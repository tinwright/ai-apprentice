import type { WorkSession } from '../types'
import { costOf, type ModelTokens } from './pricing'

// What hooks/summarize.jq emits for one transcript.
export type Summary = {
  cwd: string | null
  first: string | null
  last: string | null
  branches: Record<string, number>
  mentions: Record<string, number>
  hours: Record<string, number>
  // 5-minute slots with any activity, keyed "YYYY-MM-DDTHH:MM" in UTC.
  slots?: Record<string, number>
  prompts: number
  prompt: string | null
  // Input tokens of the last reply, cached and uncached together.
  context?: number | null
  // Tokens per model, subagents' included: see pricing.ts.
  tokens?: Record<string, ModelTokens>
  aiTitle: string | null
  name: string | null
  prNumber: number | null
  prRepo: string | null
}

export type Group = {
  key: string
  kind: 'ticket' | 'repo' | 'exploration'
  label: string
  repos: string[]
  sessions: WorkSession[]
  lastMs: number
}

// Session titles and opening prompts that mean rework rather than new progress.
export const REWORK =
  /\b((address|incorporat)\w* [^.]{0,30}?(comments?|feedback)|review comments?|feedback from|fix(es|ing)? (the )?ci|ci fix(es)?|merge (master|main)|(resolve|merge) conflicts?|rebase)\b/i

// GitHub issue numbers in a branch name: GitHub's own `12-fix-login`, `issue-12`, `gh-12`, or one
// prefix deep (`fix/12-login`). Release and bot branches carry versions, not issues.
const BRANCH_ISSUE = /^(?:(?!release\/|dependabot\/|renovate\/)[\w.-]+\/)?(?:issues?-|gh-)?(\d+)(?:-|$)/
// A worktree folder named for its issue: `12`, `12-fix-login`, `repo-12`.
const PATH_ISSUE = /^(?:issues?-|gh-)?(\d+)(?:-|$)|-(?:issues?-|gh-)?(\d+)$/
// Issues named in a prompt, as summarize.jq reads them: `owner/repo#12` or an issue URL. A bare
// `#12` is left out, since free text has "#1 priority" and the like.
const ISSUE_REF = /\bgithub\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d+)|\b([\w.-]+\/[\w.-]+)#(\d+)\b/g

// What the person set in the plugin's options (see register.tsx): branches that never name an issue.
export type ClassifyConfig = { defaultBranches: string[] }
export const DEFAULT_CLASSIFY_CONFIG: ClassifyConfig = {
  defaultBranches: ['main', 'master', 'develop', 'trunk'],
}
let config = DEFAULT_CLASSIFY_CONFIG

export function configureClassify(next: Partial<ClassifyConfig>) {
  config = { ...DEFAULT_CLASSIFY_CONFIG, ...next }
}

const issueInBranch = (branch: string) => {
  const number = branch.match(BRANCH_ISSUE)?.[1]
  return number ? `#${number}` : undefined
}

const issueInPath = (cwd: string) => {
  if (!cwd.includes('/worktrees/')) return undefined
  const found = cwd.split('/').at(-1)?.match(PATH_ISSUE)
  const number = found?.[1] ?? found?.[2]
  return number ? `#${number}` : undefined
}

/** Issue references in text, as `owner/repo#12`, in the order they appear. */
export const issueRefsIn = (text: string) =>
  [...text.matchAll(ISSUE_REF)].map(m => (m[1] ? `${m[1]}#${m[2]}` : `${m[3]}#${m[4]}`))

// An issue of the session's own repo reads `#12`; another repo's keeps its `owner/repo#12`.
const shortRef = (ref: string, slug: string | undefined) =>
  slug && ref.toLowerCase().startsWith(`${slug.toLowerCase()}#`) ? ref.slice(slug.length) : ref

// A branch seen on fewer of a session's records than this was another folder's: a command run in the
// home dotfiles repo, say, while the session itself stayed on main.
const MIN_BRANCH_SHARE = 0.25

