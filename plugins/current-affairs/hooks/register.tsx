import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderNode } from 'claude-code'

import type { LiveUsage, TicketTitle, TrendMetric, WorkSession } from '../types'
import {
  configureClassify,
  ago,
  sectionSessions,
  themeOf,
  type Group,
  repoFromGitDir,
  repoFromPath,
  slugFromRemote,
  toSession,
  type Summary,
} from './classify'
import { closingIssue, computeTrends, direction, MIN_BASELINE_DAYS, mergeHistory, type History, type MergedPr } from './trends'
import { pool } from './pool'
import { isFinished, issueViewArgs, parseIssue, staleRefs, titleOf, type TitleConfig } from './titles'
import { axis, axisSvg, buildTimeline, dailyBars, dailySvg, dayHours, DAYS, formatHours, hoursSvg, laneRuns, laneSvg, pickCellsPerDay, recentTotals, TIMELINE_PX, EXPLORATION_COLOR, type Totals } from './timeline'
import { contextWarning, levelColor, meter, tokens, usageRows } from './usage'
import { costOf, formatUsd } from './pricing'
import { summarize } from './summarize'

const PANE = 'current-affairs'
const TIMELINE = 'current-affairs-timeline'
const WINDOW_DAYS = 14
// Scanned further back than shown, so the trends baseline fills from what transcripts remain.
const SCAN_DAYS = 56
const PRS_STALE_MS = 30 * 60_000

const TREND_ROWS: {
  key: 'prsMerged' | 'cycleDays' | 'reworkShare' | 'ticketsPerDay'
  label: string
  isHigherBetter: boolean
  format: (n: number) => string
}[] = [
  { key: 'prsMerged', label: 'PRs merged', isHigherBetter: true, format: n => (Number.isInteger(n) ? String(n) : n.toFixed(1)) },
  { key: 'cycleDays', label: 'Median cycle', isHigherBetter: false, format: n => `${n.toFixed(1)}d` },
  { key: 'reworkShare', label: 'Rework share', isHigherBetter: false, format: n => `${Math.round(n * 100)}%` },
  // Fewer issues and branches a day means fewer context switches.
  { key: 'ticketsPerDay', label: 'Items / day', isHigherBetter: false, format: n => n.toFixed(1) },
]
const RESCAN_MS = 5 * 60_000
// The most one $.fs.read takes: 4 MiB.
const READ_LIMIT = 4 * 1024 * 1024
const METER_PX = 120

// A rounded meter for surfaces that draw SVG: green, then amber past 70%, red past 90%, as levelColor.
function meterSvg(percent: number): string {
  const fill = Math.round((Math.min(100, Math.max(0, percent)) / 100) * METER_PX)
  const color = percent >= 90 ? '#e5534b' : percent >= 70 ? '#d29922' : '#3fb950'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${METER_PX}" height="8" viewBox="0 0 ${METER_PX} 8">`
    + `<rect width="${METER_PX}" height="8" rx="4" fill="#8b949e" fill-opacity="0.25"/>`
    + (fill > 0 ? `<rect width="${Math.max(8, fill)}" height="8" rx="4" fill="${color}"/>` : '')
    + '</svg>'
}
const PARALLEL = 6

const sessions = atom({ plugin: 'current-affairs', key: 'sessions' } as const, [])
const scannedAt = atom({ plugin: 'current-affairs', key: 'scannedAtMs' } as const, 0)
const scanning = atom({ plugin: 'current-affairs', key: 'isScanning' } as const, false)
const toggled = atom({ plugin: 'current-affairs', key: 'toggled' } as const, [])
const titles = atom({ plugin: 'current-affairs', key: 'titles' } as const, {})
const tzOffset = atom({ plugin: 'current-affairs', key: 'tzOffsetMin' } as const, 0)
const trends = atom({ plugin: 'current-affairs', key: 'trends' } as const, null)
const usage = atom({ plugin: 'current-affairs', key: 'usage' } as const, null)
const lastTurn = atom({ plugin: 'current-affairs', key: 'lastTurn' } as const, null)
const contextWarned = atom({ plugin: 'current-affairs', key: 'contextWarned' } as const, 0)
const hidden = atom({ plugin: 'current-affairs', key: 'hidden' } as const, {})
const showHidden = atom({ plugin: 'current-affairs', key: 'showHidden' } as const, false)
const unreadSessions = atom({ plugin: 'current-affairs', key: 'unreadSessions' } as const, 0)

type Cached = { mtimeMs: number; size: number; summary: Summary }

// What the person set in the plugin's options (see register below).
let titleConfig: TitleConfig = { source: 'github' }

