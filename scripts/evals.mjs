// What eval.mjs and rollup.mjs share: turning a `claude plugin eval --json` run and its traces into
// one line of a plugin's evals/history.jsonl, and comparing those lines. A history line holds
// numbers and case names only, never prompts, answers or paths, so it's safe to commit.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The file, under a plugin's evals/, that keeps one line per eval run. */
export const HISTORY_FILE = 'history.jsonl';

/**
 * What one agent run cost and did, read from its trace.
 * @typedef {{
 *   inputTokens: number, outputTokens: number, cacheReadTokens: number, cacheWriteTokens: number,
 *   thinkingTokens: number, apiMs: number, ttftMs: number | null, models: string[],
 *   tools: Record<string, number>, permissionDenials: number, subagents: number,
 * }} TraceMetrics
 */

/**
 * The means, over one arm's runs, of what eval.mjs tracks per run.
 * @typedef {{
 *   runs: number, errors: number, turns: number, seconds: number, costUsd: number, judgeCostUsd: number,
 *   inputTokens: number | null, outputTokens: number | null, cacheReadTokens: number | null,
 *   cacheWriteTokens: number | null, thinkingTokens: number | null, ttftMs: number | null,
 *   tools: Record<string, number>,
 * }} ArmSummary
 */

/**
 * @typedef {{
 *   score: number, passRate: number, scoreWithout: number | null, passRateWithout: number | null,
 *   delta: number | null, with: ArmSummary, without: ArmSummary | null,
 * }} CaseSummary
 */

/**
 * One line of history.jsonl.
 * @typedef {{
 *   at: string, sha: string | null, dirty: boolean, claude: string, models: string[], judge: string,
 *   partial: boolean, seconds: number, costUsd: number, alwaysOnTokens: number | null,
 *   score: number, passRate: number, delta: number | null, cases: Record<string, CaseSummary>,
 * }} HistoryLine
 */

/**
 * The metrics in a trace.jsonl: its final `result` line's usage, and every tool the agent called.
 * @param {string} text
 * @returns {TraceMetrics}
 */
export function traceMetrics(text) {
  /** @type {any[]} */
  const lines = text
    .split('\n')
    .filter((line) => line.trim())
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
  /** @type {Record<string, number>} */
  const tools = {};
  for (const line of lines)
    if (line.type === 'assistant' && Array.isArray(line.message?.content))
      for (const block of line.message.content)
        if (block?.type === 'tool_use') {
          // A skill counts under its own name, so the history shows which skill fired.
          const name = block.name === 'Skill' && block.input?.skill ? `Skill(${block.input.skill})` : block.name;
          tools[name] = (tools[name] ?? 0) + 1;
        }

  const result = lines.findLast((line) => line.type === 'result') ?? {};
  const usage = result.usage ?? {};
  const modelUsage = Object.entries(result.modelUsage ?? {});
  const sum = (/** @type {string} */ key) => modelUsage.reduce((total, [, model]) => total + (model?.[key] ?? 0), 0);
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    thinkingTokens: usage.output_tokens_details?.thinking_tokens ?? sum('thinkingTokens'),
    apiMs: result.duration_api_ms ?? 0,
    ttftMs: result.ttft_ms ?? null,
    models: modelUsage.map(([model]) => model),
    tools,
    permissionDenials: result.permission_denials?.length ?? 0,
    subagents: result.subagent_stats?.spawned ?? 0,
  };
}

const mean = (/** @type {number[]} */ values) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
const round = (/** @type {number} */ value, digits = 4) => Number(value.toFixed(digits));

/**
 * One arm's runs, as means. Token fields are null when no trace could be read.
 * @param {any[]} runs  an arm from the eval JSON
 * @param {(TraceMetrics | undefined)[]} traces  each run's trace metrics, in the same order
 * @returns {ArmSummary}
 */
