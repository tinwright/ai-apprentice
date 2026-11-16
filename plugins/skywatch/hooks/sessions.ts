// Which other sessions have finished and are waiting on you. The app's session list says only
// whether each one is running, so a session counts as waiting once it goes from running to
// stopped, until it runs again, drops off the list, is seen, or three hours pass.

export const FORGET_MS = 3 * 60 * 60_000

export type SessionRow = { sessionId: string; title?: string; isRunning?: boolean; link?: string }
export type Waiting = { id: string; title: string; link?: string; since: number }
export type Tracker = { wasRunning: Map<string, boolean>; waiting: Waiting[]; firstLook: boolean }

export const newTracker = (): Tracker => ({ wasRunning: new Map(), waiting: [], firstLook: true })

// Folds one look at the session list into the tracker. True when the waiting list changed.
export function track(tr: Tracker, rows: SessionRow[], now: number): boolean {
  const before = tr.waiting.map(w => w.id).join()
  for (const row of rows) {
    const running = row.isRunning === true
    const was = tr.wasRunning.get(row.sessionId)
    // The first look only learns what's running: nothing has finished under our eyes yet.
    if (!tr.firstLook && was === true && !running && !tr.waiting.some(w => w.id === row.sessionId)) {
      tr.waiting.push({ id: row.sessionId, title: row.title || 'Untitled session', link: row.link, since: now })
    }
    if (running) tr.waiting = tr.waiting.filter(w => w.id !== row.sessionId)
    tr.wasRunning.set(row.sessionId, running)
  }
  const listed = new Set(rows.map(r => r.sessionId))
  tr.waiting = tr.waiting.filter(w => (listed.has(w.id) || w.id === 'test') && now - w.since < FORGET_MS)
  tr.firstLook = false
  return tr.waiting.map(w => w.id).join() !== before
}

// Claude Code-style flavour lines. {s} is where the session names go. One is picked per set of
// finished sessions, so the line holds still while you look at it.
export const ONE = [
  '{s} is ready for your eyes',
  '{s} wrapped up. Come take a look',
  'Psst… {s} is done',
  '{s} finished cooking',
  '{s} has news for you',
  'Fresh out of the oven: {s}',
  '{s} landed. Have a peek',
  '{s} is waiting on you',
  '{s} put the kettle on for you',
]
export const MANY = [
  '{s} are ready for your eyes',
  'A little pile-up: {s}',
  '{s} all finished cooking',
  '{s} are waiting on you',
  'Busy, busy: {s} are done',
]

export function flavour(list: Waiting[]): string {
  let h = 0
  for (const ch of list.map(w => w.id + w.since).join()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const lines = list.length === 1 ? ONE : MANY
  return lines[h % lines.length] ?? '{s} is done'
}

export const short = (s: string) => (s.length > 34 ? `${s.slice(0, 33)}…` : s)
