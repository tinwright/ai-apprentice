import { expect, test } from 'claude-code/testing'

import type { WorkSession } from '../types'
import { isFinished, issueRef, issueViewArgs, parseIssue, staleRefs, titleOf } from './titles'

const HOUR = 3_600_000
const session = (ticket: string, repoSlug?: string): WorkSession => ({
  id: ticket, cwd: '/w', title: '', firstMs: 0, lastMs: 0, prompts: 1, isRework: false, activity: {}, ticket, repoSlug,
})

test('an issue needs its repo to be looked up; a branch name never is', () => {
  expect(issueRef('#1', 'owner/repo-a')).toBe('owner/repo-a#1')
  expect(issueRef('owner/repo-b#2', 'owner/repo-a')).toBe('owner/repo-b#2')
  expect(issueRef('#1', undefined)).toBeUndefined()
  expect(issueRef('feature-a', 'owner/repo-a')).toBeUndefined()
})

test('only missing or six-hour-old titles are looked up, once each', () => {
  const list = [session('#1', 'owner/repo-a'), session('#1', 'owner/repo-a'), session('#2', 'owner/repo-a'), session('#3'), session('feature-a', 'owner/repo-a')]
  const cache = {
    'owner/repo-a#1': { summary: 'First change', fetchedMs: 0 },
    'owner/repo-a#2': { summary: 'Second change', fetchedMs: 0 },
  }
  expect(staleRefs(list, cache, HOUR)).toEqual([])
  expect(staleRefs(list, { 'owner/repo-a#1': cache['owner/repo-a#1'] }, HOUR)).toEqual(['owner/repo-a#2'])
  expect(staleRefs(list, cache, 7 * HOUR)).toEqual(['owner/repo-a#1', 'owner/repo-a#2'])
})

test('gh is asked for the Project status, and can be asked without it', () => {
  expect(issueViewArgs('owner/repo-a#1', true)).toEqual(['gh', 'issue', 'view', '1', '-R', 'owner/repo-a', '--json', 'title,state,projectItems'])
  expect(issueViewArgs('owner/repo-a#1', false).at(-1)).toBe('title,state')
})

test('the status is the Project status, else closed or merged, else none', () => {
  expect(parseIssue('{"title":"First change","state":"OPEN","projectItems":[{"status":{"name":"In progress"}}]}')).toEqual({ summary: 'First change', status: 'In progress' })
  expect(parseIssue('{"title":"First change","state":"CLOSED","projectItems":[]}')).toEqual({ summary: 'First change', status: 'closed' })
  expect(parseIssue('{"title":"First change","state":"OPEN"}')).toEqual({ summary: 'First change', status: undefined })
  expect(parseIssue('not json')).toBeUndefined()
})

test('a group finds its title through any session that knows the repo', () => {
  const titles = { 'owner/repo-a#1': { summary: 'First change', fetchedMs: 0 }, 'owner/repo-a#2': { summary: '', fetchedMs: 0 } }
  expect(titleOf(titles, [session('#1'), session('#1', 'owner/repo-a')], '#1')?.summary).toBe('First change')
  // An issue gh could not find is cached empty, and reads as no title.
  expect(titleOf(titles, [session('#2', 'owner/repo-a')], '#2')).toBeUndefined()
})

test('closed issues and the usual last Project columns are finished work', () => {
  for (const status of ['closed', 'Done', 'merged', 'Completed', "Won't do"]) expect(isFinished(status)).toBe(true)
  for (const status of [undefined, 'In progress', 'Todo', 'In review', 'Done-ish']) expect(isFinished(status)).toBe(false)
})
