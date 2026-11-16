import type { Point } from '../types'
import type { Compiled } from './character'
import type { Pose } from './draw'
import { INK } from './draw'

// The terminal has no pictures, but each cell can show two stacked pixels:
// "▀" in the top pixel's colour on the bottom pixel's colour. A buddy 2n
// pixels tall takes n rows, drawn still, with the face of the pose.

export const MAX_ROWS = 6 // taller buddies fall back to their one-line glyph

/** A run of cells with one look; `fg`/`bg` absent are the terminal's own. */
export type Run = { text: string; fg?: string; bg?: string }

type Face = 'open' | 'closed' | 'happy' | 'wide' | 'up' | 'down' | 'flat'

const FACE: Partial<Record<Pose, Face>> = {
  sleep: 'closed', stretch: 'closed', jump: 'happy', proud: 'happy', thumbs: 'happy', oops: 'wide',
  tap: 'flat', thinking: 'up', dance: 'happy', wild: 'happy', typing: 'down', writing: 'down', sweep: 'down',
}
const SMILE = new Set<Pose>(['jump', 'proud', 'thumbs', 'dance', 'wild'])
const SHADES = new Set<Face>(['open', 'up', 'down'])

/** The rows of a still portrait of the buddy in this pose, or undefined when it's too tall. */
export function portrait(k: Compiled, pose: Pose, shades: boolean): Run[][] | undefined {
  const pad = k.h % 2 // an odd height gets an empty row on top, so the feet sit on the bottom row
  const rows = (k.h + pad) / 2
  if (rows > MAX_ROWS) return undefined
  const w = k.w + 2 // a column each side for the arms
  const h = k.h + pad
  const cells: (string | undefined)[][] = Array.from({ length: h }, () => Array<string | undefined>(w).fill(undefined))
  const set = (x: number, y: number, c: string) => {
    const row = cells[y + pad]
    if (row && x + 1 >= 0 && x + 1 < w) row[x + 1] = c
  }

  k.grid.forEach((row, y) => row.forEach((c, x) => c && set(x, y, c)))

  // Arms at rest, or the right one up for a wave.
  if (k.type !== 'blob' || pose === 'wave' || pose === 'dance' || pose === 'wild') {
    const long = k.type === 'biped' ? 2 : 1
    const [lx, ly] = k.left
    const [rx, ry] = k.right
    if (pose === 'wild') for (let i = 1; i <= 3; i++) set(lx - 1, ly - i, k.armL)
    else if (pose === 'dance') for (let i = 1; i <= 2; i++) set(lx - 1 - (i - 1), ly - i, k.armL)
    else for (let i = 0; i < long; i++) set(lx - 1, ly + i, k.armL)
    if (pose === 'wave' || pose === 'wild') for (let i = 1; i <= 3; i++) set(rx + 1, ry - i, k.armR)
    else for (let i = 0; i < long; i++) set(rx + 1, ry + i, k.armR)
  }

  // The face.
  const face = FACE[pose] ?? 'open'
  const side = (i: number) => (k.eyes.length === 1 ? 0 : i === 0 ? -1 : 1)
  if (shades && SHADES.has(face)) {
    for (const [x, y] of k.eyes) for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) set(x + dx, y + dy, INK)
  } else {
    k.eyes.forEach(([x, y], i) => {
      const out = side(i) < 0 ? x - 1 : x
      const eye: Point[] = {
        open: [[x, y], [x, y + 1]],
        closed: [[out, y + 1], [out + 1, y + 1]],
        happy: [[x - 1, y + 1], [x, y], [x + 1, y + 1]],
        wide: [[out, y], [out + 1, y], [out, y + 1], [out + 1, y + 1]],
        up: [[x + 1, y]],
        down: [[x, y + 1]],
        flat: [[out, y], [out + 1, y]],
      }[face] as Point[]
      for (const [ex, ey] of eye) set(ex, ey, k.ink)
    })
  }
  if (k.mouth) {
    const [x, y] = k.mouth
    if (pose === 'oops') set(x, y, k.ink)
    else if (SMILE.has(pose) && k.smiles) for (const [mx, my] of [[x - 1, y], [x, y + 1], [x + 1, y]] as Point[]) set(mx, my, k.ink)
  }

  const out: Run[][] = []
  for (let r = 0; r < rows; r++) {
    const top = cells[2 * r] ?? []
    const bottom = cells[2 * r + 1] ?? []
    const line: Run[] = []
    for (let x = 0; x < w; x++) {
      const t = top[x]
      const b = bottom[x]
      const cell: Run = !t && !b ? { text: ' ' } : !t ? { text: '▄', fg: b } : !b || b === t ? { text: b ? '█' : '▀', fg: t } : { text: '▀', fg: t, bg: b }
      const last = line[line.length - 1]
      if (last && last.fg === cell.fg && last.bg === cell.bg) last.text += cell.text
      else line.push(cell)
    }
    out.push(line)
  }
  return out
}
