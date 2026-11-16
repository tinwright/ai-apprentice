// The backdrop: an SVG sky for each part of the day, and the theme colours that go with it.

import type { ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { arc, type Sky } from './sky'

export const ORANGE = '#d97757'
export const REDUCED = '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }'

// ---------- colours ----------

export function hsl(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`
}

const ROLES = { accent: ORANGE, danger: '#d9534a', success: '#5f9e57', warning: '#d99a2b', pro: '#9a6fc4' }

function lightColors(label: string, hue: number, sat: number) {
  return makeColors({
    label,
    only: 'light',
    roles: ROLES,
    light: {
      gray: {
        anchors: {
          'surface-0': hsl(hue, sat, 91),
          'surface-1': hsl(hue, sat, 95),
          'surface-2': hsl(hue, sat, 98),
          'surface-3': hsl(hue, sat, 98),
          'text-primary': hsl(hue, 30, 13),
          'text-secondary': hsl(hue, 22, 28),
          'text-muted': hsl(hue, 16, 38),
        },
      },
    },
  })
}

function darkColors(label: string, hue: number, sat: number) {
  return makeColors({
    label,
    only: 'dark',
    roles: ROLES,
    dark: {
      gray: {
        anchors: {
          'surface-0': hsl(hue, sat, 7),
          'surface-1': hsl(hue, sat, 9.5),
          'surface-2': hsl(hue, sat, 12),
          'surface-3': hsl(hue, sat, 14),
          'text-primary': hsl(hue, 25, 93),
          'text-secondary': hsl(hue, 18, 80),
          'text-muted': hsl(hue, 14, 66),
        },
      },
    },
  })
}

// ---------- pieces of sky ----------

function svg(defs: string, style: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs><style>${style} ${REDUCED}</style>${body}</svg>`
}

function stars(count: number, fade: number): string {
  let out = ''
  let seed = 7
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * 1600)
    const y = Math.round(rand() * 640)
    const r = (0.8 + rand() * 1.6).toFixed(1)
    out += `<circle class="tw" cx="${x}" cy="${y}" r="${r}" fill="#fff" style="animation-delay:-${(rand() * 6).toFixed(1)}s;opacity:${(fade * (0.4 + rand() * 0.6)).toFixed(2)}"/>`
  }
  return out
}

const TWINKLE = '.tw { animation: tw 6s ease-in-out infinite alternate; } @keyframes tw { from { opacity: .15; } }'

function sunDisc(x: number, y: number, core: string, glow: string): string {
  return `<radialGradient id="halo"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    </defs><circle class="pulse" cx="${x}" cy="${y}" r="130" fill="url(#halo)"/><circle cx="${x}" cy="${y}" r="30" fill="${core}"/><defs>`
}

function moon(x: number, y: number, phase: number, south = false): string {
  // A lit disc with a shadow disc slid off it. Waxing, seen from the northern hemisphere, the
  // lit side is on the right, so the shadow slides left; waning, it slides right. The southern
  // hemisphere sees it the other way round.
  const lit = Math.abs(phase - 0.5) * 2 // 1 at new moon (all shadow), 0 at full
  const side = (phase < 0.5 ? -1 : 1) * (south ? -1 : 1)
  const shadowX = x + side * (1 - lit) * 64
  return `<radialGradient id="mglow"><stop offset="0" stop-color="#cfd8ff" stop-opacity=".35"/><stop offset="1" stop-color="#cfd8ff" stop-opacity="0"/></radialGradient>
    <mask id="phase"><rect width="1600" height="1000" fill="white"/><circle cx="${shadowX.toFixed(1)}" cy="${y}" r="30" fill="black"/></mask>
    </defs><circle cx="${x}" cy="${y}" r="110" fill="url(#mglow)" opacity="${(0.4 + (1 - lit) * 0.6).toFixed(2)}"/>
    <circle cx="${x}" cy="${y}" r="30" fill="#2a3150" opacity=".5"/>
    <circle cx="${x}" cy="${y}" r="30" fill="#f3ecd6" mask="url(#phase)"/><defs>`
}

