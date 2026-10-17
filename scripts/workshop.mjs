// What create.mjs and check.mjs share: where the tools live, the naming rules, and the template's
// placeholders. The workshop's own rules are in rules.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from './items.mjs';
import config from '../site.config.js';

export { ROOT_DIR };
export const ITEMS_DIR = path.join(ROOT_DIR, config.itemsDir);
export const TEMPLATE_DIR = path.join(ROOT_DIR, 'template');

/** The template's placeholders, which create.mjs fills in and check.mjs looks for leftovers of. */
export const PLACEHOLDER = /__(NAME|TITLE|DESCRIPTION)__/;

/** The template's stand-in sentences, for the translations create.mjs can't write. */
export const STAND_INS = ['Remplacez cette phrase', 'Sustituye esta frase'];

/**
 * Why a tool can't be called `name`, or undefined if it can.
 * @param {string} name
 */
export function nameProblem(name) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name))
    return 'use lowercase letters, digits and single hyphens, like word-count';
  if (name.length > 40) return 'keep it to 40 characters or fewer';
  if (/claude|anthropic/.test(name))
    return 'leave out "claude" and "anthropic", so it doesn\'t read as an official tool';
  return undefined;
}

/** The tools' folder names, sorted. */
export const itemNames = () =>
  fs.existsSync(ITEMS_DIR)
    ? fs
        .readdirSync(ITEMS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

/** `word-count` as `Word Count`. @param {string} name */
export const titleOf = (name) =>
  name
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Every file under `dir`, as paths relative to it, skipping dependencies and build output.
 * @param {string} dir
 * @returns {string[]}
 */
export function filesIn(dir) {
  const skip = new Set(['node_modules', 'dist', 'build', '.git']);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (skip.has(entry.name) || entry.name === '.DS_Store') return [];
    if (entry.isDirectory())
      return filesIn(path.join(dir, entry.name)).map((file) => path.join(entry.name, file));
    return [entry.name];
  });
}

/** A text file's contents, or undefined for a binary or large one. @param {string} file */
export function readText(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length > 1_000_000 || buffer.includes(0)) return undefined;
  return buffer.toString('utf8');
}
