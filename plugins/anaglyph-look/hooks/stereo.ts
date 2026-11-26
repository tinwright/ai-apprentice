// What every scene shares: drawing each thing once per eye, pushed apart by its depth, and the
// floor that runs from behind the screen at the horizon to in front of it at the bottom edge.

// Red lens on the left eye, cyan on the right. A depth is the red copy's x minus the cyan
// copy's, in on-screen CSS pixels: negative sits behind the screen, positive in front.
export const DEPTH = { far: -10, near: 6 }

export const W = 1600
export const H = 1000
export const HORIZON = 620
export const VX = W / 2
export const BG = '#07070b'
export const GRID = '#6a4fa8'
export const SCENE_LIMIT = 131_072
export const REDUCED = '@media (prefers-reduced-motion:reduce){*{animation:none!important}}'

export type Inks = { red: string; cyan: string }

// The scene scales with its box by max(width / W, height / H). Each bracket covers boxes up to
// that scale, and the fallback anything larger, so a depth stays the same number of pixels.
const BRACKETS = [0.6, 0.8, 1, 1.25, 1.6, 2]
const FALLBACK_SCALE = 2.6

export const f = (n: number) => (Math.round(n * 100) / 100).toString()
const depthName = (n: number) => `d${String(n).replace('-', 'm').replace('.', '_')}`

export function random(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function polygon(r: number, n: number, start: number) {
  return Array.from({ length: n }, (_, k) => {
    const a = ((start + (360 / n) * k) * Math.PI) / 180
    return [r * Math.cos(a), r * Math.sin(a)] as const
  })
}

export const pts = (ps: ReadonlyArray<readonly [number, number]>) => ps.map(([x, y]) => `${f(x)} ${f(y)}`)

// A spot on the floor, t from 0 at the horizon to 1 at the bottom edge: where it is drawn, how
// big, and how deep. A ground x of VX stays in the middle; others spread out as t grows.
export function onFloor(groundX: number, t: number) {
  return { x: VX + (groundX - VX) * t, y: HORIZON + (H - HORIZON) * t, scale: t, depth: DEPTH.far + (DEPTH.near - DEPTH.far) * t }
}

// Moving things keyframe their own eye offsets: `u` turns pixels into viewBox units for the
// box's scale, and `id` names this bracket's keyframes apart from the others'.
export type ScaledRules = (u: (px: number) => string, id: string) => string

export function stereo(inks: Inks, strength: number) {
  const depths = new Set<number>()

  const eyes = (content: string, d: number) => {
    const n = Math.round(d * 2) / 2
    depths.add(n)
    return (
      `<g class="eye r ${depthName(n)}" stroke="${inks.red}" fill="${inks.red}">${content}</g>` +
      `<g class="eye c ${depthName(n)}" stroke="${inks.cyan}" fill="${inks.cyan}">${content}</g>`
    )
  }

  const floor = (dash?: string) => {
    const lines: string[] = []
    for (let bx = -2600; bx <= W + 2600; bx += 200) lines.push(`<line x1="${VX}" y1="${HORIZON}" x2="${bx}" y2="${H}"/>`)
    const style = dash ? ` stroke-dasharray="${dash}"` : ''
    return (
      `<g class="eye rad r" stroke="${inks.red}"${style}>${lines.join('')}</g>` +
      `<g class="eye rad c" stroke="${inks.cyan}"${style}>${lines.join('')}</g>`
    )
  }

  // Lines across the floor rolling toward the viewer, `run` seconds from horizon to bottom,
  // `phase` seconds in, so a scene drawn again later picks up where the last one was.
  const rows = (run: number, phase: number, dash?: string) => {
    const LINES = 14
    const style = dash ? ` stroke-dasharray="${dash}"` : ''
    const lines = Array.from(
      { length: LINES },
      (_, i) => `<line class="row" x1="-2600" y1="0" x2="${W + 2600}" y2="0"${style} style="animation-delay:-${f(phase + (run / LINES) * i)}s"/>`,
    ).join('')
    const frames = Array.from({ length: 13 }, (_, k) => {
      const p = k / 12
      const z = 14 - 13 * p
      return `${f(p * 100)}%{transform:translateY(${f(HORIZON + (H - HORIZON) / z)}px)}`
    }).join('')
    return { svg: lines, css: `.row{stroke:${GRID};stroke-width:2;animation:approach ${run}s linear infinite}@keyframes approach{${frames}}` }
  }

  // A scatter of dots on the floor flowing toward the viewer: each row is born near the
  // horizon, rolls down and widens as it comes, so its dots spread outward, near ones fast and
  // far ones slow. Each eye's copy is skewed as the floor is, so a dot's depth follows where it
  // is. `run` seconds from horizon to bottom, `phase` seconds in.
  const scatter = (run: number, phase: number, seed: number) => {
    const LINES = 22
    const rand = random(seed)
    const pattern = () => Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? '0.1' : f(40 + rand() * 260))).join(' ')
    const lines = Array.from({ length: LINES }, (_, i) => {
      const delay = f(phase + (run / LINES) * i)
      return `<line class="dots" x1="-4000" y1="0" x2="${W + 4000}" y2="0" stroke-dasharray="${pattern()}" stroke-dashoffset="${f(rand() * 400)}" style="animation-delay:-${delay}s"/>`
    }).join('')
    const frames = Array.from({ length: 13 }, (_, k) => {
      const p = k / 12
      const z = 14 - 13 * p
      return `${f(p * 100)}%{transform:translateY(${f(HORIZON + (H - HORIZON) / z)}px) scaleX(${f(1 / z)})}`
    }).join('')
    return {
      svg:
        `<g class="eye rad r" stroke="${inks.red}">${lines}</g>` +
        `<g class="eye rad c" stroke="${inks.cyan}">${lines}</g>`,
      css:
        `.dots{stroke-width:4;stroke-linecap:round;transform-origin:${VX}px 0;animation:flow ${run}s linear infinite}` +
        `@keyframes flow{${frames}}`,
    }
  }

  const css = (extra?: ScaledRules) => {
    const rules = (scale: number) => {
      const u = (px: number) => f((px * strength) / 2 / scale)
      const out = [...depths].map(n => `.r.${depthName(n)}{transform:translateX(${u(n)}px)}.c.${depthName(n)}{transform:translateX(${u(-n)}px)}`)
      // The floor's depth runs from far at the horizon to near at the bottom edge: x' = x + k*y + e.
      const k = ((DEPTH.near - DEPTH.far) * strength) / 2 / scale / (H - HORIZON)
      const e = (DEPTH.far * strength) / 2 / scale - k * HORIZON
      const m = (sign: number) => `matrix(1,0,${(sign * k).toFixed(5)},1,${f(sign * e)},0)`
      out.push(`.rad.r{transform:${m(1)}}.rad.c{transform:${m(-1)}}`)
      if (extra) out.push(extra(u, String(scale).replace('.', '_')))
      return out.join('')
    }
    return (
      rules(FALLBACK_SCALE) +
      [...BRACKETS]
        .reverse()
        .map(t => `@media (max-width:${W * t}px) and (max-height:${H * t}px){${rules(t)}}`)
        .join('')
    )
  }

  return { eyes, floor, rows, scatter, css }
}

