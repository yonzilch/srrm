/**
 * Feed 解析器 — 统一支持 Atom 1.0 和 RSS 2.0
 * Cloudflare Workers 兼容（无 DOMParser，纯正则解析）
 */

// ─── 统一出口类型 ───────────────────────────────

export interface FeedEntry {
  id: string;
  title: string;
  link: string;
  publishedAt: string;   // ISO 8601
  contentHtml: string;   // 原始 HTML，待前端净化渲染
  author: string;
}

// ─── 格式检测 ────────────────────────────────────

function detectFeedFormat(xml: string): 'atom' | 'rss' | 'unknown' {
  // Atom 1.0 根元素 <feed xmlns="...">
  if (xml.indexOf('<feed') !== -1 && xml.indexOf('xmlns') !== -1) return 'atom';
  // RSS 2.0 根元素 <rss><channel>
  if (xml.indexOf('<rss') !== -1 || xml.indexOf('<channel>') !== -1) return 'rss';
  return 'unknown';
}

// ─── Atom 1.0 解析 ───────────────────────────────

function parseAtom(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;

  while ((m = entryRegex.exec(xml)) !== null) {
    const block = m[1];
    entries.push({
      id:          extractTag(block, 'id'),
      title:       decodeEntities(extractTag(block, 'title')),
      link:        extractAttr(block, 'link', 'href')
                   || extractTag(block, 'link'),
      publishedAt: normalizeDate(
                     extractTag(block, 'updated') ||
                     extractTag(block, 'published')
                   ),
      contentHtml: extractCdataOrTag(block, 'content'),
      author:      extractTag(block, 'name'),
    });
  }
  return entries;
}

// ─── RSS 2.0 解析 ────────────────────────────────

function parseRss(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    entries.push({
      id:          extractTag(block, 'guid') || extractTag(block, 'link'),
      title:       decodeEntities(extractCdataOrTag(block, 'title')),
      link:        extractTag(block, 'link'),
      publishedAt: normalizeDate(extractTag(block, 'pubDate')),
      contentHtml: extractCdataOrTag(block, 'description')     // RSS 主体
                   || extractCdataOrTag(block, 'content:encoded'), // 扩展字段
      author:      extractTag(block, 'author')
                   || extractTag(block, 'dc:creator'),
    });
  }
  return entries;
}

// ─── 统一入口 ────────────────────────────────────

export function parseFeed(xml: string): FeedEntry[] {
  const format = detectFeedFormat(xml);
  if (format === 'atom') return parseAtom(xml);
  if (format === 'rss')  return parseRss(xml);
  console.warn('[Feed] Unknown feed format, attempting RSS fallback');
  return parseRss(xml); // 宽容降级
}

// ─── 辅助函数 ────────────────────────────────────

/** 提取标签文本内容（含 CDATA） */
function extractCdataOrTag(xml: string, tag: string): string {
  // 先尝试 CDATA
  const cdataRe = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'
  );
  const cdataM = cdataRe.exec(xml);
  if (cdataM) return cdataM[1].trim();

  // 再尝试普通标签（可能含 HTML 实体编码的 HTML）
  const tagRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const tagM = tagRe.exec(xml);
  if (tagM) return decodeEntities(tagM[1].trim());

  return '';
}

function extractTag(xml: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m ? m[1].trim() : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*>`).exec(xml);
  return m ? m[1] : '';
}

/** 统一日期格式为 ISO 8601 */
function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function decodeEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const cp = parseInt(h, 16);
      if (cp <= 0xffff) return String.fromCharCode(cp);
      const hi = ((cp - 0x10000) >> 10) + 0xd800;
      const lo = ((cp - 0x10000) & 0x3ff) + 0xdc00;
      return String.fromCharCode(hi, lo);
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const cp = parseInt(d, 10);
      if (cp <= 0xffff) return String.fromCharCode(cp);
      const hi = ((cp - 0x10000) >> 10) + 0xd800;
      const lo = ((cp - 0x10000) & 0x3ff) + 0xdc00;
      return String.fromCharCode(hi, lo);
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

/** 清洗 HTML，移除脚本/样式等危险标签，保留正文内容 */
export function sanitizeHtmlForStorage(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .trim();
}

/** 移除 HTML 标签，保留纯文本 */
export function stripHtmlToText(html: string): string {
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

// ─── 预发布判断 ────────────────────────────────────

export function isPrerelease(entry: FeedEntry): boolean {
  const t = (entry.title + entry.id).toLowerCase();
  return /[-.]?(alpha|beta|rc|pre|preview|nightly|snapshot|dev)\b/.test(t);
}