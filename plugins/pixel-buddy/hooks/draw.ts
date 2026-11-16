import type { Point } from '../types'
import type { Compiled } from './character'

// ── Scene geometry ─────────────────────────────────────────────────────────
export const OX = 3 // the character's top-left in the scene: room for arms on the left
export const OY = 6 // and for the thought bubble, "!" and raised arms above
export const MAX_U = 3.5 // px per pixel
export const MAX_PX_H = 50 // the drawing's height in px; tall buddies get smaller pixels

export const INK = '#1F1E1D'
export const GRAY = '#8E95AC'
export const CREAM = '#EDE6DA'
export const GOLD = '#F2C14E'
export const BROWN = '#8B5E3C'
export const RED = '#E5534B'
export const GREEN = '#6DBE45'
export const BUBBLE = '#3A3937'

export const px = (x: number, y: number, w = 1, h = 1, fill = INK, cls = '') =>
  `<rect${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
export const g = (cls: string, inner: string) => `<g class="${cls}">${inner}</g>`

export type Eyes = 'open' | 'closed' | 'happy' | 'wide' | 'up' | 'down' | 'flat' | 'look'
export type Mouth = 'none' | 'smile' | 'o'

export type Pose =
  | 'idle' | 'jump' | 'sleep' | 'coffee' | 'lunch' | 'typing' | 'writing' | 'searching'
  | 'thinking' | 'oops' | 'proud' | 'stretch' | 'thumbs' | 'sweep' | 'wave' | 'tap'

export const POSES: Pose[] = [
  'idle', 'jump', 'sleep', 'coffee', 'lunch', 'typing', 'writing', 'searching',
  'thinking', 'oops', 'proud', 'stretch', 'thumbs', 'sweep', 'wave', 'tap',
]

// ── Body ───────────────────────────────────────────────────────────────────
/** The pixels of the foot that taps: the rightmost run of the bottom row (its right third if it's a wide base). */
function footCells(k: Compiled): Set<number> {
  const row = k.grid[k.h - 1] ?? []
  let end = row.length - 1
  while (end >= 0 && !row[end]) end--
  let start = end
  while (start > 0 && row[start - 1]) start--
  const len = end - start + 1
  if (len > k.w / 2) start = end - Math.ceil(len / 3) + 1
  const cells = new Set<number>()
  for (let x = start; x <= end; x++) cells.add(x)
  return cells
}

/** Row runs of one colour, as rects; `keep` says which cells to include. */
function runs(k: Compiled, keep: (x: number, y: number) => boolean): string {
  let out = ''
  k.grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      if (!c || !keep(x, y)) {
        x++
        continue
      }
      let end = x + 1
      while (end < row.length && row[end] === c && keep(end, y)) end++
      out += px(x, y, end - x, 1, c)
      x = end
    }
  })
  return out
}

const bodies = new WeakMap<Compiled, { main: string; foot: string }>()
function bodyOf(k: Compiled) {
  let b = bodies.get(k)
  if (!b) {
    const foot = footCells(k)
    const isFoot = (x: number, y: number) => y === k.h - 1 && foot.has(x)
    b = { main: runs(k, (x, y) => !isFoot(x, y)), foot: runs(k, isFoot) }
    bodies.set(k, b)
  }
  return b
}

// ── Face ───────────────────────────────────────────────────────────────────
/** -1 for the left of two eyes, 1 for the right, 0 for a single eye. */
const sideOf = (k: Compiled, i: number) => (k.eyes.length === 1 ? 0 : i === 0 ? -1 : 1)

export function eyes(k: Compiled, kind: Eyes, shades: boolean): string {
  const ink = k.ink
  if (shades && (kind === 'open' || kind === 'down' || kind === 'up' || kind === 'look')) {
    const lenses = k.eyes.map(([x, y]) => px(x - 1, y, 3, 2, INK)).join('')
    const [l, r] = k.eyes as [Point, Point?]
    const bridge = r && r[0] - l[0] > 3 ? px(l[0] + 2, Math.min(l[1], r[1]), r[0] - l[0] - 3, 1, INK) : ''
    return lenses + bridge + px(l[0] - 1, l[1], 1, 1, '#FFFFFF').replace('/>', ' opacity=".45"/>')
  }
  const each = (f: (p: Point, side: number) => string) => k.eyes.map((p, i) => f(p, sideOf(k, i))).join('')
  const outX = (x: number, side: number) => (side < 0 ? x - 1 : x)
  switch (kind) {
    case 'closed':
      return each(([x, y], s) => px(outX(x, s), y + 1, 2, 1, ink))
    case 'happy':
      return each(([x, y]) => px(x - 1, y + 1, 1, 1, ink) + px(x, y, 1, 1, ink) + px(x + 1, y + 1, 1, 1, ink))
    case 'wide':
      return each(([x, y], s) => px(outX(x, s), y, 2, 2, ink))
    case 'up':
      return each(([x, y]) => px(x + 1, y, 1, 1, ink))
    case 'down':
      return g('blink', each(([x, y]) => px(x, y + 1, 1, k.grid[y + 2]?.[x] ? 2 : 1, ink)))
    case 'flat':
      return each(([x, y], s) => px(outX(x, s), y, 2, 1, ink))
    case 'look':
      return g('look', each(([x, y]) => px(x, y, 1, 2, ink)))
    default:
      return g('blink', each(([x, y]) => px(x, y, 1, 2, ink)))
  }
}

export function mouth(k: Compiled, kind: Mouth): string {
  if (!k.mouth || kind === 'none') return ''
  const [x, y] = k.mouth
  if (kind === 'o') return px(x, y, 1, 1, k.ink)
  if (!k.smiles) return ''
  return px(x - 1, y, 1, 1, k.ink) + px(x, y + 1, 1, 1, k.ink) + px(x + 1, y, 1, 1, k.ink)
}

// ── Arms ───────────────────────────────────────────────────────────────────
type Side = 'left' | 'right'

/** A rect relative to an arm's column (the pixel beside the hand), mirrored for the left arm. */
function limb(k: Compiled, side: Side, dx: number, dy: number, w = 1, h = 1): string {
  const [hx, hy] = k[side]
  const s = side === 'left' ? -1 : 1
  const ax = hx + s
  const x = s > 0 ? ax + dx : ax - dx - w + 1
  return px(x, hy + dy, w, h, side === 'left' ? k.armL : k.armR)
}

export const arm = {
  rest: (k: Compiled, side: Side) => (k.type === 'blob' ? '' : limb(k, side, 0, 0, 1, k.type === 'critter' ? 1 : 2)),
  cheer: (k: Compiled, side: Side) => limb(k, side, 0, -1) + limb(k, side, 1, -2),
  up: (k: Compiled, side: Side) => limb(k, side, 0, -4, 1, 5),
  waveA: (k: Compiled) => limb(k, 'right', 0, -3, 1, 3),
  waveB: (k: Compiled) => limb(k, 'right', 0, -1) + limb(k, 'right', 1, -2) + limb(k, 'right', 2, -3),
  thumbs: (k: Compiled) => arm.rest(k, 'right') + limb(k, 'right', 1, 0, 2, 2) + limb(k, 'right', 1, -2, 1, 2),
  broom: (k: Compiled) => limb(k, 'right', 0, 0, 2, 1),
}

export type Parts = { eyes?: Eyes; mouth?: Mouth; armL?: string; armR?: string; tapFoot?: boolean; shades?: boolean }

/** The character with the given face and arms, in its own pixel grid. */
export function figure(k: Compiled, o: Parts = {}): string {
  const body = bodyOf(k)
  return (
    body.main +
    (o.tapFoot ? g('foot', body.foot) : body.foot) +
    (o.armL ?? arm.rest(k, 'left')) +
    (o.armR ?? arm.rest(k, 'right')) +
    eyes(k, o.eyes ?? 'open', o.shades ?? false) +
    mouth(k, o.mouth ?? 'none')
  )
}

// ── Props, placed from the right hand ──────────────────────────────────────
export const mug = () => px(0, 0, 3, 3, CREAM) + px(0, 0, 3, 1, '#6B4A35') + px(3, 1, 1, 1, CREAM)
export const steam = () =>
  `<rect class="steam" x="0.5" y="-2" width="1" height="1"/><rect class="steam s2" x="1.5" y="-2" width="1" height="1"/><rect class="steam s3" x="1" y="-3" width="1" height="1"/>`
export const sandwich = () => px(0, 0, 3, 1, '#E3B36B') + px(0, 1, 3, 1, GREEN) + px(0, 2, 3, 1, '#C0504D') + px(0, 3, 3, 1, '#E3B36B')

export const STYLE = `
  svg{overflow:visible}
  .blink{transform-origin:50% 25%;transform-box:fill-box;animation:blink 4.2s steps(1) infinite}
  @keyframes blink{0%,94%{transform:scaleY(1)}95%,99%{transform:scaleY(.15)}}
  .bob{animation:bob 1.4s steps(1) infinite}.bob2{animation:bob 1.4s steps(1) .7s infinite}
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
  .startle{animation:startle 1.6s steps(1) infinite}
  @keyframes startle{0%,14%{transform:translateY(-1px)}15%,29%{transform:translateY(0)}30%,44%{transform:translateY(-1px)}45%,100%{transform:translateY(0)}}
  .sway{animation:sway 1.2s steps(1) infinite}
  @keyframes sway{0%,49%{transform:translateX(0)}50%,100%{transform:translateX(1px)}}
  .stretch{transform-origin:50% 100%;transform-box:fill-box;animation:stretch 2.6s ease-in-out infinite}
  @keyframes stretch{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.12)}}
  .sweep{animation:sweep .9s steps(1) infinite}
  @keyframes sweep{0%,49%{transform:translateX(0)}50%,100%{transform:translateX(-2px)}}
  .dust{opacity:0;animation:dust .9s linear infinite}
  @keyframes dust{0%{opacity:.7;transform:translate(0,0)}100%{opacity:0;transform:translate(2px,-2px)}}
  .waveA{animation:waveA .9s steps(1) infinite}.waveB{animation:waveB .9s steps(1) infinite}
  @keyframes waveA{0%,49%{opacity:1}50%,100%{opacity:0}}
  @keyframes waveB{0%,49%{opacity:0}50%,100%{opacity:1}}
  .foot{animation:foot .6s steps(1) infinite}
  @keyframes foot{0%,49%{transform:translateY(0)}50%,100%{transform:translateY(-1px)}}
