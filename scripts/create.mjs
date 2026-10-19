#!/usr/bin/env node
// npm run create -- <name> --description "…": a new tool from template/, with __NAME__, __TITLE__
// and __DESCRIPTION__ filled in, in every file and file name. Then rules.mjs's afterCreate does
// anything else this workshop needs (listing it in a manifest...).

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import rules from './rules.mjs';
import { ITEMS_DIR, ROOT_DIR, TEMPLATE_DIR, filesIn, nameProblem, readText, titleOf } from './workshop.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    description: { type: 'string', short: 'd' },
    title: { type: 'string' },
  },
});

const [name] = positionals;
const fail = (/** @type {string} */ message) => {
  console.error(message);
  process.exit(2);
};
if (!name || positionals.length > 1 || !values.description)
  fail('Usage: npm run create -- <name> --description "What it does, in one sentence."');
const problem = nameProblem(name);
if (problem) fail(`"${name}" won't work as a name: ${problem}.`);
const dir = path.join(ITEMS_DIR, name);
if (fs.existsSync(dir)) fail(`${path.relative(ROOT_DIR, dir)} already exists.`);

const fill = (/** @type {string} */ text) =>
  text
    .replaceAll('__NAME__', name)
    .replaceAll('__TITLE__', values.title ?? titleOf(name))
    .replaceAll('__DESCRIPTION__', values.description ?? '');

for (const file of filesIn(TEMPLATE_DIR)) {
  const from = path.join(TEMPLATE_DIR, file);
  const to = path.join(dir, fill(file));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const text = readText(from);
  if (text === undefined) fs.copyFileSync(from, to);
  else fs.writeFileSync(to, fill(text));
  fs.chmodSync(to, fs.statSync(from).mode);
}
await rules.afterCreate?.({ name, dir, description: values.description ?? '' });

console.log(`Created ${path.relative(ROOT_DIR, dir)}.

Next:
  1. Make it do its job, and write its tests (the template's show the shape).
  2. Translate the description in README.fr.md and README.es.md.
  3. npm run check && npm test
  4. To see its page, run npm run dev in tinwright.github.io, cloned next to this repo.`);
