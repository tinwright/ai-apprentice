// Counts the punctuation and stock phrases that give away AI-assisted writing, so the
// write-like-me skill can learn someone's voice from what they wrote themselves, not from
// what a model polished for them.

import type { ToolSpec } from 'claude-code'

export const TOOL_NAME = 'mcp__write-like-me__check_tells'

export const CHECK_TELLS: ToolSpec = {
  name: 'check_tells',
  description:
    'Counts AI-writing tells (em dashes, arrows, stock phrases) in samples of someone\'s writing and ' +
    'compares each sample with the dash style most of the samples use. Samples marked "likely assisted" ' +
    'should count for less when learning the voice. Follow the write-like-me skill for how to use it.',
  inputSchema: {
    type: 'object',
    required: ['samples'],
    properties: {
      samples: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['label', 'text'],
          additionalProperties: false,
          properties: {
            label: { type: 'string', description: 'Where it came from, such as "blog: On disappointment (2019)".' },
            text: {
              type: 'string',
              description:
                'At least 30 words the person wrote, as they wrote them, without other people\'s text. Code, quotes (lines starting with >) and URLs are ignored.',
            },
          },
        },
      },
    },
  },
}

export type Sample = { label: string; text: string }

export type Tells = {
  label: string
  words: number
  emDashes: number
  spacedHyphens: number
  arrows: number
  phrases: string[]
  likelyAssisted: boolean
}

// Stock phrases models reach for and people rarely type. Kept short on purpose: a long list
// flags normal writing too.
const PHRASES = [
  "it's worth noting",
  "here's the thing",
  'delve',
  'in summary',
  'in short,',
  'seamless',
  'leverage',
  'robust',
  'a testament to',
]

// Below this, a sample's dash says too little about the person to vote on their usual one.
const MIN_WORDS = 30

const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0

/** Only the prose: code, quoted text and URLs aren't the person's punctuation. */
export function proseOf(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .split('\n')
    .filter(line => !/^\s*>/.test(line))
    .join('\n')
    .replace(/https?:\/\/\S+/g, ' ')
}

export function tellsOf({ label, text }: Sample): Omit<Tells, 'likelyAssisted'> {
  const prose = proseOf(text)
  const lower = prose.toLowerCase()
  return {
    label,
    words: count(prose, /\S+/g),
    emDashes: count(prose, /—/g),
    // A spaced en dash is the same habit as a spaced hyphen: some keyboards swap one for the other.
    spacedHyphens: count(prose, / [-–] /g),
    arrows: count(prose, /[→⇒]/g),
    phrases: PHRASES.filter(phrase => lower.includes(phrase)),
  }
}

/**
 * Each sample's tells, and whether it's likely assisted. Someone who writes spaced hyphens in
 * most of their samples didn't write the em dashes in the others; a sample with two or more
 * stock phrases, or with arrows in prose, is suspect whatever the person's dash. Only samples
 * long enough to show a habit vote on the usual dash, and a tie decides nothing.
 */
export function checkTells(samples: Sample[]): Tells[] {
  const counted = samples.map(tellsOf)
  const voters = counted.filter(t => t.words >= MIN_WORDS)
  const hyphenFirst = voters.filter(t => t.spacedHyphens > t.emDashes).length
  const dashFirst = voters.filter(t => t.emDashes > t.spacedHyphens).length
  const usesHyphens = hyphenFirst > dashFirst
  return counted.map(t => ({
    ...t,
    likelyAssisted: (usesHyphens && t.emDashes > 0) || t.phrases.length >= 2 || t.arrows > 0,
  }))
}

/** The report Claude reads: one line per sample, then what the person's own dash seems to be. */
export function report(samples: Sample[]): string {
  if (!samples.length) return 'No samples: pass at least one.'
  const tells = checkTells(samples)
  const lines = tells.map(t => {
    const found = [
      t.emDashes && `${t.emDashes} em dash${t.emDashes > 1 ? 'es' : ''}`,
      t.spacedHyphens && `${t.spacedHyphens} spaced hyphen${t.spacedHyphens > 1 ? 's' : ''}`,
      t.arrows && `${t.arrows} arrow${t.arrows > 1 ? 's' : ''}`,
      t.phrases.length && `phrases: ${t.phrases.join(', ')}`,
    ].filter(Boolean)
    const short = t.words < MIN_WORDS ? ' Too short to show their dash.' : ''
    return `- ${t.label} (${t.words} words): ${found.join('; ') || 'no tells'}${t.likelyAssisted ? '. Likely assisted.' : '.'}${short}`
  })
  const voters = tells.filter(t => t.words >= MIN_WORDS)
  const hyphens = voters.reduce((sum, t) => sum + t.spacedHyphens, 0)
  const dashes = voters.reduce((sum, t) => sum + t.emDashes, 0)
  const dash =
    hyphens > dashes ? 'a spaced hyphen ( - )' : dashes > hyphens ? 'an em dash (—)' : 'unclear from these samples'
  return [...lines, '', `Their usual dash: ${dash}.`].join('\n')
}
