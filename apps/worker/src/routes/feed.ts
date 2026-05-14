import { Hono } from 'hono';
import { getLatestReleases, getReleasesByDate, getRepos } from '../services/db';
import type { Env } from '@srrm/shared';
import type { Release } from '@srrm/shared';

export const feedRoute = new Hono<{ Bindings: Env }>();

function generateRSS(releases: Release[], baseUrl: string): string {
  const items = releases.map((r: Release) => {
    const pubDate = new Date(r.publishedAt).toUTCString();
    return `
    <item>
      <title>${r.repoFullName} ${r.tagName}: ${r.name}</title>
      <description><![CDATA[${r.bodyHtml}]]></description>
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

function generateAtom(releases: Release[], baseUrl: string): string {
  const entries = releases.map((r: Release) => {
    const updated = new Date(r.publishedAt).toISOString();
    return `
    <entry>
      <title>${r.repoFullName} ${r.tagName}: ${r.name}</title>
      <content type="html"><![CDATA[${r.bodyHtml}]]></content>
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

// /feed.xml?repo=owner/repo — 可选按仓库过滤
feedRoute.get('/', async (c) => {
  try {
    const { repo } = c.req.query();
    let releases: Release[] = (await getLatestReleases(c.env.DB as any)) as Release[];

    if (repo) {
      releases = releases.filter((r: Release) =>
        r.repoFullName.toLowerCase() === repo.toLowerCase()
      );
    }

    // 保留最近 50 条用于 feed
    const limited = releases.slice(0, 50);

    const baseUrl = c.env.APP_BASE_URL || '';
    const xml = generateRSS(limited, baseUrl);

    return c.body(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    });
  } catch (err) {
    console.error('[Feed Route Error]', err);
    return c.text('Internal Server Error', 500);
  }
});

// /feed.xml/date/:date — 按日期获取 feed（调试用）
feedRoute.get('/date/:date', async (c) => {
  try {
    const { date } = c.req.param();
    const releases: Release[] = (await getReleasesByDate(c.env.DB as any, date)) as Release[];
    const baseUrl = c.env.APP_BASE_URL || '';

    if (releases.length === 0) {
      return c.text(`No releases found for ${date}`, 404);
    }

    const xml = generateRSS(releases, baseUrl);
    return c.body(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    });
  } catch (err) {
    console.error('[Feed Date Route Error]', err);
    return c.text('Internal Server Error', 500);
  }
});