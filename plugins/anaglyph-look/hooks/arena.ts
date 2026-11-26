// The arena scene, seen from just behind your own tank: you follow an enemy tank as pylons,
// slabs, arches and beacons stream toward you, and you fire at it while a tool runs. Every
// shape is this plugin's own.

import { BASE_CSS, DEPTH, f, frame, H, HORIZON, type Inks, onFloor, stars, stereo, VX } from './stereo'

export type Mode = 'idle' | 'working' | 'firing' | 'waiting' | 'blast'

export const MODES: readonly Mode[] = ['idle', 'working', 'firing', 'waiting', 'blast']

// Hatching gives each eye texture to match, the way a photo's detail does: it reads as more
// solid than a bare outline.
const hatch = (x0: number, x1: number, y0: number, y1: number, step: number) => {
  let d = ''
  for (let x = x0 + step; x < x1; x += step) d += `M${f(x)} ${f(y0)}L${f(x)} ${f(y1)}`
  return d
}

const PYLON = 'M-30 0L30 0L15 -140L-15 -140Z M0 0L0 -140M-24 -28L24 -28M-18 -84L18 -84'
const SLAB = 'M-80 0L60 0L90 -70L-50 -70Z M-80 0L-50 -70M-50 0L-20 -70M-20 0L10 -70M10 0L40 -70M40 0L70 -70'
const ARCH = 'M-70 0V-90H70V0M-40 0V-55Q0 -100 40 -55V0' + hatch(-70, -40, -90, 0, 15) + hatch(40, 70, -90, 0, 15)
const BEACON = 'M0 -120L18 -95L0 -70L-18 -95Z M-18 -95L18 -95M-36 0a36 10 0 1 0 72 0a36 10 0 1 0 -72 0'

// A tank seen from behind: tracks either side, a sloped hull, a turret, and the barrel pointing
// up the floor toward the horizon.
const TANK_REAR =
  'M-70 0L-70 -34L-46 -34L-46 0Z M46 0L46 -34L70 -34L70 0Z' +
  hatch(-70, -46, -34, 0, 12) +
  hatch(46, 70, -34, 0, 12) +
  'M-46 -6L46 -6L38 -40L-38 -40Z' +
  'M-26 -40L26 -40L20 -62L-20 -62Z M-4 -62L-2 -92L2 -92L4 -62' +
  'M-30 -20L30 -20'

// A planet's ring arcing up from the horizon: thin bands of different brightness, with a gap.
// Each band is [radius, stroke width, opacity].
const RING_BANDS: ReadonlyArray<readonly [number, number, number]> = Array.from({ length: 32 }, (_, i) => {
  const r = 1300 + i * 13
  const isGap = r > 1545 && r < 1600
  const glow = 0.12 + 0.2 * Math.abs(Math.sin(i * 1.7)) + (i > 20 ? 0.08 : 0)
  return [r, 4 + (i % 3) * 3, isGap ? 0 : glow] as const
}).filter(([, , o]) => o > 0)

// A long carrier: a wedge hull, a raised deck and bridge, twin engines, hatched panels,
// running lights and thrusters. It flies to the right.
const SHIP =
  'M-240 -20L120 -34L250 -6L250 6L120 34L-240 20Z' +
  'M-160 -20L40 -48L110 -32M40 -48L60 -66L92 -66L110 -32' +
  'M-284 -28h44v20h-44ZM-284 8h44v20h-44Z' +
  'M-240 0L250 0' +
  hatch(-220, 110, -18, 18, 22)
const SHIP_LIGHTS = [-200, -90, 20, 130].map(x => `<circle class="blink" cx="${x}" cy="-24" r="3" stroke="none"/>`).join('')
const SHIP_THRUST = '<ellipse class="thrust" cx="-298" cy="-18" rx="16" ry="7" fill-opacity=".5"/><ellipse class="thrust" cx="-298" cy="18" rx="16" ry="7" fill-opacity=".5"/>'
const CRUISE = 80 // seconds for the carrier to cross the sky

type Prop = { path: string; groundX: number; size: number; offset: number; beacon?: boolean }

// What streams toward you, each in its own lane, spread through the lap by `offset`.
const PROPS: Prop[] = [
  { path: PYLON, groundX: -250, size: 2.6, offset: 0 },
  { path: SLAB, groundX: 1750, size: 2.6, offset: 0.14 },
  { path: BEACON, groundX: 420, size: 2.4, offset: 0.27, beacon: true },
  { path: ARCH, groundX: -700, size: 2.2, offset: 0.4 },
  { path: PYLON, groundX: 1350, size: 2.6, offset: 0.55 },
  { path: BEACON, groundX: 1250, size: 2.4, offset: 0.68, beacon: true },
  { path: SLAB, groundX: 150, size: 2.4, offset: 0.8 },
  { path: BEACON, groundX: 2300, size: 2.2, offset: 0.9, beacon: true },
]