`

/** One pose of the character, in its own pixel grid (props reach outside it). */
export function drawPose(k: Compiled, pose: Pose, shades: boolean): string {
  const rx = k.right[0] + 1 // the right arm's column
  const ry = k.right[1]
  const top = k.top
  const bottom = k.h - 1
  const [hx, hy] = k.head
  const at = (x: number, y: number, inner: string) => `<g transform="translate(${x} ${y})">${inner}</g>`
  switch (pose) {
    case 'jump':
      return g('jump', figure(k, { eyes: 'happy', mouth: 'smile' }))
    case 'sleep':
      return (
        g('breathe', figure(k, { eyes: 'closed' })) +
        `<text class="z" x="${rx}" y="${top}">z</text><text class="z z2" x="${rx}" y="${top}">z</text><text class="z z3" x="${rx}" y="${top}">z</text>`
      )
    case 'coffee':
      return figure(k, { armR: '', shades }) + g('sip', arm.rest(k, 'right') + at(rx + 1, ry - 1, mug() + steam()))
    case 'lunch':
      return figure(k, { armR: '', shades }) + g('sip', arm.rest(k, 'right') + at(rx + 1, ry - 2, sandwich()))
    case 'typing': {
      const lx = k.left[0] - 1
      const ky = Math.min(Math.max(k.left[1], ry) + 2, bottom)
      let keys = ''
      for (let x = lx + 1; x < rx; x += 2) keys += px(x, ky, 1, 1, '#8A8A86')
      return (
        figure(k, { eyes: 'down', armL: g('tapL', arm.rest(k, 'left')), armR: g('tapR', arm.rest(k, 'right')), shades }) +
        px(lx, ky, rx - lx + 1, 1, '#4A4A48') + keys
      )
    }
    case 'writing':
      return (
        figure(k, { eyes: 'down', armR: '', shades }) +
        px(rx + 1, ry - 2, 4, 5, '#F4EFE6') + px(rx + 2, ry - 1, 2, 1, '#B9B4AC') + px(rx + 2, ry + 1, 2, 1, '#B9B4AC') +
        g('scribble', arm.rest(k, 'right') + px(rx + 1, ry - 1, 1, 2, GOLD) + px(rx + 1, ry + 1, 1, 1, INK))
      )
    case 'searching': {
      const glass = '#C8CDD8'
      return (
        figure(k, { eyes: shades ? 'open' : 'look', armR: '', shades }) +
        g(
          'scan',
          arm.rest(k, 'right') + px(rx + 1, ry, 1, 1, BROWN) + px(rx + 1, ry - 3, 3, 1, glass) + px(rx + 1, ry - 1, 3, 1, glass) +
            px(rx + 1, ry - 2, 1, 1, glass) + px(rx + 3, ry - 2, 1, 1, glass) + px(rx + 2, ry - 2, 1, 1, '#BFE3F2'),
        )
      )
    }
    case 'thinking':
      return (
        figure(k, { eyes: 'up', shades }) +
        px(rx + 2, top - 2, 1, 1, BUBBLE) + px(rx + 3, top - 5, 7, 3, BUBBLE) +
        px(rx + 4, top - 4, 1, 1, k.armR, 'd1') + px(rx + 6, top - 4, 1, 1, k.armR, 'd2') + px(rx + 8, top - 4, 1, 1, k.armR, 'd3')
      )
    case 'oops':
      return g('startle', figure(k, { eyes: 'wide', mouth: 'o' }) + px(hx, hy - 5, 1, 2, RED) + px(hx, hy - 2, 1, 1, RED))
    case 'proud':
      return (
        g('sway', figure(k, { eyes: 'happy', mouth: 'smile', armL: arm.cheer(k, 'left'), armR: arm.cheer(k, 'right') })) +
        px(hx - 3, top - 3, 1, 1, GOLD, 'd1') + px(hx, top - 4, 1, 1, RED, 'd2') + px(hx + 3, top - 3, 1, 1, GREEN, 'd3')
      )
    case 'stretch':
      return g('stretch', figure(k, { eyes: 'closed', armL: arm.up(k, 'left'), armR: arm.up(k, 'right') }))
    case 'thumbs':
      return g('startle', figure(k, { eyes: 'happy', mouth: 'smile', armR: arm.thumbs(k) }))
    case 'sweep': {
      const handleY = ry - 3
      return (
        figure(k, { eyes: 'down', armR: '' }) +
        g('sweep', arm.broom(k) + px(rx + 2, handleY, 1, Math.max(1, bottom - 1 - handleY), BROWN) + px(rx + 1, bottom - 1, 3, 2, '#E3B36B')) +
        px(rx + 5, bottom, 1, 1, GRAY, 'dust') + px(k.left[0] - 2, bottom, 1, 1, GRAY, 'dust')
      )
    }
    case 'wave':
      return figure(k, { armR: g('waveA', arm.waveA(k)) + g('waveB', arm.waveB(k)), shades })
    case 'tap':
      return figure(k, { eyes: 'flat', tapFoot: true })
    default:
      return g('bob', figure(k, { shades }))
  }
}

// ── Scenes ─────────────────────────────────────────────────────────────────
export type Size = { w: number; h: number; u: number }

/** The scene's size in pixels and the px per pixel that keeps it under MAX_PX_H. */
export function sceneSize(k: Compiled): Size {
  const w = Math.max(OX + k.right[0] + 12, OX + k.w + 2)
  const h = OY + k.h + 1
  return { w, h, u: Math.min(MAX_U, MAX_PX_H / h) }
}

const svg = (w: number, h: number, u: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * u}" height="${h * u}" shape-rendering="crispEdges">` +
  `<style>${STYLE}</style>${inner}</svg>`

