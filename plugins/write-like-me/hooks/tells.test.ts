import { expect, test } from 'claude-code/testing'

import { TOOL_NAME, checkTells, proseOf, report } from './tells'

// Samples need 30 words to vote on the usual dash.
const filler = (n: number) => Array.from({ length: n }, () => 'word').join(' ')

const OWN = { label: 'blog', text: `ok - so - I think we split it in two, and see what sticks. ${filler(20)}` }
const OWN_TOO = { label: 'notes', text: `hmm - not sure about this one - the naming feels off. ${filler(25)}` }
const POLISHED = { label: 'wiki', text: 'The change is small — but it\'s worth noting that it is robust.' }

test('a sample with em dashes from someone who writes spaced hyphens is likely assisted', () => {
  const [own, ownToo, polished] = checkTells([OWN, OWN_TOO, POLISHED])
  expect(own.likelyAssisted).toBe(false)
  expect(ownToo.likelyAssisted).toBe(false)
  expect(polished.emDashes).toBe(1)
  expect(polished.phrases).toEqual(["it's worth noting", 'robust'])
  expect(polished.likelyAssisted).toBe(true)
})

test('em dashes alone are fine for someone who always writes them', () => {
  const tells = checkTells([
    { label: 'a', text: `One thing — then another. ${filler(30)}` },
    { label: 'b', text: `It works — mostly. ${filler(30)}` },
  ])
  expect(tells.map(t => t.likelyAssisted)).toEqual([false, false])
})

test('a spaced en dash counts as the same habit as a spaced hyphen', () => {
  const [t] = checkTells([{ label: 'a', text: 'yes – and no - maybe' }])
  expect(t.spacedHyphens).toBe(2)
})

test('short samples and ties decide nothing about the usual dash', () => {
  const short = { label: 'short', text: 'quick - one' }
  const dashed = { label: 'dashed', text: `It works — mostly. ${filler(30)}` }
  expect(checkTells([short, dashed]).map(t => t.likelyAssisted)).toEqual([false, false])
  expect(report([short])).toContain('Too short to show their dash.')
  expect(report([short])).toContain('Their usual dash: unclear from these samples.')
})

test('code, quotes and URLs are not the person\'s punctuation', () => {
  const text = 'mine - here\n> quoted — text\n```\na → b\n```\nsee `x → y` at https://example.com/a—b'
  expect(proseOf(text)).not.toContain('—')
  expect(proseOf(text)).not.toContain('→')
  const [t] = checkTells([{ label: 'mixed', text }])
  expect(t.arrows).toBe(0)
  expect(t.emDashes).toBe(0)
})

test('arrows in prose are suspect on their own', () => {
  const [t] = checkTells([{ label: 'doc', text: 'Problem → fix.' }])
  expect(t.likelyAssisted).toBe(true)
})

test('the report names each sample and the usual dash', () => {
  const text = report([OWN, OWN_TOO, POLISHED])
  expect(text).toContain('- wiki (13 words): 1 em dash; phrases: it\'s worth noting, robust. Likely assisted.')
  expect(text).toContain('Their usual dash: a spaced hyphen ( - ).')
  expect(report([])).toBe('No samples: pass at least one.')
})

test('check_tells answers through the engine', async ($, on) => {
  on('tool.register', (_, e) => ({ value: { tool: `mcp__write-like-me__${e.name}` } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const r = await $.tool.call({ tool: TOOL_NAME, samples: [OWN, POLISHED] } as never)
  expect(String(r.result)).toContain('Likely assisted.')

  const bad = await $.tool.call({ tool: TOOL_NAME } as never)
  expect(bad.deny).toContain('Pass samples')
})
