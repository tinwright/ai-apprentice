// The critter above the prompt, as SVG: asleep (breathing, z's, and now and then a dream), or
// awake, crab-walking side to side with a quick one-armed point.

import { ORANGE, REDUCED } from './scene'
import type { Period } from './sky'

const CRITTER_STYLE = `
  .body { transform-box: fill-box; transform-origin: 50% 100%; }
  .sleep .body { animation: breathe 3.2s ease-in-out infinite; }
  @keyframes breathe { 50% { transform: scaleY(.93); } }
  .z { font: bold 9px ui-monospace, monospace; fill: #8a8fa8; opacity: 0; animation: z 3.6s ease-out infinite; }
  .z2 { animation-delay: 1.2s; } .z3 { animation-delay: 2.4s; }
  @keyframes z { 0% { opacity: 0; transform: translate(0, 0); } 20% { opacity: .9; } 100% { opacity: 0; transform: translate(10px, -16px); } }
  .walk { animation: walk 2.6s linear infinite; }
  @keyframes walk {
    0% { transform: translate(56px, 0); } 7% { transform: translate(49px, -2px); } 14% { transform: translate(42px, 0); }
    21% { transform: translate(35px, -2px); } 28% { transform: translate(28px, 0); } 35% { transform: translate(21px, -2px); }
    42% { transform: translate(14px, 0); } 48%, 66% { transform: translate(8px, 0); }
    73% { transform: translate(20px, -2px); } 80% { transform: translate(32px, 0); } 87% { transform: translate(44px, -2px); }
    94%, 100% { transform: translate(56px, 0); } }
  .legA { animation: legA .26s steps(1) infinite; } .legB { animation: legB .26s steps(1) infinite; }
  @keyframes legA { 50% { opacity: 0; } } @keyframes legB { 0% { opacity: 0; } 50% { opacity: 1; } }
  .point { transform-box: view-box; transform-origin: 20px 17px; animation: point 2.6s ease-out infinite; }
  @keyframes point { 0%, 47% { transform: scaleX(.5); } 51%, 63% { transform: scaleX(1); } 68%, 100% { transform: scaleX(.5); } }
  .eye { transform-box: fill-box; transform-origin: center; animation: blink 4s infinite; }
  @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
  ${REDUCED}`

// A small blocky orange critter on a grid 12 cells wide and 8 tall, 3px a cell: a body 8x6,
// square eyes one cell in from the top corners, arms 2x2 out each side on rows 2-3, and four
// legs in two pairs with a two-cell gap in the middle.
const U = 3
const OX = 14
const OY = 8
const cell = (x: number, y: number, w: number, h: number, extra = '') =>
  `<rect x="${OX + x * U}" y="${OY + y * U}" width="${w * U}" height="${h * U}" ${extra}/>`
const EYE = '#1d1a17'

function body(eyes: 'open' | 'shut'): string {
  const eyeCells =
    eyes === 'open'
      ? cell(3, 1, 1, 1, `class="eye" fill="${EYE}"`) + cell(8, 1, 1, 1, `class="eye" fill="${EYE}"`)
      : `<rect x="${OX + 3 * U}" y="${OY + U + 1.6}" width="${U}" height="1.2" fill="${EYE}"/><rect x="${OX + 8 * U}" y="${OY + U + 1.6}" width="${U}" height="1.2" fill="${EYE}"/>`
  return cell(2, 0, 8, 6, `fill="${ORANGE}"`) + eyeCells
}

// Awake: a zig-zag crab walk left and right, stopping at the left end for a quick point.
function pointing(): string {
  const o = ORANGE
  // The two pairs of legs take turns lifting a pixel, so the feet patter as it scuttles.
  const leg = (x: number, lift: number) => `<rect x="${OX + x * U}" y="${OY + 6 * U}" width="${U}" height="${2 * U - lift}" fill="${o}"/>`
  const legsA = `<g class="legA">${leg(2, 0)}${leg(4, 1.5)}${leg(7, 0)}${leg(9, 1.5)}</g>`
  const legsB = `<g class="legB">${leg(2, 1.5)}${leg(4, 0)}${leg(7, 1.5)}${leg(9, 0)}</g>`
  // The left arm is 4 cells long and drawn at half length, its usual 2 cells, until it points.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 36" width="110" height="36" class="awake"><style>${CRITTER_STYLE}</style>
    <g class="walk">${body('open')}
    ${cell(-2, 2, 4, 2, `class="point" fill="${o}"`)}${cell(10, 2, 2, 2, `fill="${o}"`)}
    ${legsA}${legsB}</g></svg>`
}

export const POINTING = pointing()

// ---------- dreams ----------

// Once every two minutes the dream bubble drifts in to the critter's right, holds for about
// four seconds, and fades. What's in it follows the sky: sheep at night, a butterfly by day,
// a sunrise at dawn, fireflies at dusk.
const DREAM_STYLE = `
  .bubble { opacity: 0; animation: bubble 120s ease-in-out infinite; }
  @keyframes bubble { 0%, 1.6% { opacity: 0; transform: translateY(3px); } 2.4%, 5.6% { opacity: 1; transform: none; } 6.4%, 100% { opacity: 0; } }
  .trail1 { animation: trail 120s infinite; } .trail2 { animation: trail 120s infinite .4s; }
  @keyframes trail { 0%, 1% { opacity: 0; } 1.5%, 6% { opacity: .8; } 6.8%, 100% { opacity: 0; } }
  .sheep { animation: jump 2.8s ease-in-out infinite; } .sheep2 { animation-delay: -1.4s; }
  @keyframes jump { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 1; } 50% { transform: translate(18px, -8px); }
    90% { opacity: 1; } 100% { transform: translate(36px, 0); opacity: 0; } }
  .fly { animation: fly 6s ease-in-out infinite; }
  @keyframes fly { 0% { transform: translate(0, 0); } 25% { transform: translate(10px, -6px); } 50% { transform: translate(18px, 2px); }
    75% { transform: translate(6px, 5px); } 100% { transform: translate(0, 0); } }
  .wing { transform-box: fill-box; transform-origin: 100% 50%; animation: flap .25s ease-in-out infinite alternate; }
  .wingR { transform-origin: 0% 50%; }
  @keyframes flap { to { transform: scaleX(.25); } }
  .rise { animation: rise 7s ease-out infinite; }
  @keyframes rise { 0% { transform: translateY(9px); } 70%, 100% { transform: translateY(0); } }
  .ff { animation: ff 2.4s ease-in-out infinite alternate; }
  @keyframes ff { from { opacity: .1; transform: translate(0, 1px); } to { opacity: 1; transform: translate(2px, -2px); } }
