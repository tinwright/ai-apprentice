// This workshop's part of the tinwright site, which tinwright.github.io builds from a checkout of
// this repo: its nouns, its own words, and what its pages add to the shell there. Each hook gets
// the site, the tool, where the page sits (ctx) and the site's helpers (kit), and returns HTML;
// escape anything that comes from the repo with kit.escapeHTML().

/**
 * @typedef {import('./items.mjs').Item} Item
 * @typedef {import('./items.mjs').SiteConfig} Site
 * @typedef {{ lang: string, root: string, home: string }} Ctx
 * @typedef {{
 *   escapeHTML: (text: string) => string,
 *   commandHTML: (lang: string, command: string) => string,
 *   itemsPath: (site: Site) => string,
 * }} Kit
 */

/** The nouns on this workshop's pages, per language. */
export const nouns = {
  en: {
    item: 'Plugin',
    allItems: 'All plugins',
    count: (/** @type {number} */ n) => `${n} ${n === 1 ? 'plugin' : 'plugins'}`,
    emptyTitle: 'No plugins yet',
    emptyText: 'The first ones are on their way. Watch the repository on GitHub to hear when they land.',
    back: '← All plugins',
    moreItems: 'More plugins',
  },
  fr: {
    item: 'Plugin',
    allItems: 'Tous les plugins',
    count: (/** @type {number} */ n) => `${n} ${n === 1 ? 'plugin' : 'plugins'}`,
    emptyTitle: 'Pas encore de plugins',
    emptyText: 'Les premiers arrivent bientôt. Suivez le dépôt sur GitHub pour savoir quand ils seront là.',
    back: '← Tous les plugins',
    moreItems: 'Autres plugins',
  },
  es: {
    item: 'Plugin',
    allItems: 'Todos los plugins',
    count: (/** @type {number} */ n) => `${n} ${n === 1 ? 'plugin' : 'plugins'}`,
    emptyTitle: 'Todavía no hay plugins',
    emptyText: 'Los primeros están en camino. Sigue el repositorio en GitHub para enterarte cuando lleguen.',
    back: '← Todos los plugins',
    moreItems: 'Más plugins',
  },
};

const MARKETPLACE = 'tinwright';
const MARKETPLACE_REPO = 'tinwright/ai-apprentice';

/** This workshop's own words, per language. */
const WORDS = {
  en: {
    type: 'Type',
    install: 'In Claude Code, add the tinwright marketplace once:',
    then: 'Then install this plugin:',
  },
  fr: {
    type: 'Type',
    install: 'Dans Claude Code, ajoutez une fois la place de marché tinwright :',
    then: 'Puis installez ce plugin :',
  },
  es: {
    type: 'Tipo',
    install: 'En Claude Code, añade una vez el marketplace de tinwright:',
    then: 'Después, instala este plugin:',
  },
};
/** @param {string} lang */
const wordsOf = (lang) => WORDS[/** @type {keyof typeof WORDS} */ (lang)] ?? WORDS.en;

/**
 * `<dt>`/`<dd>` pairs for the detail page's "At a glance" box.
 * @param {Site} site
 * @param {Item} item
 * @param {Ctx} ctx
 * @param {Kit} kit
 */
export function facts(site, item, ctx, kit) {
  return item.category ? `<dt>${wordsOf(ctx.lang).type}</dt><dd>${kit.escapeHTML(item.category)}</dd>` : '';
}

/**
 * The install steps: add the marketplace once, then install the plugin.
 * @param {Site} site
 * @param {Item} item
 * @param {Ctx} ctx
 * @param {Kit} kit
 */
export function install(site, item, ctx, kit) {
  const words = wordsOf(ctx.lang);
  return `<div class="install">
              <p>${words.install}</p>
              ${kit.commandHTML(ctx.lang, `/plugin marketplace add ${MARKETPLACE_REPO}`)}
              <p>${words.then}</p>
              ${kit.commandHTML(ctx.lang, `/plugin install ${item.name}@${MARKETPLACE}`)}
            </div>`;
}

/** The label above a plugin's title: its marketplace category (Mod, Skill...). @param {Item} item */
export const kicker = (item) => item.category;
