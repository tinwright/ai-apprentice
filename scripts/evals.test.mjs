// The eval history: reading traces, writing history lines, comparing them, and npm run eval and
// npm run rollup end to end. `claude` is the outside world here, so a stand-in plays it, writing
// output shaped like a real `claude plugin eval --json` run and its kept traces.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { alwaysOnTokens, historyLine, keptDir, readHistory, regressions, removeKept, traceMetrics } from './evals.mjs';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));

/** A trace like a real one: an init line, an assistant turn calling tools, and the result. */
const trace = ({ input = 2, output = 260, cacheRead = 5262, cacheWrite = 5102, thinking = 93, tools = ['Skill'] } = {}) =>
  [
    { type: 'system', subtype: 'init', model: 'claude-opus-5-5' },
    {
      type: 'assistant',
      message: {
        content: tools.map((name) => ({ type: 'tool_use', name, input: name === 'Skill' ? { skill: 'greet' } : {} })),
      },
    },
    {
      type: 'result',
      subtype: 'success',
      num_turns: 1,
      duration_api_ms: 4560,
      ttft_ms: 2896,
      usage: {
        input_tokens: input,
        output_tokens: output,
        cache_read_input_tokens: cacheRead,
        cache_creation_input_tokens: cacheWrite,
        output_tokens_details: { thinking_tokens: thinking },
      },
      modelUsage: { 'claude-opus-5-5': { inputTokens: input, outputTokens: output, thinkingTokens: thinking } },
      permission_denials: [],
      subagent_stats: { spawned: 0 },
    },
  ]
    .map((line) => JSON.stringify(line))
    .join('\n');

/** An agent run in the eval JSON. */
const agentRun = (/** @type {Partial<Record<string, any>>} */ fields) => ({
  score: 1,
  passed: true,
  turns: 1,
  costUsd: 0.05,
  judgeCostUsd: 0.0005,
  durationSeconds: 4,
  error: null,
  tracePath: null,
  graders: [],
  ...fields,
});

/** An eval JSON shaped like the one `claude plugin eval --json` writes. */
const evalRun = ({ score = 1, scoreWithout = 0, cost = 0.135, withTraces = [null, null] } = {}) => ({
  schemaVersion: 1,
  claudeVersion: '2.1.292',
  startedAt: '2026-10-19T21:42:31.675Z',
  durationSeconds: 22,
  costUsd: cost,
  partial: false,
  cases: [
    {
      name: 'says-hello',
      arms: {
        with: withTraces.map((tracePath) => agentRun({ score, tracePath })),
        without: [agentRun({ score: scoreWithout }), agentRun({ score: scoreWithout })],
      },
      aggregates: { score, passRate: score, scoreWithout, passRateWithout: scoreWithout, delta: score - scoreWithout },
    },
  ],
  aggregates: { casesTotal: 1, overallScore: score, overallPassRate: score, meanDelta: score - scoreWithout },
});

test('a trace gives its tokens, timing and the tools called, skills by name', () => {
  const metrics = traceMetrics(`${trace({ tools: ['Skill', 'Read', 'Read'] })}\nnot json\n`);
  assert.equal(metrics.inputTokens, 2);
  assert.equal(metrics.outputTokens, 260);
  assert.equal(metrics.cacheReadTokens, 5262);
  assert.equal(metrics.cacheWriteTokens, 5102);
  assert.equal(metrics.thinkingTokens, 93);
  assert.equal(metrics.ttftMs, 2896);
  assert.deepEqual(metrics.models, ['claude-opus-5-5']);
  assert.deepEqual(metrics.tools, { 'Skill(greet)': 1, Read: 2 });
});

