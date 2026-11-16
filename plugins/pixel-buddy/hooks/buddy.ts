import type { Activity, Moment, Phase, Waiting } from '../types'
import type { Pose } from './draw'

// ── Schedule (local time, minutes after midnight) ──────────────────────────
export const COFFEE_START = 8 * 60 // 8:00am
export const COFFEE_END = 10 * 60 + 30 // 10:30am
export const LUNCH_START = 12 * 60 // 12:00pm
export const LUNCH_END = 13 * 60 // 1:00pm
export const SLEEP_START = 22 * 60 // 10:00pm
export const WAKE_UP = 7 * 60 // 7:00am
export const FRIDAY_FROM = 12 * 60 // Friday afternoon sunglasses

// ── Timings ────────────────────────────────────────────────────────────────
export const JUMP_MS = 4000
export const COFFEE_BREAK_MS = 30_000
export const WILD_MS = 30_000
export const DOZE_AFTER_MS = 20 * 60_000 // nod off after 20 idle minutes
export const IMPATIENT_AFTER_MS = 60_000 // tap its foot after a question waits 1 min
export const PROUD_TURN_MS = 90_000 // a turn this long earns a ta-da
export const STRETCH_TURN_MS = 5 * 60_000 // a turn this long earns a stretch

// Smoothing: how long poses hold so the buddy doesn't flicker between them.
export const HOLD_MS = 1000 // a finished tool's pose stays this long before it falls back
export const MIN_POSE_MS = 600 // a new activity shows at least this long before another replaces it
export const MOMENT_MIN_MS = 1200 // a reaction shows at least this long before new work ends it
export const OOPS_COOLDOWN_MS = 8000 // at most one "oops!" per this long
export const HELPER_STALE_MS = 10 * 60_000 // a workflow agent unseen this long is dropped

export function phaseAt(ms: number): Phase {
  const d = new Date(ms)
  const m = d.getHours() * 60 + d.getMinutes()
  if (m >= COFFEE_START && m < COFFEE_END) return 'coffee'
  if (m >= LUNCH_START && m < LUNCH_END) return 'lunch'
  if (m >= SLEEP_START || m < WAKE_UP) return 'sleep'
  return 'awake'
}

export function fridayAt(ms: number): boolean {
  const d = new Date(ms)
  const m = d.getHours() * 60 + d.getMinutes()
  return d.getDay() === 5 && m >= FRIDAY_FROM && m < SLEEP_START
}

// Deliveries that count as "one of my Claude sessions pinged me".
export const PING_KINDS = new Set(['peer', 'peer-send-message', 'task-notification', 'projects-relay', 'coordinator'])

export function isPing(origin: { kind: string } | undefined, text: string): boolean {
  if (!origin) return false
  if (PING_KINDS.has(origin.kind)) return true
  // The desktop app's linked-session updates arrive unstamped.
  return origin.kind === 'unclassified' && /session/i.test(text)
}

export function activityFor(tool: string): Activity {
  if (tool === 'Bash' || tool === 'PowerShell' || tool === 'Monitor') return 'typing'
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit' || tool === 'NotebookEdit') return 'writing'
  if (['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch', 'ToolSearch'].includes(tool)) return 'searching'
  if (/search|fetch|find|browse|read_page|get_page/i.test(tool)) return 'searching'
  return 'none'
}

export const TEST_RE = /\b(npm (run )?test|pnpm test|yarn test|jest|vitest|pytest|cargo test|go test|rspec|mocha|playwright test)\b/
export const PUSH_RE = /\bgit\s+push\b/

export const CAPTION: Record<Pose, string> = {
  idle: '',
  jump: 'a session pinged you!',
  sleep: 'zzz… sleeping',
  coffee: 'morning coffee ☕',
  lunch: 'lunch break 🥪',
  typing: 'running a command',
  writing: 'editing files',
  searching: 'looking things up',
  thinking: 'thinking…',
  oops: 'oops!',
  proud: 'ta-da!',
  stretch: '*streeetch*',
  thumbs: 'saved to GitHub 👍',
  sweep: 'tidying up',
  wave: 'needs your OK',
  tap: 'still waiting on you…',
  dance: '',
  wild: 'FLARHGUNNSTOW',
}

const DOING: Record<Pose, string> = {
  idle: 'hanging out', jump: 'jumping', sleep: 'asleep', coffee: 'sipping coffee',
  lunch: 'eating a sandwich', typing: 'typing', writing: 'writing', searching: 'searching with a magnifying glass',
  thinking: 'thinking', oops: 'startled', proud: 'celebrating', stretch: 'stretching',
  thumbs: 'giving a thumbs-up', sweep: 'sweeping', wave: 'waving for your attention', tap: 'tapping its foot', dance: 'dancing', wild: 'going absolutely wild',
}

/** The drawing's alt text: "<name> typing". */
export const altFor = (name: string, pose: Pose) => `${name} ${DOING[pose]}`

// ── Demo: every mood in turn, 3 seconds each ───────────────────────────────
export const DEMO_MS = 3000
export const DEMO: { pose: Pose; caption: string; shades?: boolean; helpers?: number }[] = [
  { pose: 'idle', caption: 'just hanging out' },
  { pose: 'idle', caption: "it's Friday 😎", shades: true },
  { pose: 'thinking', caption: CAPTION.thinking },
  { pose: 'typing', caption: CAPTION.typing },
  { pose: 'writing', caption: CAPTION.writing },
  { pose: 'searching', caption: CAPTION.searching },
  { pose: 'typing', caption: 'running a command · + 2 helpers', helpers: 2 },
  { pose: 'oops', caption: CAPTION.oops },
  { pose: 'proud', caption: CAPTION.proud },
  { pose: 'stretch', caption: CAPTION.stretch },
  { pose: 'thumbs', caption: CAPTION.thumbs },
  { pose: 'wave', caption: CAPTION.wave },
  { pose: 'tap', caption: CAPTION.tap },
  { pose: 'sweep', caption: CAPTION.sweep },
  { pose: 'sleep', caption: 'dozing…' },
  { pose: 'coffee', caption: CAPTION.coffee },
  { pose: 'lunch', caption: CAPTION.lunch },
  { pose: 'jump', caption: CAPTION.jump },
]
/** The mood show for this buddy: dancers show their moves second. */
export function demoFor(dances: boolean): typeof DEMO {
  return dances ? [DEMO[0]!, { pose: 'dance', caption: 'dancing ♪' }, { pose: 'wild', caption: CAPTION.wild }, ...DEMO.slice(1)] : DEMO
}

export function choosePose(s: {
  phase: Phase; sipping: boolean; activity: Activity; moment: Moment; waiting: Waiting; dozing: boolean; working: boolean
}): Pose {
  if (s.waiting === 'approval' || s.waiting === 'question') return 'wave'
  if (s.waiting === 'impatient') return 'tap'
  if (s.moment !== 'none') return s.moment
  if (s.activity !== 'none') return s.activity
  if (s.working) return 'thinking'
  if (s.sipping || s.phase === 'coffee') return 'coffee'
  if (s.phase === 'lunch') return 'lunch'
  if (s.phase === 'sleep' || s.dozing) return 'sleep'
  return 'idle'
}