async function mergedPrs($: EngineInterface, nowMs: number): Promise<MergedPr[]> {
  const saved = (await $.store.get('prs')) as { fetchedMs: number; prs: MergedPr[] } | undefined
  if (saved && nowMs - saved.fetchedMs < PRS_STALE_MS) return saved.prs
  const from = new Date(nowMs - SCAN_DAYS * 86_400_000).toISOString().slice(0, 10)
  const run = await $.process
    .run(['gh', 'search', 'prs', '--author=@me', '--merged', `--merged-at=>=${from}`, '--limit', '1000', '--json', 'number,repository,title,body,closedAt'], { timeoutMs: 60_000 })
    .catch(() => undefined)
  if (!run || run.exitCode !== 0) return saved?.prs ?? []
  try {
    const rows = JSON.parse(run.stdout) as { number: number; title: string; body?: string; closedAt: string; repository: { name: string } }[]
    const prs = rows.map(row => ({
      repo: row.repository.name,
      number: row.number,
      title: row.title,
      issue: closingIssue(row.body ?? ''),
      mergedMs: Date.parse(row.closedAt),
    }))
    await $.store.set('prs', { fetchedMs: nowMs, prs })
    return prs
  } catch {
    return saved?.prs ?? []
  }
}

async function refreshTrends($: EngineInterface, list: WorkSession[], nowMs: number, tzMinutes: number) {
  const history = mergeHistory((await $.store.get('history')) as History | undefined, list, tzMinutes, nowMs)
  await $.store.set('history', history)
  const prs = await mergedPrs($, nowMs)
  await $.state.set({ plugin: 'current-affairs', key: 'trends' }, computeTrends(history, prs, list, nowMs, tzMinutes))
}

// Each stale issue's title and status through gh, cached so a scan asks again only after six hours.
async function refreshTitles($: EngineInterface, list: WorkSession[], nowMs: number) {
  if (titleConfig.source !== 'github') return undefined
  const cache = ((await $.store.get('titles')) ?? {}) as Record<string, TicketTitle>
  const stale = staleRefs(list, cache, nowMs)
  if (stale.length === 0) return undefined
  // Without the read:project scope, gh refuses projectItems: ask once, then go on without it.
  let withProjects = true
  await pool(stale, 4, async ref => {
    let run = await $.process.run(issueViewArgs(ref, withProjects), { timeoutMs: 30_000 }).catch(() => undefined)
    if (run && run.exitCode !== 0 && withProjects && /scope|projectItems/i.test(run.stderr)) {
      withProjects = false
      run = await $.process.run(issueViewArgs(ref, false), { timeoutMs: 30_000 }).catch(() => undefined)
    }
    const found = run && run.exitCode === 0 ? parseIssue(run.stdout) : undefined
    // An issue gh can't find is cached empty, so it is not asked again every scan.
    cache[ref] = { summary: found?.summary ?? '', status: found?.status, fetchedMs: nowMs }
  })
  await $.store.set('titles', cache)
  return cache
}

// What usage.ts draws from $.session.usage() or a session.measure: the figures, without the breakdown.
const toLiveUsage = (u: { context: LiveUsage['context']; rateLimits: LiveUsage['rateLimits']; cost?: { usd: number } }): LiveUsage => ({
  context: { tokens: u.context.tokens, window: u.context.window, percent: u.context.percent },
  rateLimits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
  costUsd: u.cost?.usd,
})

// The session's cost when the running turn began; a reload mid-turn loses it, and that turn's cost.
let turnStartUsd: number | undefined

// A module variable, not state: a reload drops an in-flight scan, and this with it.
let isScanInFlight = false

