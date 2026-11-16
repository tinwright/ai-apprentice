import type { Character, Point } from '../types'

// ── Limits ─────────────────────────────────────────────────────────────────
export const MIN_W = 5
export const MAX_W = 16
export const MIN_H = 5
export const MAX_H = 16
export const MAX_COLOURS = 8
export const MAX_NAME = 24
export const MAX_GLYPH = 5
export const EMPTY = '.'
export const DEFAULT_INK = '#1F1E1D'
export const DEFAULT_GLYPH = '▐█▌'

// The backgrounds a buddy must show up on, and how much contrast that takes.
export const LIGHT_BG = '#FAF9F5'
export const DARK_BG = '#262624'
export const EDGE_CONTRAST = 1.8 // each outline pixel against the background
export const EDGE_SHARE = 0.6 // the share of outline pixels that must reach it
export const EYE_CONTRAST = 3 // eyes against the face under them

/** Clawd, the one built-in buddy, in the same format /buddy-make writes. */
export const CLAWD: Character = {
  name: 'Clawd',
  palette: { o: '#D97757' },
  body: [
    'ooooooooo',
    'ooooooooo',
    'ooooooooo',
    'ooooooooo',
    'ooooooooo',
    '.o.o.o.o.',
    '.o.o.o.o.',
  ],
  anchors: { eyes: [[2, 1], [6, 1]], hands: { left: [0, 2], right: [8, 2] }, head: [4, 0] },
  type: 'biped',
  glyph: '▐▛█▜▌',
}

// ── Colour ─────────────────────────────────────────────────────────────────
const HEX = /^#[0-9a-fA-F]{6}$/

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two "#RRGGBB" colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// ── Validation ─────────────────────────────────────────────────────────────
export type Checked = { character?: Character; errors: string[]; warnings: string[] }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isPoint = (v: unknown): v is Point =>
  Array.isArray(v) && v.length === 2 && v.every(n => Number.isInteger(n))
const show = (p: Point) => `[${p[0]}, ${p[1]}]`

function unknownKeys(o: Record<string, unknown>, allowed: string[], where: string, errors: string[]) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) errors.push(`${where}: unknown field "${k}" (allowed: ${allowed.join(', ')})`)
}

/**
 * Checks a character spec strictly, with errors written for whoever fixes it
 * (Claude, through the set_character tool). Returns the character only when
 * there are no errors; warnings don't block it.
 */
