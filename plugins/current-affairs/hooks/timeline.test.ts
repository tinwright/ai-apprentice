import { expect, mock, test } from 'claude-code/testing'

import type { WorkSession } from '../types'
import { axis, buildTimeline, dailyBars, dayHours, formatHours, hoursWorked, laneRuns, pickCellsPerDay } from './timeline'

// Sunday 11 Oct 2026, 15:00 UTC, at UTC+1.
const NOW = Date.parse('2026-10-11T15:00:00Z')
const TZ = 60

const session = (over: Partial<WorkSession>): WorkSession => ({
  id: 'x', cwd: '/w', title: 'chat', firstMs: NOW, lastMs: NOW, prompts: 1, isRework: false, activity: {}, ...over,
})

test('activity lands in local-time cells, lanes per issue colored by repo', async () => {
  const t = buildTimeline(
    [
      session({ id: 'a', ticket: '#1', repo: 'repo-a', repoSlug: 'owner/repo-a', activity: { '2026-10-11T14': 10, '2026-10-10T23': 2 } }),
      session({ id: 'b', repo: 'repo-a', activity: { '2026-10-07T09': 5 } }),
      session({ id: 'c', activity: { '2026-10-05T12': 1 } }),
      session({ id: 'old', ticket: '#2', repo: 'repo-a', activity: { '2026-09-01T09': 50 } }),
    ],
    { 'owner/repo-a#1': { summary: 'First change', fetchedMs: 0 } },
    NOW,
    TZ,
    4,
  )
  expect(t.sessionCount).toBe(3)
  expect(t.lanes.map(l => l.label)).toEqual(['#1 First change', 'repo-a · no issue', 'Exploration'])
  const lane = t.lanes[0].cells
  // 14:00Z is 15:00 local today, the third 6h cell of the last day.
  expect(lane[6 * 4 + 2]).toBe(10)
  // 23:00Z on the 10th is midnight local on the 11th: today's first cell.
  expect(lane[6 * 4 + 0]).toBe(2)
  expect(t.lanes[0].color).toBe(t.lanes[1].color)
  expect(t.lanes[2].color).toBe('#8a8a8a')
  expect(t.dayLabels.at(-1)).toBe('Su11')
  expect(t.daily.at(-1)).toBe(12)
  expect(t.activeDays).toBe(3)
})

test('hours worked count each 5-minute slot once, bridging pauses up to 15 minutes', async () => {
  // Today (Su11) is the last of the 7 days; the window's first day is Mo5.
  const firstDay = Math.floor((NOW + TZ * 60_000) / 86_400_000) - 6
  const hours = hoursWorked(
    [
      // 10:00 to 10:55 UTC every 5 minutes: an hour, the first slot plus eleven 5-minute steps.
      session({ id: 'a', slots: Array.from({ length: 12 }, (_, i) => `2026-10-11T10:${String(i * 5).padStart(2, '0')}`) }),
      // A parallel session in the same hour adds nothing; its 11:10 slot bridges the 15-minute pause.
      session({ id: 'b', slots: ['2026-10-11T10:20', '2026-10-11T11:10'] }),
      // A lone slot after a long gap counts its own 5 minutes, on its local day (23:30Z is the 11th at UTC+1).
      session({ id: 'c', slots: ['2026-10-10T23:30', '2026-10-09T08:00'] }),
      // Outside the window.
      session({ id: 'd', slots: ['2026-09-01T08:00'] }),
    ],
    firstDay,
    TZ,
  )
  expect(hours).toHaveLength(7)
  expect(Math.round(hours[6] * 60)).toBe(5 + 55 + 15 + 5)
  expect(Math.round(hours[4] * 60)).toBe(5)
  expect(hours.slice(0, 4)).toEqual([0, 0, 0, 0])
  expect(formatHours(1.333)).toBe('1.3h')
  expect(formatHours(2)).toBe('2h')
  expect(formatHours(23.6)).toBe('24h')
  expect(dayHours([0, 1.5, 12], 6)).toBe('      1.5h  12h   ')
  expect(dayHours([0, 1.5, 12], 3)).toBeUndefined()
})

test('cells per day fit the room, runs and rows keep their width', async () => {
  expect(pickCellsPerDay(100)).toBe(12)
  expect(pickCellsPerDay(10)).toBe(1)
  const runs = laneRuns([0, 0, 3, 9, 0, 0, 0, 1], 4, 9)
  expect(runs.map(r => r.text).join('')).toHaveLength(8)
  expect(runs.map(r => r.isActive)).toEqual([false, true, false, true])
  expect(axis(['Mo1', 'Tu2'], 4)).toBe('Mo1 Tu2 ')
  expect(dailyBars([0, 4, 8], 3)).toHaveLength(9)
})

test('the Last week pane draws lanes, the axis and the legend on every surface', async ($, on) => {
  const list = [
    session({ id: 'a', ticket: '#1', repo: 'repo-a', activity: { '2026-10-11T14': 10 }, slots: ['2026-10-11T14:00', '2026-10-11T14:15'] }),
    session({ id: 'c', activity: { '2026-10-05T12': 1 }, slots: ['2026-10-05T12:30'] }),
  ]
  on('state.get', { plugin: 'current-affairs', key: 'sessions' }, async () => ({ value: { value: list, version: 1 } }))
  on('state.get', { plugin: 'current-affairs', key: 'tzOffsetMin' }, async () => ({ value: { value: TZ, version: 1 } }))
  mock.clock(on, { now: NOW })
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({
      plugin: 'current-affairs',
      surface,
      component: 'Pane',
      requestId: 'current-affairs-timeline',
      props: { title: 'Last week', isFocused: false, bodyColumns: 100, placement: 'dock' } as any,
    })
    // 20 minutes on the 11th, 5 on the 5th: 25 minutes for the week.
    expect(await ui.find({ type: 'Text', text: /0\.4h worked · 2 sessions · 2\/7 active days/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /#1 chat/ })).toBeDefined()
    if (surface === 'terminal') {
      expect((await ui.find({ key: 'hours' }))?.text).toContain('0.3h')
      expect(await ui.find({ type: 'Text', text: /Su11/ })).toBeDefined()
    } else {
      // Everywhere else the axis and the hours are drawn, and say what they show to a screen reader.
      const drawn = async (key: string) => JSON.stringify((await ui.find({ key }))?.children)
      expect(await drawn('hours')).toContain('Su11 0.3h')
      expect(await drawn('axis')).toContain('Su11')
    }
    expect(await ui.find({ type: 'Text', text: /repo-a/ })).toBeDefined()
    await ui.unmount()
  }
})