const topBranch = (branches: Record<string, number>) => {
  const total = Object.values(branches).reduce((a, b) => a + b, 0)
  return Object.entries(branches)
    .filter(([name, count]) => !config.defaultBranches.includes(name) && count >= total * MIN_BRANCH_SHARE)
    .sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function primaryTicket(
  s: Summary,
  slug?: string,
): { ticket: string; source: NonNullable<WorkSession['ticketSource']> } | undefined {
  const branch = topBranch(s.branches)
  const fromBranch = branch && issueInBranch(branch)
  if (fromBranch) return { ticket: fromBranch, source: 'branch' }

  const fromPath = s.cwd && issueInPath(s.cwd)
  if (fromPath) return { ticket: fromPath, source: 'path' }

  const fromMentions = mentionedIssue(s)
  if (fromMentions) return { ticket: shortRef(fromMentions, slug), source: 'mentions' }

  // No issue anywhere: the branch itself is the unit of work, so repos without issues still get
  // one group per piece of work.
  return branch ? { ticket: branch, source: 'branch-name' } : undefined
}

function mentionedIssue(s: Summary): string | undefined {
  const counted = Object.entries(s.mentions).sort((a, b) => b[1] - a[1])
  if (counted.length === 0) return undefined
  const top = counted[0][1]
  const tied = counted.filter(([, n]) => n === top).map(([ref]) => ref)
  if (tied.length === 1 && (top >= 2 || counted.length === 1)) return tied[0]
  return issueRefsIn(s.prompt ?? '').find(ref => tied.includes(ref))
}

/** `owner/repo` from a GitHub remote URL (HTTPS or SSH); undefined for any other host. */
export function slugFromRemote(url: string): string | undefined {
  return url.trim().match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/)?.[1]
}

// Repo from the path alone, for when git can no longer answer (worktree removed).
export function repoFromPath(cwd: string, home: string): string | undefined {
  if (!cwd.startsWith(home + '/')) return undefined
  const parts = cwd.slice(home.length + 1).split('/')
  if (parts[0] === 'worktrees' && parts[1]) {
    return parts[1].replace(/-(?:issues?-|gh-)?\d+(?:-.*)?$/, '')
  }
  if (parts.length >= 2 && !parts[0].startsWith('.')) return parts[1]
  return undefined
}

// `git rev-parse --git-common-dir` answer to a repo name; the home dotfiles repo is no repo.
export function repoFromGitDir(commonDir: string, home: string): string | undefined {
  const root = commonDir.replace(/\/\.git\/?$/, '').replace(/\.git\/?$/, '')
  if (root === home || root === '') return undefined
  return root.split('/').at(-1)
}

export function toSession(
  id: string,
  s: Summary,
  repo: string | undefined,
  slug?: string,
): WorkSession | undefined {
  if (!s.cwd || !s.last || s.prompts === 0) return undefined
  const repoSlug = slug ?? (s.prRepo?.includes('/') ? s.prRepo : undefined)
  const found = primaryTicket(s, repoSlug)
  const title = s.name ?? s.aiTitle ?? s.prompt ?? '(untitled)'
  return {
    id,
    cwd: s.cwd,
    title,
    firstMs: Date.parse(s.first ?? s.last),
    lastMs: Date.parse(s.last),
    isRework: REWORK.test(title),
    prompts: s.prompts,
    ticket: found?.ticket,
    ticketSource: found?.source,
    repo: repo ?? s.prRepo?.split('/').at(-1),
    repoSlug,
    branch: topBranch(s.branches),
    prNumber: s.prNumber ?? undefined,
    contextTokens: s.context || undefined,
    costUsd: costOf(s.tokens) || undefined,
    activity: s.hours ?? {},
    slots: Object.keys(s.slots ?? {}),
  }
}