async function scan($: EngineInterface) {
  if (isScanInFlight) return
  isScanInFlight = true
  await $.state.set({ plugin: 'current-affairs', key: 'isScanning' }, true)
  try {
    const home = (await $.env.get('HOME')) ?? ''
    const root = `${home}/.claude/projects`
    const nowMs = await $.clock.now()
    const since = nowMs - SCAN_DAYS * 86_400_000

    const dirs = (await $.fs.list(root)).filter((entry) => entry.kind === 'dir')
    const transcripts = (folder: string) =>
      $.fs.list(folder).then(
        entries =>
          entries
            .filter((entry) => entry.kind === 'file' && entry.name.endsWith('.jsonl') && entry.mtimeMs >= since)
            .map((entry) => ({
              id: entry.name.replace(/\.jsonl$/, ''),
              path: `${folder}/${entry.name}`,
              mtimeMs: entry.mtimeMs,
              size: entry.size,
            })),
        () => [],
      )
    const files = (await pool(dirs, PARALLEL, dir => transcripts(`${root}/${dir.name}`))).flat()
    // A session's subagents write their own transcripts, in <session id>/subagents/, read for their cost.
    const subagentFiles = (
      await pool(files, PARALLEL, async file =>
        (await transcripts(`${file.path.replace(/\.jsonl$/, '')}/subagents`)).map(sub => ({ ...sub, parent: file.id })),
      )
    ).flat()

    const cache = ((await $.store.get('summaries.v5')) ?? {}) as Record<string, Cached>
    const fresh: Record<string, Cached> = {}
    const jq = `${$.plugin.root}/hooks/summarize.jq`
    // Transcripts up to what one $.fs.read takes are summarized here; longer ones need jq, and are
    // counted when it's missing so the pane can say so.
    let unread = 0
    await pool([...files, ...subagentFiles], PARALLEL, async file => {
      const hit = cache[file.path]
      if (hit && hit.mtimeMs === file.mtimeMs && hit.size === file.size) {
        fresh[file.path] = hit
        return
      }
      if (file.size <= READ_LIMIT) {
        const text = await $.fs.read(file.path).catch(() => undefined)
        if (text !== undefined) fresh[file.path] = { mtimeMs: file.mtimeMs, size: file.size, summary: summarize(text) }
        return
      }
      const run = await $.process.run(['jq', '-Rnc', '-f', jq, file.path], { timeoutMs: 60_000 }).catch(() => undefined)
      if (!run || run.exitCode !== 0) {
        if (!('parent' in file)) unread += 1
        return
      }
      try {
        fresh[file.path] = { mtimeMs: file.mtimeMs, size: file.size, summary: JSON.parse(run.stdout) }
      } catch {}
    })
    await $.state.set({ plugin: 'current-affairs', key: 'unreadSessions' }, unread)
    await $.store.set('summaries.v5', fresh)
    void $.store.delete('summaries.v4')

    const zone = await $.process.run(['date', '+%z']).catch(() => undefined)
    const offset = zone?.stdout.trim().match(/^([+-])(\d\d)(\d\d)$/)
    let tzMinutes = await read($, tzOffset)
    if (offset) {
      const minutes = (offset[1] === '-' ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3]))
      tzMinutes = minutes
      await $.state.set({ plugin: 'current-affairs', key: 'tzOffsetMin' }, minutes)
    }

    const cwds = [...new Set(Object.values(fresh).map(c => c.summary.cwd).filter(Boolean))] as string[]
    const repoByCwd = new Map<string, string | undefined>()
    const slugByCwd = new Map<string, string | undefined>()
    await pool(cwds, PARALLEL, async cwd => {
      const remote = await $.process.run(['git', '-C', cwd, 'remote', 'get-url', 'origin']).catch(() => undefined)
      if (remote && remote.exitCode === 0) slugByCwd.set(cwd, slugFromRemote(remote.stdout))
      const git = await $.process
        .run(['git', '-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'])
        .catch(() => undefined)
      const repo =
        git && git.exitCode === 0
          ? repoFromGitDir(git.stdout.trim(), home)
          : repoFromPath(cwd, home)
      repoByCwd.set(cwd, repo)
    })

    const subagentUsd = new Map<string, number>()
    for (const sub of subagentFiles) {
      const usd = costOf(fresh[sub.path]?.summary.tokens)
      if (usd) subagentUsd.set(sub.parent, (subagentUsd.get(sub.parent) ?? 0) + usd)
    }
    const list: WorkSession[] = []
    for (const file of files) {
      const cached = fresh[file.path]
      if (!cached) continue
      const cwd = cached.summary.cwd ?? ''
      const session = toSession(file.id, cached.summary, repoByCwd.get(cwd), slugByCwd.get(cwd))
      if (!session) continue
      const usd = (session.costUsd ?? 0) + (subagentUsd.get(file.id) ?? 0)
      list.push(usd ? { ...session, costUsd: usd } : session)
    }
    await $.state.set({ plugin: 'current-affairs', key: 'sessions' }, list)
    await $.state.set({ plugin: 'current-affairs', key: 'scannedAtMs' }, nowMs)
    await refreshTrends($, list, nowMs, tzMinutes).catch(() => undefined)
    const found = await refreshTitles($, list, nowMs).catch(() => undefined)
    if (found) await $.state.set({ plugin: 'current-affairs', key: 'titles' }, found)
  } finally {
    isScanInFlight = false
    await $.state.set({ plugin: 'current-affairs', key: 'isScanning' }, false)
  }
}

/** A comma-separated option as a list, e.g. "main, trunk" → ['main', 'trunk']. */
const listOption = (value: unknown) =>
  (Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(',') : [])
    .map(item => item.trim())
    .filter(Boolean)