export function summarizeArm(runs, traces) {
  const read = /** @type {TraceMetrics[]} */ (traces.filter(Boolean));
  const tokens = (/** @type {keyof TraceMetrics} */ key) =>
    read.length ? round(mean(read.map((trace) => /** @type {number} */ (trace[key]))), 1) : null;
  const ttfts = read.map((trace) => trace.ttftMs).filter((ms) => ms !== null);
  /** @type {Record<string, number>} */
  const tools = {};
  for (const trace of read)
    for (const [name, count] of Object.entries(trace.tools)) tools[name] = (tools[name] ?? 0) + count;
  for (const name of Object.keys(tools)) tools[name] = round(tools[name] / read.length, 2);
  return {
    runs: runs.length,
    errors: runs.filter((run) => run.error).length,
    turns: round(mean(runs.map((run) => run.turns ?? 0)), 2),
    seconds: round(mean(runs.map((run) => run.durationSeconds ?? 0)), 1),
    costUsd: round(mean(runs.map((run) => run.costUsd ?? 0))),
    judgeCostUsd: round(mean(runs.map((run) => run.judgeCostUsd ?? 0))),
    inputTokens: tokens('inputTokens'),
    outputTokens: tokens('outputTokens'),
    cacheReadTokens: tokens('cacheReadTokens'),
    cacheWriteTokens: tokens('cacheWriteTokens'),
    thinkingTokens: tokens('thinkingTokens'),
    ttftMs: ttfts.length ? Math.round(mean(/** @type {number[]} */ (ttfts))) : null,
    tools,
  };
}

/**
 * A `claude plugin eval --json` run as one history line.
 * @param {any} run  the parsed --json output
 * @param {{
 *   traces?: Record<string, TraceMetrics | undefined>,
 *   sha?: string | null, dirty?: boolean, judge?: string, alwaysOnTokens?: number | null,
 * }} [extra]  traces keyed by tracePath, and what the eval JSON doesn't say
 * @returns {HistoryLine}
 */
export function historyLine(run, extra = {}) {
  const traces = extra.traces ?? {};
  const traceOf = (/** @type {any} */ agentRun) => (agentRun.tracePath ? traces[agentRun.tracePath] : undefined);
  /** @type {Set<string>} */
  const models = new Set();
  /** @type {Record<string, CaseSummary>} */
  const cases = {};
  for (const evalCase of run.cases ?? []) {
    const withRuns = evalCase.arms?.with ?? [];
    const withoutRuns = evalCase.arms?.without ?? [];
    for (const agentRun of withRuns) for (const model of traceOf(agentRun)?.models ?? []) models.add(model);
    const aggregates = evalCase.aggregates ?? {};
    cases[evalCase.name] = {
      score: aggregates.score ?? 0,
      passRate: aggregates.passRate ?? 0,
      scoreWithout: aggregates.scoreWithout ?? null,
      passRateWithout: aggregates.passRateWithout ?? null,
      delta: aggregates.delta ?? null,
      with: summarizeArm(withRuns, withRuns.map(traceOf)),
      without: withoutRuns.length ? summarizeArm(withoutRuns, withoutRuns.map(traceOf)) : null,
    };
  }
  const aggregates = run.aggregates ?? {};
  return {
    at: run.startedAt,
    sha: extra.sha ?? null,
    dirty: extra.dirty ?? false,
    claude: run.claudeVersion,
    models: [...models].sort(),
    judge: extra.judge ?? 'haiku',
    partial: Boolean(run.partial),
    seconds: run.durationSeconds ?? 0,
    costUsd: round(run.costUsd ?? 0),
    alwaysOnTokens: extra.alwaysOnTokens ?? null,
    score: aggregates.overallScore ?? 0,
    passRate: aggregates.overallPassRate ?? 0,
    delta: aggregates.meanDelta ?? null,
    cases,
  };
}

/**
 * The always-on token cost in `claude plugin details` output (`Always-on:   ~1.2k tok`).
 * @param {string} text
 */
export function alwaysOnTokens(text) {
  const match = /Always-on:\s*~?([\d.,]+)\s*([km]?)\s*tok/i.exec(text);
  if (!match) return null;
  const scale = { '': 1, k: 1_000, m: 1_000_000 }[match[2].toLowerCase()] ?? 1;
  return Math.round(Number(match[1].replaceAll(',', '')) * scale);
}

/**
 * A plugin's history, oldest first. Lines that don't parse are skipped.
 * @param {string} pluginDir
 * @returns {HistoryLine[]}
 */