test('a history line keeps numbers and case names, never prompts or paths', () => {
  const traces = { '/tmp/a/out/trace.jsonl': traceMetrics(trace()), '/tmp/b/out/trace.jsonl': traceMetrics(trace({ output: 100 })) };
  const run = evalRun({ withTraces: Object.keys(traces) });
  const line = historyLine(run, { traces, sha: 'abc1234', dirty: false, alwaysOnTokens: 120 });
  assert.equal(line.score, 1);
  assert.equal(line.delta, 1);
  assert.equal(line.alwaysOnTokens, 120);
  assert.deepEqual(line.models, ['claude-opus-5-5']);
  const hello = line.cases['says-hello'];
  assert.equal(hello.with.runs, 2);
  assert.equal(hello.with.outputTokens, 180);
  assert.deepEqual(hello.with.tools, { 'Skill(greet)': 1 });
  // The no-plugin arm had no traces, so its tokens are unknown rather than zero.
  assert.equal(hello.without?.inputTokens, null);
  assert.doesNotMatch(JSON.stringify(line), /\/tmp\//);
});

test('always-on tokens are read from plugin details, with k and m suffixes', () => {
  assert.equal(alwaysOnTokens('Projected token cost\n  Always-on:   ~0 tok   added to every session'), 0);
  assert.equal(alwaysOnTokens('Always-on: ~1.2k tok'), 1200);
  assert.equal(alwaysOnTokens('Always-on: 3,400 tok'), 3400);
  assert.equal(alwaysOnTokens('nothing here'), null);
});

test('regressions: lower scores, a smaller edge, and cost or tokens grown past the tolerance', () => {
  const traces = { '/tmp/a/out/trace.jsonl': traceMetrics(trace()) };
  const before = historyLine(evalRun({ withTraces: Object.keys(traces) }), { traces, alwaysOnTokens: 100 });
  assert.deepEqual(regressions(before, before), []);

  const heavier = { '/tmp/a/out/trace.jsonl': traceMetrics(trace({ cacheRead: 20000 })) };
  const after = historyLine(evalRun({ score: 0.5, cost: 0.3, withTraces: Object.keys(heavier) }), {
    traces: heavier,
    alwaysOnTokens: 400,
  });
  const found = regressions(before, after).join('\n');
  assert.match(found, /^score 1 → 0\.5$/m);
  assert.match(found, /edge over no plugin 1 → 0\.5/);
  assert.match(found, /says-hello: score 1 → 0\.5/);
  assert.match(found, /cost \$0\.135 → \$0\.3/);
  assert.match(found, /tokens per run/);
  assert.match(found, /always-on tokens 100 → 400/);
});

test('only a kept eval folder in the temporary folder is removed, sealed parts included', () => {
  const kept = fs.mkdtempSync(path.join(os.tmpdir(), 'e-'));
  fs.mkdirSync(path.join(kept, 'out'));
  fs.writeFileSync(path.join(kept, 'out', 'trace.jsonl'), trace());
  fs.mkdirSync(path.join(kept, 'sealed', 'home'), { recursive: true });
  fs.chmodSync(path.join(kept, 'sealed'), 0o000);
  fs.chmodSync(kept, 0o500);

  assert.equal(keptDir(path.join(kept, 'out', 'trace.jsonl')), kept);
  assert.equal(keptDir(path.join(SCRIPTS, 'e-abc', 'out', 'trace.jsonl')), undefined);
  removeKept(kept);
  assert.equal(fs.existsSync(kept), false);
});

/** A stand-in `claude`: `plugin eval` writes a run and kept traces, `plugin details` a token cost. */
const FAKE_CLAUDE = `
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const args = process.argv.slice(2);
if (args.includes('details')) { console.log('Projected token cost\\n  Always-on:   ~1.5k tok'); process.exit(0); }
const json = args[args.indexOf('--json') + 1];
const kept = fs.mkdtempSync(path.join(os.tmpdir(), 'e-'));
fs.mkdirSync(path.join(kept, 'out'));
const tracePath = path.join(kept, 'out', 'trace.jsonl');
fs.writeFileSync(tracePath, process.env.FAKE_TRACE);
const run = JSON.parse(process.env.FAKE_RUN);
for (const agentRun of run.cases[0].arms.with) agentRun.tracePath = tracePath;
fs.writeFileSync(json, JSON.stringify(run));
fs.writeFileSync(process.env.FAKE_ARGS, JSON.stringify(args));
`;

test('npm run eval records a run, cleans up its traces, and npm run rollup shows the trend', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-eval-test-'));
  const plugin = path.join(work, 'plugins', 'greeter');
  fs.mkdirSync(path.join(plugin, 'evals', 'says-hello'), { recursive: true });
  fs.writeFileSync(path.join(work, 'claude.mjs'), FAKE_CLAUDE);
  const env = {
    ...process.env,
    CLAUDE_BIN: `node ${path.join(work, 'claude.mjs')}`,
    FAKE_TRACE: trace(),
    FAKE_ARGS: path.join(work, 'args.json'),
  };

  const evaluate = (/** @type {object} */ run) =>
    spawnSync('node', [path.join(SCRIPTS, 'eval.mjs'), plugin, '--runs', '1'], {
      env: { ...env, FAKE_RUN: JSON.stringify(run) },
      encoding: 'utf8',
    });
  const first = evaluate(evalRun({ withTraces: [null] }));
  assert.equal(first.status, 0, first.stderr);
  const args = JSON.parse(fs.readFileSync(env.FAKE_ARGS, 'utf8'));
  assert.deepEqual(args.slice(0, 3), ['plugin', 'eval', plugin]);
  for (const arg of ['--keep-temp', '--no-publish', '--runs']) assert.ok(args.includes(arg), arg);

  const second = evaluate(evalRun({ score: 0.5, withTraces: [null] }));
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /↓ score 1 → 0\.5/);

  const history = readHistory(plugin);
  assert.equal(history.length, 2);
  assert.equal(history[0].alwaysOnTokens, 1500);
  assert.equal(history[0].cases['says-hello'].with.outputTokens, 260);
  // Every kept trace folder is gone.
  const leftovers = fs.readdirSync(os.tmpdir()).filter((entry) => {
    const trace = path.join(os.tmpdir(), entry, 'out', 'trace.jsonl');
    return entry.startsWith('e-') && fs.existsSync(trace) && fs.readFileSync(trace, 'utf8') === env.FAKE_TRACE;
  });
  assert.deepEqual(leftovers, []);

  const rollup = spawnSync('node', [path.join(SCRIPTS, 'rollup.mjs'), plugin, '--strict'], { encoding: 'utf8' });
  assert.equal(rollup.status, 1, 'a regression fails --strict');
  assert.match(rollup.stdout, /^greeter\s+2\s+0\.50\s+\+0\.50\s+50%/m);
  assert.match(rollup.stdout, /█▅/);
  assert.match(rollup.stdout, /↓ score 1 → 0\.5/);
  const rows = JSON.parse(spawnSync('node', [path.join(SCRIPTS, 'rollup.mjs'), plugin, '--json'], { encoding: 'utf8' }).stdout);
  assert.equal(rows[0].tokensPerRun, 10626);
  assert.equal(rows[0].alwaysOnTokens, 1500);

  fs.rmSync(work, { recursive: true, force: true });
});

test('npm run eval refuses the options it sets itself', () => {
  const run = spawnSync('node', [path.join(SCRIPTS, 'eval.mjs'), 'example', '--json', 'out.json'], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /sets --json itself/);
});
