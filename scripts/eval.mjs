#!/usr/bin/env node
// npm run eval -- [plugin...] [claude plugin eval options]: runs each plugin's evals/ with
// `claude plugin eval`, then adds a line to its evals/history.jsonl: the run's scores and cost, the
// tokens and tools from each agent run's trace, the always-on token cost, and the commit it ran on.
// With no plugin named, it runs every plugin that has an evals/ folder. Options it doesn't know go
// to `claude plugin eval` (--runs 1, --case <glob>, --model sonnet...). The report stays local
// unless --publish-report is passed. `npm run rollup` shows the trends.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendHistory, alwaysOnTokens, historyLine, keptDir, readHistory, regressions, removeKept, traceMetrics } from './evals.mjs';
import { claudeCommand } from './rules.mjs';
import { ITEMS_DIR, ROOT_DIR, itemNames } from './workshop.mjs';

const args = process.argv.slice(2);
// Plugin names (or paths to plugin folders) come first; the rest is for claude plugin eval.
const firstOption = args.findIndex((arg) => arg.startsWith('-'));
const targets = firstOption === -1 ? args : args.slice(0, firstOption);
const passThrough = firstOption === -1 ? [] : args.slice(firstOption);
for (const own of ['--json', '--keep-temp'])
  if (passThrough.includes(own)) {
    console.error(`npm run eval sets ${own} itself; leave it out.`);
    process.exit(2);
  }

const hasEvals = (/** @type {string} */ dir) => fs.existsSync(path.join(dir, 'evals'));
const dirs = targets.length
  ? targets.map((target) => (target.includes(path.sep) ? path.resolve(target) : path.join(ITEMS_DIR, target)))
  : itemNames()
      .map((name) => path.join(ITEMS_DIR, name))
      .filter(hasEvals);
if (dirs.length === 0) {
  console.error('No plugin has an evals/ folder yet. Add one with: cd plugins/<name> && claude plugin eval init');
  process.exit(2);
}

const [command, ...commandArgs] = claudeCommand();
const optionValue = (/** @type {string} */ name) => {
  const index = passThrough.indexOf(name);
  return index === -1 ? undefined : passThrough[index + 1];
};
const git = (/** @type {string[]} */ gitArgs, /** @type {string} */ cwd) => {
  const run = spawnSync('git', gitArgs, { cwd, encoding: 'utf8' });
  return run.status === 0 ? run.stdout.trim() : undefined;
};

let failed = false;
for (const dir of dirs) {
  const name = path.basename(dir);
  if (!hasEvals(dir)) {
    console.error(`${name}: no evals/ folder. Add one with: cd ${path.relative(process.cwd(), dir) || '.'} && claude plugin eval init`);
    failed = true;
    continue;
  }
  console.log(`\n${name}`);

  // The commit, and whether the plugin had uncommitted changes (its history file aside).
  const sha = git(['rev-parse', '--short', 'HEAD'], dir) ?? null;
  const changes = git(['status', '--porcelain', '--', '.', `:!evals/history.jsonl`], dir);
  const dirty = changes === undefined ? false : changes.length > 0;

  const jsonFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-eval-')), 'run.json');
  const publish = passThrough.includes('--publish-report') ? [] : ['--no-publish'];
  const run = spawnSync(
    command,
    [...commandArgs, 'plugin', 'eval', dir, '--keep-temp', '--json', jsonFile, ...publish, ...passThrough],
    { cwd: ROOT_DIR, stdio: ['inherit', 'inherit', 'inherit'] },
  );
  if (run.error) {
    console.error(`Can't run ${command}: install Claude Code, or set CLAUDE_BIN.`);
    process.exit(1);
  }
  if (!fs.existsSync(jsonFile)) {
    console.error(`${name}: the eval didn't finish, so nothing was recorded.`);
    failed = true;
    continue;
  }
  const result = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  fs.rmSync(path.dirname(jsonFile), { recursive: true, force: true });

  // Each agent run's trace, read for its tokens and tools, then its kept folder deleted.
  /** @type {Record<string, ReturnType<typeof traceMetrics>>} */
  const traces = {};
  for (const evalCase of result.cases ?? [])
    for (const agentRun of [...(evalCase.arms?.with ?? []), ...(evalCase.arms?.without ?? [])]) {
      const tracePath = agentRun.tracePath;
      if (!tracePath) continue;
      if (fs.existsSync(tracePath)) traces[tracePath] = traceMetrics(fs.readFileSync(tracePath, 'utf8'));
      const kept = fs.existsSync(tracePath) ? keptDir(tracePath) : undefined;
      if (kept) removeKept(kept);
    }

  const details = spawnSync(command, [...commandArgs, '--plugin-dir', dir, 'plugin', 'details', name], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  const before = readHistory(dir).at(-1);
  const line = historyLine(result, {
    traces,
    sha,
    dirty,
    judge: optionValue('--judge-model'),
    alwaysOnTokens: details.status === 0 ? alwaysOnTokens(details.stdout) : null,
  });
  appendHistory(dir, line);
  console.log(`Recorded in ${path.relative(process.cwd(), path.join(dir, 'evals', 'history.jsonl'))}.`);
  for (const regression of before ? regressions(before, line) : []) console.log(`  ↓ ${regression}`);
  if (run.status !== 0) failed = true;
}
if (failed) process.exit(1);
