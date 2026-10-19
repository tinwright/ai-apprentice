import { expect, mock, test } from 'claude-code/testing'

import type { LiveUsage, TicketTitle, WorkSession } from '../types'

const SESSIONS: WorkSession[] = [
  { id: 's1', cwd: '/w/repo-a', title: 'Session one', lastMs: 1_000, prompts: 3, activity: {}, firstMs: 0, isRework: false, ticket: '#1', ticketSource: 'branch', repo: 'repo-a', repoSlug: 'owner/repo-a', prNumber: 5, contextTokens: 84_000, costUsd: 2.5 },
  { id: 's2', cwd: '/w/repo-a', title: 'Session two', lastMs: 2_000, prompts: 2, activity: {}, firstMs: 0, isRework: false, repo: 'repo-a', repoSlug: 'owner/repo-a', costUsd: 1.25 },
  { id: 's3', cwd: '/w/repo-a', title: 'Session three', lastMs: 500, prompts: 2, activity: {}, firstMs: 0, isRework: false, ticket: 'feature-a', ticketSource: 'branch-name', repo: 'repo-a', repoSlug: 'owner/repo-a' },
  { id: 's4', cwd: '/home', title: 'Session four', lastMs: 3_000, prompts: 1, activity: {}, firstMs: 0, isRework: false },
]

const TITLES: Record<string, TicketTitle> = {
  'owner/repo-a#1': { summary: 'First change', status: 'In progress', fetchedMs: 0 },
}

const PANE = {
  component: 'Pane',
  requestId: 'current-affairs',
  props: { title: 'Recent work', isFocused: true, bodyColumns: 100, placement: 'dock' } as any,
} as const

test('repos hold their issues, branches and loose sessions; Exploration starts closed', async ($, on) => {
  on('state.get', { plugin: 'current-affairs', key: 'sessions' }, async () => ({ value: { value: SESSIONS, version: 1 } }))
  on('state.get', { plugin: 'current-affairs', key: 'titles' }, async () => ({ value: { value: TITLES, version: 1 } }))
  mock.clock(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'current-affairs', surface, ...PANE })
    expect((await ui.find({ key: 'row:repo:repo-a' }))?.text).toContain('repo-a')

    const issue = await ui.find({ key: 'row:repo:repo-a/ticket:#1' })
    expect(issue?.text).toContain('First change')
    expect(issue?.text).toContain('In progress')
    // A branch with no issue shows its newest chat title.
    expect((await ui.find({ key: 'row:repo:repo-a/ticket:feature-a' }))?.text).toContain('Session three')
    expect((await ui.find({ key: 'row:s1' }))?.text).toContain('#5')
    // Sessions with no issue or branch wait under their own closed row.
    expect(await ui.find({ key: 's2' })).toBeUndefined()
    await ui.press({ key: 'repo:repo-a/loose' })
    expect((await ui.find({ key: 's2' }))?.text).toContain('Session two')
    await ui.press({ key: 'repo:repo-a/loose' })

    expect((await ui.find({ key: 'row:exploration:' }))?.text).toContain('Exploration')
    expect(await ui.find({ key: 's4' })).toBeUndefined()
    await ui.press({ key: 'exploration:' })
    expect(await ui.find({ key: 's4' })).toBeDefined()

    await ui.press({ key: 'repo:repo-a' })
    expect(await ui.find({ key: 's1' })).toBeUndefined()
    expect(await ui.find({ key: 'repo:repo-a/ticket:#1' })).toBeUndefined()
    await ui.press({ key: 'repo:repo-a' })
    await ui.press({ key: 'exploration:' })
    await ui.unmount()
  }
})

const USAGE: LiveUsage = {
  context: { tokens: 84_000, window: 200_000, percent: 42 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 23, resetsAt: new Date(2 * 3_600_000).toISOString() },
    { kind: 'seven_day', percentUsed: 91 },
  ],
  costUsd: 1.25,
}

test('the pane leads with this session\'s context and the account\'s limits', async ($, on) => {
  on('state.get', { plugin: 'current-affairs', key: 'sessions' }, async () => ({ value: { value: SESSIONS, version: 1 } }))
  on('state.get', { plugin: 'current-affairs', key: 'usage' }, async () => ({ value: { value: USAGE, version: 1 } }))
  mock.clock(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'current-affairs', surface, ...PANE })
    const context = (await ui.find({ key: 'usage:context' }))?.text
    expect(context).toContain('42%')
    expect(context).toContain('84k / 200k')
    expect(context).not.toContain('$')
    expect((await ui.find({ key: 'usage:cost' }))?.text).toContain('$1.25')
    expect((await ui.find({ key: 'usage:five_hour' }))?.text).toContain('5-hour limit')
    expect((await ui.find({ key: 'usage:seven_day' }))?.text).toContain('91%')
    // Each past session says how full its context was when it stopped.
    expect((await ui.find({ key: 'row:s1' }))?.text).toContain('84k ctx')
    await ui.unmount()
  }
})

test('with no reading yet, the pane draws no usage block', async ($, on) => {
  on('state.get', { plugin: 'current-affairs', key: 'sessions' }, async () => ({ value: { value: SESSIONS, version: 1 } }))
  mock.clock(on)
  const ui = await $.ui.mount({ plugin: 'current-affairs', surface: 'terminal', ...PANE })
  expect(await ui.find({ key: 'usage' })).toBeUndefined()
  await ui.unmount()
})

