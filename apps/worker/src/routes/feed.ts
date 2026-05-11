import { Hono } from 'hono';
import { getReleases, getRepos } from '../services/kv';
import type { Env } from '@srrm/shared';
import type { Release } from '@srrm/shared';

export const feedRoute = new Hono<{ Bindings: Env }>();

function generateRSS(releases: Release[], baseUrl: string): string {
  const items = releases.map((r: Release) => {
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

function generateAtom(releases: Release[], baseUrl: string): string {
  const entries = releases.map((r: Release) => {
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

    let filtered: Release[] = releases;
    if (repo) {
      filtered = releases.filter((r: Release) => r.repoFullName.toLowerCase() === repo.toLowerCase());
    }

    filtered.sort((a: Release, b: Release) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const limited = filtered.slice(0, 50);

    const xml = generateRSS(limited, c.env.APP_BASE_URL);

    return c.body(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    });
  } catch (err) {
    console.error('[Feed Route Error]', err);
    return c.text('Internal Server Error', 500);
  }
});