import type { Activity, Moment, Phase, Waiting } from '../types'

// ── Schedule (local time, minutes after midnight) ──────────────────────────
export const COFFEE_START = 8 * 60 // 8:00am
export const COFFEE_END = 10 * 60 + 30 // 10:30am
export const LUNCH_START = 12 * 60 // 12:00pm
export const LUNCH_END = 13 * 60 // 1:00pm
export const SLEEP_START = 22 * 60 // 10:00pm
export const WAKE_UP = 7 * 60 // 7:00am
export const FRIDAY_FROM = 12 * 60 // Friday afternoon sunglasses

// ── Timings ────────────────────────────────────────────────────────────────
export const YOOHOO_MS = 4000
export const COFFEE_BREAK_MS = 30_000
export const DOZE_AFTER_MS = 20 * 60_000 // nod off after 20 idle minutes
export const IMPATIENT_AFTER_MS = 60_000 // tap his foot after a question waits 1 min
export const PROUD_TURN_MS = 90_000 // a turn this long earns a ta-da
export const STRETCH_TURN_MS = 5 * 60_000 // a turn this long earns a stretch

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

// ── Pixel art ──────────────────────────────────────────────────────────────
export const U = 3.5 // px per pixel
export const W = 36
export const H = 13
export const OX = 12
export const OY = 5 // Clawd's top-left in the scene
export const BODY = '#D97757'
export const INK = '#1F1E1D'
export const GRAY = '#8E95AC'
export const CREAM = '#EDE6DA'
export const GOLD = '#F2C14E'
export const BROWN = '#8B5E3C'
export const RED = '#E5534B'
export const BUBBLE = '#3A3937'