export function validate(input: unknown): Checked {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isObject(input)) return { errors: ['the character must be an object with name, palette, body and anchors'], warnings }
  unknownKeys(input, ['name', 'palette', 'body', 'anchors', 'type', 'ink', 'glyph', 'dance', 'hat'], 'character', errors)

  const { name, palette, body, anchors, type, ink, glyph, dance, hat } = input
  if (dance !== undefined && typeof dance !== 'boolean') errors.push('dance: true or false')
  if (typeof name !== 'string' || !name.trim()) errors.push('name: give it a name')
  else if (name.length > MAX_NAME) errors.push(`name: at most ${MAX_NAME} characters`)
  else if (!/^[\p{L}\p{N}][\p{L}\p{N} '_-]*$/u.test(name)) errors.push('name: letters, digits, spaces, hyphens, underscores and apostrophes only')

  if (type !== undefined && type !== 'biped' && type !== 'critter' && type !== 'blob')
    errors.push('type: one of "biped", "critter" or "blob"')
  if (ink !== undefined && (typeof ink !== 'string' || !HEX.test(ink))) errors.push('ink: a colour like "#1F1E1D"')
  if (glyph !== undefined && (typeof glyph !== 'string' || !glyph.trim() || [...glyph].length > MAX_GLYPH || /\s/.test(glyph)))
    errors.push(`glyph: 1 to ${MAX_GLYPH} characters, no spaces`)

  // Palette
  const colours = new Map<string, string>()
  if (!isObject(palette)) errors.push('palette: an object of one-character keys to "#RRGGBB" colours')
  else {
    const entries = Object.entries(palette)
    if (entries.length === 0) errors.push('palette: needs at least one colour')
    if (entries.length > MAX_COLOURS) errors.push(`palette: at most ${MAX_COLOURS} colours (it has ${entries.length})`)
    for (const [k, v] of entries) {
      if ([...k].length !== 1 || k === EMPTY || /\s/.test(k)) errors.push(`palette: key "${k}" must be one character, not "." or a space`)
      else if (typeof v !== 'string' || !HEX.test(v)) errors.push(`palette.${k}: "${String(v)}" is not a colour like "#D97757"`)
      else colours.set(k, v)
    }
  }

  // Body
  let grid: (string | undefined)[][] = []
  if (!Array.isArray(body) || !body.every(r => typeof r === 'string')) errors.push('body: an array of strings, one per row')
  else {
    const rows = body.map(r => [...(r as string)])
    const h = rows.length
    const w = rows[0]?.length ?? 0
    if (h < MIN_H || h > MAX_H) errors.push(`body: ${MIN_H} to ${MAX_H} rows (it has ${h})`)
    if (w < MIN_W || w > MAX_W) errors.push(`body: rows ${MIN_W} to ${MAX_W} pixels wide (the first is ${w})`)
    rows.forEach((r, y) => {
      if (r.length !== w) errors.push(`body[${y}]: ${r.length} pixels wide, but the first row is ${w}; every row must be the same width`)
      const bad = [...new Set(r.filter(ch => ch !== EMPTY && !(isObject(palette) && ch in palette)))]
      if (bad.length) errors.push(`body[${y}]: ${bad.map(b => `"${b}"`).join(', ')} not in the palette (use "." for empty)`)
    })
    grid = rows.map(r => r.map(ch => (ch === EMPTY ? undefined : colours.get(ch))))
    if (h && !rows[h - 1]?.some(ch => ch !== EMPTY)) errors.push(`body[${h - 1}]: the bottom row must have pixels: it stands on it`)
    const used = new Set(rows.flat())
    for (const k of colours.keys()) if (!used.has(k)) warnings.push(`palette.${k} is never used in the body`)
  }
  const H = grid.length
  const W = grid[0]?.length ?? 0
  const at = (x: number, y: number) => (y >= 0 && y < H && x >= 0 && x < W ? grid[y]?.[x] : undefined)
  const solid = (x: number, y: number) => at(x, y) !== undefined

  // Anchors
  if (!isObject(anchors)) errors.push('anchors: an object with eyes and hands (and optionally mouth and head)')
  else if (grid.length) {
    unknownKeys(anchors, ['eyes', 'mouth', 'hands', 'head'], 'anchors', errors)
    const { eyes, mouth, hands, head } = anchors
    const inside = (p: Point) => p[0] >= 0 && p[0] < W && p[1] >= 0 && p[1] < H

    if (!Array.isArray(eyes) || eyes.length < 1 || eyes.length > 2 || !eyes.every(isPoint))
      errors.push('anchors.eyes: one or two [x, y] points, left first')
    else {
      eyes.forEach((p, i) => {
        const where = `anchors.eyes[${i}] ${show(p)}`
        if (!inside(p)) return errors.push(`${where}: outside the body (${W}×${H})`)
        const [x, y] = p
        const face: Point[] = [[x, y], [x, y + 1], [x - 1, y], [x + 1, y], [x - 1, y + 1], [x + 1, y + 1]]
        const holes = face.filter(([fx, fy]) => !solid(fx, fy))
        if (holes.length) return errors.push(`${where}: an eye is 1×2 and needs face around it; ${holes.map(show).join(', ')} are empty`)
        const eyeInk = typeof ink === 'string' && HEX.test(ink) ? ink : DEFAULT_INK
        const under = [at(x, y), at(x, y + 1)] as string[]
        const faint = under.find(c => contrast(eyeInk, c) < EYE_CONTRAST)
        if (faint)
          errors.push(`${where}: the eyes (${eyeInk}) barely show on ${faint}; lighten the face there or set "ink" to a contrasting colour`)
      })
      const [l, r] = eyes as Point[]
      if (l && r && r[0] - l[0] < 3) errors.push('anchors.eyes: left eye first, with at least two pixels between the eyes (they squint and smile sideways)')
    }

    if (mouth !== undefined) {
      if (!isPoint(mouth)) errors.push('anchors.mouth: an [x, y] point')
      else {
        const [x, y] = mouth
        if (!solid(x, y) || !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y + 1))
          errors.push(`anchors.mouth ${show(mouth)}: a smile is 3 wide and 2 tall; it needs face at ${show([x - 1, y])} to ${show([x + 1, y + 1])}`)
        if (Array.isArray(eyes) && eyes.some(e => isPoint(e) && e[1] + 1 >= y))
          errors.push(`anchors.mouth ${show(mouth)}: must sit below the eyes`)
      }
    }

    if (!isObject(hands) || !isPoint(hands.left) || !isPoint(hands.right))
      errors.push('anchors.hands: { left: [x, y], right: [x, y] }')
    else {
      for (const side of ['left', 'right'] as const) {
        const p = hands[side] as Point
        const [x, y] = p
        const out = side === 'left' ? -1 : 1
        const where = `anchors.hands.${side} ${show(p)}`
        if (!solid(x, y)) errors.push(`${where}: must be a body pixel (the arm attaches there)`)
        else {
          let blocked: Point | undefined
          for (let bx = x + out; bx >= 0 && bx < W; bx += out) if (solid(bx, y)) blocked ??= [bx, y]
          if (blocked) errors.push(`${where}: must be on the body's outer ${side} edge, with nothing beyond it on that row; ${show(blocked)} is not empty`)
        }
        if (y < 1 || y > H - 3) errors.push(`${where}: y between 1 and ${H - 3}, so the arms and props fit`)
      }
      if (hands.left[0] >= hands.right[0]) errors.push('anchors.hands: left must be left of right')
    }

    if (hat !== undefined) {
      const topEye = Array.isArray(eyes) && eyes.every(isPoint) ? Math.min(...eyes.map(e => e[1])) : 0
      if (!Number.isInteger(hat) || (hat as number) < 1 || (hat as number) > topEye)
        errors.push(`hat: the number of rows at the top that are the hat, from 1 to ${topEye} (it must end above the eyes)`)
    }

    if (head !== undefined && (!isPoint(head) || !solid(head[0], head[1]) || solid(head[0], head[1] - 1)))
      errors.push('anchors.head: an [x, y] body pixel at the top of the head, with nothing above it')
  }

  // Visibility on light and dark themes: most of the outline must stand out.
  if (errors.length === 0) {
    const edge: string[] = []
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const c = at(x, y)
        if (c && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1))) edge.push(c)
      }
    for (const [bg, theme] of [[LIGHT_BG, 'light'], [DARK_BG, 'dark']] as const) {
      const share = edge.filter(c => contrast(c, bg) >= EDGE_CONTRAST).length / edge.length
      if (share < EDGE_SHARE)
        errors.push(
          `contrast: only ${Math.round(share * 100)}% of the outline shows on a ${theme} background (${bg}); ` +
            `use a ${theme === 'light' ? 'darker' : 'lighter'} outline colour, or a mid-tone body`,
        )
    }
  }

  if (errors.length) return { errors, warnings }
  return { character: input as Character, errors, warnings }
}