export function groupSessions(sessions: WorkSession[]): Group[] {
  const groups = new Map<string, Group>()
  for (const session of sessions) {
    const kind = session.ticket ? 'ticket' : session.repo ? 'repo' : 'exploration'
    const key = `${kind}:${session.ticket ?? session.repo ?? ''}`
    const label = session.ticket ?? session.repo ?? 'Exploration'
    const group = groups.get(key) ?? { key, kind, label, repos: [], sessions: [], lastMs: 0 }
    group.sessions.push(session)
    group.lastMs = Math.max(group.lastMs, session.lastMs)
    if (session.repo && !group.repos.includes(session.repo)) group.repos.push(session.repo)
    groups.set(key, group)
  }
  for (const group of groups.values()) group.sessions.sort((a, b) => b.lastMs - a.lastMs)
  return [...groups.values()].sort((a, b) =>
    a.kind === 'exploration' ? 1 : b.kind === 'exploration' ? -1 : b.lastMs - a.lastMs,
  )
}

export type RepoSection = {
  key: string
  label: string
  kind: 'repo' | 'no-repo' | 'exploration'
  tickets: Group[]
  loose: WorkSession[]
  count: number
  lastMs: number
}

// Repo, then ticket, then session. A session with an issue but no repo of its own joins the repo
// that issue has elsewhere; a branch name never does, since every repo has its own branches.
// Sessions with neither are Exploration, last.
export function sectionSessions(sessions: WorkSession[]): RepoSection[] {
  const repoOfTicket = new Map<string, Map<string, number>>()
  const isIssue = (s: WorkSession) => !!s.ticket && s.ticketSource !== 'branch-name'
  for (const s of sessions) {
    if (!isIssue(s) || !s.repo) continue
    const counts = repoOfTicket.get(s.ticket) ?? new Map<string, number>()
    counts.set(s.repo, (counts.get(s.repo) ?? 0) + 1)
    repoOfTicket.set(s.ticket, counts)
  }
  const placed = sessions.map(s => {
    if (s.repo || !isIssue(s)) return { session: s, repo: s.repo }
    const counts = [...(repoOfTicket.get(s.ticket) ?? new Map()).entries()].sort((a, b) => b[1] - a[1])
    return { session: s, repo: counts[0]?.[0] as string | undefined }
  })

  const buckets = new Map<string, { kind: RepoSection['kind']; label: string; list: WorkSession[] }>()
  for (const { session, repo } of placed) {
    const kind = repo ? 'repo' : session.ticket ? 'no-repo' : 'exploration'
    const key = `${kind}:${repo ?? ''}`
    const label = repo ?? (kind === 'no-repo' ? 'No repo' : 'Exploration')
    const bucket = buckets.get(key) ?? { kind, label, list: [] }
    bucket.list.push(session)
    buckets.set(key, bucket)
  }

  const sections = [...buckets.entries()].map(([key, { kind, label, list }]): RepoSection => {
    const groups = groupSessions(list.map(s => ({ ...s, repo: undefined })))
    return {
      key,
      label,
      kind,
      tickets: groups
        .filter(g => g.kind === 'ticket')
        .map(g => ({ ...g, key: `${key}/${g.key}`, repos: [] })),
      loose: groups.filter(g => g.kind !== 'ticket').flatMap(g => g.sessions),
      count: list.length,
      lastMs: Math.max(...list.map(s => s.lastMs)),
    }
  })
  const rank = (s: RepoSection) => (s.kind === 'exploration' ? 2 : s.kind === 'no-repo' ? 1 : 0)
  return sections.sort((a, b) => rank(a) - rank(b) || b.lastMs - a.lastMs)
}

// Newest chat title in a group, for an issue GitHub has not named, or a branch.
export const themeOf = (group: Group) => group.sessions[0]?.title

export function ago(ms: number, nowMs: number): string {
  const minutes = Math.max(0, Math.round((nowMs - ms) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}
