import type { TrendMetric, Trends, WorkSession } from '../types'

const DAY_MS = 86_400_000
const CURRENT_DAYS = 14
const BASELINE_DAYS = 42
// Fewer active days than this in the baseline and it is not shown.
export const MIN_BASELINE_DAYS = 5
// GitHub's closing keywords in a PR description: "Closes #12", "fixes: #12".
const CLOSES = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+#(\d+)\b/i

// One local day, as saved in the store so the baseline outlives transcript cleanup. `tickets` holds
// work keys: the issues and branches worked on that day.
export type DayStat = { activity: number; rework: number; tickets: string[] }

// What the mod saves across sessions.
export type History = {
  days: Record<string, DayStat>
  // The first activity seen on each work key, the start of its cycle.
  ticketFirstMs: Record<string, number>
  // The first day the history holds; work first seen then may be older.
  sinceDay?: string
}

export type MergedPr = { repo: string; number: number; title: string; issue?: number; mergedMs: number }

/** The issue a PR description closes, if it names one. */
export const closingIssue = (body: string) => {
  const number = body.match(CLOSES)?.[1]
  return number ? Number(number) : undefined
}

/** A session's issue or branch with its repo, since every repo has its own #1. */
export const workKey = (session: Pick<WorkSession, 'repo' | 'ticket'>) =>
  session.ticket && (session.repo ? `${session.repo} ${session.ticket}` : session.ticket)

const dayKey = (ms: number, tzOffsetMin: number) =>
  new Date(ms + tzOffsetMin * 60_000).toISOString().slice(0, 10)

export function computeDays(sessions: WorkSession[], tzOffsetMin: number): Record<string, DayStat> {
  const days: Record<string, DayStat> = {}
  for (const session of sessions) {
    for (const [hour, count] of Object.entries(session.activity)) {
      const ms = Date.parse(`${hour}:00:00Z`)
      if (Number.isNaN(ms)) continue
      const day = (days[dayKey(ms, tzOffsetMin)] ??= { activity: 0, rework: 0, tickets: [] })
      day.activity += count
      if (session.isRework) day.rework += count
      const key = workKey(session)
      if (key && !day.tickets.includes(key)) day.tickets.push(key)
    }
  }
  return days
}

// Days the transcripts still fully cover replace the saved ones; older days are kept.
export function mergeHistory(
  saved: History | undefined,
  sessions: WorkSession[],
  tzOffsetMin: number,
  nowMs: number,
): History {
  const fresh = computeDays(sessions, tzOffsetMin)
  const freshDays = Object.keys(fresh).sort()
  // The earliest day may be cut short by cleanup, so it only fills a gap.
  const trustedFrom = freshDays[1] ?? freshDays[0]
  const keepFrom = dayKey(nowMs - (CURRENT_DAYS + BASELINE_DAYS + 7) * DAY_MS, tzOffsetMin)

  const days: Record<string, DayStat> = {}
  for (const [day, stat] of Object.entries(saved?.days ?? {})) if (day >= keepFrom) days[day] = stat
  for (const [day, stat] of Object.entries(fresh)) {
    if (day < keepFrom) continue
    if (!days[day] || (trustedFrom && day >= trustedFrom)) days[day] = stat
  }

  const ticketFirstMs = { ...saved?.ticketFirstMs }
  for (const session of sessions) {
    const key = workKey(session)
    if (!key) continue
    const known = ticketFirstMs[key]
    if (known === undefined || session.firstMs < known) ticketFirstMs[key] = session.firstMs
  }

  const sinceDay = [saved?.sinceDay, freshDays[0]].filter(Boolean).sort()[0]
  return { days, ticketFirstMs, sinceDay }
}

// A merged PR's work key: from a session that linked the PR, else the issue its description closes.
export function ticketOfPr(pr: MergedPr, sessions: WorkSession[]): string | undefined {
  const linked = sessions.find(s => s.prNumber === pr.number && s.repo === pr.repo && s.ticket)
  if (linked) return workKey(linked)
  return pr.issue ? workKey({ repo: pr.repo, ticket: `#${pr.issue}` }) : undefined
}

