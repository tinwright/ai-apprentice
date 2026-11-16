import { expect, test } from 'claude-code/testing'

import { FORGET_MS, flavour, MANY, newTracker, ONE, short, track } from './sessions'

test('a session that stops running starts waiting, and running again clears it', () => {
  const tr = newTracker()
  // The first look learns what's running and flags nothing.
  expect(track(tr, [{ sessionId: 'a', title: 'Fix login', isRunning: true }, { sessionId: 'b', isRunning: false }], 0)).toBe(false)
  expect(tr.waiting).toEqual([])

  expect(track(tr, [{ sessionId: 'a', title: 'Fix login', isRunning: false, link: 'claude://a' }, { sessionId: 'b' }], 10)).toBe(true)
  expect(tr.waiting).toEqual([{ id: 'a', title: 'Fix login', link: 'claude://a', since: 10 }])

  // Still stopped: no change.
  expect(track(tr, [{ sessionId: 'a', isRunning: false }], 20)).toBe(false)
  expect(track(tr, [{ sessionId: 'a', isRunning: true }], 30)).toBe(true)
  expect(tr.waiting).toEqual([])
})

test('a waiting session goes after three hours or when it leaves the list', () => {
  const tr = newTracker()
  track(tr, [{ sessionId: 'a', isRunning: true }, { sessionId: 'b', isRunning: true }], 0)
  track(tr, [{ sessionId: 'a', isRunning: false }, { sessionId: 'b', isRunning: false }], 1)
  expect(tr.waiting.map(w => w.id)).toEqual(['a', 'b'])
  expect(tr.waiting[1]?.title).toBe('Untitled session')
  track(tr, [{ sessionId: 'a', isRunning: false }], 2)
  expect(tr.waiting.map(w => w.id)).toEqual(['a'])
  track(tr, [{ sessionId: 'a', isRunning: false }], 1 + FORGET_MS)
  expect(tr.waiting).toEqual([])
})

test('the flavour line holds still and fits the count', () => {
  const one = [{ id: 'a', title: 'A', since: 1 }]
  const two = [...one, { id: 'b', title: 'B', since: 2 }]
  expect(flavour(one)).toBe(flavour(one))
  expect(ONE).toContain(flavour(one))
  expect(MANY).toContain(flavour(two))
  for (const line of [...ONE, ...MANY]) expect(line.split('{s}').length).toBe(2)
  expect(short('x'.repeat(40))).toHaveLength(34)
  expect(short('Fix login')).toBe('Fix login')
})