test('the cost row shows the last turn beside the session total', async ($, on) => {
  on('state.get', { plugin: 'current-affairs', key: 'usage' }, async () => ({ value: { value: USAGE, version: 1 } }))
  on('state.get', { plugin: 'current-affairs', key: 'lastTurn' }, async () => ({ value: { value: { usd: 0.42, durationMs: 83_000 }, version: 1 } }))
  mock.clock(on)
  const ui = await $.ui.mount({ plugin: 'current-affairs', surface: 'terminal', ...PANE })
  const cost = (await ui.find({ key: 'usage:cost' }))?.text
  expect(cost).toContain('$1.25')
  expect(cost).toContain('$0.42')
  expect(cost).toContain('last turn, 1m 23s')
  await ui.unmount()
})

test('sessions, issues and repos show what their work cost', async ($, on) => {
  on('state.get', { plugin: 'current-affairs', key: 'sessions' }, async () => ({ value: { value: SESSIONS, version: 1 } }))
  mock.clock(on)
  const ui = await $.ui.mount({ plugin: 'current-affairs', surface: 'terminal', ...PANE })
  expect((await ui.find({ key: 'row:s1' }))?.text).toContain('$2.50')
  expect((await ui.find({ key: 'row:repo:repo-a/ticket:#1' }))?.text).toContain('$2.50')
  expect((await ui.find({ key: 'row:repo:repo-a' }))?.text).toContain('$3.75')
  // A branch whose sessions cost nothing known shows no figure.
  expect((await ui.find({ key: 'row:repo:repo-a/ticket:feature-a' }))?.text).not.toContain('$')
  await ui.unmount()
})

test('work can be put away until it moves again, and finished issues go by themselves', async ($, on) => {
  let list = SESSIONS
  on('state.get', { plugin: 'current-affairs', key: 'sessions' }, async () => ({ value: { value: list, version: 1 } }))
  on('state.get', { plugin: 'current-affairs', key: 'titles' }, async () => ({
    value: { value: { 'owner/repo-a#1': { summary: 'First change', status: 'Done', fetchedMs: 0 } }, version: 1 },
  }))
  const store = new Map<string, unknown>()
  on('store.get', async (_, e) => ({ value: store.get(e.key) }))
  on('store.set', async (_, e) => (store.set(e.key, e.value), { value: undefined }))
  mock.clock(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'current-affairs', surface, ...PANE })
    // #1 is Done, so it starts away; the branch is still in view.
    expect(await ui.find({ key: 'row:repo:repo-a/ticket:#1' })).toBeUndefined()
    await ui.press({ key: 'hide:repo:repo-a/ticket:feature-a' })
    expect(await ui.find({ key: 'row:repo:repo-a/ticket:feature-a' })).toBeUndefined()
    expect((await ui.find({ key: 'show-hidden' }))?.text).toContain('2 hidden')

    // Shown again, dimmed, each with a way back.
    await ui.press({ key: 'show-hidden' })
    expect(await ui.find({ key: 'row:repo:repo-a/ticket:#1' })).toBeDefined()
    await ui.press({ key: 'unhide:repo:repo-a/ticket:#1' })
    await ui.press({ key: 'show-hidden' })
    expect(await ui.find({ key: 'row:repo:repo-a/ticket:#1' })).toBeDefined()
    expect((await ui.find({ key: 'show-hidden' }))?.text).toContain('1 hidden')

    // New activity on the branch brings it back.
    list = SESSIONS.map(s => (s.id === 's3' ? { ...s, lastMs: Date.now() + 60_000 } : s))
    await ui.press({ key: 'repo:repo-a' })
    await ui.press({ key: 'repo:repo-a' })
    expect(await ui.find({ key: 'row:repo:repo-a/ticket:feature-a' })).toBeDefined()
    expect(await ui.find({ key: 'show-hidden' })).toBeUndefined()

    // Back as it began, for the next surface: #1 away, the branch in view.
    list = SESSIONS
    await ui.press({ key: 'repo:repo-a' })
    await ui.press({ key: 'repo:repo-a' })
    await ui.press({ key: 'show-hidden' })
    await ui.press({ key: 'unhide:repo:repo-a/ticket:feature-a' })
    await ui.press({ key: 'hide:repo:repo-a/ticket:#1' })
    await ui.press({ key: 'show-hidden' })
    expect(await ui.find({ key: 'row:repo:repo-a/ticket:#1' })).toBeUndefined()
    await ui.unmount()
  }
})

test('a context filling up is warned of once at the option\'s mark, again at 90%, and again after a compact', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', async (_, e) => (toasts.push(e.text), { value: undefined }))
  on('session.measure', async (_, e) => ({ changed: e.changed }))
  const measure = (percent: number) =>
    $.session.measure({ context: { window: 200_000, tokens: percent * 2_000, percent }, rateLimits: [], changed: ['context'] })
  await measure(50)
  await measure(81)
  await measure(85)
  expect(toasts).toEqual(['Context 81% full: /compact or start a fresh session soon'])
  await measure(93)
  expect(toasts.at(-1)).toBe('Context 93% full: /compact now, or start a fresh session')
  await measure(20)
  await measure(82)
  expect(toasts.length).toBe(3)
})

test('the context warning follows the option, and 0 turns it off', { options: { context_warning: 0 } }, async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', async (_, e) => (toasts.push(e.text), { value: undefined }))
  on('session.measure', async (_, e) => ({ changed: e.changed }))
  await $.session.measure({ context: { window: 200_000, tokens: 196_000, percent: 98 }, rateLimits: [], changed: ['context'] })
  expect(toasts).toEqual([])
})
