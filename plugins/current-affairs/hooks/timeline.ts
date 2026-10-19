import type { TicketTitle, WorkSession } from '../types'
import { sectionSessions, themeOf } from './classify'
import { titleOf } from './titles'

export const DAYS = 7
const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const CELLS_PER_DAY = [24, 12, 8, 6, 4, 3, 2, 1]
const SHADES = ['░', '▒', '▓', '█']
const BARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
const SLOT_MS = 5 * 60_000
// A pause up to this long between active slots still counts as working: reading, thinking, waiting.
const BRIDGE_MS = 15 * 60_000
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export const REPO_COLORS = ['#4e9af1', '#e8a33d', '#5cbf7a', '#c77ddb', '#e0675a', '#48c1c4', '#b5a642', '#8d8df0']
export const EXPLORATION_COLOR = '#8a8a8a'

export type Lane = {
  key: string
  ticket?: string
  label: string
  repo: string
  color: string
  cells: number[]
  total: number
}

export type Timeline = {
  cellsPerDay: number
  dayLabels: string[]
  todayIndex: number
  lanes: Lane[]
  daily: number[]
  repos: { name: string; color: string; total: number }[]
  activeDays: number
  sessionCount: number
  prCount: number
  busiestDay?: string
  // Hours worked on each day, and in all: active 5-minute slots across every session, counted once.
  hoursByDay: number[]
  hours: number
}

export const pickCellsPerDay = (room: number) => CELLS_PER_DAY.find(c => c * DAYS <= room) ?? 1

// The local day an epoch-ms instant falls on, counted in whole days since 1970.
const localDay = (ms: number, tzOffsetMin: number) => Math.floor((ms + tzOffsetMin * 60_000) / DAY_MS)

/**
 * Hours worked on each of the `DAYS` days from `firstDay`: the 5-minute slots any session was active
 * in, counted once however many sessions ran at the same time, and the pauses between them up to
 * 15 minutes. Each stretch is counted on the local day it happens.
 */
export function hoursWorked(sessions: WorkSession[], firstDay: number, tzOffsetMin: number): number[] {
  const starts = [...new Set(sessions.flatMap(s => s.slots ?? []))]
    .map(key => Date.parse(`${key}:00Z`))
    .filter(ms => !Number.isNaN(ms))
    .sort((a, b) => a - b)
  const minutes = new Array<number>(DAYS).fill(0)
  let previous: number | undefined
  for (const ms of starts) {
    const gap = previous === undefined ? Infinity : ms - previous
    const credit = gap <= BRIDGE_MS ? gap : SLOT_MS
    const day = localDay(ms, tzOffsetMin) - firstDay
    if (day >= 0 && day < DAYS) minutes[day] += credit / 60_000
    previous = ms
  }
  return minutes.map(m => m / 60)
}

/** Hours to read at a glance: 0.5h, 7.3h, 23h. */
export const formatHours = (hours: number) => `${hours < 10 ? hours.toFixed(1).replace(/\.0$/, '') : Math.round(hours)}h`

/** Each day's hours under its column, where a column has room for them; undefined where none does. */
export function dayHours(hoursByDay: number[], cellsPerDay: number): string | undefined {
  const cells = hoursByDay.map(h => (h === 0 ? '' : formatHours(h)))
  if (cellsPerDay < Math.max(1, ...cells.map(c => c.length)) + 1) return undefined
  return cells.map(c => c.padEnd(cellsPerDay)).join('')
}

