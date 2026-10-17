#!/usr/bin/env node
// Builds the catalog site into dist/ from each item's READMEs and screenshot.png: a home page with
// every item plus one page per item, in each language of site.config.js `languages` (English,
// French and Spanish by default). The first language is served at the root, each other one under
// its own folder (fr/, es/), from README.<lang>.md and falling back to README.md. Deployed to
// GitHub Pages by .github/workflows/pages.yml on pushes to main.

import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT_DIR, languagesOf, readItems } from './items.mjs';
import { SUPPORTED_LANGUAGES, absoluteUrl, itemsPath, renderDetail, renderHome } from './page.js';
import rules from './rules.mjs';
import config from '../site.config.js';

const OUT_DIR = path.join(ROOT_DIR, 'dist');
const ICONS = ['favicon-32.png', 'apple-touch-icon.png'];
const languages = languagesOf(config);

const missing = languages.filter((lang) => !SUPPORTED_LANGUAGES.includes(lang));
if (missing.length) {
  console.error(
    `No strings for ${missing.join(', ')}: add a set to STRINGS in scripts/page.js, or remove it from site.config.js languages.`,
  );
  process.exit(1);
}

// A workshop's own build step before the site reads its tools (minifying bookmarklets...).
await rules.beforeBuild?.();

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(path.join(OUT_DIR, 'screenshots'), { recursive: true });

const hasFavicons = ICONS.every((icon) => existsSync(path.join(ROOT_DIR, 'site', icon)));
if (hasFavicons) {
  for (const icon of ICONS)
    copyFileSync(path.join(ROOT_DIR, 'site', icon), path.join(OUT_DIR, icon));
}
const site = { ...config, hasFavicons };
const items = readItems(config);

for (const item of items) {
  if (item.hasScreenshot) {
    copyFileSync(
      path.join(item.dir, 'screenshot.png'),
      path.join(OUT_DIR, 'screenshots', `${item.name}.png`),
    );
  }
}
for (const lang of languages) {
  const langDir = lang === languages[0] ? OUT_DIR : path.join(OUT_DIR, lang);
  mkdirSync(langDir, { recursive: true });
  writeFileSync(path.join(langDir, 'index.html'), renderHome(site, items, lang));
  for (const item of items) {
    const pageDir = path.join(langDir, itemsPath(site), item.name);
    mkdirSync(pageDir, { recursive: true });
    writeFileSync(path.join(pageDir, 'index.html'), renderDetail(site, item, items, lang));
  }
}

// A workshop's own files next to the pages (an app to run, an extension's update manifest...).
await rules.afterBuild?.({ outDir: OUT_DIR, items, site, languages });

// items.json: every tool, for the tinwright gallery (tinwright.github.io), which lists the tools of
// every workshop and links each to its page here. Paths are relative to this site's root.
writeFileSync(
  path.join(OUT_DIR, 'items.json'),
  `${JSON.stringify(
    {
      title: site.title,
      tagline: site.tagline,
      translations: site.translations ?? {},
      languages,
      siteUrl: site.siteUrl ?? null,
      repoUrl: site.repoUrl,
      items: items.map((item) => ({
        name: item.name,
        title: item.title,
        descriptions: item.descriptions,
        page: `${itemsPath(site)}/${encodeURIComponent(item.name)}/`,
        screenshot: item.hasScreenshot ? `screenshots/${encodeURIComponent(item.name)}.png` : null,
        sourceUrl: item.sourceUrl,
      })),
    },
    null,
    2,
  )}\n`,
);

// With a siteUrl, a sitemap of every page in every language, and a robots.txt that points to it.
if (site.siteUrl) {
  const paths = ['', ...items.map((item) => `${itemsPath(site)}/${encodeURIComponent(item.name)}/`)];
  const urls = languages.flatMap((lang) => paths.map((page) => absoluteUrl(site, lang, page)));
  writeFileSync(
    path.join(OUT_DIR, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`,
  );
  writeFileSync(
    path.join(OUT_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl(site, languages[0], 'sitemap.xml')}\n`,
  );
}

console.log(
  `Built dist/ in ${languages.join(', ')}, each with a home page and ${items.length} item page(s)${site.siteUrl ? ', with a sitemap' : ''}.`,
);