const median = (values: number[]) => {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function computeTrends(
  history: History,
  prs: MergedPr[],
  sessions: WorkSession[],
  nowMs: number,
  tzOffsetMin: number,
): Trends {
  const today = dayKey(nowMs, tzOffsetMin)
  const currentFrom = dayKey(nowMs - (CURRENT_DAYS - 1) * DAY_MS, tzOffsetMin)
  const baselineFrom = dayKey(nowMs - (CURRENT_DAYS + BASELINE_DAYS - 1) * DAY_MS, tzOffsetMin)
  const inCurrent = (day: string) => day >= currentFrom && day <= today
  const inBaseline = (day: string) => day >= baselineFrom && day < currentFrom

  const days = Object.entries(history.days).filter(([, stat]) => stat.activity > 0)
  const current = days.filter(([day]) => inCurrent(day)).map(([, stat]) => stat)
  const baseline = days.filter(([day]) => inBaseline(day)).map(([, stat]) => stat)
  const hasBaseline = baseline.length >= MIN_BASELINE_DAYS

  const share = (stats: DayStat[]) => {
    const total = stats.reduce((n, s) => n + s.activity, 0)
    return total > 0 ? stats.reduce((n, s) => n + s.rework, 0) / total : undefined
  }
  const perDay = (stats: DayStat[]) =>
    stats.length > 0 ? stats.reduce((n, s) => n + s.tickets.length, 0) / stats.length : undefined

  // Work first seen on the history's first day may have started earlier: no cycle.
  const sinceMs = history.sinceDay ? Date.parse(`${history.sinceDay}T00:00:00Z`) + DAY_MS : 0
  const cycles = (from: string, to: string) =>
    prs
      .filter(pr => {
        const day = dayKey(pr.mergedMs, tzOffsetMin)
        return day >= from && day <= to
      })
      .flatMap(pr => {
        const ticket = ticketOfPr(pr, sessions)
        const firstMs = ticket ? history.ticketFirstMs[ticket] : undefined
        if (firstMs === undefined || firstMs < sinceMs || firstMs > pr.mergedMs) return []
        return [(pr.mergedMs - firstMs) / DAY_MS]
      })
  const merged = (from: string, to: string) =>
    prs.filter(pr => {
      const day = dayKey(pr.mergedMs, tzOffsetMin)
      return day >= from && day <= to
    }).length

  const baselineCycles = cycles(baselineFrom, dayKey(nowMs - CURRENT_DAYS * DAY_MS, tzOffsetMin))
  const metric = (value: number | undefined, base: number | undefined, baseDays: number): TrendMetric => ({
    current: value,
    baseline: base,
    baselineDays: baseDays,
  })

  return {
    // gh holds the full PR history, so this baseline never waits on saved days.
    prsMerged: metric(
      merged(currentFrom, today),
      (merged(baselineFrom, dayKey(nowMs - CURRENT_DAYS * DAY_MS, tzOffsetMin)) * CURRENT_DAYS) / BASELINE_DAYS,
      BASELINE_DAYS,
    ),
    cycleDays: metric(
      median(cycles(currentFrom, today)),
      hasBaseline && baselineCycles.length >= 3 ? median(baselineCycles) : undefined,
      baseline.length,
    ),
    reworkShare: metric(share(current), hasBaseline ? share(baseline) : undefined, baseline.length),
    ticketsPerDay: metric(perDay(current), hasBaseline ? perDay(baseline) : undefined, baseline.length),
  }
}

// Whether the change from baseline is better, worse or about the same.
export function direction(m: TrendMetric, isHigherBetter: boolean): 'better' | 'worse' | 'same' | undefined {
  if (m.current === undefined || m.baseline === undefined) return undefined
  const scale = Math.max(Math.abs(m.baseline), 1e-9)
  const change = (m.current - m.baseline) / scale
  if (Math.abs(change) < 0.1) return 'same'
  return change > 0 === isHigherBetter ? 'better' : 'worse'
}
