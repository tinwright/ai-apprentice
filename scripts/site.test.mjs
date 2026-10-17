// The catalog site builds in every language, has a page for every tool in each, and every link
// and image inside it leads somewhere that exists.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { languagesOf } from './items.mjs';
import { itemsPath } from './page.js';
import { ROOT_DIR, itemNames } from './workshop.mjs';
import config from '../site.config.js';

const DIST = path.join(ROOT_DIR, 'dist');

/** @param {string} dir @returns {string[]} */
const htmlFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });

test('the site builds', () => {
  const build = spawnSync(process.execPath, ['scripts/build-site.mjs'], { cwd: ROOT_DIR, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr || build.stdout);
});

test('every language has a home page and a page per tool', () => {
  const languages = languagesOf(config);
  for (const lang of languages) {
    const home = lang === languages[0] ? DIST : path.join(DIST, lang);
    assert.ok(fs.existsSync(path.join(home, 'index.html')), `${lang} home page`);
    for (const name of itemNames())
      assert.ok(
        fs.existsSync(path.join(home, itemsPath(config), name, 'index.html')),
        `${lang} page for ${name}`,
      );
  }
});

test('every link and image inside the site exists, and only bookmarklets run script', () => {
  for (const file of htmlFiles(DIST)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [tag] of html.matchAll(/<[a-z]+\b[^>]*\s(?:href|src)="[^"]*"[^>]*>/g)) {
      const [, attribute, raw] = /** @type {RegExpMatchArray} */ (tag.match(/\s(href|src)="([^"]*)"/));
      const value = raw.replaceAll('&amp;', '&');
      const where = `${path.relative(DIST, file)}: ${attribute}="${value.slice(0, 60)}"`;
      if (/^javascript:/i.test(value)) {
        assert.match(tag, /^<a\s[^>]*class="[^"]*\bbookmarklet\b/, `${where} runs script`);
        continue;
      }
      if (/^(https?:|mailto:|data:|#|\/\/)/i.test(value) || value === '') continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(value.split(/[?#]/)[0]));
      const exists =
        fs.existsSync(target) &&
        (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
      assert.ok(exists, `${where} leads nowhere`);
    }
  }
});