/** The character alone. Helpers are a separate drawing, so one coming or going doesn't restart its animations. */
export function scene(k: Compiled, pose: Pose, shades: boolean): string {
  const { w, h, u } = sceneSize(k)
  const ground = `<rect x="1" y="${OY + k.h}" width="${w - 2}" height="1" fill="${INK}" opacity=".18"/>`
  return svg(w, h, u, `${ground}<g transform="translate(${OX} ${OY})">${drawPose(k, pose, shades)}</g>`)
}

/** The width of the helpers' drawing: two half-size copies side by side. */
export const minisWidth = (k: Compiled) => k.w + 4

/** Up to two half-size copies typing away, one per helper agent. */
export function minis(k: Compiled, helperCount: number): string {
  const { h, u } = sceneSize(k)
  const w = minisWidth(k)
  const groundY = OY + k.h
  const ground = `<rect x="0" y="${groundY}" width="${w - 1}" height="1" fill="${INK}" opacity=".18"/>`
  const pose = figure(k, { eyes: 'down', armL: g('tapL', arm.rest(k, 'left')), armR: g('tapR', arm.rest(k, 'right')) })
  const drawn = [1, 1 + (k.w + 2) / 2]
    .slice(0, Math.min(helperCount, 2))
    .map((x, i) => `<g transform="translate(${x} ${groundY - k.h / 2}) scale(.5)">${g(i ? 'bob' : 'bob2', pose)}</g>`)
    .join('')
  return svg(w, h, u, ground + drawn)
}