// ── Compiled: what the drawing needs, worked out once per character ────────
export type Compiled = {
  character: Character
  w: number
  h: number
  /** The first row with a pixel. */
  top: number
  grid: (string | undefined)[][]
  eyes: Point[]
  mouth?: Point
  left: Point
  right: Point
  head: Point
  ink: string
  glyph: string
  type: 'biped' | 'critter' | 'blob'
  /** Whether a smile fits under squinting eyes with a clear row between (else the eyes alone say it). */
  smiles: boolean
  /** The colour at each hand, for its arm. */
  armL: string
  armR: string
}

const compiled = new Map<string, Compiled>()

/** Works out a validated character's drawing data (cached by its JSON). */
export function compile(c: Character): Compiled {
  const key = JSON.stringify(c)
  const hit = compiled.get(key)
  if (hit) return hit
  const grid = c.body.map(r => [...r].map(ch => (ch === EMPTY ? undefined : c.palette[ch])))
  const cell = (x: number, y: number) => grid[y]?.[x]
  const w = grid[0]?.length ?? 0
  const h = grid.length
  const top = grid.findIndex(r => r.some(Boolean))
  const { left, right } = c.anchors.hands
  const mid = Math.floor(w / 2)
  const headX = cell(mid, top) ? mid : (grid[top] ?? []).findIndex(Boolean)
  const k: Compiled = {
    character: c,
    w,
    h,
    top,
    grid,
    eyes: c.anchors.eyes,
    mouth: c.anchors.mouth,
    left,
    right,
    head: c.anchors.head ?? [headX, top],
    ink: c.ink ?? DEFAULT_INK,
    glyph: c.glyph ?? DEFAULT_GLYPH,
    type: c.type ?? 'biped',
    smiles: c.anchors.mouth !== undefined && c.anchors.mouth[1] >= Math.max(...c.anchors.eyes.map(e => e[1])) + 3,
    armL: cell(left[0], left[1]) as string,
    armR: cell(right[0], right[1]) as string,
  }
  if (compiled.size > 32) compiled.clear()
  compiled.set(key, k)
  return k
}

/** The colour most of the body is, for the terminal glyph. */
export function mainColour(k: Compiled): string {
  const counts = new Map<string, number>()
  for (const c of k.grid.flat()) if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? DEFAULT_INK
}

/** The key a character is saved under. */
export const keyOf = (name: string) => name.trim().toLowerCase()