// Where each piece of a blown-up tank flies, and how far it turns: the ones thrown down come
// toward you.
const DEBRIS: ReadonlyArray<readonly [number, number, number]> = [
  [-260, -120, 300], [220, -160, -240], [-120, 200, 180], [180, 240, -320],
  [-340, 40, 420], [320, 60, -200], [40, -220, 260], [-40, 300, -380],
]

const YAW = 13 // seconds for one sweep of a turn, left to right
const LAP = 9 // seconds for a prop to come from the horizon past you
const ENEMY_T = 0.3
const PLAYER = { y: 930, size: 1.6, depth: 5 }

// `respawn` fades a new tank in ahead, after the last one blew up.
export type ArenaArgs = { inks: Inks; strength: number; mode: Mode; phase: number; respawn?: boolean }

// From the horizon to past the bottom edge, spaced as perspective spaces it: equal steps in
// distance, which crowd together near the horizon.
function approach(p: Prop, i: number) {
  const frames = Array.from({ length: 13 }, (_, k) => {
    const z = 14 - 13.1 * (k / 12)
    const t = 1 / z
    const at = onFloor(p.groundX, t)
    const fade = k === 0 ? ';opacity:0' : k === 1 ? ';opacity:1' : ''
    return `${f((k / 12) * 100)}%{transform:translate(${f(at.x)}px,${f(at.y)}px) scale(${f(t * p.size)})${fade}}`
  }).join('')
  return `@keyframes come${i}{${frames}}`
}

