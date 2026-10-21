import { expect, test } from 'claude-code/testing'

import { slot, summarize } from './summarize'

const lines = (...rows: unknown[]) => rows.map(row => (typeof row === 'string' ? row : JSON.stringify(row))).join('\n')

const usage = { input_tokens: 10, cache_creation_input_tokens: 30, cache_creation: { ephemeral_1h_input_tokens: 20 }, cache_read_input_tokens: 100, output_tokens: 5 }

test('a transcript reads as summarize.jq reads it', async () => {
  const s = summarize(
    lines(
      { type: 'user', cwd: '/home/user/code/repo-a', timestamp: '2026-01-01T10:07:00Z', gitBranch: '12-fix-login', message: { content: 'Fix   the login, see owner/repo-a#12 and https://github.com/owner/repo-a/issues/12' } },
      { type: 'assistant', timestamp: '2026-01-01T10:08:00Z', message: { id: 'm1', model: 'model-a', usage: { ...usage, output_tokens: 1 } } },
      // The same reply's next content block: its usage replaces the first's.
      { type: 'assistant', timestamp: '2026-01-01T10:09:00Z', message: { id: 'm1', model: 'model-a', usage } },
      { type: 'user', cwd: '/elsewhere', timestamp: '2026-01-01T11:31:00Z', gitBranch: 'HEAD', message: { content: [{ type: 'text', text: '<command-name>/clear</command-name>' }] } },
      { type: 'user', isMeta: true, timestamp: '2026-01-01T11:32:00Z', message: { content: 'meta' } },
      // A subagent's reply counts for cost, not activity.
      { type: 'assistant', isSidechain: true, timestamp: '2026-01-01T12:00:00Z', message: { id: 'm2', model: 'model-b', usage: { ...usage, speed: 'fast' } } },
      { type: 'ai-title', aiTitle: 'Login fix' },
      { type: 'custom-title', customTitle: 'My login fix' },
      { type: 'pr-link', prNumber: 7, prRepository: 'owner/repo-a' },
      'not json',
      '[1, 2]',
    ),
  )
  expect(s.cwd).toBe('/home/user/code/repo-a')
  expect(s.first).toBe('2026-01-01T10:07:00Z')
  expect(s.last).toBe('2026-01-01T11:32:00Z')
  expect(s.branches).toEqual({ '12-fix-login': 1 })
  expect(s.mentions).toEqual({ 'owner/repo-a#12': 1 })
  expect(s.hours).toEqual({ '2026-01-01T10': 3, '2026-01-01T11': 2 })
  expect(s.slots).toEqual({ '2026-01-01T10:05': 1, '2026-01-01T11:30': 1 })
  expect(s.prompts).toBe(1)
  expect(s.prompt).toBe('Fix the login, see owner/repo-a#12 and https://github.com/owner/repo-a/issues/12')
  expect(s.context).toBe(140)
  expect(s.tokens).toEqual({ 'model-a': [10, 10, 20, 100, 5], 'model-b/fast': [10, 10, 20, 100, 5] })
  expect(s.aiTitle).toBe('Login fix')
  expect(s.name).toBe('My login fix')
  expect([s.prNumber, s.prRepo]).toEqual([7, 'owner/repo-a'])
})

test('an empty transcript is an empty summary', async () => {
  const s = summarize('')
  expect([s.cwd, s.first, s.last, s.prompt, s.prompts]).toEqual([null, null, null, null, 0])
  expect(s.tokens).toEqual({})
})

test('activity falls in 5-minute slots', async () => {
  expect(slot('2026-01-01T09:04:59Z')).toBe('2026-01-01T09:00')
  expect(slot('2026-01-01T09:55:00Z')).toBe('2026-01-01T09:55')
})
