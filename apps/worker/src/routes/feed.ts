import { Hono } from 'hono';
import { getReleases, getRepos } from './services/kv';
import type { Env } from '@srrm/shared';
import type { Release } from '@srrm/shared';

export const feedRoute = new Hono<{ Bindings: Env }>();

// 生成 RSS 2.0 XML
function generateRSS(releases: Release[], baseUrl: string): string {
  const items = releases.map(r => {
    const pubDate = new Date(r.publishedAt).toUTCString();
    return `
    <item>
      <title>${r.repoFullName} ${r.tagName}: ${r.name}</title>
      <description><![CDATA[${r.body}]]></description>
      <link>${r.htmlUrl}</link>
      <guid isPermaLink="false">${r.id}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
  }).join('\n');

  const lastBuildDate = new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Serverless Repository Release Monitor</title>
    <link>${baseUrl}</link>
    <description>Aggregated GitHub releases</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

// Atom XML 替代方案（更现代）
function generateAtom(releases: Release[], baseUrl: string): string {
  const entries = releases.map(r => {
    const updated = new Date(r.publishedAt).toISOString();
    return `
    <entry>
      <title>${r.repoFullName} ${r.tagName}: ${r.name}</title>
      <content type="html"><![CDATA[${r.body}]]></content>
      <link href="${r.htmlUrl}" />
      <id>${r.id}</id>
      <updated>${updated}</updated>
    </entry>`;
  }).join('\n');

  const updated = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Serverless Repository Release Monitor</title>
  <link href="${baseUrl}" />
  <updated>${updated}</updated>
  <id>${baseUrl}/feed.xml</id>
  ${entries}
</feed>`;
}

feedRoute.get('/', async (c) => {
  try {
    const { repo } = c.req.query();
    const releases = await getReleases(c.env.KV);
    
    let filtered = releases;
    if (repo) {
      filtered = releases.filter(r => r.repoFullName.toLowerCase() === repo.toLowerCase());
    }
    
    // 按发布时间降序排序
    filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // 限制最近 50 条以避免 feed 过大
    const limited = filtered.slice(0, 50);
    
    // 根据环境变量决定输出格式（这里使用 RSS 2.0）
    const xml = generateRSS(limited, c.env.APP_BASE_URL);
    
    return c.body(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 分钟缓存
    });
  } catch (err) {
    console.error('[Feed Route Error]', err);
    return c.text('Internal Server Error', 500);
  }
});