function clouds(colour: string, opacity: number): string {
  return `<g class="cl" fill="${colour}" opacity="${opacity}">
    <g transform="translate(260 210)"><ellipse rx="90" ry="22"/><ellipse cx="-40" cy="-14" rx="46" ry="24"/><ellipse cx="30" cy="-18" rx="52" ry="28"/></g>
    <g transform="translate(1180 300)"><ellipse rx="110" ry="24"/><ellipse cx="-50" cy="-14" rx="50" ry="26"/><ellipse cx="34" cy="-20" rx="60" ry="30"/></g>
    <g transform="translate(760 120)" opacity=".7"><ellipse rx="70" ry="16"/><ellipse cx="20" cy="-12" rx="40" ry="20"/></g>
  </g>`
}

const DRIFT = '.cl { animation: cl 140s ease-in-out infinite alternate; } @keyframes cl { from { transform: translateX(-60px); } to { transform: translateX(80px); } } .pulse { transform-box: fill-box; transform-origin: center; animation: pulse 8s ease-in-out infinite alternate; } @keyframes pulse { from { opacity: .7; transform: scale(.94); } to { opacity: 1; transform: scale(1.05); } }'

export function scene(sky: Sky): string {
  const [x, y] = arc(sky.t)
  const grad = (stops: string[]) =>
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`
  const bg = '<rect width="1600" height="1000" fill="url(#sky)"/>'
  switch (sky.period) {
    case 'day':
      return svg(grad(['#7fb8e6', '#b6d9f2', '#e4f1fa']) + sunDisc(x, y, '#ffe27a', '#fff2b0'), DRIFT, bg + clouds('#ffffff', 0.75))
    case 'dawn':
      return svg(grad(['#2f3466', '#9c6a8e', '#f0a487', '#f9dca8']) + sunDisc(x, y, '#ffc56b', '#ffb07a'), DRIFT + TWINKLE, bg + stars(30, 0.35) + clouds('#ffd9c4', 0.45))
    case 'dusk':
      return svg(grad(['#1b1838', '#5a2f5c', '#b2475a', '#f08a4f']) + sunDisc(x, y, '#ff9a4d', '#ff7a4a'), DRIFT + TWINKLE, bg + stars(40, 0.5) + clouds('#f7a07a', 0.35))
    case 'night':
      return svg(grad(['#050816', '#0b1230', '#18213f']) + moon(x, y, sky.phase, sky.south), TWINKLE, bg + stars(110, 1))
  }
}

// ---------- the look ----------

export type Look = { key: string; source: string; args: ThemeSetArgs }

export function lookFor(sky: Sky): Look {
  // Bucket the sun's path so the backdrop moves in small steps, not every poll.
  const key = `${sky.period}-${Math.round(sky.t * 60)}`
  const colours =
    sky.period === 'day' ? lightColors('Skywatch: day', 205, 30)
    : sky.period === 'dawn' ? lightColors('Skywatch: dawn', 25, 35)
    : sky.period === 'dusk' ? darkColors('Skywatch: dusk', 290, 18)
    : darkColors('Skywatch: night', 228, 22)
  const refused = colours.problems.some(line => line.startsWith("Desktop won't paint"))
  const light = sky.period === 'day' || sky.period === 'dawn'
  const tint = light ? (sky.period === 'day' ? '#e8f0f6' : '#f6ebe2') : sky.period === 'dusk' ? '#151018' : '#0b0e1a'
  const backdrop = { scene: key, glass: { blur: 10, tint, opacity: 0.5 } }
  return {
    key,
    source: scene(sky),
    args: refused ? { backdrop, overrideColorScheme: light ? 'light' : 'dark' } : { colors: colours.theme, backdrop },
  }
}