`

export const DREAMS: Record<Period, string> = { night: 'sheep jumping a fence', day: 'a butterfly', dawn: 'a sunrise', dusk: 'fireflies' }

function dream(period: Period): string {
  const light = period === 'day' || period === 'dawn'
  const fill = light ? '#ffffff' : '#c9d2f0'
  const stroke = light ? '#8a8fa8' : '#c9d2f0'
  // Bubble: x 60..106, y 3..31. Everything inside is clipped to it.
  const shape = `<rect x="60" y="3" width="46" height="28" rx="13"/>`
  let inside = ''
  switch (period) {
    case 'night': {
      const sheep = (cls: string) => `<g class="sheep ${cls}"><g transform="translate(64 24)">
        <ellipse cx="0" cy="-3" rx="4.5" ry="3.2" fill="#f4f1ea" stroke="#8a8fa8" stroke-width=".5"/>
        <rect x="3" y="-6" width="2.6" height="2.6" fill="#3b3a40"/>
        <rect x="-3" y="-0.4" width="1" height="2.6" fill="#3b3a40"/><rect x="2" y="-0.4" width="1" height="2.6" fill="#3b3a40"/></g></g>`
      inside = `<g fill="#8a6a4a"><rect x="80" y="20" width="1.4" height="8"/><rect x="85" y="20" width="1.4" height="8"/><rect x="79" y="22" width="9" height="1.2"/><rect x="79" y="25" width="9" height="1.2"/></g>
        <rect x="60" y="27.5" width="46" height="4" fill="#5d8a4e" opacity=".7"/>${sheep('')}${sheep('sheep2')}`
      break
    }
    case 'day':
      inside = `<g class="fly"><g transform="translate(76 16)">
        <ellipse class="wing" cx="-3" cy="0" rx="3.2" ry="4" fill="#e98a5c"/><ellipse class="wing wingR" cx="3" cy="0" rx="3.2" ry="4" fill="#f0a77b"/>
        <rect x="-0.6" y="-3.5" width="1.2" height="7" fill="#3b3a40"/></g></g>
        <g fill="#7fb35f"><rect x="66" y="27" width="1" height="4"/><rect x="96" y="26" width="1" height="5"/><circle cx="96.5" cy="25.5" r="1.6" fill="#f2c94c"/></g>`
      break
    case 'dawn':
      inside = `<rect x="60" y="3" width="46" height="28" fill="#f6d2a8" opacity=".6"/>
        <g class="rise"><circle cx="83" cy="22" r="5" fill="#ffb347"/></g><rect x="60" y="23" width="46" height="9" fill="#9c6a8e" opacity=".85"/>`
      break
    case 'dusk':
      inside = [[70, 14, 0], [80, 22, -0.8], [90, 12, -1.6], [97, 20, -0.4], [75, 24, -2]]
        .map(([x, y, d]) => `<circle class="ff" cx="${x}" cy="${y}" r="1.4" fill="#ffe27a" style="animation-delay:${d}s"/>`)
        .join('')
      break
  }
  return `<defs><clipPath id="bub">${shape}</clipPath></defs>
    <circle class="trail1" cx="51" cy="9" r="1.4" fill="${fill}" stroke="${stroke}" stroke-width=".5" opacity="0"/>
    <circle class="trail2" cx="56" cy="6" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width=".5" opacity="0"/>
    <g class="bubble"><g fill="${fill}" fill-opacity="${light ? 0.75 : 0.14}" stroke="${stroke}" stroke-opacity=".6" stroke-width=".7">${shape}</g>
    <g clip-path="url(#bub)">${inside}</g></g>`
}

export function sleeping(period: Period): string {
  const o = ORANGE
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 36" width="110" height="36" class="sleep"><style>${CRITTER_STYLE} ${DREAM_STYLE}
    .z { animation-name: zl; } @keyframes zl { 0% { opacity: 0; transform: translate(0, 0); } 20% { opacity: .9; } 100% { opacity: 0; transform: translate(-8px, -14px); } }</style>
    <g class="body">${body('shut')}${cell(0, 2, 2, 2, `fill="${o}"`)}${cell(10, 2, 2, 2, `fill="${o}"`)}
    ${[2, 4, 7, 9].map(x => cell(x, 6, 1, 2, `fill="${o}"`)).join('')}</g>
    <text class="z" x="14" y="12">z</text><text class="z z2" x="14" y="12">z</text><text class="z z3" x="14" y="12">Z</text>
    ${dream(period)}</svg>`
}
