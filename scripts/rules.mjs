// This workshop's rules for npm run check and its step after npm run create. A plugin's manifest
// must match its folder, and the marketplace must list every plugin, and nothing else.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR, itemNames } from './workshop.mjs';

const MARKETPLACE = path.join(ROOT_DIR, '.claude-plugin', 'marketplace.json');
const readJSON = (/** @type {string} */ file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** The `claude` command: $CLAUDE_BIN if set (CI pins a version with npx), else whatever is on PATH. */
export const claudeCommand = () => (process.env.CLAUDE_BIN ?? 'claude').split(' ');

export default {
  /**
   * @param {import('./items.mjs').Item} item
   * @param {string[]} files
   */
  check(item, files) {
    /** @type {string[]} */
    const problems = [];
    if (!files.includes(path.join('.claude-plugin', 'plugin.json'))) return ['no .claude-plugin/plugin.json'];
    const manifest = readJSON(path.join(item.dir, '.claude-plugin', 'plugin.json'));
    if (manifest.name !== item.name) problems.push(`plugin.json's name is "${manifest.name}", not "${item.name}"`);
    if (!manifest.description) problems.push('plugin.json needs a description');
    // Plugins stay version-less, so every merge to main reaches everyone who installed them.
    if (manifest.version) problems.push('plugin.json has a version; leave it out so every merge is an update');
    return problems;
  },

  /** Every plugin listed once in the marketplace, each with a description, and the manifests valid. */
  checkRepo() {
    /** @type {string[]} */
    const problems = [];
    const listed = readJSON(MARKETPLACE).plugins ?? [];
    const names = itemNames();
    for (const name of names) {
      const entries = listed.filter((/** @type {any} */ entry) => entry.name === name);
      if (entries.length !== 1) problems.push(`marketplace.json should list ${name} once`);
      else if (entries[0].source !== `./plugins/${name}`) problems.push(`${name}'s marketplace source should be ./plugins/${name}`);
      else if (!entries[0].description) problems.push(`${name} needs a description in marketplace.json`);
    }
    for (const entry of listed)
      if (!names.includes(entry.name)) problems.push(`marketplace.json lists ${entry.name}, which has no folder`);

    const [command, ...args] = claudeCommand();
    const validate = spawnSync(command, [...args, 'plugin', 'validate', '.'], { cwd: ROOT_DIR, encoding: 'utf8' });
    if (validate.error) console.warn(`Skipped claude plugin validate: ${command} isn't installed (CI runs it).`);
    else if (validate.status !== 0) problems.push(`claude plugin validate failed:\n${validate.stdout}${validate.stderr}`);
    return problems;
  },

  /** Lists a new plugin in the marketplace. @param {{ name: string, description: string }} plugin */
  afterCreate({ name, description }) {
    const marketplace = readJSON(MARKETPLACE);
    marketplace.plugins = [
      ...(marketplace.plugins ?? []),
      { name, source: `./plugins/${name}`, description, category: 'Mod', tags: ['mod'] },
    ];
    fs.writeFileSync(MARKETPLACE, `${JSON.stringify(marketplace, null, 2)}\n`);
  },
};
