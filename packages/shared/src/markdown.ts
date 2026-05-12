// Markdown → HTML 轻量转换器
// 适用于 Cloudflare Workers Edge Runtime 和浏览器，零依赖
// 覆盖 GitHub Release 常用语法：标题、粗体、斜体、代码、链接、列表、引用、表格等

/** 转义 HTML 特殊字符 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** 处理行内元素：粗体、斜体、删除线、行内代码、链接、图片、@mention、#issue */
function parseInline(text: string): string {
  // 代码块优先（避免代码内的 ** 被解析）
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });

  // 图片 ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`;
  });

  // 链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
    return `<a href="${escapeHtml(url)}">${parseInline(escapeHtml(linkText))}</a>`;
  });

  // 粗体 **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 粗体 __text__
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 斜体 *text*
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  // 斜体 _text_
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

  // 删除线 ~~text~~
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // @mention → 链接
  text = text.replace(/@([a-zA-Z0-9_-]+)/g, ' <a href="https://github.com/$1">@$1</a> ');

  // #数字 → issue 链接
  text = text.replace(/#(\d+)/g, (_, num) => {
    return `<a href="https://github.com/issue/${num}">#${num}</a>`;
  });

  return text;
}

/** 判断是否为分割线行 */
function isHr(line: string): boolean {
  return /^[*\-_]{3,}\s*$/.test(line);
}