export const px = (x: number, y: number, w = 1, h = 1, fill = BODY, cls = '') =>
  `<rect${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
export const g = (cls: string, inner: string) => `<g class="${cls}">${inner}</g>`

export type Eyes = 'open' | 'closed' | 'happy' | 'wide' | 'up' | 'down' | 'flat' | 'dot' | 'none'

// Open eyes are a single pixel each; closed, squinting and narrowed eyes are lines.
export function eyes(kind: Eyes, shades: boolean): string {
  if (shades && (kind === 'open' || kind === 'down' || kind === 'up'))
    return px(2, 1, 3, 2, INK) + px(6, 1, 3, 2, INK) + px(5, 1, 1, 1, INK) + px(2, 1, 1, 1, '#FFFFFF').replace('/>', ' opacity=".45"/>')
  switch (kind) {
    case 'none':
      return ''
    case 'dot':
      return g('blink', px(3, 1, 1, 1, INK) + px(7, 1, 1, 1, INK))
    case 'closed':
      return px(2, 2, 2, 1, INK) + px(7, 2, 2, 1, INK)
    case 'happy':
      return px(2, 2, 1, 1, INK) + px(3, 1, 1, 1, INK) + px(4, 2, 1, 1, INK) + px(6, 2, 1, 1, INK) + px(7, 1, 1, 1, INK) + px(8, 2, 1, 1, INK)
    case 'wide':
      return g('blink', px(3, 1, 1, 1, INK) + px(7, 1, 1, 1, INK))
    case 'up':
      return g('blink', px(4, 1, 1, 1, INK) + px(8, 1, 1, 1, INK))
    case 'down':
      return g('blink', px(3, 2, 1, 1, INK) + px(7, 2, 1, 1, INK))
    case 'flat':
      return px(2, 2, 2, 1, INK) + px(7, 2, 2, 1, INK) + px(2, 1, 2, 1, BODY)
    default:
      return g('blink', px(3, 1, 1, 1, INK) + px(7, 1, 1, 1, INK))
  }
}

export type Parts = { eyes?: Eyes; armL?: string; armR?: string; legs?: string; shades?: boolean }

export const ARM_L = px(-1, 2, 2, 2)
export const ARM_R = px(10, 2, 2, 2)
export const LEGS = px(1, 5, 1, 2) + px(3, 5, 1, 2) + px(7, 5, 1, 2) + px(9, 5, 1, 2)

export function clawd(o: Parts = {}): string {
  return px(1, 0, 9, 5) + (o.armL ?? ARM_L) + (o.armR ?? ARM_R) + (o.legs ?? LEGS) + eyes(o.eyes ?? 'open', o.shades ?? false)
}

export const mug = () => px(0, 0, 3, 3, CREAM) + px(0, 0, 3, 1, '#6B4A35') + px(3, 1, 1, 1, CREAM)
export const steam = () =>
  `<rect class="steam" x="0.5" y="-2" width="1" height="1"/><rect class="steam s2" x="1.5" y="-2" width="1" height="1"/><rect class="steam s3" x="1" y="-3" width="1" height="1"/>`
export const sandwich = () => px(0, 0, 3, 1, '#E3B36B') + px(0, 1, 3, 1, '#6DBE45') + px(0, 2, 3, 1, '#C0504D') + px(0, 3, 3, 1, '#E3B36B')

// ── Yoohoo ─────────────────────────────────────────────────────────────────
// From the pixel kit: a session pinged you, so a blue dot ('n') pops up over
// his head and he flaps his arms from straight up to out wide and back.
// A grid's top-left is at (-1, -3) in Clawd's own coordinates (column 7, row 2
// on a kit canvas).
const YOOHOO_GRIDS = {
  up: ['......n......', '..oo.....oo..', '..oo.....oo..', '..ooooooooo..', '..oo#ooo#oo..', '..ooooooooo..', '..ooooooooo..', '..ooooooooo..', '..o.o...o.o..', '..o.o...o.o..'],
  wide: ['......n......', '.oo.......oo.', '.oo.......oo.', '.ooooooooooo.', '..oo#ooo#oo..', '..ooooooooo..', '..ooooooooo..', '..ooooooooo..', '..o.o...o.o..', '..o.o...o.o..'],
  angle: ['......n......', 'oo.........oo', 'ooo.......ooo', '.ooooooooooo.', '..oo#ooo#oo..', '..ooooooooo..', '..ooooooooo..', '..ooooooooo..', '..o.o...o.o..', '..o.o...o.o..'],
  out: ['......n......', '.............', 'ooo.......ooo', 'ooooooooooooo', '..oo#ooo#oo..', '..ooooooooo..', '..ooooooooo..', '..ooooooooo..', '..o.o...o.o..', '..o.o...o.o..'],
} as const
type YoohooFrame = keyof typeof YOOHOO_GRIDS
const YOOHOO_STEPS: [YoohooFrame, number][] = [
  ['up', 0.18], ['wide', 0.18], ['angle', 0.18], ['out', 0.18], ['angle', 0.18], ['wide', 0.18],
]

// ── Wave ───────────────────────────────────────────────────────────────────
// Waving for your OK: the yoohoo's arm flap on his right arm only, with his
// left arm resting at his side and the yoohoo's eyes, but no blue dot. Built
// from the yoohoo frames, so it changes when they do.
const WAVE_REST = [
  '.............', '.............', '.............', '..ooooooooo..', '..oo#ooo#oo..',
  'ooooooooooooo', 'ooooooooooooo', '..ooooooooo..', '..o.o...o.o..', '..o.o...o.o..',
]
const WAVE_GRIDS = Object.fromEntries(
  (Object.keys(YOOHOO_GRIDS) as YoohooFrame[]).map(f => [
    f,
    YOOHOO_GRIDS[f].map((row, y) => WAVE_REST[y]!.slice(0, 6) + row.slice(6).replace('n', '.')),
  ]),
) as Record<YoohooFrame, string[]>

// ── Writing ────────────────────────────────────────────────────────────────
// From the pixel kit: he brings the pencil ('y', its tip 'k') across from his
// left side to the paper ('p', lines 'g'), with his arm in shadow ('d'),
// scribbles three times round, then takes it back the way it came.
// A grid's top-left is at (0, 0) in Clawd's own coordinates (column 8, row 5
// on a kit canvas).
const WRITE_GRIDS = {
  in1: ['.ooooooooo.pppp', '.ooooooooo.pggp', 'yooo#ooo#oopppp', 'oyooooooooopggp', '.okooooooo.pppp', '.o.o...o.o.....', '.o.o...o.o.....'],
  in2: ['.ooooooooo.pppp', '.ooooooooo.pggp', '.oyo#ooo#oopppp', '.odyooooooopggp', '.oookooooo.pppp', '.o.o...o.o.....', '.o.o...o.o.....'],
  in3: ['.ooooooooo.pppp', '.ooooooooo.pggp', '.oooyooo#oopppp', '.ooddyooooopggp', '.oooookooo.pppp', '.o.o...o.o.....', '.o.o...o.o.....'],
  in4: ['.ooooooooo.pppp', '.ooooooooo.pggp', '.ooo#oooo#opppp', '.oooooooooopggp', '.ooodddyyk.pppp', '.o.o...o.o.....', '.o.o...o.o.....'],
  sc1: ['.ooooooooo.pppp', '.ooooooooo.pggp', '.oooo#ooo#opppp', '.oooooooooopggp', '.ooooodddoyykpp', '.o.o...o.o.....', '.o.o...o.o.....'],
  sc2: ['.ooooooooo.pppp', '.ooooooooo.pggp', '.oooo#ooo#opppp', '.oooooooddyykgp', '.oooooodoo.pppp', '.o.o...o.o.....', '.o.o...o.o.....'],
  sc3: ['.ooooooooo.pppp', '.ooooooooo.pggp', '.oooo#ooooopppp', '.ooooooooodyykp', '.ooooooddd.pppp', '.o.o...o.o.....', '.o.o...o.o.....'],
  sc4: ['.ooooooooo.pppp', '.ooooooooo.pggp', '.oooo#ooo#opppp', '.oooooooooopggp', '.ooooooddddyykp', '.o.o...o.o.....', '.o.o...o.o.....'],
} as const
type WriteFrame = keyof typeof WRITE_GRIDS
const SCRIBBLE: [WriteFrame, number][] = [['sc1', 0.12], ['sc2', 0.12], ['sc3', 0.12], ['sc4', 0.12]]
const WRITE_STEPS: [WriteFrame, number][] = [
  ['in1', 0.6], ['in2', 0.1], ['in3', 0.1], ['in4', 0.1],
  ...SCRIBBLE, ...SCRIBBLE, ...SCRIBBLE,
  ['in4', 0.1], ['in3', 0.1], ['in2', 0.1],
]

// ── Search ─────────────────────────────────────────────────────────────────
// From the pixel kit: the magnifying glass slides in over his eye a pixel at a
// time ('l' is lens, his eye showing big through it), he blinks twice,
// and it slides back out. A grid's top-left is at (-2, -1) in Clawd's own
// coordinates (column 6, row 4 on a kit canvas).
const SEARCH_GRIDS = {
  f0: ['..............llll.', '...ooooooooo..llll.', '...oo#ooo#oo..llll.', '.ooooooooooooollll.', '.oooooooooooow.....', '...ooooooooo.......', '...o.o...o.o.......', '...o.o...o.o.......'],
  f1: ['.............llll..', '...ooooooooo.llll..', '...oo#ooo#oo.llll..', '.oooooooooooollll..', '.oooooooooooow.....', '...ooooooooo.......', '...o.o...o.o.......', '...o.o...o.o.......'],
  f2: ['............llll...', '...ooooooooollll...', '...oo#ooo#oollll...', '.ooooooooooollll...', '.oooooooooooow.....', '...ooooooooo.......', '...o.o...o.o.......', '...o.o...o.o.......'],
  f3: ['...........llll....', '...oooooooollll....', '...oo#ooo#ollll....', '.oooooooooollll....', '.ooooooooooowo.....', '...ooooooooo.......', '...o.o...o.o.......', '...o.o...o.o.......'],
  f4: ['..........llll.....', '...ooooooololl.....', '...oo#ooo#loll.....', '.ooooooooollll.....', '.ooooooooooowo.....', '...ooooooooo.......', '...o.o...o.o.......', '...o.o...o.o.......'],
  f5: ['.........llll......', '...ooooool#ol......', '...oo#oool#ol......', '.oooooooollllo.....', '.ooooooooooowo.....', '...ooooooooo.......', '...o.o...o.o.......', '...o.o...o.o.......'],
  f6: ['........llll.......', '...oooool##l.......', '...oo#ool##l.......', '.ooooooollllo......', '.oooooooooowo......', '...ooooooooo.......', '...o.o...o.o.......', '...o.o...o.o.......'],
  blink: ['........llll.......', '...ooooollll.......', '...oocool##l.......', '.ooooooollllo......', '.oooooooooowo......', '...ooooooooo.......', '...o.o...o.o.......', '...o.o...o.o.......'],
} as const
type SearchFrame = keyof typeof SEARCH_GRIDS
const SEARCH_STEPS: [SearchFrame, number][] = [
  ['f0', 1.6], ['f1', 0.05], ['f2', 0.05], ['f3', 0.05], ['f4', 0.05], ['f5', 0.05],
  ['f6', 0.7], ['blink', 0.15], ['f6', 0.15], ['blink', 0.15], ['f6', 0.7],
  ['f5', 0.05], ['f4', 0.05], ['f3', 0.05], ['f2', 0.05], ['f1', 0.05],
]

// ── Stretch ────────────────────────────────────────────────────────────────
// Every frame of the stretch, drawn in the pixel kit and copied here as-is:
// 'o' is body, '#' is eye. A grid's top-left is at (-2, -3) in Clawd's own
// coordinates (column 6, row 2 on a kit canvas).
const STRETCH_DRAWN = {
  up1: ['...............', '...............', '...............', '...ooooooooo...', '.ooooooooooooo.', '.ooo##ooo##ooo.', '.ooooooooooooo.', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  up2: ['...............', '...............', '...............', '.ooooooooooooo.', '.ooooooooooooo.', '.ooo##ooo##ooo.', '...ooooooooo...', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  up3: ['...............', '...............', '.oo.........oo.', '.ooooooooooooo.', '.ooooooooooooo.', '...o##ooo##o...', '...ooooooooo...', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  up4: ['..o.........o..', '..o.........o..', '..o.........o..', '..ooooooooooo..', '...ooooooooo...', '...o##ooo##o...', '...ooooooooo...', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  leanA: ['........o......', '.........o.....', 'o.........o....', 'ooooooooooo....', 'ooooooooooo....', '.o##ooo##oo....', '.oooooooooo....', '.oooooooooo....', '.o.o....o.o....', '..o.o....o.o...'],
  reachA: ['........o......', '.........o.....', '..........o....', '.oooooooooo....', 'ooooooooooo....', 'oo##ooo##oo....', 'ooooooooooo....', '.oooooooooo....', '.o.o....o.o....', '..o.o....o.o...'],
  middle: ['...............', '..o.........o..', '..o.........o..', '..ooooooooooo..', '..ooooooooooo..', '...o##ooo##o...', '...ooooooooo...', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
}
// Leaning right is leaning left mirrored, so his feet land the same way.
const mirror = (rows: readonly string[]) => rows.map(r => [...r].reverse().join(''))
const STRETCH_GRIDS = {
  ...STRETCH_DRAWN,
  leanB: mirror(STRETCH_DRAWN.leanA),
  reachB: mirror(STRETCH_DRAWN.reachA),
}
type StretchFrame = keyof typeof STRETCH_GRIDS

// [frame, seconds, tall stretches while it shows]. Arms up quickly, one tall
// stretch, an over-the-head reach to each side, one more tall stretch, arms down
// and a rest before it starts again.
const STRETCH_STEPS: [StretchFrame, number, number][] = [
  ['up1', 0.1, 0], ['up2', 0.1, 0], ['up3', 0.1, 0], ['up4', 2.4, 1],
  ['leanA', 0.15, 0], ['reachA', 0.6, 0], ['leanA', 0.15, 0], ['middle', 0.15, 0],
  ['leanB', 0.15, 0], ['reachB', 0.6, 0], ['leanB', 0.15, 0], ['middle', 0.15, 0],
  ['up4', 1.2, 1], ['up3', 0.1, 0], ['up2', 0.1, 0], ['up1', 1.5, 0],
]

// Kit grids: 'o' body, '#' eye, 'c' closed eye, 'w' handle, 'b' bristles, 'l' lens,
// 'n' notification dot, 'd' arm in shadow, 'y' pencil, 'k' pencil tip, 'p' paper,
// 'g' lines on the paper, '.' empty.
const GRID_COLOURS: Record<string, string> = {
  o: BODY, '#': BODY, w: BROWN, b: '#E3B36B', l: '#BFE3F2', n: '#3A4DDF',
  d: '#B96144', y: GOLD, k: INK, p: '#F4EFE6', g: '#B9B4AC',
}
const material = (c: string | undefined) => (c === '#' || c === 'c' ? 'o' : c ?? '.')

// One run per row for each colour; where the row below is the same colour,
// the run reaches half a pixel down into it so no seam shows between rows.
// Eyes are drawn on top of the body afterwards.
export function gridArt(rows: readonly string[], blink = false): string {
  let out = ''
  rows.forEach((row, y) => {
    const below = rows[y + 1] ?? ''
    for (let x = 0; x < row.length; ) {
      const m = material(row[x])
      if (m === '.') { x++; continue }
      let end = x
      while (end < row.length && material(row[end]) === m) end++
      const fill = GRID_COLOURS[m] ?? BODY
      out += px(x, y, end - x, 1, fill)
      for (let a = x; a < end; ) {
        if (material(below[a]) !== m) { a++; continue }
        let b = a
        while (b < end && material(below[b]) === m) b++
        out += px(a, y + 0.5, b - a, 1, fill)
        a = b
      }
      x = end
    }
  })
  let eyes = ''
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === '#') eyes += px(x, y, 1, 1, INK)
    if (c === 'c') out += px(x, y + 0.7, 1, 0.3, INK) // a shut eye: a thin line at its bottom
  }))
  return out + (blink && eyes ? g('blink', eyes) : eyes)
}

// Shows one frame at a time in a loop: [frame, seconds] steps, each frame a
// group with class `${prefix}-${frame}`. The first step's frame shows at rest.
function framesCss(prefix: string, steps: readonly (readonly [string, number])[]): string {
  const total = steps.reduce((t, [, d]) => t + d, 0)
  const pct = (t: number) => `${+((t / total) * 100).toFixed(3)}%`
  const shown = new Map<string, [number, number][]>()
  let t = 0
  for (const [frame, d] of steps) {
    shown.set(frame, [...(shown.get(frame) ?? []), [t, t + d]])
    t += d
  }
  let css = ''
  for (const [frame, spans] of shown) {
    const first = frame === steps[0]![0]
    const marks = [`0%{opacity:${first ? 1 : 0}}`]
    for (const [a, b] of spans) {
      if (a > 0) marks.push(`${pct(a)}{opacity:1}`)
      if (b < total) marks.push(`${pct(b)}{opacity:0}`)
    }
    css += `.${prefix}-${frame}{opacity:${first ? 1 : 0};animation:${prefix}-${frame} ${total}s steps(1) infinite}@keyframes ${prefix}-${frame}{${marks.join('')}}`
  }
  return css
}

// Degrees he tilts in each frame; positive leans his top to the left.
const STRETCH_TILT: Partial<Record<StretchFrame, number>> = { leanA: 3, reachA: 6, leanB: -3, reachB: -6 }

function stretchCss(): string {
  const total = STRETCH_STEPS.reduce((t, [, d]) => t + d, 0)
  const pct = (t: number) => `${+((t / total) * 100).toFixed(3)}%`
  const scale = ['0%{transform:scaleY(1)}']
  let t = 0
  for (const [, d, tall] of STRETCH_STEPS) {
    for (let k = 0; k < tall; k++) {
      scale.push(`${pct(t + (k * d) / tall)}{transform:scaleY(1)}`, `${pct(t + ((k + 0.5) * d) / tall)}{transform:scaleY(1.12)}`)
    }
    if (tall) scale.push(`${pct(t + d)}{transform:scaleY(1)}`)
    t += d
  }
  scale.push('100%{transform:scaleY(1)}')
  // He tilts toward each side as he reaches: a little on the lean, most at
  // full reach, eased between the middle of each frame.
  const tilt = ['0%{transform:skewX(0deg)}']
  t = 0
  for (const [frame, d] of STRETCH_STEPS) {
    const deg = STRETCH_TILT[frame] ?? 0
    // An upright frame stays upright from its first moment to its last, so
    // the tilt never creeps into the tall stretches either side of it.
    if (deg) tilt.push(`${pct(t + d / 2)}{transform:skewX(${deg}deg)}`)
    else tilt.push(`${pct(t)}{transform:skewX(0deg)}`, `${pct(t + d)}{transform:skewX(0deg)}`)
    t += d
  }
  tilt.push('100%{transform:skewX(0deg)}')
  let css = `.stretch{transform-origin:50% 100%;transform-box:fill-box;animation:stretch ${total}s ease-in-out infinite}@keyframes stretch{${scale.join('')}}`
  css += `.tilt{transform-origin:50% 100%;transform-box:fill-box;animation:tilt ${total}s ease-in-out infinite}@keyframes tilt{${tilt.join('')}}`
  return css + framesCss('sf', STRETCH_STEPS.map(([f, d]) => [f, d] as const))
}
const STRETCH_CSS = stretchCss()

// Oops legs on the pixel grid: the top of each leg stays put under his body
// (reaching half a pixel up so no seam shows) and its foot sits straight
// under it, or one pixel to the side, joined at the corner.
// Each leg steps on its own beat, out of step with the others.
const legWithFootAt = (x: number, dx: number) => px(x, 4.5, 1, 1.5) + px(x + dx, 6, 1, 1)
const OOPS_LEG_STEPS: [string, number][] = [['left', 0.125], ['mid', 0.125], ['right', 0.125], ['mid', 0.125]]
const OOPS_LEGS = [1, 3, 7, 9]
  .map((x, i) => g(`oleg${i}`, g('ol-mid', legWithFootAt(x, 0)) + g('ol-left', legWithFootAt(x, -1)) + g('ol-right', legWithFootAt(x, 1))))
  .join('')
const OOPS_LEG_CSS =
  framesCss('ol', OOPS_LEG_STEPS) +
  // the four legs' beats, scrambled: a quarter, a half and three-eighths of a step behind
  [0, 0.25, 0.125, 0.375].map((d, i) => `.oleg${i} [class^="ol-"]{animation-delay:-${d}s}`).join('')

// A thick pixel wall clock (drawn in the kit style): a grey face with a dark
// hour hand pointing right and a minute hand that jumps a quarter turn with
// every stomp, round from twelve to three, six and nine.
const CLOCK_GREY = '#8A8A86'
const WALL_CLOCK =
  // the face as three overlapping blocks so no seam shows between its rows
  px(1, 0, 3, 1.5, CLOCK_GREY) + px(0, 1, 5, 3, CLOCK_GREY) + px(1, 3.5, 3, 1.5, CLOCK_GREY) +
  px(2, 2, 2, 1, INK) + // centre and hour hand, pointing at three
  g('tick', px(2, 1, 1, 1, INK)) // minute hand, starting at twelve

// ── Sweep ──────────────────────────────────────────────────────────────────
// The broom stroke, six frames from the pixel kit. A grid's top-left is at
// (0, -1) in Clawd's own coordinates (column 8, row 4 on a kit canvas).
const SWEEP_GRIDS = {
  in1: ['...........w..', '.ooooooooo.w..', '.oooooooooow..', '.ooo#ooo#o.w..', '.oooooooooow..', '.ooooooooo.w..', '.o.o...o.obbb.', '.o.o...o.o.bbb'],
  in2: ['..........w...', '.ooooooooow...', '.ooooooooow...', '.ooo#ooo#ow...', '.ooooooooow...', '.ooooooooow...', '.o.o...o.bbb..', '.o.o...o.obbb.'],
  flat: ['..........w...', '.ooooooooow...', '.ooooooooow...', '.ooo#ooo#ow...', '.ooooooooow...', '.ooooooooow...', '.o.o...o.bbb..', '.o.o...obbbb..'],
  out1: ['...........w..', '.ooooooooo.w..', '.oooooooooow..', '.ooo#ooo#o.w..', '.oooooooooow..', '.ooooooooo.w..', '.o.o...o.obbb.', '.o.o...o.bbb..'],
  out2: ['............w.', '.ooooooooo..w.', '.ooooooooooow.', '.ooo#ooo#o..w.', '.ooooooooooow.', '.ooooooooo..w.', '.o.o...o.o.bbb', '.o.o...o.obbb.'],
  rest: ['............w.', '.ooooooooo..w.', '.ooooooooooow.', '.ooo#ooo#o..w.', '.ooooooooooow.', '.ooooooooo..w.', '.o.o...o.o.bbb', '.o.o...o.o.bbb'],
} as const
type SweepFrame = keyof typeof SWEEP_GRIDS
const SWEEP_STEPS: [SweepFrame, number][] = [
  ['in1', 0.15], ['in2', 0.15], ['flat', 0.15], ['out1', 0.15], ['out2', 0.15], ['rest', 0.15],
]
const SWEEP_CSS = framesCss('sw', SWEEP_STEPS)
const SEARCH_CSS = framesCss('se', SEARCH_STEPS)
const WRITE_CSS = framesCss('wr', WRITE_STEPS)
const YOOHOO_CSS = framesCss('yh', YOOHOO_STEPS)
const WAVE_CSS = framesCss('wv', YOOHOO_STEPS)

export const STYLE = `
  svg{overflow:visible}
  .blink{transform-origin:50% 25%;transform-box:fill-box;animation:blink 4.2s steps(1) infinite}
  @keyframes blink{0%,94%{transform:scaleY(1)}95%,99%{transform:scaleY(.15)}}
  .mini .blink{animation-delay:-1.4s}.mini-top .blink{animation-delay:-2.8s}
  .bob{animation:bob 1.4s steps(1) infinite}
  @keyframes bob{0%,49%{transform:translateY(0)}50%,100%{transform:translateY(-1px)}}
  .breathe{transform-origin:50% 100%;transform-box:fill-box;animation:breathe 3.6s ease-in-out infinite}
  @keyframes breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.9)}}
  .z{font:700 4px ui-monospace,Menlo,monospace;fill:${GRAY};opacity:0;animation:z 3.6s linear infinite}
  .z2{animation-delay:1.2s;font-size:3px}.z3{animation-delay:2.4s;font-size:2.4px}
  @keyframes z{0%{opacity:0;transform:translate(0,0)}15%{opacity:.9}100%{opacity:0;transform:translate(3px,-6px)}}
  .sip{animation:sip 5s steps(1) infinite}
  @keyframes sip{0%,59%{transform:translate(0,0)}60%,84%{transform:translate(-2px,0)}85%,100%{transform:translate(0,0)}}
  .steam{fill:#B9B4AC;opacity:0;animation:steam 2.4s linear infinite}
  .s2{animation-delay:.8s}.s3{animation-delay:1.6s}
  @keyframes steam{0%{opacity:0;transform:translateY(0)}30%{opacity:.8}100%{opacity:0;transform:translateY(-4px)}}
  .tapL{animation:tap .5s steps(1) infinite}.tapR{animation:tap .5s steps(1) .25s infinite}
  @keyframes tap{0%,49%{transform:translateY(0)}50%,100%{transform:translateY(1px)}}
  .scribble{animation:scribble .6s steps(1) infinite}
  @keyframes scribble{0%,32%{transform:translate(0,0)}33%,65%{transform:translate(1px,0)}66%,100%{transform:translate(1px,1px)}}
  .d1,.d2,.d3{opacity:0;animation:dot 1.8s steps(1) infinite}.d2{animation-delay:.3s}.d3{animation-delay:.6s}
  @keyframes dot{0%,19%{opacity:0}20%,85%{opacity:1}86%,100%{opacity:0}}
  .startle{animation:startle .5s steps(1) 2}
  @keyframes startle{0%,49%{transform:translateY(-1px)}50%,100%{transform:translateY(0)}}
  .sway{animation:sway 1.2s steps(1) infinite}
  @keyframes sway{0%,49%{transform:translateX(0)}50%,100%{transform:translateX(1px)}}
  ${STRETCH_CSS}
  ${OOPS_LEG_CSS}
  ${SWEEP_CSS}
  ${SEARCH_CSS}
  ${WRITE_CSS}
  ${YOOHOO_CSS}
  ${WAVE_CSS}
  .dust{opacity:0;animation:dust .9s linear infinite}
  @keyframes dust{0%{opacity:.7;transform:translate(0,0)}100%{opacity:0;transform:translate(2px,-2px)}}
  .key1{animation:key1 .4s steps(1) infinite}.key2{animation:key2 .4s steps(1) infinite}.key3{animation:key3 .4s steps(1) infinite}
  @keyframes key1{0%,40.2%{opacity:1}40.3%,100%{opacity:0}}
  @keyframes key2{0%,40.2%{opacity:0}40.3%,59.6%{opacity:1}59.7%,100%{opacity:0}}
  @keyframes key3{0%,59.6%{opacity:0}59.7%,100%{opacity:1}}
  .foot{animation:foot .6s steps(1) infinite}
  @keyframes foot{0%,49%{transform:translateY(0)}50%,100%{transform:translateY(-1px)}}
  .tick{animation:tick 2.4s steps(1) infinite}
  @keyframes tick{0%,24%{transform:translate(0,0)}25%,49%{transform:translate(1px,1px)}50%,74%{transform:translate(0,2px)}75%,100%{transform:translate(-1px,1px)}}
  .stompL,.stompR{opacity:0;animation:.6s linear infinite}.stompL{animation-name:stompL}.stompR{animation-name:stompR}
  @keyframes stompL{0%{opacity:.85;transform:translate(0,0)}35%{opacity:0;transform:translate(-1px,-1px)}100%{opacity:0}}
  @keyframes stompR{0%{opacity:.85;transform:translate(0,0)}35%{opacity:0;transform:translate(1px,-1px)}100%{opacity:0}}
`

export type Pose =
  | 'idle' | 'yoohoo' | 'sleep' | 'coffee' | 'lunch' | 'typing' | 'writing' | 'searching'
  | 'thinking' | 'oops' | 'proud' | 'stretch' | 'thumbs' | 'sweep' | 'wave' | 'tap'

export function drawPose(pose: Pose, shades: boolean): string {
  const at = (inner: string) => `<g transform="translate(${OX} ${OY})">${inner}</g>`
  switch (pose) {
    case 'yoohoo':
      // Frames from the pixel kit: arms flapping under a blue notification dot.
      return at((Object.keys(YOOHOO_GRIDS) as YoohooFrame[])
        .map(f => `<g class="yh-${f}" transform="translate(-1 -3)">${gridArt(YOOHOO_GRIDS[f], true)}</g>`).join(''))
    case 'sleep':
      return (
        at(g('breathe', clawd({ eyes: 'closed' }))) +
        `<text class="z" x="${OX + 10}" y="${OY}">z</text><text class="z z2" x="${OX + 10}" y="${OY}">z</text><text class="z z3" x="${OX + 10}" y="${OY}">z</text>`
      )
    case 'coffee':
      return at(clawd({ armR: '', shades }) + g('sip', ARM_R + `<g transform="translate(12 1)">${mug()}${steam()}</g>`))
    case 'lunch':
      return at(clawd({ armR: '', shades }) + g('sip', ARM_R + `<g transform="translate(12 0)">${sandwich()}</g>`))
    case 'typing':
      // Crouched low, looking left at a side-on laptop (from the Figma kit).
      return at(
        px(1, 1, 9, 4) + px(1, 5, 9, 1) +
          (shades ? px(1, 2, 2, 1, INK) + px(4, 2, 2, 1, INK) : g('blink', px(1, 2, 1, 1, INK) + px(5, 2, 1, 1, INK))) +
          // Claw on the keys, three frames: shadow on top, then under the back claw, then under both.
          g('key1', px(-1, 3, 2, 1, '#B96144') + px(-1, 4, 2, 2)) +
          g('key2', px(-1, 3, 2, 2) + px(0, 5, 1, 1, '#B96144')) +
          g('key3', px(-1, 3, 2, 2) + px(-1, 5, 2, 1, '#B96144')) +
          px(2, 5.5, 1, 1.5) + px(4, 5.5, 1, 1.5) + px(8, 5.5, 1, 1.5) + px(10, 6, 1, 1) +
          px(-4, 2, 1, 4, '#8A8A86') + px(-3, 6, 4, 1, '#8A8A86'),
      )
    case 'writing':
      // Frames from the pixel kit; his eyes blink, the pencil's tip does not.
      return at((Object.keys(WRITE_GRIDS) as WriteFrame[])
        .map(f => `<g class="wr-${f}">${gridArt(WRITE_GRIDS[f], true)}</g>`).join(''))
    case 'searching':
      // Frames from the pixel kit; his blink is one of them.
      return at((Object.keys(SEARCH_GRIDS) as SearchFrame[])
        .map(f => `<g class="se-${f}" transform="translate(-2 -1)">${gridArt(SEARCH_GRIDS[f])}</g>`).join(''))
    case 'thinking':
      return at(
        clawd({ eyes: 'up', shades }) +
          px(12, -2, 1, 1, BUBBLE) +
          px(13, -5, 7, 3, BUBBLE) + px(14, -4, 1, 1, BODY, 'd1') + px(16, -4, 1, 1, BODY, 'd2') + px(18, -4, 1, 1, BODY, 'd3'),
      )
    case 'oops':
      // Startled: a red '!', his arms wiggling in turn like the helpers', and his
      // legs scrambling: each leg's foot steps a pixel diagonally left, back
      // under him, then a pixel diagonally right.
      return at(g('startle', clawd({ eyes: 'wide', armL: g('tapL', ARM_L), armR: g('tapR', ARM_R), legs: OOPS_LEGS }) + px(5, -5, 1, 2, RED) + px(5, -2, 1, 1, RED)))
    case 'proud':
      return at(g('sway', clawd({ eyes: 'happy', armL: px(-1, 1, 2, 1) + px(-2, 0, 1, 1), armR: px(10, 1, 2, 1) + px(12, 0, 1, 1) })))
    case 'stretch':
      return at(g('stretch', g('tilt', (Object.keys(STRETCH_GRIDS) as StretchFrame[])
        .map(f => `<g class="sf-${f}" transform="translate(-2 -3)">${gridArt(STRETCH_GRIDS[f])}</g>`).join(''))))
    case 'thumbs':
      return at(g('startle', clawd({ eyes: 'happy', armR: ARM_R + px(11, 0, 1, 2) })))
    case 'sweep':
      return at(
        (Object.keys(SWEEP_GRIDS) as SweepFrame[])
          .map(f => `<g class="sw-${f}" transform="translate(0 -1)">${gridArt(SWEEP_GRIDS[f], true)}</g>`).join('') +
          px(15, 6, 1, 1, GRAY, 'dust') + px(10, 6, 1, 1, GRAY, 'dust'),
      )
    case 'wave':
      return at((Object.keys(WAVE_GRIDS) as YoohooFrame[])
        .map(f => `<g class="wv-${f}" transform="translate(-1 -3)">${gridArt(WAVE_GRIDS[f], true)}</g>`).join(''))
    case 'tap':
      // Impatient: the clock on the wall ticks a quarter turn with every stomp
      // of his foot, and each stomp kicks up a little dust.
      return at(
        clawd({ eyes: 'flat', legs: px(1, 5, 1, 2) + px(3, 5, 1, 2) + px(7, 5, 1, 2) + g('foot', px(9, 5, 1, 2)) }) +
          `<g transform="translate(-5 -5)">${WALL_CLOCK}</g>` +
          px(8.25, 6.5, 0.5, 0.5, GRAY, 'stompL') + px(10.25, 6.5, 0.5, 0.5, GRAY, 'stompR'),
      )
    default:
      return at(g('bob', clawd({ shades })))
  }
}

// Helpers stand to Clawd's right: one on the ground, a second on his head.
// They stand still and wiggle their arms, each in turn.
// A helper pixel is 4/7 of Clawd's, which is a whole 2 screen pixels in the
// app (Clawd's are 3.5), and every helper sits on whole screen pixels, so no
// leg or arm rounds to a different size. Arms and legs still reach half a
// helper pixel into the body so nothing can show a seam.
const MINI_SCALE = 4 / 7
const MINI_ARM_L = px(-1, 2, 2.5, 2)
const MINI_ARM_R = px(9.5, 2, 2.5, 2)
const MINI_LEGS = px(1, 4.5, 1, 2.5) + px(3.5, 4.5, 1, 2.5) + px(6.5, 4.5, 1, 2.5) + px(9, 4.5, 1, 2.5)
const mini = (left: string, right: string, cls = 'mini') =>
  `<g class="${cls}" transform="scale(${MINI_SCALE})">${clawd({ eyes: 'dot', armL: g(left, MINI_ARM_L), armR: g(right, MINI_ARM_R), legs: MINI_LEGS })}</g>`
const MINI = mini('tapL', 'tapR')
const MINI_TOP = mini('tapR', 'tapL', 'mini mini-top')
const MINI_HEIGHT = 7 * MINI_SCALE // helper pixels from head to feet
function helperStack(count: number, x: number): string {
  if (count <= 0) return ''
  // the top helper stands one helper pixel above the bottom one's head
  const top = count > 1 ? `<g transform="translate(0 ${-8 * MINI_SCALE})">${MINI_TOP}</g>` : ''
  return `<g transform="translate(${x} ${OY + 7 - MINI_HEIGHT})">${MINI + top}</g>`
}

export function scene(pose: Pose, shades: boolean, helperCount: number): string {
  const ground = `<rect x="2" y="${OY + 7}" width="${W - 4}" height="1" fill="${INK}" opacity=".18"/>`
  const minis =
    pose === 'sleep'
      ? ''
      : helperStack(Math.min(helperCount, 2), pose === 'typing' ? 172 / 7 : 200 / 7)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * U}" height="${H * U}" shape-rendering="crispEdges">` +
    `<style>${STYLE}</style>${ground}${drawPose(pose, shades)}${minis}</svg>`
  )
}

export const CAPTION: Record<Pose, string> = {
  idle: '',
  yoohoo: 'a session pinged you!',
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
}

export const ALT: Record<Pose, string> = {
  idle: 'Clawd hanging out', yoohoo: 'Clawd waving yoohoo under a notification dot', sleep: 'Clawd asleep', coffee: 'Clawd sipping coffee',
  lunch: 'Clawd eating a sandwich', typing: 'Clawd typing', writing: 'Clawd writing', searching: 'Clawd searching with a magnifying glass',
  thinking: 'Clawd thinking', oops: 'Clawd startled', proud: 'Clawd celebrating', stretch: 'Clawd stretching',
  thumbs: 'Clawd giving a thumbs-up', sweep: 'Clawd sweeping', wave: 'Clawd waving for your attention', tap: 'Clawd tapping his foot',
}

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
  { pose: 'yoohoo', caption: CAPTION.yoohoo },
]
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