export function readHistory(pluginDir) {
  const file = path.join(pluginDir, 'evals', HISTORY_FILE);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

/** @param {string} pluginDir @param {HistoryLine} line */
export function appendHistory(pluginDir, line) {
  const file = path.join(pluginDir, 'evals', HISTORY_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(line)}\n`);
}

/** How far a number may move before the rollup calls it a regression. */
export const TOLERANCES = { score: 0.1, growth: 0.2 };

/** A run's tokens per agent run with the plugin: input, cache and output, averaged over its cases. */
export function tokensPerRun(/** @type {HistoryLine} */ line) {
  const arms = Object.values(line.cases).map((evalCase) => evalCase.with);
  const totals = arms
    .filter((arm) => arm.inputTokens !== null)
    .map(
      (arm) =>
        /** @type {number} */ (arm.inputTokens) +
        /** @type {number} */ (arm.cacheReadTokens) +
        /** @type {number} */ (arm.cacheWriteTokens) +
        /** @type {number} */ (arm.outputTokens),
    );
  return totals.length ? Math.round(mean(totals)) : null;
}

/**
 * What got worse from `before` to `after`: scores that fell, the plugin's edge over no plugin that
 * shrank, and cost, tokens or always-on tokens that grew past the tolerance.
 * @param {HistoryLine} before
 * @param {HistoryLine} after
 * @param {typeof TOLERANCES} [tolerances]
 * @returns {string[]}
 */
export function regressions(before, after, tolerances = TOLERANCES) {
  /** @type {string[]} */
  const found = [];
  const fell = (/** @type {number | null} */ from, /** @type {number | null} */ to) =>
    from !== null && to !== null && from - to >= tolerances.score;
  const grew = (/** @type {number | null} */ from, /** @type {number | null} */ to) =>
    from !== null && to !== null && from > 0 && (to - from) / from > tolerances.growth;
  const pct = (/** @type {number} */ from, /** @type {number} */ to) => `+${Math.round(((to - from) / from) * 100)}%`;

  if (fell(before.score, after.score)) found.push(`score ${before.score} → ${after.score}`);
  if (fell(before.delta, after.delta)) found.push(`edge over no plugin ${before.delta} → ${after.delta}`);
  for (const [name, now] of Object.entries(after.cases)) {
    const then = before.cases[name];
    if (!then) continue;
    if (fell(then.score, now.score)) found.push(`${name}: score ${then.score} → ${now.score}`);
    if (now.with.errors > then.with.errors) found.push(`${name}: ${now.with.errors} run error(s)`);
  }
  if (grew(before.costUsd, after.costUsd))
    found.push(`cost $${before.costUsd} → $${after.costUsd} (${pct(before.costUsd, after.costUsd)})`);
  const [tokensBefore, tokensAfter] = [tokensPerRun(before), tokensPerRun(after)];
  if (grew(tokensBefore, tokensAfter))
    found.push(
      `tokens per run ${tokensBefore} → ${tokensAfter} (${pct(/** @type {number} */ (tokensBefore), /** @type {number} */ (tokensAfter))})`,
    );
  if (grew(before.alwaysOnTokens, after.alwaysOnTokens))
    found.push(`always-on tokens ${before.alwaysOnTokens} → ${after.alwaysOnTokens}`);
  return found;
}

/**
 * The folder `claude plugin eval --keep-temp` kept for a trace, if it's one of its own: a
 * `<tmp>/e-XXXX` folder directly under the system's temporary folder. Anything else is left alone.
 * @param {string} tracePath  `<tmp>/e-XXXX/out/trace.jsonl`
 */
export function keptDir(tracePath) {
  const dir = path.dirname(path.dirname(tracePath));
  if (!/^e-[A-Za-z0-9]+$/.test(path.basename(dir))) return undefined;
  const temps = new Set(['/tmp', os.tmpdir()].map((temp) => fs.realpathSync(temp)));
  return temps.has(fs.realpathSync(path.dirname(dir))) ? dir : undefined;
}

/**
 * Deletes a kept eval folder. Its sealed parts are mode 000 and the rest read-only, so each folder
 * is opened up before it's read. Symbolic links are removed, never followed.
 * @param {string} dir
 */
export function removeKept(dir) {
  const open = (/** @type {string} */ folder) => {
    fs.chmodSync(folder, 0o700);
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }))
      if (entry.isDirectory() && !entry.isSymbolicLink()) open(path.join(folder, entry.name));
  };
  open(dir);
  fs.rmSync(dir, { recursive: true, force: true });
}
