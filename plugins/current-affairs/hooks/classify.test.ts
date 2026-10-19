import { expect, test } from 'claude-code/testing'

import { configureClassify, groupSessions, issueRefsIn, primaryTicket, sectionSessions, repoFromGitDir, repoFromPath, slugFromRemote, toSession, type Summary } from './classify'

const HOME = '/home/user'
const SLUG = 'owner/repo-a'

const summary = (over: Partial<Summary>): Summary => ({
  cwd: `${HOME}/code/repo-a`,
  first: '2026-01-01T10:00:00Z',
  last: '2026-01-01T11:00:00Z',
  branches: {},
  mentions: {},
  hours: {},
  prompts: 2,
  prompt: 'hello',
  aiTitle: 'A title',
  name: null,
  prNumber: null,
  prRepo: null,
  ...over,
})

test('the branch names the issue before the path or the prompts', async () => {
  const found = primaryTicket(summary({ branches: { main: 3, '1-first-change': 40 }, mentions: { [`${SLUG}#2`]: 5 } }), SLUG)
  expect(found).toEqual({ ticket: '#1', source: 'branch' })
  expect(primaryTicket(summary({ branches: { 'issue-2': 1 } }))?.ticket).toBe('#2')
  expect(primaryTicket(summary({ branches: { 'fix/3-second-change': 1 } }))?.ticket).toBe('#3')
  // Release and bot branches carry versions, not issues.
  expect(primaryTicket(summary({ branches: { 'release/2-0': 1 } }))?.source).toBe('branch-name')
  expect(primaryTicket(summary({ branches: { 'feature-a': 1 } }))?.source).toBe('branch-name')
})

test('a worktree folder names the issue when the branch does not', async () => {
  expect(primaryTicket(summary({ cwd: `${HOME}/worktrees/repo-a/2`, branches: { main: 1 } }))).toEqual({ ticket: '#2', source: 'path' })
  expect(primaryTicket(summary({ cwd: `${HOME}/worktrees/repo-a-3` }))?.ticket).toBe('#3')
  // Outside a worktrees folder, a number in the path is just a name.
  expect(primaryTicket(summary({ cwd: `${HOME}/code/repo-4` }))).toBeUndefined()
})

test('a clear lead in prompt mentions names the issue; a tie does not', async () => {
  expect(primaryTicket(summary({ mentions: { [`${SLUG}#1`]: 3, [`${SLUG}#2`]: 1 } }), SLUG)?.ticket).toBe('#1')
  expect(primaryTicket(summary({ mentions: { 'owner/repo-b#1': 2 } }), SLUG)?.ticket).toBe('owner/repo-b#1')
  expect(primaryTicket(summary({ mentions: { [`${SLUG}#1`]: 2, [`${SLUG}#2`]: 2 } }), SLUG)).toBeUndefined()
  expect(primaryTicket(summary({ mentions: { [`${SLUG}#1`]: 2, [`${SLUG}#2`]: 2 }, prompt: `look at ${SLUG}#2` }), SLUG)?.ticket).toBe('#2')
})

test('issue references are full refs or issue URLs, never a bare number', async () => {
  expect(issueRefsIn('see https://github.com/owner/repo-a/issues/3, owner/repo-b#4, #1 priority and UTF-8')).toEqual([
    'owner/repo-a#3',
    'owner/repo-b#4',
  ])
})

test('repos come from git, the home dotfiles repo is none, the path is a fallback', async () => {
  expect(repoFromGitDir(`${HOME}/code/repo-a/.git`, HOME)).toBe('repo-a')
  expect(repoFromGitDir(`${HOME}/.git`, HOME)).toBeUndefined()
  expect(repoFromPath(`${HOME}/worktrees/repo-a-12`, HOME)).toBe('repo-a')
  expect(repoFromPath(`${HOME}/worktrees/repo-a/12`, HOME)).toBe('repo-a')
  expect(repoFromPath(HOME, HOME)).toBeUndefined()
  expect(repoFromPath(`${HOME}/.claude`, HOME)).toBeUndefined()
})

test('the GitHub owner and repo come from the remote URL', async () => {
  expect(slugFromRemote('git@github.com:owner/repo-a.git\n')).toBe('owner/repo-a')
  expect(slugFromRemote('https://github.com/owner/repo-a')).toBe('owner/repo-a')
  expect(slugFromRemote('https://example.com/owner/repo-a.git')).toBeUndefined()
})

