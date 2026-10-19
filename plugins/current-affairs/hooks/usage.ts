import type { LiveUsage } from '../types'

// The live session's context fill and the account's rate-limit windows, as $.session.usage() and
// session.measure report them; register.tsx keeps the latest in state. These are the parts that
// don't need $.

const BLOCKS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

/** A bar `width` cells wide, filled to `percent` (0 to 100) in eighths of a cell. */
export function meter(percent: number, width: number): { filled: string; empty: string } {
  const eighths = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width * 8)
  const full = Math.floor(eighths / 8)
  const part = BLOCKS[eighths % 8]
  const filled = '█'.repeat(full) + part
  return { filled, empty: '░'.repeat(Math.max(0, width - full - (part ? 1 : 0))) }
}

/** A token count to read at a glance: 950, 12.3k, 184k, 1.2M. */
export function tokens(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 100_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

/** A rate-limit window's name for a row: `five_hour` → `5-hour limit`. */
export function limitLabel(kind: string): string {
  if (kind === 'five_hour') return '5-hour limit'
  if (kind === 'seven_day') return 'Weekly limit'
  if (kind === 'spend_limit') return 'Spend limit'
  return kind.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

/** How long until an ISO time: `in 42m`, `in 3h`, `in 2d`; undefined once past or unreadable. */
export function resetsIn(iso: string | undefined, nowMs: number): string | undefined {
  const at = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(at) || at <= nowMs) return undefined
  const minutes = Math.max(1, Math.round((at - nowMs) / 60_000))
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `in ${hours}h`
  return `in ${Math.round(hours / 24)}d`
}

/** green, then yellow past 70%, red past 90%, so a filling window stands out. */
export const levelColor = (percent: number) => (percent >= 90 ? 'red' : percent >= 70 ? 'yellow' : 'green')

export type UsageRow = { key: string; label: string; percent: number; detail: string }

/** The rows the usage block draws: context first, then each rate-limit window. */
export function usageRows(usage: LiveUsage, nowMs: number): UsageRow[] {
  const rows: UsageRow[] = []
  const { context } = usage
  if (context.percent !== undefined || context.tokens !== undefined) {
    const percent = context.percent ?? Math.round(((context.tokens ?? 0) / Math.max(1, context.window)) * 100)
    rows.push({
      key: 'context',
      label: 'Context',
      percent,
      detail: `${tokens(context.tokens ?? 0)} / ${tokens(context.window)}`,
    })
  }
  for (const limit of usage.rateLimits) {
    const reset = resetsIn(limit.resetsAt, nowMs)
    rows.push({
      key: limit.kind,
      label: limitLabel(limit.kind),
      percent: limit.percentUsed,
      detail: reset ? `resets ${reset}` : '',
    })
  }
  return rows
}

// The last warning before the context is full, whatever the option says.
const FINAL_WARNING = 90

/**
 * Whether to warn that this session's context is filling: once at `warnAt` percent, again at 90%,
 * and not again until it has dropped back under (after /compact, say). `level` is the warning now
 * in force, for the next call; `text` is set only when one is due. `warnAt` 0 turns it off.
 */
export function contextWarning(
  percent: number | undefined,
  warnAt: number,
  warned: number,
): { level: number; text?: string } {
  if (percent === undefined || warnAt <= 0) return { level: 0 }
  const level = percent >= Math.max(warnAt, FINAL_WARNING) ? Math.max(warnAt, FINAL_WARNING) : percent >= warnAt ? warnAt : 0
  if (level <= warned) return { level }
  const full = `Context ${Math.round(percent)}% full`
  return {
    level,
    text: level >= FINAL_WARNING ? `${full}: /compact now, or start a fresh session` : `${full}: /compact or start a fresh session soon`,
  }
}
