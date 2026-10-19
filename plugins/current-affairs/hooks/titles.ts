import type { TicketTitle, WorkSession } from '../types'

// GitHub issue titles, cached in $.store under `owner/repo#12`. register.tsx looks each stale one
// up with `gh issue view`; these are the parts that don't need $. With titles set to `none`, the
// panes use chat titles instead and nothing is looked up.

export type TitleConfig = { source: string }

const STALE_MS = 6 * 3_600_000
const SHORT = /^#(\d+)$/
const FULL = /^[\w.-]+\/[\w.-]+#\d+$/

/** An issue's full `owner/repo#12`; undefined for a branch name, or a `#12` with no known repo. */
export function issueRef(ticket: string | undefined, slug: string | undefined): string | undefined {
  if (!ticket) return undefined
  if (FULL.test(ticket)) return ticket
  return SHORT.test(ticket) && slug ? `${slug}${ticket}` : undefined
}

/** The title of a group's issue, from the repo of whichever session knows it. */
export function titleOf(
  titles: Record<string, TicketTitle>,
  sessions: WorkSession[],
  ticket: string,
): TicketTitle | undefined {
  const slug = sessions.find(s => s.repoSlug)?.repoSlug
  const ref = issueRef(ticket, slug)
  return ref && titles[ref]?.summary ? titles[ref] : undefined
}

/** Issues the sessions name whose cached title is missing or older than six hours. */
export function staleRefs(list: WorkSession[], cache: Record<string, TicketTitle>, nowMs: number): string[] {
  const wanted = new Set(list.map(s => issueRef(s.ticket, s.repoSlug)).filter((ref): ref is string => !!ref))
  return [...wanted].filter(ref => !cache[ref] || nowMs - cache[ref].fetchedMs > STALE_MS)
}

/** `gh issue view`'s argv for one issue; Project status needs the token's `read:project` scope. */
export function issueViewArgs(ref: string, withProjects: boolean): string[] {
  const [slug, number] = ref.split('#')
  return ['gh', 'issue', 'view', number, '-R', slug, '--json', withProjects ? 'title,state,projectItems' : 'title,state']
}

/** A title and status from `gh issue view --json`: the first Project status, else closed or merged. */
export function parseIssue(stdout: string): { summary: string; status?: string } | undefined {
  try {
    const row = JSON.parse(stdout) as {
      title?: string
      state?: string
      projectItems?: { status?: { name?: string } }[]
    }
    if (!row.title) return undefined
    const project = row.projectItems?.find(item => item.status?.name)?.status?.name
    const state = row.state && row.state !== 'OPEN' ? row.state.toLowerCase() : undefined
    return { summary: row.title, status: project ?? state }
  } catch {
    return undefined
  }
}

// Statuses that mean the work is over: GitHub's own closed, and the usual last Project columns.
const FINISHED = /^(closed|merged|done|completed?|shipped|released|won'?t do|not planned)$/i

/** Whether an issue's status says its work is finished. */
export const isFinished = (status: string | undefined) => !!status && FINISHED.test(status.trim())
