import type { Summary } from './classify'
import type { ModelTokens } from './pricing'

// summarize.jq, in TypeScript: one session transcript's text in, one compact summary out. The scan
// uses this for transcripts small enough to read whole, so most people need no jq at all.

type Row = Record<string, any>

function promptText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content))
    return content
      .filter(part => part?.type === 'text')
      .map(part => part.text)
      .join(' ')
  return ''
}

/** The 5-minute slot a timestamp falls in, "YYYY-MM-DDTHH:MM", for hours worked. */
export function slot(timestamp: string): string {
  const minutes = Math.floor(Number(timestamp.slice(14, 16)) / 5) * 5
  return timestamp.slice(0, 14) + String(minutes).padStart(2, '0')
}

const ISSUE_URL = /\bgithub\.com\/([\w.-]+\/[\w.-]+)\/issues\/([0-9]+)/g
const ISSUE_REF = /\b([\w.-]+\/[\w.-]+)#([0-9]+)\b/g

export function summarize(text: string): Summary {
  const s: Summary = {
    cwd: null, first: null, last: null, branches: {}, mentions: {}, hours: {}, slots: {}, prompts: 0,
    prompt: null, context: null, aiTitle: null, name: null, prNumber: null, prRepo: null,
  }
  // Every reply's tokens, subagents' included, for its cost. A reply is written once per content
  // block, each with the same message id: the last one's usage stands for it.
  const replies = new Map<string, [string, ...ModelTokens]>()
  const active = (timestamp: string) => {
    s.hours[timestamp.slice(0, 13)] = (s.hours[timestamp.slice(0, 13)] ?? 0) + 1
    s.slots![slot(timestamp)] = 1
  }

  for (const line of text.split('\n')) {
    let r: Row
    try {
      r = JSON.parse(line)
    } catch {
      continue
    }
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue

    const u = r.message?.usage
    if (r.type === 'assistant' && u && typeof u === 'object' && r.message.id) {
      const hour = u.cache_creation?.ephemeral_1h_input_tokens ?? 0
      replies.set(r.message.id, [
        `${r.message.model}${u.speed === 'fast' ? '/fast' : ''}`,
        u.input_tokens ?? 0, (u.cache_creation_input_tokens ?? 0) - hour, hour,
        u.cache_read_input_tokens ?? 0, u.output_tokens ?? 0,
      ])
    }

    const timestamp = typeof r.timestamp === 'string' && r.timestamp ? r.timestamp : undefined
    if (r.type === 'user' && !r.isSidechain) {
      s.cwd ??= r.cwd ?? null
      s.first ??= timestamp ?? null
      s.last = timestamp ?? s.last
      if (timestamp) active(timestamp)
      if (r.gitBranch && r.gitBranch !== 'HEAD') s.branches[r.gitBranch] = (s.branches[r.gitBranch] ?? 0) + 1
      const t = promptText(r.message?.content)
      if (!r.isMeta && t && !t.startsWith('<')) {
        s.prompts += 1
        s.prompt ??= t.replace(/\s+/g, ' ').slice(0, 160)
        const refs = new Set([
          ...[...t.matchAll(ISSUE_URL)].map(m => `${m[1]}#${m[2]}`),
          ...[...t.matchAll(ISSUE_REF)].map(m => `${m[1]}#${m[2]}`),
        ])
        for (const ref of refs) s.mentions[ref] = (s.mentions[ref] ?? 0) + 1
      }
    } else if (r.type === 'assistant' && !r.isSidechain && timestamp) {
      s.last = timestamp
      active(timestamp)
      if (u) s.context = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
    } else if (r.type === 'ai-title') s.aiTitle = r.aiTitle
    else if (r.type === 'agent-name') s.name = r.agentName
    else if (r.type === 'custom-title') s.name = r.customTitle
    else if (r.type === 'pr-link') {
      s.prNumber = r.prNumber
      s.prRepo = r.prRepository
    }
  }

  // Tokens per model: [input, 5-minute cache writes, 1-hour cache writes, cache reads, output].
  const tokens: Record<string, ModelTokens> = {}
  for (const [model, ...counts] of replies.values()) {
    const sum = tokens[model] ?? [0, 0, 0, 0, 0]
    tokens[model] = sum.map((n, i) => n + counts[i]) as ModelTokens
  }
  s.tokens = tokens
  return s
}