// `phase` is seconds on a clock every scene shares, so a scene drawn for a new mode carries on
// from where the last one's world was.
export function arenaScene({ inks, strength, mode, phase, respawn }: ArenaArgs): string {
  const s = stereo(inks, strength)
  const flow = s.scatter(LAP / 1.5, phase % (LAP / 1.5), 23)
  const turning = `animation-delay:-${f(phase % (YAW * 2))}s`

  // Each eye's copy of what lies on the floor is skewed as the floor is, so a prop's depth
  // follows where it is on the floor as it comes toward you.
  const onTheFloor = (inner: string) =>
    `<g class="eye rad r" stroke="${inks.red}" fill="${inks.red}">${inner}</g>` +
    `<g class="eye rad c" stroke="${inks.cyan}" fill="${inks.cyan}">${inner}</g>`

  const props = PROPS.map((p, i) => {
    const delay = f(((phase / LAP + p.offset) % 1) * LAP)
    const body = `<path d="${p.path}" fill-opacity=".18" vector-effect="non-scaling-stroke"/>`
    const moving = `<g class="come${p.beacon ? ' beacon' : ''}" style="animation-name:come${i};animation-delay:-${delay}s">${body}</g>`
    return onTheFloor(moving)
  }).join('')

  const enemyAt = onFloor(VX, ENEMY_T)
  const enemy =
    `<g transform="translate(${f(enemyAt.x)} ${f(enemyAt.y)})"${mode === 'blast' ? ' class="gone"' : respawn ? ' class="spawn"' : ''}><g class="weave" style="animation-delay:-${f(phase % 7)}s">` +
    s.eyes(`<g transform="scale(${f(ENEMY_T * 2.6)})"><path d="${TANK_REAR}" fill-opacity=".18" vector-effect="non-scaling-stroke"/></g>`, enemyAt.depth) +
    '</g></g>'

  const player =
    `<g transform="translate(${VX} ${PLAYER.y})"><g class="rumble">` +
    s.eyes(`<g transform="scale(${PLAYER.size})"><path d="${TANK_REAR}" fill-opacity=".18" vector-effect="non-scaling-stroke"/></g>`, PLAYER.depth) +
    '</g></g>'

  // Bolts from your barrel up the floor toward the tank ahead.
  const muzzle = PLAYER.y - 92 * PLAYER.size
  const bolts =
    mode === 'firing'
      ? [0, 0.3]
          .map(
            delay =>
              onTheFloor(
                `<g class="bolt" style="animation-delay:${delay}s"><line x1="0" y1="0" x2="0" y2="-36" stroke-width="6" vector-effect="non-scaling-stroke"/></g>`,
              ),
          )
          .join('')
      : ''

  // The tank ahead blowing up: a flash ring, then debris flung out. Pieces thrown down the
  // floor come toward you, since each eye's copy is skewed as the floor is.
  const blast =
    mode === 'blast'
      ? onTheFloor(
          `<g style="transform:translate(${f(enemyAt.x)}px,${f(enemyAt.y - 30 * ENEMY_T)}px)">` +
            '<g class="flash"><ellipse rx="60" ry="22" fill-opacity=".25" vector-effect="non-scaling-stroke"/></g>' +
            DEBRIS.map((_, i) => `<g class="bit bit${i}"><path d="M-14 -4L14 4M-8 6L10 -6" vector-effect="non-scaling-stroke"/></g>`).join('') +
            '</g>',
        )
      : ''

  // Turning: the sky pans, and the ground pans and leans with it, near parts sweeping faster
  // than far ones. Your own tank stays put in front of you.
  const ring = s.eyes(
    `<g clip-path="url(#sky)"><g transform="translate(2200 1500) rotate(-8)">` +
      RING_BANDS.map(([r, w, o]) => `<ellipse rx="${r}" ry="${f(r * 1.04)}" fill="none" stroke-width="${w}" stroke-opacity="${f(o)}"/>`).join('') +
      '</g></g>',
    DEPTH.far,
  )
  const ship =
    `<g transform="translate(0 175)"><g class="ship" style="animation-delay:-${f(phase % CRUISE)}s">` +
    s.eyes(`<g transform="scale(1.1)"><path d="${SHIP}" fill-opacity=".18" vector-effect="non-scaling-stroke"/>${SHIP_LIGHTS}${SHIP_THRUST}</g>`, -4) +
    '</g></g>'

  const body =
    `<clipPath id="sky"><rect x="-2600" y="-400" width="${1600 + 5200}" height="${HORIZON + 400}"/></clipPath>` +
    `<g class="pan" style="${turning}">${stars(s.eyes, 110, 11)}${ring}${ship}</g>` +
    `<g class="yaw" style="${turning}">` +
    `<g mask="url(#floor)">${flow.svg}${s.floor('2 46')}</g>` +
    props +
    enemy +
    blast +
    bolts +
    '</g>' +
    player +
    // A window frame at the screen's own depth, as an old stereo card has: the arena reads as
    // behind it.
    s.eyes(`<rect x="36" y="36" width="1528" height="928" rx="30" fill="none" stroke-width="3"/>`, 0)

  const style =
    BASE_CSS +
    flow.css +
    `.ship{animation:cruise ${CRUISE}s linear infinite}@keyframes cruise{from{transform:translateX(-900px)}to{transform:translateX(2600px)}}` +
    '.blink{animation:blink 1.6s steps(2) infinite}@keyframes blink{50%{opacity:.15}}' +
    '.thrust{transform-box:fill-box;transform-origin:100% 50%;animation:thrust .5s ease-in-out infinite alternate}@keyframes thrust{to{transform:scaleX(1.5);opacity:.6}}' +
    `.pan{animation:pan ${YAW}s ease-in-out infinite alternate}@keyframes pan{from{transform:translateX(-60px)}to{transform:translateX(60px)}}` +
    `.yaw{transform-origin:${VX}px ${HORIZON}px;animation:yaw ${YAW}s ease-in-out infinite alternate}@keyframes yaw{from{transform:translateX(-60px) skewX(5deg)}to{transform:translateX(60px) skewX(-5deg)}}` +
    PROPS.map(approach).join('') +
    `.come{animation-duration:${LAP}s;animation-timing-function:linear;animation-iteration-count:infinite}` +
    '.beacon{opacity:.6}' +
    `.weave{animation:weave 7s ease-in-out infinite alternate}@keyframes weave{from{transform:translateX(${f(-240 * ENEMY_T * 2)}px)}to{transform:translateX(${f(240 * ENEMY_T * 2)}px)}}` +
    '.rumble{animation:rumble .35s steps(2) infinite}@keyframes rumble{50%{transform:translateY(-2px)}}' +
    `.bolt{animation:bolt .6s ease-out both}@keyframes bolt{from{transform:translate(${VX}px,${f(muzzle)}px) scale(1);opacity:1}to{transform:translate(${VX}px,${f(enemyAt.y - 40 * ENEMY_T)}px) scale(${f(ENEMY_T)});opacity:.3}}` +
    '.gone{opacity:0}.spawn{animation:spawn 1.2s ease-out both}@keyframes spawn{from{opacity:0}to{opacity:1}}' +
    '.flash{animation:flash .9s ease-out both}@keyframes flash{from{transform:scale(.2);opacity:1}to{transform:scale(4);opacity:0}}' +
    DEBRIS.map(([dx, dy, turn], i) => `.bit${i}{animation:bit${i} 1.7s cubic-bezier(.2,.7,.4,1) both}@keyframes bit${i}{from{transform:translate(0,0) rotate(0);opacity:1}to{transform:translate(${dx}px,${dy}px) rotate(${turn}deg);opacity:0}}`).join('') +
    // Parked: the world, the tank ahead and your engine hold where they are.
    '.idle .come,.idle .dots,.idle .weave,.idle .rumble,.idle .pan,.idle .yaw,.waiting .come,.waiting .dots,.waiting .weave,.waiting .rumble,.waiting .pan,.waiting .yaw{animation-play-state:paused}' +
    // Waiting for you: the beacons light up and pulse fast.
    '.waiting .beacon{animation-name:inherit}.waiting .beacon path{animation:call 1.2s ease-in-out infinite}@keyframes call{0%,100%{opacity:.7}50%{opacity:1;fill-opacity:.45}}' +
    s.css()

  return frame(style, body, mode === 'firing' || mode === 'blast' ? 'working' : mode)
}

export const ARENA = { DEPTH, H, HORIZON }
