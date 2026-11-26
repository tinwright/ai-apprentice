// Calibration: inks and depth tuned to one pair of glasses, kept across sessions, and the test
// card the calibration pane shows.

import { clampStrength, type Glasses, INKS } from './scene'
import type { Inks } from './stereo'

export type Calibration = Inks & { strength: number }

export type Step = 'red-' | 'red+' | 'cyan-' | 'cyan+' | 'greener' | 'bluer' | 'depth-' | 'depth+' | Glasses

export const STEPS: readonly Step[] = ['red-', 'red+', 'cyan-', 'cyan+', 'greener', 'bluer', 'depth-', 'depth+', 'clean', 'typical', 'leaky']

const HEX = /^#[0-9a-f]{6}$/i

const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
const hex = (c: readonly number[]) => '#' + c.map(n => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')).join('')

// What the store holds, if it is a calibration at all.
export function calibrationFrom(value: unknown): Calibration | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { red, cyan, strength } = value as Record<string, unknown>
  if (typeof red !== 'string' || !HEX.test(red) || typeof cyan !== 'string' || !HEX.test(cyan)) return undefined
  if (typeof strength !== 'number' || !Number.isFinite(strength)) return undefined
  return { red: red.toLowerCase(), cyan: cyan.toLowerCase(), strength: clampStrength(strength) }
}

// Brighter or dimmer, keeping the hue; never all the way to black.
export function scaled(h: string, factor: number): string {
  const c = rgb(h).map(n => n * factor)
  return Math.max(...c) < 24 ? h : hex(c)
}

// Moves a cyan toward green or toward blue, keeping its brightness about the same.
export function tilted(h: string, toward: 'green' | 'blue'): string {
  const [r, g, b] = rgb(h)
  const move = Math.min(12, toward === 'green' ? b : g)
  return toward === 'green' ? hex([r, g + move, b - move]) : hex([r, g - move, b + move])
}

const STEP = 1.15

export function step(c: Calibration, s: Step): Calibration {
  switch (s) {
    case 'red-':
      return { ...c, red: scaled(c.red, 1 / STEP) }
    case 'red+':
      return { ...c, red: scaled(c.red, STEP) }
    case 'cyan-':
      return { ...c, cyan: scaled(c.cyan, 1 / STEP) }
    case 'cyan+':
      return { ...c, cyan: scaled(c.cyan, STEP) }
    case 'greener':
      return { ...c, cyan: tilted(c.cyan, 'green') }
    case 'bluer':
      return { ...c, cyan: tilted(c.cyan, 'blue') }
    case 'depth-':
      return { ...c, strength: clampStrength(Math.round((c.strength - 0.1) * 10) / 10) }
    case 'depth+':
      return { ...c, strength: clampStrength(Math.round((c.strength + 0.1) * 10) / 10) }
    default:
      return { ...c, ...INKS[s] }
  }
}

export const describe = (c: Calibration) => `Red ${c.red} · Cyan ${c.cyan} · Depth ${c.strength.toFixed(1)}`

// The test card: two words printed over each other, each ink alone, and a square at a depth.
// Through the red lens only LEFT should show; through the cyan lens only RIGHT.
export function testCard(c: Calibration): string {
  const half = (6 * c.strength) / 2
  const word = (text: string, color: string, dx: number) =>
    `<text x="${300 + dx}" y="92" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="76" letter-spacing="4" fill="${color}" style="mix-blend-mode:screen">${text}</text>`
  const square = (color: string, dx: number) =>
    `<rect x="${264 + dx}" y="130" width="72" height="72" rx="6" fill="none" stroke="${color}" stroke-width="5" style="mix-blend-mode:screen"/>`
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220">' +
    '<rect width="600" height="220" fill="#000"/>' +
    word('LEFT', c.red, -10) +
    word('RIGHT', c.cyan, 10) +
    `<rect x="70" y="138" width="56" height="56" rx="4" fill="${c.red}"/>` +
    `<rect x="474" y="138" width="56" height="56" rx="4" fill="${c.cyan}"/>` +
    square(c.red, half) +
    square(c.cyan, -half) +
    '</svg>'
  )
}
