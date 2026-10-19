#!/usr/bin/env node
// npm run rollup -- [plugin...] [--last <n>] [--json] [--strict]: every plugin's eval history in
// one place. For each plugin: its latest score, its edge over no plugin, cost, tokens and always-on
// tokens, a trend of its last runs, and what got worse since the run before. --strict exits 1 when
// anything did, for CI; --json prints the same as data.

import path from 'node:path';
import { parseArgs } from 'node:util';
import { readHistory, regressions, tokensPerRun } from './evals.mjs';
import { ITEMS_DIR, itemNames } from './workshop.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    last: { type: 'string', default: '10' },
    json: { type: 'boolean', default: false },
    strict: { type: 'boolean', default: false },
  },
});
const last = Math.max(1, Number(values.last) || 10);

// Plugin names, or paths to plugin folders.
const dirs = (positionals.length ? positionals : itemNames()).map((target) =>
  target.includes(path.sep) ? path.resolve(target) : path.join(ITEMS_DIR, target),
);
const rows = dirs.flatMap((dir) => {
  const name = path.basename(dir);
  const history = readHistory(dir);
  if (history.length === 0) return [];
  const latest = /** @type {import('./evals.mjs').HistoryLine} */ (history.at(-1));
  const previous = history.at(-2);
  return [
    {
      plugin: name,
      runs: history.length,
      at: latest.at,
      sha: latest.sha,
      dirty: latest.dirty,
      claude: latest.claude,
      models: latest.models,
      score: latest.score,
      passRate: latest.passRate,
      delta: latest.delta,
      costUsd: latest.costUsd,
      tokensPerRun: tokensPerRun(latest),
      alwaysOnTokens: latest.alwaysOnTokens,
      trend: history.slice(-last).map((line) => line.score),
      regressions: previous ? regressions(previous, latest) : [],
    },
  ];
});

if (values.json) console.log(JSON.stringify(rows, null, 2));
else if (rows.length === 0) console.log('No eval history yet. Run npm run eval -- <plugin> to start one.');
else {
  const SPARKS = '▁▂▃▄▅▆▇█';
  const spark = (/** @type {number[]} */ scores) =>
    scores.map((score) => SPARKS[Math.min(SPARKS.length - 1, Math.max(0, Math.round(score * (SPARKS.length - 1))))]).join('');
  const show = (/** @type {number | null} */ value, /** @type {(value: number) => string} */ format) =>
    value === null ? '–' : format(value);
  const signed = (/** @type {number} */ value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
  const table = [
    ['Plugin', 'Runs', 'Score', 'Edge', 'Pass', 'Cost', 'Tokens/run', 'Always-on', 'Trend', 'Commit'],
    ...rows.map((row) => [
      row.plugin,
      String(row.runs),
      row.score.toFixed(2),
      show(row.delta, signed),
      `${Math.round(row.passRate * 100)}%`,
      `$${row.costUsd.toFixed(2)}`,
      show(row.tokensPerRun, (tokens) => tokens.toLocaleString('en')),
      show(row.alwaysOnTokens, (tokens) => tokens.toLocaleString('en')),
      spark(row.trend),
      `${row.sha ?? '–'}${row.dirty ? '*' : ''}`,
    ]),
  ];
  const widths = table[0].map((_, column) => Math.max(...table.map((cells) => cells[column].length)));
  for (const cells of table) console.log(cells.map((cell, column) => cell.padEnd(widths[column])).join('  ').trimEnd());
  console.log('\nEdge: score with the plugin minus without it. * : uncommitted changes when it ran.');
  for (const row of rows.filter((row) => row.regressions.length)) {
    console.log(`\n${row.plugin}, since the run before:`);
    for (const regression of row.regressions) console.log(`  ↓ ${regression}`);
  }
}
if (values.strict && rows.some((row) => row.regressions.length)) process.exit(1);