test('a session keeps its repo slug, from git or else from a linked PR', async () => {
  expect(toSession('a', summary({}), 'repo-a', SLUG)?.repoSlug).toBe(SLUG)
  expect(toSession('a', summary({ prRepo: 'owner/repo-b', prNumber: 1 }), undefined)?.repoSlug).toBe('owner/repo-b')
})

test('sessions group by issue, then repo, with exploration last', async () => {
  const sessions = [
    toSession('a', summary({ branches: { '1-first-change': 1 }, last: '2026-01-01T09:00:00Z' }), 'repo-a'),
    toSession('b', summary({ last: '2026-01-01T12:00:00Z' }), 'repo-a'),
    toSession('c', summary({ cwd: HOME, last: '2026-01-01T13:00:00Z' }), undefined),
    toSession('d', summary({ prompts: 0 }), 'repo-a'),
  ].filter(s => s !== undefined)
  const groups = groupSessions(sessions)
  expect(groups.map(g => [g.kind, g.label])).toEqual([
    ['repo', 'repo-a'],
    ['ticket', '#1'],
    ['exploration', 'Exploration'],
  ])
  expect(groups[1].repos).toEqual(['repo-a'])
})

test('sections nest issues under repos; a repo-less session joins its issue repo', async () => {
  const base = { cwd: '/x', prompts: 1, title: 't', activity: {}, firstMs: 0, isRework: false }
  const sections = sectionSessions([
    { ...base, id: 'a', lastMs: 5, ticket: '#1', repo: 'repo-a' },
    { ...base, id: 'b', lastMs: 4, ticket: '#1', repo: 'repo-b' },
    { ...base, id: 'c', lastMs: 9, ticket: '#1' },
    { ...base, id: 'd', lastMs: 3, repo: 'repo-a' },
    { ...base, id: 'e', lastMs: 2, ticket: '#2' },
    { ...base, id: 'f', lastMs: 8 },
  ])
  expect(sections.map(s => s.label)).toEqual(['repo-a', 'repo-b', 'No repo', 'Exploration'])
  expect(sections[0].tickets.map(g => [g.key, g.sessions.map(s => s.id)])).toEqual([
    ['repo:repo-a/ticket:#1', ['c', 'a']],
  ])
  expect(sections[0].loose.map(s => s.id)).toEqual(['d'])
  expect(sections[2].tickets[0].label).toBe('#2')
  expect(sections[3].loose.map(s => s.id)).toEqual(['f'])
})

test('default branches come from the options', () => {
  configureClassify({ defaultBranches: ['trunk'] })
  expect(primaryTicket(summary({ branches: { trunk: 9 } }))).toBeUndefined()
  expect(primaryTicket(summary({ branches: { main: 2 } }))?.ticket).toBe('main')
  configureClassify({})
})

test('with no issue anywhere, the branch is the unit of work', () => {
  expect(primaryTicket(summary({ branches: { main: 1, 'feature-a': 6 } }))).toEqual({
    ticket: 'feature-a',
    source: 'branch-name',
  })
  expect(primaryTicket(summary({ branches: { 'feature-a': 3 }, mentions: { [`${SLUG}#3`]: 2 } }), SLUG)?.ticket).toBe('#3')
  expect(primaryTicket(summary({ branches: { main: 4 } }))).toBeUndefined()
})

test('a branch on few of a session\'s records is another folder\'s, and names no work', () => {
  // 5 of 46 records on the home dotfiles repo's branch, the rest on master.
  expect(primaryTicket(summary({ branches: { master: 41, 'personal-machine': 5 } }))).toBeUndefined()
  expect(primaryTicket(summary({ branches: { main: 30, '12-fix-login': 10 } }))?.ticket).toBe('#12')
})

test('a repo-less session joins its issue\'s repo, never a branch name\'s', () => {
  const base = { cwd: '/w', title: 't', firstMs: 0, lastMs: 1, prompts: 1, isRework: false, activity: {} }
  const sections = sectionSessions([
    { ...base, id: 'a', repo: 'repo-a', ticket: 'shared-branch', ticketSource: 'branch-name' },
    { ...base, id: 'b', ticket: 'shared-branch', ticketSource: 'branch-name' },
    { ...base, id: 'c', repo: 'repo-a', ticket: '#4', ticketSource: 'branch' },
    { ...base, id: 'd', ticket: '#4', ticketSource: 'mentions' },
  ])
  const repoA = sections.find(s => s.key === 'repo:repo-a')
  expect(repoA?.count).toBe(3)
  expect(sections.find(s => s.kind === 'no-repo')?.tickets.map(g => g.sessions.map(x => x.id))).toEqual([['b']])
})
