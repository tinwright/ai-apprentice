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
export const JUMP_MS = 4000
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

export type Eyes = 'open' | 'closed' | 'happy' | 'wide' | 'up' | 'down' | 'flat' | 'dot'

export function eyes(kind: Eyes, shades: boolean): string {
  if (shades && (kind === 'open' || kind === 'down' || kind === 'up'))
    return px(2, 1, 3, 2, INK) + px(6, 1, 3, 2, INK) + px(5, 1, 1, 1, INK) + px(2, 1, 1, 1, '#FFFFFF').replace('/>', ' opacity=".45"/>')
  switch (kind) {
    case 'dot':
      return px(3, 1, 1, 1, INK) + px(7, 1, 1, 1, INK)
    case 'closed':
      return px(2, 2, 2, 1, INK) + px(7, 2, 2, 1, INK)
    case 'happy':
      return px(2, 2, 1, 1, INK) + px(3, 1, 1, 1, INK) + px(4, 2, 1, 1, INK) + px(6, 2, 1, 1, INK) + px(7, 1, 1, 1, INK) + px(8, 2, 1, 1, INK)
    case 'wide':
      return px(2, 1, 2, 2, INK) + px(7, 1, 2, 2, INK)
    case 'up':
      return px(4, 1, 1, 1, INK) + px(8, 1, 1, 1, INK)
    case 'down':
      return g('blink', px(3, 2, 1, 2, INK) + px(7, 2, 1, 2, INK))
    case 'flat':
      return px(2, 2, 2, 1, INK) + px(7, 2, 2, 1, INK) + px(2, 1, 2, 1, BODY)
    default:
      return g('blink', px(3, 1, 1, 2, INK) + px(7, 1, 1, 2, INK))
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

// ── Stretch ────────────────────────────────────────────────────────────────
// Every frame of the stretch, drawn in the pixel kit and copied here as-is:
// 'o' is body, '#' is eye. A grid's top-left is at (-2, -3) in Clawd's own
// coordinates (column 6, row 2 on a kit canvas).
const STRETCH_GRIDS = {
  up1: ['...............', '...............', '...............', '...ooooooooo...', '.ooooooooooooo.', '.ooo##ooo##ooo.', '.ooooooooooooo.', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  up2: ['...............', '...............', '...............', '.ooooooooooooo.', '.ooooooooooooo.', '.ooo##ooo##ooo.', '...ooooooooo...', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  up3: ['...............', '...............', '.oo.........oo.', '.ooooooooooooo.', '.ooooooooooooo.', '...o##ooo##o...', '...ooooooooo...', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  up4: ['..o.........o..', '..o.........o..', '..o.........o..', '..ooooooooooo..', '...ooooooooo...', '...o##ooo##o...', '...ooooooooo...', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  leanA: ['........o......', '.........o.....', 'o.........o....', 'ooooooooooo....', 'ooooooooooo....', '.o##ooo##oo....', '.oooooooooo....', '.oooooooooo....', '.o.o....o.o....', '..o.o....o.o...'],
  reachA: ['........o......', '.........o.....', '..........o....', '.oooooooooo....', 'ooooooooooo....', 'oo##ooo##oo....', 'ooooooooooo....', '.oooooooooo....', '.o.o....o.o....', '..o.o....o.o...'],
  middle: ['...............', '..o.........o..', '..o.........o..', '..ooooooooooo..', '..ooooooooooo..', '...o##ooo##o...', '...ooooooooo...', '...ooooooooo...', '...o.o...o.o...', '...o.o...o.o...'],
  leanB: ['.....o.........', '....o..........', '...o.........o.', '...ooooooooooo.', '...ooooooooooo.', '...oo##ooo##o..', '...oooooooooo..', '...oooooooooo..', '...o.o....o.o..', '..o.o....o.o...'],
  reachB: ['.....o.........', '....o..........', '...o...........', '...oooooooooo..', '...ooooooooooo.', '...oo##ooo##oo.', '...ooooooooooo.', '...oooooooooo..', '...o.o....o.o..', '..o.o....o.o...'],
} as const
type StretchFrame = keyof typeof STRETCH_GRIDS

// [frame, seconds, tall stretches while it shows]. Arms up quickly, one tall
// stretch, an over-the-head reach to each side, one more tall stretch, arms down.
const STRETCH_STEPS: [StretchFrame, number, number][] = [
  ['up1', 0.1, 0], ['up2', 0.1, 0], ['up3', 0.1, 0], ['up4', 2.4, 1],
  ['leanA', 0.15, 0], ['reachA', 0.6, 0], ['leanA', 0.15, 0], ['middle', 0.15, 0],
  ['leanB', 0.15, 0], ['reachB', 0.6, 0], ['leanB', 0.15, 0], ['middle', 0.15, 0],
  ['up4', 1.2, 1], ['up3', 0.1, 0], ['up2', 0.1, 0], ['up1', 0.1, 0],
]

// One row-run of body per row; where the row below is body too, the run
// reaches half a pixel down into it so no seam shows between rows.
export function gridArt(rows: readonly string[]): string {
  let out = ''
  rows.forEach((row, y) => {
    const below = rows[y + 1] ?? ''
    for (let x = 0; x < row.length; ) {
      if (row[x] === '.') { x++; continue }
      let end = x
      while (end < row.length && row[end] !== '.') end++
      out += px(x, y, end - x, 1)
      for (let a = x; a < end; ) {
        if ((below[a] ?? '.') === '.') { a++; continue }
        let b = a
        while (b < end && (below[b] ?? '.') !== '.') b++
        out += px(a, y + 0.5, b - a, 1)
        a = b
      }
      x = end
    }
  })
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') out += px(x, y, 1, 1, INK) }))
  return out
}

function stretchCss(): string {
  const total = STRETCH_STEPS.reduce((t, [, d]) => t + d, 0)
  const pct = (t: number) => `${+((t / total) * 100).toFixed(3)}%`
  const shown = new Map<StretchFrame, [number, number][]>()
  const scale = ['0%{transform:scaleY(1)}']
  let t = 0
  for (const [frame, d, tall] of STRETCH_STEPS) {
    shown.set(frame, [...(shown.get(frame) ?? []), [t, t + d]])
    for (let k = 0; k < tall; k++) {
      scale.push(`${pct(t + (k * d) / tall)}{transform:scaleY(1)}`, `${pct(t + ((k + 0.5) * d) / tall)}{transform:scaleY(1.12)}`)
    }
    if (tall) scale.push(`${pct(t + d)}{transform:scaleY(1)}`)
    t += d
  }
  scale.push('100%{transform:scaleY(1)}')
  let css = `.stretch{transform-origin:50% 100%;transform-box:fill-box;animation:stretch ${total}s ease-in-out infinite}@keyframes stretch{${scale.join('')}}`
  for (const [frame, spans] of shown) {
    const first = frame === STRETCH_STEPS[0]![0]
    const marks = [`0%{opacity:${first ? 1 : 0}}`]
    for (const [a, b] of spans) {
      if (a > 0) marks.push(`${pct(a)}{opacity:1}`)
      if (b < total) marks.push(`${pct(b)}{opacity:0}`)
    }
    css += `.sf-${frame}{opacity:${first ? 1 : 0};animation:sf-${frame} ${total}s steps(1) infinite}@keyframes sf-${frame}{${marks.join('')}}`
  }
  return css
}
const STRETCH_CSS = stretchCss()

export const STYLE = `
  svg{overflow:visible}
  .blink{transform-origin:50% 25%;transform-box:fill-box;animation:blink 4.2s steps(1) infinite}
  @keyframes blink{0%,94%{transform:scaleY(1)}95%,99%{transform:scaleY(.15)}}
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
  .jump{transform-origin:50% 100%;transform-box:fill-box;animation:jump 1s steps(1) infinite}
  @keyframes jump{0%,24%{transform:translateY(0) scaleY(.85)}25%,49%{transform:translateY(-3px)}50%,74%{transform:translateY(-4px)}75%,100%{transform:translateY(-2px)}}
  .tapL{animation:tap .5s steps(1) infinite}.tapR{animation:tap .5s steps(1) .25s infinite}
  @keyframes tap{0%,49%{transform:translateY(0)}50%,100%{transform:translateY(1px)}}
  .scribble{animation:scribble .6s steps(1) infinite}
  @keyframes scribble{0%,32%{transform:translate(0,0)}33%,65%{transform:translate(1px,0)}66%,100%{transform:translate(1px,1px)}}
  .scan{animation:scan 2.4s steps(1) infinite}
  @keyframes scan{0%,49%{transform:translateX(0)}50%,100%{transform:translateX(-1px)}}
  .look{animation:look 2.4s steps(1) infinite}
  @keyframes look{0%,49%{transform:translateX(1px)}50%,100%{transform:translateX(-1px)}}
  .d1,.d2,.d3{opacity:0;animation:dot 1.8s steps(1) infinite}.d2{animation-delay:.3s}.d3{animation-delay:.6s}
  @keyframes dot{0%,19%{opacity:0}20%,85%{opacity:1}86%,100%{opacity:0}}
  .startle{animation:startle .5s steps(1) 2}
  @keyframes startle{0%,49%{transform:translateY(-1px)}50%,100%{transform:translateY(0)}}
  .sway{animation:sway 1.2s steps(1) infinite}
  @keyframes sway{0%,49%{transform:translateX(0)}50%,100%{transform:translateX(1px)}}
  ${STRETCH_CSS}
  .sweep{animation:sweep .9s steps(1) infinite}
  @keyframes sweep{0%,49%{transform:translateX(0)}50%,100%{transform:translateX(-2px)}}
  .dust{opacity:0;animation:dust .9s linear infinite}
  @keyframes dust{0%{opacity:.7;transform:translate(0,0)}100%{opacity:0;transform:translate(2px,-2px)}}
  .waveA{animation:waveA .9s steps(1) infinite}.waveB{animation:waveB .9s steps(1) infinite}
  @keyframes waveA{0%,49%{opacity:1}50%,100%{opacity:0}}
  @keyframes waveB{0%,49%{opacity:0}50%,100%{opacity:1}}
  .key1{animation:key1 .4s steps(1) infinite}.key2{animation:key2 .4s steps(1) infinite}.key3{animation:key3 .4s steps(1) infinite}
  @keyframes key1{0%,40.2%{opacity:1}40.3%,100%{opacity:0}}
  @keyframes key2{0%,40.2%{opacity:0}40.3%,59.6%{opacity:1}59.7%,100%{opacity:0}}
  @keyframes key3{0%,59.6%{opacity:0}59.7%,100%{opacity:1}}
  .foot{animation:foot .6s steps(1) infinite}
  @keyframes foot{0%,49%{transform:translateY(0)}50%,100%{transform:translateY(-1px)}}
`

export type Pose =
  | 'idle' | 'jump' | 'sleep' | 'coffee' | 'lunch' | 'typing' | 'writing' | 'searching'
  | 'thinking' | 'oops' | 'proud' | 'stretch' | 'thumbs' | 'sweep' | 'wave' | 'tap'

export function drawPose(pose: Pose, shades: boolean): string {
  const at = (inner: string) => `<g transform="translate(${OX} ${OY})">${inner}</g>`
  switch (pose) {
    case 'jump':
      return at(g('jump', clawd({ eyes: 'happy' })))
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
      return at(
        clawd({ eyes: 'down', armR: '', shades }) +
          px(12, 0, 4, 5, '#F4EFE6') + px(13, 1, 2, 1, '#B9B4AC') + px(13, 3, 2, 1, '#B9B4AC') +
          g('scribble', ARM_R + px(12, 1, 1, 2, GOLD) + px(12, 3, 1, 1, INK)),
      )
    case 'searching':
      return at(
        px(1, 0, 9, 5) + ARM_L + LEGS + (shades ? eyes('open', true) : g('look', px(3, 1, 1, 2, INK) + px(7, 1, 1, 2, INK))) +
          g('scan', ARM_R + px(12, 2, 1, 1, BROWN) + px(12, -1, 3, 1, '#C8CDD8') + px(12, 1, 3, 1, '#C8CDD8') + px(12, 0, 1, 1, '#C8CDD8') + px(14, 0, 1, 1, '#C8CDD8') + px(13, 0, 1, 1, '#BFE3F2')),
      )
    case 'thinking':
      return at(
        clawd({ eyes: 'up', shades }) +
          px(12, -2, 1, 1, BUBBLE) +
          px(13, -5, 7, 3, BUBBLE) + px(14, -4, 1, 1, BODY, 'd1') + px(16, -4, 1, 1, BODY, 'd2') + px(18, -4, 1, 1, BODY, 'd3'),
      )
    case 'oops':
      return at(g('startle', clawd({ eyes: 'wide' }) + px(5, -5, 1, 2, RED) + px(5, -2, 1, 1, RED)))
    case 'proud':
      return at(g('sway', clawd({ eyes: 'happy', armL: px(-1, 1, 2, 1) + px(-2, 0, 1, 1), armR: px(10, 1, 2, 1) + px(12, 0, 1, 1) })))
    case 'stretch':
      return at(g('stretch', (Object.keys(STRETCH_GRIDS) as StretchFrame[])
        .map(f => `<g class="sf-${f}" transform="translate(-2 -3)">${gridArt(STRETCH_GRIDS[f])}</g>`).join('')))
    case 'thumbs':
      return at(g('startle', clawd({ eyes: 'happy', armR: ARM_R + px(11, 0, 1, 2) })))
    case 'sweep':
      return at(
        clawd({ eyes: 'down', armR: '' }) +
          g('sweep', px(10, 2, 3, 1) + px(13, -1, 1, 6, BROWN) + px(12, 5, 3, 2, '#E3B36B')) +
          px(16, 6, 1, 1, GRAY, 'dust') + px(10, 6, 1, 1, GRAY, 'dust'),
      )
    case 'wave':
      return at(clawd({ armR: g('waveA', px(10, 1, 2, 2) + px(11, -1, 1, 2)) + g('waveB', px(10, 1, 2, 2) + px(12, -1, 1, 2)), shades }))
    case 'tap':
      return at(clawd({ eyes: 'flat', legs: px(1, 5, 1, 2) + px(3, 5, 1, 2) + px(7, 5, 1, 2) + g('foot', px(9, 5, 1, 2)) }))
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
const mini = (left: string, right: string) =>
  `<g class="mini" transform="scale(${MINI_SCALE})">${clawd({ eyes: 'dot', armL: g(left, MINI_ARM_L), armR: g(right, MINI_ARM_R), legs: MINI_LEGS })}</g>`
const MINI = mini('tapL', 'tapR')
const MINI_TOP = mini('tapR', 'tapL')
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
}

export const ALT: Record<Pose, string> = {
  idle: 'Clawd hanging out', jump: 'Clawd jumping', sleep: 'Clawd asleep', coffee: 'Clawd sipping coffee',
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
  { pose: 'jump', caption: CAPTION.jump },
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