export function buildTimeline(
  sessions: WorkSession[],
  titles: Record<string, TicketTitle>,
  nowMs: number,
  tzOffsetMin: number,
  cellsPerDay: number,
): Timeline {
  const today = localDay(nowMs, tzOffsetMin)
  const firstDay = today - DAYS + 1
  const hoursPerCell = 24 / cellsPerDay
  const width = DAYS * cellsPerDay

  const place = (hourKey: string) => {
    const ms = Date.parse(`${hourKey}:00:00Z`)
    const day = localDay(ms, tzOffsetMin) - firstDay
    if (Number.isNaN(ms) || day < 0 || day >= DAYS) return undefined
    const localHour = Math.floor((((ms + tzOffsetMin * 60_000) % DAY_MS) + DAY_MS) % DAY_MS / HOUR_MS)
    return day * cellsPerDay + Math.floor(localHour / hoursPerCell)
  }
  const cellsOf = (list: WorkSession[]) => {
    const cells = new Array<number>(width).fill(0)
    for (const session of list) {
      for (const [hour, count] of Object.entries(session.activity)) {
        const at = place(hour)
        if (at !== undefined) cells[at] += count
      }
    }
    return cells
  }
  const sum = (cells: number[]) => cells.reduce((a, b) => a + b, 0)

  const inWindow = sessions.filter(s => sum(cellsOf([s])) > 0)
  const sections = sectionSessions(inWindow)
  const repos = sections
    .filter(s => s.kind === 'repo')
    .map((s, i) => ({ name: s.label, color: REPO_COLORS[i % REPO_COLORS.length], total: 0 }))
  const colorOf = (repo: string) => repos.find(r => r.name === repo)?.color ?? EXPLORATION_COLOR

  const lanes: Lane[] = []
  for (const section of sections) {
    const color = colorOf(section.label)
    for (const group of section.tickets) {
      const cells = cellsOf(group.sessions)
      const title = titleOf(titles, group.sessions, group.label)?.summary || themeOf(group) || ''
      lanes.push({ key: group.key, ticket: group.label, label: `${group.label} ${title}`, repo: section.label, color, cells, total: sum(cells) })
    }
    if (section.loose.length > 0) {
      const cells = cellsOf(section.loose)
      const label = section.kind === 'exploration' ? 'Exploration' : `${section.label} · no issue`
      lanes.push({ key: `${section.key}/loose`, label, repo: section.label, color, cells, total: sum(cells) })
    }
  }
  for (const repo of repos) repo.total = sum(lanes.filter(l => l.repo === repo.name).map(l => l.total))
  repos.sort((a, b) => b.total - a.total)
  lanes.sort((a, b) => {
    const rank = (lane: Lane) => {
      const at = repos.findIndex(r => r.name === lane.repo)
      return at < 0 ? repos.length : at
    }
    return rank(a) - rank(b) || b.total - a.total
  })

  const all = cellsOf(inWindow)
  const daily = Array.from({ length: DAYS }, (_, d) => sum(all.slice(d * cellsPerDay, (d + 1) * cellsPerDay)))
  const dayLabels = Array.from({ length: DAYS }, (_, d) => {
    const date = new Date((firstDay + d) * DAY_MS)
    return `${WEEKDAYS[date.getUTCDay()]}${date.getUTCDate()}`
  })
  const busiest = daily.indexOf(Math.max(...daily))
  const hoursByDay = hoursWorked(inWindow, firstDay, tzOffsetMin)

  return {
    cellsPerDay,
    dayLabels,
    todayIndex: DAYS - 1,
    lanes,
    daily,
    repos,
    activeDays: daily.filter(n => n > 0).length,
    sessionCount: inWindow.length,
    prCount: new Set(inWindow.map(s => s.prNumber).filter(Boolean)).size,
    busiestDay: daily[busiest] > 0 ? dayLabels[busiest] : undefined,
    hoursByDay,
    hours: hoursByDay.reduce((a, b) => a + b, 0),
  }
}

// A lane's cells as runs of text: day ticks and gaps dim, activity shaded by level.
export function laneRuns(cells: number[], cellsPerDay: number, max: number) {
  const runs: { text: string; isActive: boolean }[] = []
  cells.forEach((value, i) => {
    const isActive = value > 0
    const glyph = isActive
      ? SHADES[Math.min(SHADES.length - 1, Math.floor((Math.log1p(value) / Math.log1p(max)) * SHADES.length))]
      : i % cellsPerDay === 0
        ? '·'
        : ' '
    const last = runs.at(-1)
    if (last && last.isActive === isActive) last.text += glyph
    else runs.push({ text: glyph, isActive })
  })
  return runs
}

export function axis(labels: string[], cellsPerDay: number) {
  return labels
    .map(label => (cellsPerDay >= label.length + 1 ? label.padEnd(cellsPerDay) : label.slice(0, cellsPerDay).padEnd(cellsPerDay)))
    .join('')
}

export function dailyBars(daily: number[], cellsPerDay: number) {
  const max = Math.max(1, ...daily)
  return daily
    .map(n => {
      const glyph = n === 0 ? ' ' : BARS[Math.min(BARS.length - 1, Math.floor((n / max) * BARS.length))]
      return glyph.repeat(Math.max(1, cellsPerDay - (cellsPerDay > 2 ? 1 : 0))).padEnd(cellsPerDay)
    })
    .join('')
}