/** 判断是否为标题行 */
function getHeadingLevel(line: string): number | null {
  const match = line.match(/^(#{1,6})\s+(.+)/);
  return match ? match[1].length : null;
}

/** 判断是否为无序列表项 */
function isUnorderedListItem(line: string): boolean {
  return /^\s*[-*+]\s+/.test(line);
}

/** 判断是否为有序列表项 */
function isOrderedListItem(line: string): boolean {
  return /^\s*\d+\.\s+/.test(line);
}

/** 判断是否为引用行 */
function isBlockquote(line: string): boolean {
  return /^\s*>\s?/.test(line);
}

/** 判断是否为代码块围栏 */
function isFence(line: string): boolean {
  return /^```/.test(line);
}

/** 处理列表项的缩进层级（每2个空格算一级） */
function getListIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  return Math.floor(match[1].length / 2);
}

/** 根据缩进调整列表栈 */
function adjustListStack(
  result: string[],
  stack: { type: 'ul' | 'ol'; indent: number }[],
  targetIndent: number,
  listType: 'ul' | 'ol',
): void {
  if (stack.length === 0) {
    stack.push({ type: listType, indent: targetIndent });
    result.push(`<${listType}>`);
    return;
  }

  const current = stack[stack.length - 1];

  if (targetIndent > current.indent) {
    stack.push({ type: listType, indent: targetIndent });
    result.push(`<${listType}>`);
  } else if (targetIndent < current.indent) {
    while (stack.length > 0 && stack[stack.length - 1].indent >= targetIndent) {
      stack.pop();
      result.push(`</${listType}>`);
    }
    if (stack.length === 0) {
      stack.push({ type: listType, indent: targetIndent });
      result.push(`<${listType}>`);
    }
  } else {
    if (current.type !== listType) {
      result.push(`</${current.type}>`);
      stack.pop();
      stack.push({ type: listType, indent: targetIndent });
      result.push(`<${listType}>`);
    }
  }
}

/** 关闭所有嵌套列表 */
function closeLists(
  result: string[],
  stack: { type: 'ul' | 'ol'; indent: number }[],
): void {
  while (stack.length > 0) {
    const top = stack.pop()!;
    result.push(`</${top.type}>`);
  }
}

/**
 * 将 Markdown 文本转换为 HTML
 * 支持：标题(#)、粗体(**)、斜体(*)、删除线(~~)、行内代码、代码块、链接、图片、
 *       无序列表、有序列表、引用、分割线、表格、换行
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let listStack: { type: 'ul' | 'ol'; indent: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块处理
    if (isFence(line)) {
      if (inCodeBlock) {
        result.push('</pre></div>');
        inCodeBlock = false;
        codeLang = '';
      } else {
        if (inList) {
          closeLists(result, listStack);
          inList = false;
          listStack = [];
          listType = null;
        }
        inCodeBlock = true;
        codeLang = line.replace(/^```\s*/, '').trim();
        const langAttr = codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : '';
        result.push(`<div class="code-block"><pre${langAttr}><code>`);
      }
      continue;
    }

    if (inCodeBlock) {
      result.push(escapeHtml(line));
      continue;
    }

    // 空行：结束当前列表
    if (/^\s*$/.test(line)) {
      if (inList) {
        closeLists(result, listStack);
        inList = false;
        listStack = [];
        listType = null;
      }
      continue;
    }

    // 分割线
    if (isHr(line)) {
      if (inList) {
        closeLists(result, listStack);
        inList = false;
        listStack = [];
        listType = null;
      }
      result.push('<hr />');
      continue;
    }

    // 标题
    const headingLevel = getHeadingLevel(line);
    if (headingLevel !== null) {
      if (inList) {
        closeLists(result, listStack);
        inList = false;
        listStack = [];
        listType = null;
      }
      const content = line.replace(/^#{1,6}\s+/, '');
      result.push(`<h${headingLevel}>${parseInline(escapeHtml(content))}</h${headingLevel}>`);
      continue;
    }

    // 表格处理（简化版：| a | b |）
    if (/^\s*\|/.test(line) && line.indexOf('|') !== -1) {
      if (inList) {
        closeLists(result, listStack);
        inList = false;
        listStack = [];
        listType = null;
      }
      const cells = line.split('|').filter((c) => c !== '');
      const lastResult = result[result.length - 1];
      if (!lastResult || lastResult.indexOf('<table') === -1) {
        result.push('<table>');
      }
      result.push('<tr>');
      for (const cell of cells) {
        result.push(`<td>${parseInline(escapeHtml(cell.trim()))}</td>`);
      }
      result.push('</tr>');
      // 检查下一行是否是表头分隔行
      const next = lines[i + 1] || '';
      if (
        /^\s*\|[-\s|]+\|/.test(next) &&
        next.split('|').filter(Boolean).every((c) => /^[\s\-:|]+$/.test(c))
      ) {
        i++; // 跳过表头分隔行
      } else {
        result.push('</table>');
      }
      continue;
    }

    // 无序列表项
    if (isUnorderedListItem(line)) {
      const indent = getListIndent(line);
      const content = line.replace(/^\s*[-*+]\s+/, '');

      if (!inList) {
        inList = true;
        listType = 'ul';
        listStack = [{ type: 'ul', indent }];
        result.push('<ul>');
      } else {
        adjustListStack(result, listStack, indent, 'ul');
      }

      result.push(`<li>${parseInline(escapeHtml(content))}</li>`);
      continue;
    }

    // 有序列表项
    if (isOrderedListItem(line)) {
      const indent = getListIndent(line);
      const content = line.replace(/^\s*\d+\.\s+/, '');

      if (!inList) {
        inList = true;
        listType = 'ol';
        listStack = [{ type: 'ol', indent }];
        result.push('<ol>');
      } else {
        adjustListStack(result, listStack, indent, 'ol');
      }

      result.push(`<li>${parseInline(escapeHtml(content))}</li>`);
      continue;
    }

    // 引用
    if (isBlockquote(line)) {
      if (inList) {
        closeLists(result, listStack);
        inList = false;
        listStack = [];
        listType = null;
      }
      const content = line.replace(/^\s*>\s?/, '');
      result.push(`<blockquote>${parseInline(escapeHtml(content))}</blockquote>`);
      continue;
    }

    // 普通段落
    if (inList) {
      closeLists(result, listStack);
      inList = false;
      listStack = [];
      listType = null;
    }

    // 处理行内换行（行尾两个空格）
    const isHardBreak = /\s{2}$/.test(line);
    const parsed = parseInline(escapeHtml(line));
    if (isHardBreak) {
      result.push(`${parsed}<br />`);
    } else {
      result.push(`<p>${parsed}</p>`);
    }
  }

  // 结束时关闭未关闭的列表
  if (inList) {
    closeLists(result, listStack);
  }

  return result.join('\n');
}