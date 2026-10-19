// A GitHub issue's title, and its Project status (or closed), keyed by `owner/repo#12`.
export type TicketTitle = { summary: string; status?: string; fetchedMs: number }

export type WorkSession = {
  id: string
  cwd: string
  title: string
  firstMs: number
  lastMs: number
  prompts: number
  // Titled as rework: review comments, CI fixes, conflicts, rebases.
  isRework: boolean
  ticket?: string
  // A GitHub issue (`#12`, or `owner/repo#12` for another repo's) from the branch, worktree path or
  // prompt mentions, or else the branch's own name.
  ticketSource?: 'branch' | 'path' | 'mentions' | 'branch-name'
  repo?: string
  // `owner/repo` from the git remote, when it is on GitHub.
  repoSlug?: string
  branch?: string
  prNumber?: number
  // Input tokens of the session's last reply: how full its context was when it stopped.
  contextTokens?: number
  // What its replies, and its subagents', would cost at API list prices.
  costUsd?: number
  // Records per UTC hour, keyed "YYYY-MM-DDTHH".
  activity: Record<string, number>
  // The 5-minute slots with any activity, "YYYY-MM-DDTHH:MM" in UTC, for hours worked.
  slots?: string[]
}

export type TrendMetric = {
  current?: number
  // The prior six weeks (PR counts scaled to two weeks); absent while history is too short.
  baseline?: number
  baselineDays: number
}

export type Trends = {
  prsMerged: TrendMetric
  cycleDays: TrendMetric
  reworkShare: TrendMetric
  ticketsPerDay: TrendMetric
}

// This session's context fill and the account's rate-limit windows, from $.session.usage().
export type LiveUsage = {
  context: { tokens?: number; window: number; percent?: number }
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
  costUsd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'current-affairs': {
      sessions: WorkSession[]
      scannedAtMs: number
      isScanning: boolean
      toggled: string[]
      tzOffsetMin: number
      titles: Record<string, TicketTitle>
      trends: Trends | null
      usage: LiveUsage | null
      // What the last main-loop turn cost, subagents included, and how long it ran.
      lastTurn: { usd: number; durationMs: number } | null
      // The context warning last given, in percent; 0 once the context is back under it.
      contextWarned: number
      // Work groups put away, by group key: hidden until newer activity than the time stored, or
      // kept in view (false) though its issue is closed.
      hidden: Record<string, number | false>
      showHidden: boolean
    }
  }
}
