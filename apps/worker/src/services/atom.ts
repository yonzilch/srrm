/**
 * Atom Feed 解析器 — Cloudflare Workers 兼容
 * 不使用 DOMParser（Workers 不可用），纯正则解析
 */

export interface AtomEntry {
  id: string;
  title: string;
  link: string;
  updated: string;
  content: string;
  author: string;
}

/** 提取 XML 标签内容（支持嵌套同名标签时取第一个） */
function extractTagContent(xml: string, tag: string): string {
  const regex = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

/** 提取 XML 属性值 */
function extractAttrValue(xml: string, attr: string): string {
  const regex = new RegExp(attr + '="([^"]*)"', 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

/** 处理 CDATA */
function decodeCdata(str: string): string {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

/**
 * 解码 HTML 实体（数字实体 + 命名实体 + 双重编码）
 * 必须在 stripHtml 之后调用
 */
function decodeEntities(str: string): string {
  if (!str) return '';
  return str
    // 处理双重编码的换行：&amp;#xA; → \n
    .replace(/&amp;#xA;/g, '\n')
    .replace(/&amp;#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)))
    // 处理十六进制数字实体：&#xHH;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)))
    // 处理十进制数字实体：&#DD;
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)))
    // 处理命名实体
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

/** 移除 HTML 标签，保留纯文本 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 解析 Atom XML 字符串，返回 entry 列表
 */
export function parseAtomFeed(xml: string): AtomEntry[] {
  const entries: AtomEntry[] = [];

  // 提取所有 <entry> 块
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let entryMatch: RegExpExecArray | null;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entryXml = entryMatch[1];

    // 提取 id
    const id = extractTagContent(entryXml, 'id');

    // 提取 title（去除 CDATA）
    const rawTitle = extractTagContent(entryXml, 'title');
    const title = decodeCdata(rawTitle);

    // 提取 link href（优先 rel="alternate"，否则取第一个 link）
    let link = '';
    const linkRegex = /<link[^>]*>/gi;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(entryXml)) !== null) {
      const linkTag = linkMatch[0];
      const rel = extractAttrValue(linkTag, 'rel');
      if (!rel || rel === 'alternate') {
        link = extractAttrValue(linkTag, 'href');
        if (link) break;
      }
    }

    // 提取 updated
    const updated = extractTagContent(entryXml, 'updated');

    // 提取 content：先 decodeCdata → stripHtml → decodeEntities
    const rawContent = extractTagContent(entryXml, 'content');
    const content = decodeEntities(stripHtml(decodeCdata(rawContent)));

    // 提取 author name
    const author = extractTagContent(entryXml, 'author');
    const authorName = author ? extractTagContent(author, 'name') : '';

    entries.push({ id, title, link, updated, content, author: authorName });
  }

  return entries;
}

/**
 * 从 Atom entry 中判断是否为预发布版本
 */
export function isPrerelease(entry: AtomEntry): boolean {
  const text = (entry.title + ' ' + entry.id).toLowerCase();
  const prereleaseKeywords = [
    '-alpha', '-beta', '-rc', '-pre', '.beta', '.alpha',
    'preview', 'prerelease', 'pre-release', 'dev', '-dev',
  ];
  for (let i = 0; i < prereleaseKeywords.length; i++) {
    if (text.indexOf(prereleaseKeywords[i]) !== -1) return true;
  }
  return false;
}

/**
 * 解析 RSS 2.0 XML 字符串（Forgejo/Codeberg 使用）
 * 返回与 AtomEntry 兼容的结构
 */
export function parseRssFeed(xml: string): AtomEntry[] {
  const entries: AtomEntry[] = [];

  // 提取所有 <item> 块
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];

    // 提取 guid 作为 id
    const id = extractTagContent(itemXml, 'guid');

    // 提取 title
    const rawTitle = extractTagContent(itemXml, 'title');
    const title = decodeCdata(rawTitle);

    // 提取 link
    const link = extractTagContent(itemXml, 'link');

    // 提取 pubDate → 转为 ISO 8601
    const pubDate = extractTagContent(itemXml, 'pubDate');
    let updated = pubDate;
    try {
      updated = new Date(pubDate).toISOString();
    } catch {
      updated = pubDate;
    }

    // 提取 content:encoded（优先）或 description
    let rawContent = '';
    // 匹配 <content:encoded> 或 <encoded> 标签
    const contentEncodedRegex = /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i;
    const contentMatch = itemXml.match(contentEncodedRegex);
    if (contentMatch) {
      rawContent = contentMatch[1];
    } else {
      rawContent = extractTagContent(itemXml, 'description');
    }
    const content = decodeEntities(stripHtml(decodeCdata(rawContent)));

    // 提取 author
    const authorName = extractTagContent(itemXml, 'author');

    entries.push({ id, title, link, updated, content, author: authorName });
  }

  return entries;
}

/**
 * 统一 feed 解析入口
 * 根据 XML 内容自动判断 Atom 或 RSS 2.0
 */
export function parseFeed(xml: string): AtomEntry[] {
  // 检测根元素判断格式
  if (xml.indexOf('<rss') !== -1 || xml.indexOf('<channel>') !== -1) {
    return parseRssFeed(xml);
  }
  return parseAtomFeed(xml);
}
