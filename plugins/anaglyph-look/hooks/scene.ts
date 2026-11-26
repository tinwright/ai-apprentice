// The grid scene, the settings, and the dark theme every scene shares.

import type { ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { BASE_CSS, DEPTH, f, frame, type Inks, polygon, pts, stars, stereo } from './stereo'

// Each pair of inks is as bright as the glasses allow without the other lens letting it
// through: leakier lenses get dimmer, purer inks.
export const INKS = {
  clean: { red: '#ff1a1a', cyan: '#00b4f0' },
  typical: { red: '#e00a0a', cyan: '#0090c8' },
  leaky: { red: '#c00808', cyan: '#0078a8' },
} as const

export type Glasses = keyof typeof INKS
export type SceneName = 'grid' | 'arena'
export type Settings = { strength: number; inks: Inks; scene: SceneName }

export const clampStrength = (n: number) => Math.min(2, Math.max(0.2, n))

export function settingsFrom(options: Record<string, unknown>): Settings {
  const { depth, glasses, scene } = options
  const preset: Glasses = typeof glasses === 'string' && glasses in INKS ? (glasses as Glasses) : 'typical'
  return {
    strength: typeof depth === 'number' && Number.isFinite(depth) ? clampStrength(depth) : 1,
    inks: { ...INKS[preset] },
    scene: scene === 'grid' ? 'grid' : 'arena',
  }
}

type Kind = 'cube' | 'octa' | 'tetra'

// Wireframes drawn flat: an in-plane spin keeps both eyes' copies level with each other.
export function shape(kind: Kind, r: number) {
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
  { kind: 'cube', x: 190, y: 250, r: 72, d: 6, spin: 20, bob: 16 },
  { kind: 'tetra', x: 330, y: 520, r: 52, d: 3, spin: -16, bob: 11 },
  { kind: 'cube', x: 610, y: 150, r: 34, d: -5, spin: 24, bob: 9 },
  { kind: 'octa', x: 1060, y: 115, r: 32, d: -3, spin: -22, bob: 8 },
  { kind: 'octa', x: 1450, y: 470, r: 78, d: 7, spin: 15, bob: 18 },
]

const DRIFT = { from: -4, to: DEPTH.near + 2 }

export function gridScene({ strength, inks }: Pick<Settings, 'strength' | 'inks'>): string {
  const s = stereo(inks, strength)
  const rows = s.rows(5, 0)

  const floaters = FLOATERS.map((x, i) => {
    const body = `<g class="spin" style="animation-duration:${Math.abs(x.spin)}s;animation-direction:${x.spin < 0 ? 'reverse' : 'normal'}"><path d="${shape(x.kind, x.r)}" fill="none"/></g>`
    return `<g transform="translate(${x.x} ${x.y})"><g class="bob" style="--b:${x.bob}px;animation-delay:-${f(i * 1.1)}s">${s.eyes(body, x.d)}</g></g>`
  }).join('')

  // A cube that floats out of the screen toward you and back.
  const drifterBody = `<g class="spin" style="animation-duration:14s"><path d="${shape('cube', 46)}" fill="none"/></g>`
  const drifter =
    '<g transform="translate(240 800)">' +
    `<g class="dr-red eye" stroke="${inks.red}">${drifterBody}</g>` +
    `<g class="dr-cyan eye" stroke="${inks.cyan}">${drifterBody}</g></g>`

  const planet = `<g transform="translate(1340 170)">${s.eyes('<circle r="58" fill="none"/><ellipse rx="112" ry="24" fill="none" transform="rotate(-16)"/>', -6.5)}</g>`

  const body = stars(s.eyes, 150, 7) + planet + `<g mask="url(#floor)">${rows.svg}${s.floor()}</g>` + floaters + drifter

  const style =
    BASE_CSS +
    'path{stroke-width:4}' +
    rows.css +
    '.spin{animation:spin linear infinite}@keyframes spin{to{transform:rotate(360deg)}}' +
    '.bob{animation:bob 4s ease-in-out infinite}@keyframes bob{50%{transform:translateY(calc(var(--b) * -1))}}' +
    '.dr-red,.dr-cyan{animation-duration:9s;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}' +
    s.css(
      (u, id) =>
        `.dr-red{animation-name:drR${id}}.dr-cyan{animation-name:drC${id}}` +
        `@keyframes drR${id}{from{transform:translateX(${u(DRIFT.from)}px) scale(.8)}to{transform:translateX(${u(DRIFT.to)}px) scale(1.3)}}` +
        `@keyframes drC${id}{from{transform:translateX(${u(-DRIFT.from)}px) scale(.8)}to{transform:translateX(${u(-DRIFT.to)}px) scale(1.3)}}`,
    )

  return frame(style, body)
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
export function lookFor(scene: string): ThemeSetArgs {
  return { colors: COLORS.theme, backdrop: { scene, glass: { blur: 2, tint: '#0a0a10', opacity: 0.5 } } }
}
