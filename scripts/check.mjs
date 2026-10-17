#!/usr/bin/env node
// npm run check: every tool against the workshop's rules (the shared ones here, this workshop's in
// rules.mjs), a scan of the whole repository for secrets, and the private-data guard's file check
// when its patterns are on this machine. CI runs the full guard, history included, on every change.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readItem, titleAndLead } from './items.mjs';
import rules from './rules.mjs';
import config from '../site.config.js';
import {
  ITEMS_DIR,
  PLACEHOLDER,
  ROOT_DIR,
  STAND_INS,
  filesIn,
  itemNames,
  nameProblem,
  readText,
} from './workshop.mjs';

/** @type {string[]} */
const problems = [];
const report = (/** @type {string} */ where, /** @type {string} */ message) =>
  problems.push(`${where}: ${message}`);

const READMES = ['README.md', 'README.fr.md', 'README.es.md'];
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

const names = itemNames();
if (names.length === 0 && !rules.noItems) report(config.itemsDir, 'no tools yet; add one with npm run create');

for (const name of names) {
  const dir = path.join(ITEMS_DIR, name);
  const where = path.relative(ROOT_DIR, dir);
  const files = filesIn(dir);

  const problem = nameProblem(name);
  if (problem) report(where, problem);
  for (const readme of READMES) {
    if (!files.includes(readme)) {
      report(where, `no ${readme}`);
      continue;
    }
    const { title, description } = titleAndLead(fs.readFileSync(path.join(dir, readme), 'utf8'));
    if (!title || !description)
      report(`${where}/${readme}`, 'needs a # title and a description paragraph under it');
  }
  if (!files.some((file) => TEST_FILE.test(file)))
    report(where, 'no tests: add a *.test.* file that runs the real thing');
  for (const file of files) {
    const text = readText(path.join(dir, file));
    if (text === undefined) continue;
    if (PLACEHOLDER.test(text)) report(`${where}/${file}`, 'still has a template placeholder');
    for (const standIn of STAND_INS)
      if (text.includes(standIn)) report(`${where}/${file}`, `still has "${standIn}…" from the template`);
  }
  for (const message of (await rules.check?.(readItem(config, dir), files)) ?? []) report(where, message);
}
for (const message of (await rules.checkRepo?.()) ?? []) report('repository', message);

// Secrets anywhere in the repository: tracked files and new ones not yet added, minus ignored ones.
const SECRETS = [
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['an AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['a GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/],
  ['an npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['a Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['an Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['an OpenAI API key', /\bsk-(proj-)?[A-Za-z0-9_-]{40,}/],
];
const listed = spawnSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: ROOT_DIR, encoding: 'utf8' });
const repoFiles = listed.status === 0 ? listed.stdout.split('\n').filter(Boolean) : filesIn(ROOT_DIR);
for (const file of repoFiles) {
  const full = path.join(ROOT_DIR, file);
  if (!fs.existsSync(full)) continue;
  const text = readText(full);
  if (text === undefined) continue;
  text.split('\n').forEach((line, index) => {
    for (const [kind, pattern] of SECRETS)
      if (pattern.test(line)) report(`${file}:${index + 1}`, `looks like ${kind}; remove it and revoke it`);
  });
}

// The private-data guard's patterns, if this machine has them. They are never in a repository.
const patternsFile =
  process.env.PRIVATE_DATA_PATTERNS_FILE ??
  path.join(os.homedir(), '.config', 'tinwright', 'private-data-patterns');
let guardNote = 'Private-data guard: skipped, no patterns on this machine (CI runs it on every change).';
if (process.env.PRIVATE_DATA_PATTERNS || fs.existsSync(patternsFile)) {
  const patterns = (process.env.PRIVATE_DATA_PATTERNS ?? fs.readFileSync(patternsFile, 'utf8'))
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .join('\n');
  const list = path.join(os.tmpdir(), `private-data-${process.pid}`);
  fs.writeFileSync(list, `${patterns}\n`, { mode: 0o600 });
  const grep = spawnSync('git', ['grep', '-I', '-n', '-i', '-E', '--untracked', '-f', list], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  fs.rmSync(list);
  // Only where it matched: the matching text is dropped, so the output is safe to share.
  for (const hit of grep.stdout.split('\n').filter(Boolean)) {
    const [file, line] = hit.split(':');
    report(`${file}:${line}`, 'matches a private-data pattern');
  }
  guardNote = 'Private-data guard: files checked (CI also checks the history).';
}

if (problems.length) {
  console.error(problems.map((problem) => `✗ ${problem}`).join('\n'));
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`✓ ${names.length} tool${names.length === 1 ? '' : 's'} checked, no secrets found.\n${guardNote}`);