export function stars(eyes: (content: string, d: number) => string, count: number, seed: number) {
  const rand = random(seed)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const x = -500 + rand() * (W + 1000)
    const y = rand() * (HORIZON - 50)
    const r = 0.8 + rand() * 1.6
    const d = DEPTH.far + rand() * 4
    const twinkle = rand() < 0.3 ? ` class="tw" style="animation-delay:-${f(rand() * 3)}s"` : ''
    out.push(`<g${twinkle}>${eyes(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" stroke="none"/>`, d)}</g>`)
  }
  return out.join('')
}

export function frame(style: string, body: string, rootClass = '') {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"${rootClass ? ` class="${rootClass}"` : ''}>` +
    `<style>${style}${REDUCED}</style>` +
    '<defs>' +
    `<linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="${HORIZON}" x2="0" y2="${H}">` +
    '<stop offset="0" stop-color="#000"/><stop offset=".25" stop-color="#555"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
    `<mask id="floor"><rect x="-2600" y="${HORIZON}" width="${W + 5200}" height="${H - HORIZON}" fill="url(#fade)"/></mask>` +
    `<radialGradient id="glow" cx="50%" cy="100%" r="60%"><stop offset="0" stop-color="#3a1640" stop-opacity=".9"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>` +
    '</defs>' +
    `<rect x="-2600" y="-200" width="${W + 5200}" height="${H + 400}" fill="${BG}"/>` +
    `<rect x="-400" y="${HORIZON - 260}" width="${W + 800}" height="260" fill="url(#glow)"/>` +
    body +
    '</svg>'
  )
}

export const BASE_CSS =
  '.eye{mix-blend-mode:screen}' +
  'path,line,circle,ellipse{stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}' +
  '.tw{animation:tw 3s ease-in-out infinite}@keyframes tw{50%{opacity:.25}}'