export const register: Register = (on, options) => {
  titleConfig = { source: typeof options.titles === 'string' ? options.titles : 'github' }
  const warnAt = typeof options.context_warning === 'number' ? options.context_warning : 80
  configureClassify({
    ...(listOption(options.default_branches).length
      ? { defaultBranches: listOption(options.default_branches) }
      : {}),
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'work',
      description: 'Show recent sessions across all projects, by repo and issue or branch',
    })
    await $.state.set({ plugin: 'current-affairs', key: 'titles' }, ((await $.store.get('titles')) ?? {}) as Record<string, TicketTitle>)
    await $.state.set({ plugin: 'current-affairs', key: 'hidden' }, ((await $.store.get('hidden')) ?? {}) as Record<string, number | false>)
    void $.ui.open({ id: PANE, title: 'Recent work' })
    await $.state.set({ plugin: 'current-affairs', key: 'isScanning' }, false)
    void scan($)
    await $.command.register({
      name: 'timeline',
      description: 'Show the last week of work as lanes per issue or branch, with two-week trends',
    })
    $.clock.every(RESCAN_MS, () => void scan($))
    const now = await $.session.usage().catch(() => undefined)
    if (now) await $.state.set({ plugin: 'current-affairs', key: 'usage' }, toLiveUsage(now))

    return next(e)
  })

  // Pushed after each turn and when a rate-limit window moves a point, so the pane never polls.
  on('session.measure', async ($, e, next) => {
    await $.state.set({ plugin: 'current-affairs', key: 'usage' }, toLiveUsage(e))
    const warned = await read($, contextWarned)
    const warning = contextWarning(e.context.percent, warnAt, warned)
    if (warning.level !== warned) await $.state.set({ plugin: 'current-affairs', key: 'contextWarned' }, warning.level)
    if (warning.text) await $.ui.toast(warning.text)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    turnStartUsd = (await $.session.usage().catch(() => undefined))?.cost?.usd
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // A subagent's runs are turns too; their cost is counted in the main turn that spawned them.
    if (e.agentId === undefined && turnStartUsd !== undefined) {
      const endUsd = (await $.session.usage().catch(() => undefined))?.cost?.usd
      if (endUsd !== undefined) {
        await $.state.set({ plugin: 'current-affairs', key: 'lastTurn' }, { usd: Math.max(0, endUsd - turnStartUsd), durationMs: e.durationMs })
      }
      turnStartUsd = undefined
    }
    return result
  })

  on('command.run', { command: 'work' }, async $ => {
    void scan($)
    await $.ui.open({ id: PANE, title: 'Recent work' })

    return { text: 'Recent work pane opened.' }
  })

  on('command.run', { command: 'timeline' }, async $ => {
    void scan($)
    await $.ui.open({ id: TIMELINE, title: 'Last week' })

    return { text: 'Last week pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    // Svg is on every surface but the terminal, where resolve hands back a stand-in that draws nothing.
    const Svg = e.surface !== 'terminal' && 'Svg' in elements ? elements.Svg : undefined
    const scanned = await read($, sessions)
    const turn = await read($, lastTurn)
    const flipped = await read($, toggled)
    const issues = await read($, titles)
    const isScanning = await read($, scanning)
    const lastScan = await read($, scannedAt)
    const live = await read($, usage)
    const putAway = await read($, hidden)
    const isShowingHidden = await read($, showHidden)
    const unread = await read($, unreadSessions)
    const tz = await read($, tzOffset)
    const nowMs = await $.clock.now()
    const list = scanned.filter(s => s.lastMs >= nowMs - WINDOW_DAYS * 86_400_000)
    const width = Math.max(30, e.props.bodyColumns ?? e.viewport?.columns ?? 80)
    const fit = (text: string, room: number) =>
      text.length <= room ? text : `${text.slice(0, Math.max(1, room - 1))}…`

    // A group is put away by its ✕ until it has newer activity, and one whose issue is finished
    // goes by itself, unless brought back. `hidden` shows them all again, dimmed.
    const isHidden = (group: Group) => {
      const mark = putAway[group.key]
      if (mark === false) return false
      if (typeof mark === 'number' && group.lastMs <= mark) return true
      return isFinished(titleOf(issues, group.sessions, group.label)?.status)
    }
    const setHidden = async (key: string, mark: number | false) => {
      const next = { ...(((await $.store.get('hidden')) ?? {}) as Record<string, number | false>), [key]: mark }
      await $.store.set('hidden', next)
      await $.state.set({ plugin: 'current-affairs', key: 'hidden' }, next)
    }
    const allSections = sectionSessions(list)
    const hiddenCount = allSections.flatMap(s => s.tickets).filter(isHidden).length
    const sections = allSections.map(section => ({
      ...section,
      // Exploration has no tickets: its sessions sit right under its header.
      isFlat: section.tickets.length === 0,
      // Cost counts the whole repo, put-away work included.
      sessions: [...section.tickets.flatMap(g => g.sessions), ...section.loose],
      tickets: isShowingHidden ? section.tickets : section.tickets.filter(g => !isHidden(g)),
    }))
    const usd = (sessionsOf: WorkSession[]) => {
      const total = sessionsOf.reduce((sum, s) => sum + (s.costUsd ?? 0), 0)
      return total ? `${formatUsd(total)} · ` : ''
    }
    // Repos start open, Exploration closed, and only the three newest issues or branches open;
    // a toggle flips the default, so it holds as the order shifts.
    const newest = sections
      .flatMap(s => s.tickets)
      .sort((a, b) => b.lastMs - a.lastMs)
      .slice(0, 3)
      .map(g => g.key)
    const isOpenByDefault = (key: string) =>
      key.includes('/') ? newest.includes(key) : !key.startsWith('exploration:')
    const isOpen = (key: string) => isOpenByDefault(key) !== flipped.includes(key)
    const toggle = (key: string) =>
      update($, toggled, keys => (keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]))
    const copyResume = async (session: WorkSession, surface: typeof e.surface) => {
      const command = `cd ${JSON.stringify(session.cwd)} && claude --resume ${session.id}`
      const { isCopied } = await $.ui.copy({ text: command, surface })
      await $.ui.toast(isCopied ? `Copied: ${command}` : 'Could not copy the resume command')
    }

    // One row: a pressable lead, an optional text beside it, a dim meta column on
    // the right. Styling sits outside the Button, since a desktop draws its own.
    const row = (
      key: string,
      depth: number,
      lead: RenderNode,
      meta: string,
      beside?: RenderNode,
      after?: RenderNode,
    ) => (
      <Box key={`row:${key}`} flexDirection="row" justifyContent="space-between" gap={1} paddingLeft={depth * 2}>
        <Box flexDirection="row" gap={1} flexShrink={1}>
          {lead}
          {beside}
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text dimColor>{meta}</Text>
          {after}
        </Box>
      </Box>
    )

    const sessionRow = (session: WorkSession, depth: number) => {
      const context = session.contextTokens ? `${tokens(session.contextTokens)} ctx · ` : ''
      const meta = `${context}${usd([session])}${session.prNumber ? `#${session.prNumber} · ` : ''}${ago(session.lastMs, nowMs)}`
      const room = width - depth * 2 - meta.length - 4
      return row(
        session.id,
        depth,
        <Button key={session.id} plain onPress={press => copyResume(session, press.surface)}>
          {fit(session.title, room)}
        </Button>,
        meta,
      )
    }

    const ticketBlock = (group: Group, depth: number) => {
      const isExpanded = isOpen(group.key)
      const issue = titleOf(issues, group.sessions, group.label)
      const meta = `${issue?.status ? `${issue.status} · ` : ''}${usd(group.sessions)}${group.sessions.length} · ${ago(group.lastMs, nowMs)}`
      const title = issue?.summary ?? themeOf(group) ?? ''
      const room = width - depth * 2 - group.label.length - 3 - meta.length - 4
      const isAway = isHidden(group)
      return (
        <Box flexDirection="column">
          {row(
            group.key,
            depth,
            <Box flexDirection="row" gap={1}>
              <Button key={group.key} plain label={isExpanded ? '▾' : '▸'} onPress={() => toggle(group.key)} />
              <Text bold={!isAway} dimColor={isAway} color={isAway ? undefined : 'cyan'}>{group.label}</Text>
            </Box>,
            meta,
            <Text dimColor={!issue || isAway} italic={!issue} wrap="truncate-end">
              {fit(title, Math.max(8, room))}
            </Text>,
            isAway ? (
              <Button key={`unhide:${group.key}`} plain dimColor label="↺" onPress={() => void setHidden(group.key, false)} />
            ) : (
              <Button key={`hide:${group.key}`} plain dimColor label="✕" onPress={() => void setHidden(group.key, Math.max(nowMs, group.lastMs))} />
            ),
          )}
          {isExpanded && group.sessions.map(session => sessionRow(session, depth + 1))}
        </Box>
      )
    }

    const looseBlock = (key: string, sessionsOfRepo: WorkSession[], depth: number) => {
      const isExpanded = isOpen(key)
      const lastMs = Math.max(...sessionsOfRepo.map(s => s.lastMs))
      return (
        <Box flexDirection="column">
          {row(
            key,
            depth,
            <Box flexDirection="row" gap={1}>
              <Button key={key} plain dimColor label={isExpanded ? '▾' : '▸'} onPress={() => toggle(key)} />
              <Text dimColor>no issue or branch</Text>
            </Box>,
            `${sessionsOfRepo.length} · ${ago(lastMs, nowMs)}`,
          )}
          {isExpanded && sessionsOfRepo.map(session => sessionRow(session, depth + 1))}
        </Box>
      )
    }

    // Outside the terminal the app lists sessions itself, so the pane keeps to the figures; there,
    // limits drop the word "limit", which a narrow pane has no room for.
    const isTerminal = e.surface === 'terminal'
    const shortLabel = (label: string) => (isTerminal ? label : label.replace(/ limit$/, ''))
    const LABEL = isTerminal ? 13 : 12
    // A label in a fixed column, then the rest. Nothing here wraps; a narrow pane cuts the end.
    const labelled = (key: string, label: string, ...rest: RenderNode[]) => (
      <Box key={key} flexDirection="row" gap={1} alignItems="center">
        <Box width={LABEL} flexShrink={0}>
          <Text wrap="truncate-end">{label}</Text>
        </Box>
        {rest}
      </Box>
    )

    // Hours worked, sessions and cost, today and over the last 7 days, as the timeline counts them.
    const totalsBlock = () => {
      if (list.length === 0) return undefined
      const { today, week } = recentTotals(list, nowMs, tz)
      const figures = (t: Totals, ofWeek: boolean) =>
        [
          formatHours(t.hours),
          t.usd ? formatUsd(t.usd) : undefined,
          `${t.sessions} ${t.sessions === 1 ? 'session' : 'sessions'}`,
          ofWeek ? `${t.activeDays}/${DAYS} days` : undefined,
        ]
          .filter(Boolean)
          .join(' · ')
      return (
        <Box key="totals" flexDirection="column" marginTop={1}>
          {labelled('totals:today', 'Today', <Text wrap="truncate-end">{today.sessions ? figures(today, false) : 'nothing yet'}</Text>)}
          {labelled('totals:week', 'Last 7 days', <Text wrap="truncate-end">{figures(week, true)}</Text>)}
        </Box>
      )
    }

    // This session's context and the account's limits, one meter each with where a limit is
    // heading, then what the session has cost.
    const usageBlock = () => {
      if (!live) return undefined
      const rows = usageRows(live, nowMs)
      if (rows.length === 0 && live.costUsd === undefined) return undefined
      const duration = (ms: number) => (ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`)
      const labelWidth = Math.max(4, ...rows.map(r => r.label.length)) + 1
      const barWidth = Math.max(8, Math.min(24, width - labelWidth - 28))
      // Block characters only line up in a monospaced terminal; elsewhere each meter is a drawn bar
      // and the label sits in a fixed-width column.
      if (Svg) {
        return (
          <Box key="usage" flexDirection="column" marginTop={1} gap={1}>
            {rows.map(r => (
              <Box key={`usage:${r.key}`} flexDirection="column">
                {labelled(
                  `usage:${r.key}:meter`,
                  shortLabel(r.label),
                  <Box flexShrink={0}>
                    <Svg source={meterSvg(r.percent)} alt={`${r.label}: ${Math.round(r.percent)}%`} width={METER_PX} height={8} />
                  </Box>,
                  <Box width={5} flexShrink={0}>
                    <Text>{`${Math.round(r.percent)}%`}</Text>
                  </Box>,
                  <Text dimColor wrap="truncate-end">{r.detail}</Text>,
                )}
                {r.pace && labelled(`usage:${r.key}:pace`, '', <Text color={r.paceColor} dimColor={r.paceColor === 'green'} wrap="truncate-end">{r.pace}</Text>)}
              </Box>
            ))}
            {live.costUsd !== undefined && (
              <Box key="usage:cost" flexDirection="column">
                {labelled('usage:cost:session', 'Cost', <Text>${live.costUsd.toFixed(2)}</Text>, <Text dimColor wrap="truncate-end">this session</Text>)}
                {turn &&
                  labelled(
                    'usage:cost:turn',
                    '',
                    <Text>${turn.usd.toFixed(2)}</Text>,
                    <Text dimColor wrap="truncate-end">last turn, {duration(turn.durationMs)}</Text>,
                  )}
              </Box>
            )}
          </Box>
        )
      }
      return (
        <Box key="usage" flexDirection="column" marginTop={1}>
          {rows.map(r => {
            const bar = meter(r.percent, barWidth)
            return [
              <Box key={`usage:${r.key}`} flexDirection="row" gap={1}>
                <Text>{r.label.padEnd(labelWidth)}</Text>
                <Text>
                  <Text color={levelColor(r.percent)}>{bar.filled}</Text>
                  <Text dimColor>{bar.empty}</Text>
                </Text>
                <Text>{`${Math.round(r.percent)}%`.padStart(4)}</Text>
                <Text dimColor>{r.detail}</Text>
              </Box>,
              r.pace && (
                <Text key={`usage:${r.key}:pace`}>
                  {' '.repeat(labelWidth + 1)}
                  <Text color={r.paceColor} dimColor={r.paceColor === 'green'}>{r.pace}</Text>
                </Text>
              ),
            ]
          })}
          {live.costUsd !== undefined && (
            <Box key="usage:cost" flexDirection="row" gap={1}>
              <Text>{'Cost'.padEnd(labelWidth)}</Text>
              <Text>${live.costUsd.toFixed(2)}</Text>
              <Text dimColor>this session</Text>
              {turn && <Text>· ${turn.usd.toFixed(2)}</Text>}
              {turn && <Text dimColor>last turn, {duration(turn.durationMs)}</Text>}
            </Box>
          )}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between" gap={1}>
          <Text dimColor wrap="truncate-end">
            {isTerminal ? `${list.length} sessions · ${WINDOW_DAYS}d` : isScanning ? '' : 'updated'}
            {isScanning ? `${isTerminal ? ' · ' : ''}scanning…` : lastScan ? `${isTerminal ? ' ·' : ''} ${ago(lastScan, nowMs)} ago` : ''}
          </Text>
          <Box flexDirection="row" gap={2} flexShrink={0}>
            {isTerminal && hiddenCount > 0 && (
              <Button
                key="show-hidden"
                label={isShowingHidden ? 'hide finished' : `${hiddenCount} hidden`}
                hotkey="h"
                plain
                onPress={() => update($, showHidden, shown => !shown)}
              />
            )}
            <Button label="timeline" hotkey="t" plain onPress={() => void $.ui.open({ id: TIMELINE, title: 'Last week' })} />
            <Button label="refresh" hotkey="r" plain onPress={() => void scan($)} />
          </Box>
        </Box>
        {usageBlock()}
        {totalsBlock()}
        {list.length === 0 && !isScanning && <Text dimColor>No sessions found.</Text>}
        {unread > 0 && (
          <Text dimColor>
            {unread} long {unread === 1 ? 'session needs' : 'sessions need'} jq to show here.
          </Text>
        )}
        {isTerminal && sections.map(section => {
          const isExpanded = isOpen(section.key)
          const isFlat = section.isFlat
          if (!isFlat && section.tickets.length === 0 && section.loose.length === 0) return undefined
          return (
            <Box flexDirection="column" marginTop={1}>
              {row(
                section.key,
                0,
                <Box flexDirection="row" gap={1}>
                  <Button key={section.key} plain label={isExpanded ? '▾' : '▸'} onPress={() => toggle(section.key)} />
                  <Text bold>{section.label}</Text>
                </Box>,
                `${usd(section.sessions)}${section.count} ${section.count === 1 ? 'session' : 'sessions'} · ${ago(section.lastMs, nowMs)}`,
              )}
              {isExpanded && section.tickets.map(group => ticketBlock(group, 1))}
              {isExpanded && section.loose.length > 0 &&
                (isFlat
                  ? section.loose.map(session => sessionRow(session, 1))
                  : looseBlock(`${section.key}/loose`, section.loose, 1))}
            </Box>
          )
        })}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: TIMELINE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const Svg = e.surface !== 'terminal' && 'Svg' in elements ? elements.Svg : undefined
    const list = await read($, sessions)
    const issues = await read($, titles)
    const tz = await read($, tzOffset)
    const trend = await read($, trends)
    const nowMs = await $.clock.now()
    const width = Math.max(40, e.props.bodyColumns ?? e.viewport?.columns ?? 80)
    const labelWidth = Math.min(30, Math.max(14, Math.floor(width * 0.3)))
    const fit = (text: string, room: number) =>
      (text.length <= room ? text : `${text.slice(0, Math.max(1, room - 1))}…`).padEnd(room)

    // Drawn as SVG, a day has room for 3-hour cells whatever the pane's width.
    const cellsPerDay = Svg ? 8 : pickCellsPerDay(width - labelWidth - 1)
    const t = buildTimeline(list, issues, nowMs, tz, cellsPerDay)
    const max = Math.max(1, ...t.lanes.flatMap(lane => lane.cells))
    const room = Math.max(3, (e.viewport?.rows ?? 40) - (trend ? 16 : 10))
    const shown = t.lanes.length <= room ? t.lanes : [...t.lanes].sort((a, b) => b.total - a.total).slice(0, room - 1)
    const lanes = t.lanes.filter(lane => shown.includes(lane))
    const gutter = ' '.repeat(labelWidth + 1)
    const hoursRow = dayHours(t.hoursByDay, cellsPerDay)

    const trendArrow = (row: (typeof TREND_ROWS)[number]) => {
      const m = trend![row.key]
      const way = direction(m, row.isHigherBetter)
      const arrow = way === undefined ? ' ' : way === 'same' ? '→' : (m.current ?? 0) > (m.baseline ?? 0) ? '↑' : '↓'
      const color = way === 'better' ? 'green' : way === 'worse' ? 'yellow' : undefined
      return { m, way, arrow, color }
    }

    // Outside the terminal, the lanes are drawn bars beside a fixed-width label column, and the
    // trends a table of fixed-width columns, since text in a proportional face doesn't line up.
    if (Svg) {
      const svgLabelWidth = Math.min(24, Math.max(12, width - Math.round(TIMELINE_PX / 7) - 2))
      const row = (key: string, name: string | undefined, color: string | undefined, isDim: boolean, chart: string, alt: string) => (
        <Box key={key} flexDirection="row" gap={1} alignItems="center">
          <Box width={svgLabelWidth}>
            {name !== undefined && (
              <Text color={color} dimColor={isDim} wrap="truncate-end">
                {name}
              </Text>
            )}
          </Box>
          <Svg source={chart} alt={alt} width={TIMELINE_PX} />
        </Box>
      )
      return (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            {formatHours(t.hours)} worked · {t.sessionCount} sessions · {t.activeDays}/{DAYS} active days · {t.prCount} PRs
            {t.busiestDay ? ` · busiest ${t.busiestDay}` : ''}
          </Text>
          <Box flexDirection="column" gap={1}>
            {row('axis', undefined, undefined, false, axisSvg(t.dayLabels, t.todayIndex), t.dayLabels.join(', '))}
            {lanes.map(lane => row(`lane:${lane.key}`, lane.label, lane.color, false, laneSvg(lane.cells, cellsPerDay, max, lane.color), `${lane.label}: activity by day`))}
            {lanes.length < t.lanes.length && (
              <Text dimColor>+{t.lanes.length - lanes.length} quieter lanes</Text>
            )}
            {row('all', 'all work', undefined, true, dailySvg(t.daily, '#48c1c4'), 'All work by day')}
            {t.hours > 0 &&
              row('hours', 'hours worked', undefined, true, hoursSvg(t.hoursByDay),
                `Hours worked: ${t.dayLabels.map((day, i) => `${day} ${formatHours(t.hoursByDay[i] ?? 0)}`).join(', ')}`)}
          </Box>
          <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
            {[...t.repos, { name: 'exploration', color: EXPLORATION_COLOR }].map(repo => (
              <Text key={`key:${repo.name}`}>
                <Text color={repo.color}>●</Text> {repo.name}
              </Text>
            ))}
          </Box>
          {trend && (
            <Box flexDirection="column">
              <Box flexDirection="row">
                <Box width={14} flexShrink={0}><Text bold>Trends</Text></Box>
                <Box width={10} flexShrink={0}><Text dimColor>2 wks</Text></Box>
                <Text dimColor wrap="truncate-end">prior 6 wks</Text>
              </Box>
              {TREND_ROWS.map(r => {
                const { m, way, arrow, color } = trendArrow(r)
                return (
                  <Box key={`trend:${r.key}`} flexDirection="row">
                    <Box width={14} flexShrink={0}><Text wrap="truncate-end">{r.label}</Text></Box>
                    <Box width={7} flexShrink={0}><Text>{m.current === undefined ? '—' : r.format(m.current)}</Text></Box>
                    <Box width={3} flexShrink={0}><Text color={color} dimColor={way === 'same'}>{arrow}</Text></Box>
                    <Text dimColor wrap="truncate-end">
                      {m.baseline !== undefined ? r.format(m.baseline) : `building, ${Math.min(m.baselineDays, MIN_BASELINE_DAYS)}/${MIN_BASELINE_DAYS} days`}
                    </Text>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text dimColor>
          {formatHours(t.hours)} worked · {t.sessionCount} sessions · {t.activeDays}/{DAYS} active days · {t.prCount} PRs
          {t.busiestDay ? ` · busiest ${t.busiestDay}` : ''} · {24 / cellsPerDay}h per cell
        </Text>
        <Text> </Text>
        <Text dimColor>
          {gutter}
          {axis(t.dayLabels, cellsPerDay)}
        </Text>
        {lanes.map(lane => (
          <Text>
            <Text color={lane.color}>{fit(lane.label, labelWidth)}</Text>{' '}
            {laneRuns(lane.cells, cellsPerDay, max).map(run =>
              run.isActive ? <Text color={lane.color}>{run.text}</Text> : <Text dimColor>{run.text}</Text>,
            )}
          </Text>
        ))}
        {lanes.length < t.lanes.length && (
          <Text dimColor>
            {gutter}+{t.lanes.length - lanes.length} quieter lanes
          </Text>
        )}
        <Text>
          <Text dimColor>{fit('all work', labelWidth)}</Text> <Text color="cyan">{dailyBars(t.daily, cellsPerDay)}</Text>
        </Text>
        {hoursRow && (
          <Box key="hours">
            <Text>
              <Text dimColor>{fit('hours worked', labelWidth)}</Text> {hoursRow}
            </Text>
          </Box>
        )}
        <Text> </Text>
        <Text>
          {t.repos.map(repo => (
            <Text>
              <Text color={repo.color}>█</Text> {repo.name}{'  '}
            </Text>
          ))}
          <Text color="#8a8a8a">█</Text> exploration
        </Text>
        {trend && (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>
              {fit('Trends', 16)}
              {'last 2 wks'.padEnd(13)}prior 6 wks, per 2 wks
            </Text>
            {TREND_ROWS.map(row => {
              const { m, way, arrow, color } = trendArrow(row)
              return (
                <Text>
                  {fit(row.label, 16)}
                  {(m.current === undefined ? '—' : row.format(m.current)).padEnd(9)}
                  <Text color={color} dimColor={way === 'same'}>
                    {arrow}
                  </Text>
                  {'   '}
                  <Text dimColor>
                    {m.baseline !== undefined
                      ? row.format(m.baseline)
                      : `building baseline (${m.baselineDays} active days saved)`}
                  </Text>
                </Text>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })
}
