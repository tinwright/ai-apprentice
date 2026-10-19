import { expect, mock, test } from 'claude-code/testing'

import type { Trends, WorkSession } from '../types'
import { REWORK } from './classify'
import { closingIssue, computeTrends, direction, mergeHistory, ticketOfPr, type History, type MergedPr } from './trends'

const DAY = 86_400_000
const NOW = Date.parse('2026-10-11T15:00:00Z')
// The kit has no toBeCloseTo: compare to three decimals.
const near = (actual: number | undefined, expected: number) =>
  expect(Math.round((actual ?? Number.NaN) * 1000)).toBe(Math.round(expected * 1000))

const session = (over: Partial<WorkSession>): WorkSession => ({
  id: 'x', cwd: '/w', title: 'chat', firstMs: NOW, lastMs: NOW, prompts: 1, isRework: false, activity: {}, ...over,
})

test('rework is read from titles', async () => {
  for (const title of ['Address branch comments', 'Incorporate the comments', 'Merge master and resolve conflicts', 'CI fixes and review comments', 'Feedback from the review']) {
    expect(REWORK.test(title)).toBe(true)
  }
  for (const title of ['Add a settings page', 'Write the first tests', 'Comment box missing on one page', 'List the open pull requests']) {
    expect(REWORK.test(title)).toBe(false)
  }
})

test('saved days outlive cleanup; fresh days replace all but the earliest', async () => {
  const saved: History = {
    days: {
      '2026-09-01': { activity: 40, rework: 4, tickets: ['repo-a #1'] },
      '2026-10-02': { activity: 99, rework: 0, tickets: [] },
      '2026-10-05': { activity: 1, rework: 0, tickets: [] },
    },
    ticketFirstMs: { 'repo-a #1': Date.parse('2026-09-01T09:00:00Z') },
    sinceDay: '2026-09-01',
  }
  const fresh = [
    session({ ticket: '#1', repo: 'repo-a', firstMs: Date.parse('2026-10-02T09:00:00Z'), activity: { '2026-10-02T09': 3 } }),
    session({ ticket: '#1', repo: 'repo-b', firstMs: Date.parse('2026-10-05T10:00:00Z'), isRework: true, activity: { '2026-10-05T10': 6 } }),
  ]
  const history = mergeHistory(saved, fresh, 0, NOW)
  expect(history.days['2026-09-01'].activity).toBe(40)
  // The earliest fresh day may be cut short, so the saved one stands.
  expect(history.days['2026-10-02'].activity).toBe(99)
  // Each repo has its own #1.
  expect(history.days['2026-10-05']).toEqual({ activity: 6, rework: 6, tickets: ['repo-b #1'] })
  expect(history.ticketFirstMs['repo-a #1']).toBe(Date.parse('2026-09-01T09:00:00Z'))
  expect(history.ticketFirstMs['repo-b #1']).toBe(Date.parse('2026-10-05T10:00:00Z'))
  expect(history.sinceDay).toBe('2026-09-01')
})

test('a PR finds its issue through a linked session, then the issue its description closes', async () => {
  const pr: MergedPr = { repo: 'repo-a', number: 7, title: 'chore: bump', mergedMs: NOW }
  expect(ticketOfPr(pr, [session({ repo: 'repo-a', prNumber: 7, ticket: '#3' })])).toBe('repo-a #3')
  expect(ticketOfPr({ ...pr, issue: 4 }, [])).toBe('repo-a #4')
  expect(ticketOfPr(pr, [])).toBeUndefined()
  expect(closingIssue('Some notes.\n\nCloses #4')).toBe(4)
  expect(closingIssue('fixes: #5')).toBe(5)
  // A mention isn't a close.
  expect(closingIssue('Follows #6')).toBeUndefined()
})

test('trends compare two weeks with the prior six; a short history builds its baseline', async () => {
  const days: History['days'] = {}
  for (let d = 0; d < 56; d++) {
    const key = new Date(NOW - d * DAY).toISOString().slice(0, 10)
    days[key] = d < 14 ? { activity: 10, rework: 3, tickets: ['A', 'B'] } : { activity: 10, rework: 1, tickets: ['A'] }
  }
  const history: History = {
    days,
    ticketFirstMs: { 'r #1': NOW - 3 * DAY, 'r #2': NOW - 30 * DAY, 'r #3': NOW - 32 * DAY, 'r #4': NOW - 40 * DAY },
    sinceDay: new Date(NOW - 60 * DAY).toISOString().slice(0, 10),
  }
  const pr = (number: number, issue: number | undefined, mergedMs: number): MergedPr => ({ repo: 'r', number, title: 'a change', issue, mergedMs })
  const prs = [
    pr(11, 1, NOW - 1 * DAY),
    pr(12, 2, NOW - 20 * DAY),
    pr(13, 3, NOW - 22 * DAY),
    pr(14, 4, NOW - 30 * DAY),
    pr(15, undefined, NOW - 15 * DAY),
    pr(16, undefined, NOW - 16 * DAY),
  ]
  const trends = computeTrends(history, prs, [], NOW, 0)
  expect(trends.prsMerged.current).toBe(1)
  near(trends.prsMerged.baseline, (5 * 14) / 42)
  near(trends.cycleDays.current, 2)
  near(trends.cycleDays.baseline, 10)
  near(trends.reworkShare.current, 0.3)
  near(trends.reworkShare.baseline, 0.1)
  expect(trends.ticketsPerDay.current).toBe(2)
  expect(trends.ticketsPerDay.baseline).toBe(1)
  expect(direction(trends.cycleDays, false)).toBe('better')
  expect(direction(trends.reworkShare, false)).toBe('worse')

  const short = computeTrends({ ...history, days: Object.fromEntries(Object.entries(days).slice(0, 16)) }, prs, [], NOW, 0)
  expect(short.reworkShare.baseline).toBeUndefined()
  expect(short.reworkShare.baselineDays).toBe(2)
  // gh keeps the full PR history, so PRs always have a baseline.
  expect(short.prsMerged.baseline).toBeDefined()
})

test('the Last week pane shows the trends rows and a building baseline', async ($, on) => {
  const trends: Trends = {
    prsMerged: { current: 12, baseline: 9.7, baselineDays: 42 },
    cycleDays: { current: 2.1, baseline: 3.4, baselineDays: 30 },
    reworkShare: { current: 0.18, baselineDays: 3 },
    ticketsPerDay: { current: 4.2, baseline: 4.1, baselineDays: 30 },
  }
  on('state.get', { plugin: 'current-affairs', key: 'trends' }, async () => ({ value: { value: trends, version: 1 } }))
  mock.clock(on, { now: NOW })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'current-affairs',
      surface,
      component: 'Pane',
      requestId: 'current-affairs-timeline',
      props: { title: 'Last week', isFocused: false, bodyColumns: 100, placement: 'dock' } as any,
    })
    expect(await ui.find({ type: 'Text', text: /PRs merged\s+12\s+↑\s+9\.7/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Median cycle\s+2\.1d\s+↓\s+3\.4d/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Rework share\s+18%.*building baseline \(3 active days saved\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Items \/ day\s+4\.2\s+→/ })).toBeDefined()
    await ui.unmount()
  }
})
