import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Text a site or an item shows that can change per language.
 * @typedef {{ title?: string, tagline?: string, intro?: string, badge?: string }} SiteText
 * @typedef {{ title?: string, kicker?: string }} ItemText
 *
 * @typedef {{
 *   name: string,
 *   dir: string,
 *   title: string,
 *   readmes: Record<string, string>,
 *   descriptions: Record<string, string>,
 *   hasScreenshot: boolean,
 *   sourceUrl: string,
 *   category?: string,
 * }} Item `category` is the plugin's marketplace category (Mod, Skill...). `readmes` and `descriptions` are keyed by language, holding only the languages the item
 *   has a README for.
 *
 * @typedef {SiteText & {
 *   title: string,
 *   tagline: string,
 *   languages?: string[],
 *   translations?: Record<string, SiteText>,
 *   repoUrl: string,
 *   siteUrl?: string,
 *   license?: string,
 *   branch?: string,
 *   itemsDir: string,
 *   items?: Record<string, ItemText & { focus?: string, hidden?: boolean, translations?: Record<string, ItemText> }>,
 * }} SiteConfig
 */

/** The languages a site is built in when site.config.js doesn't say: English, French, Spanish. */
export const DEFAULT_LANGUAGES = ['en', 'fr', 'es'];

/**
 * The site's languages, the first being the default: served at the site's root, read from
 * README.md, and what any other language falls back to.
 * @param {Pick<SiteConfig, 'languages'>} config
 */
export const languagesOf = (config) =>
  config.languages?.length ? config.languages : DEFAULT_LANGUAGES;

/**
 * The README file for `lang`: README.md for the default language, README.<lang>.md otherwise.
 * @param {Pick<SiteConfig, 'languages'>} config
 * @param {string} lang
 */
export const readmeFile = (config, lang) =>
  lang === languagesOf(config)[0] ? 'README.md' : `README.${lang}.md`;

// A line of links between a README's translations ("🇫🇷 [Français](README.fr.md) · 🇪🇸
// [Español](README.es.md)"); the site has its own language switch, so it drops these lines.
const LANGUAGE_LINK = /^\S*\s*\[[^\]]*\]\(README(\.[a-z]{2,3}(-[A-Za-z]{2,4})?)?\.md\)$/u;
export const isLanguageLinks = (/** @type {string} */ text) =>
  text
    .trim()
    .split(/\s+[·|]\s+/)
    .every((part) => LANGUAGE_LINK.test(part.trim()));

/**
 * Inline markdown as plain text: `code`, **bold**, [links](url) and <tags> keep only their text,
 * and images are dropped.
 */
export const plainText = (/** @type {string} */ markdown) =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A README's title and the first paragraph under it (skipping the language links), as plain text.
 * @param {string} readme
 */
export function titleAndLead(readme) {
  const tokens = new Marked().lexer(readme.replace(/<!--[\s\S]*?-->/g, ''));
  const heading = tokens.findIndex((token) => token.type === 'heading' && token.depth === 1);
  const lead = tokens
    .slice(heading + 1)
    .find(
      (token) =>
        token.type === 'paragraph' && !isLanguageLinks(token.text) && plainText(token.text) !== '',
    );
  return {
    title: heading === -1 ? '' : plainText(/** @type {any} */ (tokens[heading]).text),
    description: lead?.type === 'paragraph' ? plainText(lead.text) : '',
  };
}

/** @param {string} file */
const readFile = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

/**
 * Every folder under `itemsDir` with a README.md, sorted by name.
 * @param {SiteConfig} config
 * @param {string} [root]
 * @returns {Item[]}
 */
export function readItems(config, root = ROOT_DIR) {
  const itemsDir = path.join(root, config.itemsDir);
  if (!fs.existsSync(itemsDir)) throw new Error(`itemsDir "${config.itemsDir}" doesn't exist`);
  return fs
    .readdirSync(itemsDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && fs.existsSync(path.join(itemsDir, entry.name, 'README.md')),
    )
    .map((entry) => entry.name)
    .sort()
    .map((name) => readItem(config, path.join(itemsDir, name)));
}

/**
 * @param {SiteConfig} config
 * @param {string} dir
 * @returns {Item}
 */
export function readItem(config, dir) {
  const name = path.basename(dir);
  /** @type {Record<string, string>} */
  const readmes = {};
  /** @type {Record<string, string>} */
  const descriptions = {};
  for (const lang of languagesOf(config)) {
    const readme = readFile(path.join(dir, readmeFile(config, lang)));
    if (!readme) continue;
    readmes[lang] = readme;
    descriptions[lang] = titleAndLead(readme).description;
  }
  const defaultTitle = titleAndLead(readmes[languagesOf(config)[0]] ?? '').title;
  const marketplace = JSON.parse(
    readFile(path.join(ROOT_DIR, '.claude-plugin', 'marketplace.json')) || '{"plugins":[]}',
  );
  const entry = marketplace.plugins?.find((/** @type {any} */ plugin) => plugin.name === name);
  return {
    name,
    dir,
    title: config.items?.[name]?.title || defaultTitle || name,
    readmes,
    descriptions,
    hasScreenshot: fs.existsSync(path.join(dir, 'screenshot.png')),
    category: entry?.category,
    sourceUrl: `${config.repoUrl}/tree/${config.branch ?? 'main'}/${config.itemsDir}/${encodeURIComponent(name)}`,
  };
}
