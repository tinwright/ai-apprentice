// The backdrop: a red and cyan scene for anaglyph glasses, and the dark theme that goes with it.

import type { ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// Red lens on the left eye, cyan on the right. A depth is the red copy's x minus the cyan
// copy's, in on-screen CSS pixels: negative sits behind the screen, positive in front.
export const DEPTH = { far: -10, near: 6 }

// Each pair of inks is as bright as the glasses allow without the other lens letting it
// through: leakier lenses get dimmer, purer inks.
export const INKS = {
  clean: { red: '#ff1a1a', cyan: '#00b4f0' },
  typical: { red: '#e00a0a', cyan: '#0090c8' },
  leaky: { red: '#c00808', cyan: '#0078a8' },
} as const

export type Glasses = keyof typeof INKS

export type Settings = { strength: number; glasses: Glasses }

export const SCENE = 'anaglyph'
export const SCENE_LIMIT = 131_072

export function settingsFrom(options: Record<string, unknown>): Settings {
  const depth = options.depth
  const glasses = options.glasses
  return {
    strength: typeof depth === 'number' && Number.isFinite(depth) ? Math.min(2, Math.max(0.2, depth)) : 1,
    glasses: typeof glasses === 'string' && glasses in INKS ? (glasses as Glasses) : 'typical',
  }
}

const W = 1600
const H = 1000
const HORIZON = 620
const VX = W / 2
const GRID = '#6a4fa8'
const BG = '#07070b'

// The scene scales with its box by max(width / W, height / H). Each bracket covers boxes up to
// that scale, and the fallback anything larger, so a depth stays the same number of pixels.
const BRACKETS = [0.6, 0.8, 1, 1.25, 1.6, 2]
const FALLBACK_SCALE = 2.6

const f = (n: number) => (Math.round(n * 100) / 100).toString()
const depthName = (n: number) => `d${String(n).replace('-', 'm').replace('.', '_')}`

function random(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function polygon(r: number, n: number, start: number) {
  return Array.from({ length: n }, (_, k) => {
    const a = ((start + (360 / n) * k) * Math.PI) / 180
    return [r * Math.cos(a), r * Math.sin(a)] as const
  })
}

const pts = (ps: ReadonlyArray<readonly [number, number]>) => ps.map(([x, y]) => `${f(x)} ${f(y)}`)

type Kind = 'cube' | 'octa' | 'tetra'

// Wireframes drawn flat: an in-plane spin keeps both eyes' copies level with each other.
function shape(kind: Kind, r: number) {
  if (kind === 'cube') {
    const v = polygon(r, 6, -90)
    return `M${pts(v).join('L')}Z` + v.map(([x, y]) => `M0 0L${f(x)} ${f(y)}`).join('')
  }
  if (kind === 'tetra') {
    const v = polygon(r, 3, -90)
    return `M${pts(v).join('L')}Z` + v.map(([x, y]) => `M0 ${f(-r * 0.1)}L${f(x)} ${f(y)}`).join('')
  }
  const eq: Array<readonly [number, number]> = [
    [r * 0.8, 0],
    [0, r * 0.28],
    [-r * 0.8, 0],
    [0, -r * 0.28],
  ]
  return `M${pts(eq).join('L')}Z` + eq.map(([x, y]) => `M0 ${f(-r)}L${f(x)} ${f(y)}M0 ${f(r)}L${f(x)} ${f(y)}`).join('')
}

type Floater = { kind: Kind; x: number; y: number; r: number; d: number; spin: number; bob: number }

const FLOATERS: Floater[] = [
  { kind: 'cube', x: 190, y: 250, r: 72, d: 4, spin: 20, bob: 16 },
  { kind: 'tetra', x: 330, y: 520, r: 52, d: 1.5, spin: -16, bob: 11 },
  { kind: 'cube', x: 610, y: 150, r: 34, d: -4, spin: 24, bob: 9 },
  { kind: 'octa', x: 1060, y: 115, r: 32, d: -2, spin: -22, bob: 8 },
  { kind: 'octa', x: 1450, y: 470, r: 78, d: 5.5, spin: 15, bob: 18 },
]

const DRIFT = { from: -4, to: DEPTH.near + 2 }
const RUN = 5 // seconds for a floor line to roll from the horizon to the bottom edge

export function scene({ strength, glasses }: Settings): string {
  const { red, cyan } = INKS[glasses]
  const depths = new Set<number>()

  const eyes = (content: string, d: number) => {
    const n = Math.round(d * 2) / 2
    depths.add(n)
    return (
      `<g class="eye r ${depthName(n)}" stroke="${red}" fill="${red}">${content}</g>` +
      `<g class="eye c ${depthName(n)}" stroke="${cyan}" fill="${cyan}">${content}</g>`
    )
  }

  const rand = random(7)
  const stars: string[] = []
  for (let i = 0; i < 150; i++) {
    const x = -500 + rand() * (W + 1000)
    const y = rand() * (HORIZON - 50)
    const r = 0.8 + rand() * 1.6
    const d = DEPTH.far + rand() * 4
    const twinkle = rand() < 0.3 ? ` class="tw" style="animation-delay:-${f(rand() * 3)}s"` : ''
    stars.push(`<g${twinkle}>${eyes(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" stroke="none"/>`, d)}</g>`)
  }

  const radials: string[] = []
  for (let bx = -2600; bx <= W + 2600; bx += 200) radials.push(`<line x1="${VX}" y1="${HORIZON}" x2="${bx}" y2="${H}"/>`)
  const floor =
    `<g class="eye rad r" stroke="${red}">${radials.join('')}</g>` +
    `<g class="eye rad c" stroke="${cyan}">${radials.join('')}</g>`

  const LINES = 14
  const rows = Array.from(
    { length: LINES },
    (_, i) => `<line class="row" x1="-2600" y1="0" x2="${W + 2600}" y2="0" style="animation-delay:-${f((RUN / LINES) * i)}s"/>`,
  ).join('')
  const frames = Array.from({ length: 13 }, (_, k) => {
    const p = k / 12
    const z = 14 - 13 * p
    return `${f(p * 100)}%{transform:translateY(${f(HORIZON + (H - HORIZON) / z)}px)}`
  }).join('')

  const floaters = FLOATERS.map((s, i) => {
    const body = `<g class="spin" style="animation-duration:${Math.abs(s.spin)}s;animation-direction:${s.spin < 0 ? 'reverse' : 'normal'}"><path d="${shape(s.kind, s.r)}" fill="none"/></g>`
    return `<g transform="translate(${s.x} ${s.y})"><g class="bob" style="--b:${s.bob}px;animation-delay:-${f(i * 1.1)}s">${eyes(body, s.d)}</g></g>`
  }).join('')

  // A cube that floats out of the screen toward you and back.
  const drifterBody = `<g class="spin" style="animation-duration:14s"><path d="${shape('cube', 46)}" fill="none"/></g>`
  const drifter =
    `<g transform="translate(240 800)">` +
    `<g class="dr-red eye" stroke="${red}">${drifterBody}</g>` +
    `<g class="dr-cyan eye" stroke="${cyan}">${drifterBody}</g></g>`

  const planet = `<g transform="translate(1340 170)">${eyes('<circle r="58" fill="none"/><ellipse rx="112" ry="24" fill="none" transform="rotate(-16)"/>', -6.5)}</g>`

  // Turns pixel depths into viewBox units for a box at this scale.
  const rules = (scale: number) => {
    const u = (px: number) => f((px * strength) / 2 / scale)
    const out = [...depths].map(n => `.r.${depthName(n)}{transform:translateX(${u(n)}px)}.c.${depthName(n)}{transform:translateX(${u(-n)}px)}`)
    // The floor's depth runs from far at the horizon to near at the bottom edge: x' = x + k*y + e.
    const k = ((DEPTH.near - DEPTH.far) * strength) / 2 / scale / (H - HORIZON)
    const e = (DEPTH.far * strength) / 2 / scale - k * HORIZON
    const m = (sign: number) => `matrix(1,0,${(sign * k).toFixed(5)},1,${f(sign * e)},0)`
    out.push(`.rad.r{transform:${m(1)}}.rad.c{transform:${m(-1)}}`)
    const id = String(scale).replace('.', '_')
    out.push(
      `.dr-red{animation-name:drR${id}}.dr-cyan{animation-name:drC${id}}` +
        `@keyframes drR${id}{from{transform:translateX(${u(DRIFT.from)}px) scale(.8)}to{transform:translateX(${u(DRIFT.to)}px) scale(1.3)}}` +
        `@keyframes drC${id}{from{transform:translateX(${u(-DRIFT.from)}px) scale(.8)}to{transform:translateX(${u(-DRIFT.to)}px) scale(1.3)}}`,
    )
    return out.join('')
  }
  const scaled =
    rules(FALLBACK_SCALE) +
    [...BRACKETS]
      .reverse()
      .map(t => `@media (max-width:${W * t}px) and (max-height:${H * t}px){${rules(t)}}`)
      .join('')

  const style =
    '.eye{mix-blend-mode:screen}' +
    'path,line,circle,ellipse{stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}' +
    `.row{stroke:${GRID};stroke-width:2;animation:approach ${RUN}s linear infinite}` +
    `@keyframes approach{${frames}}` +
    '.spin{animation:spin linear infinite}@keyframes spin{to{transform:rotate(360deg)}}' +
    '.bob{animation:bob 4s ease-in-out infinite}@keyframes bob{50%{transform:translateY(calc(var(--b) * -1))}}' +
    '.tw{animation:tw 3s ease-in-out infinite}@keyframes tw{50%{opacity:.25}}' +
    '.dr-red,.dr-cyan{animation-duration:9s;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}' +
    scaled +
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<style>${style}</style>` +
    '<defs>' +
    `<linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="${HORIZON}" x2="0" y2="${H}">` +
    '<stop offset="0" stop-color="#000"/><stop offset=".25" stop-color="#555"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
    `<mask id="floor"><rect x="-2600" y="${HORIZON}" width="${W + 5200}" height="${H - HORIZON}" fill="url(#fade)"/></mask>` +
    `<radialGradient id="glow" cx="50%" cy="100%" r="60%"><stop offset="0" stop-color="#3a1640" stop-opacity=".9"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>` +
    '</defs>' +
    `<rect x="-2600" y="-200" width="${W + 5200}" height="${H + 400}" fill="${BG}"/>` +
    `<rect x="-400" y="${HORIZON - 260}" width="${W + 800}" height="260" fill="url(#glow)"/>` +
    stars.join('') +
    planet +
    `<g mask="url(#floor)">${rows}${floor}</g>` +
    floaters +
    drifter +
    '</svg>'
  )
}

export const COLORS = makeColors({
  label: 'Anaglyph',
  only: 'dark',
  roles: { accent: '#22c8e8', danger: '#ff4646', success: '#4cc890', warning: '#e8b440', pro: '#b08cff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a0a10',
        'surface-1': '#111219',
        'surface-2': '#171822',
        'surface-3': '#1d1e29',
        'text-primary': '#eceef4',
        'text-secondary': '#c3c7d2',
        'text-muted': '#9ba0ae',
      },
    },
  },
})

// Light frosting: heavy blur would smear the two eyes' copies together behind the panels.
export function lookFor(settings: Settings): { source: string; args: ThemeSetArgs } {
  return {
    source: scene(settings),
    args: { colors: COLORS.theme, backdrop: { scene: SCENE, glass: { blur: 3, tint: '#0a0a10', opacity: 0.7 } } },
  }
}
