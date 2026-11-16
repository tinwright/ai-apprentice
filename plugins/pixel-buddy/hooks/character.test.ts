import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { Character } from '../types'
import { CLAWD, MAX_COLOURS, compile, contrast, validate } from './character'
import { POSES, minis, scene } from './draw'
import { MAX_SAVED, currentOf as currentOfLib, forget, load, save, setDance, use } from './library'
import { BOLT, MOCHI } from './samples'
import { portrait } from './terminal'
import type { Run } from './terminal'

const errorsOf = (c: unknown) => validate(c).errors.join('\n')
const withBody = (body: string[], extra: Partial<Character> = {}): Character => ({ ...BOLT, ...extra, body })

// ── The validator ──────────────────────────────────────────────────────────
test('Clawd and the samples are valid characters', () => {
  for (const c of [CLAWD, BOLT, MOCHI]) expect(validate(c).errors).toEqual([])
})

test('the body must be a rectangle of palette colours', () => {
  expect(errorsOf(withBody([...BOLT.body.slice(0, 11), '..dd...d..']))).toContain('every row must be the same width')
  expect(errorsOf(withBody([...BOLT.body.slice(0, 11), '..dd...xx..']))).toContain('"x" not in the palette')
  expect(errorsOf(withBody(BOLT.body.slice(0, 3)))).toContain('5 to 16 rows')
  expect(errorsOf(withBody(BOLT.body.map(r => r + r)))).toContain('5 to 16 pixels wide')
  expect(errorsOf(withBody([...BOLT.body.slice(0, 11), '...........']))).toContain('bottom row must have pixels')
})

test('the palette has at most 8 real colours with one-character keys', () => {
  const many = Object.fromEntries('abcdefghi'.split('').map(k => [k, '#4FA3A5']))
  expect(errorsOf({ ...BOLT, palette: { ...BOLT.palette, ...many } })).toContain(`at most ${MAX_COLOURS} colours`)
  expect(errorsOf({ ...BOLT, palette: { ...BOLT.palette, g: 'teal' } })).toContain('palette.g: "teal" is not a colour')
  expect(errorsOf({ ...BOLT, palette: { ...BOLT.palette, '.': '#000000' } })).toContain('must be one character, not "."')
  expect(validate({ ...BOLT, palette: { ...BOLT.palette, z: '#000000' } }).warnings).toContain('palette.z is never used in the body')
})

test('anchors must sit on the body where the drawing needs them', () => {
  const anchors = BOLT.anchors
  expect(errorsOf({ ...BOLT, anchors: { ...anchors, eyes: [[0, 0], [7, 3]] } })).toContain('needs face around it')
  expect(errorsOf({ ...BOLT, anchors: { ...anchors, eyes: [[4, 3], [6, 3]] } })).toContain('at least two pixels between the eyes')
  expect(errorsOf({ ...BOLT, anchors: { ...anchors, eyes: [[3, 3], [7, 3]], mouth: [5, 3] } })).toContain('must sit below the eyes')
  expect(errorsOf({ ...BOLT, anchors: { ...anchors, hands: { left: [3, 8], right: [8, 8] } } })).toContain("outer left edge")
  expect(errorsOf({ ...BOLT, anchors: { ...anchors, hands: { left: [2, 10], right: [8, 8] } } })).toContain('y between 1 and 9')
  expect(errorsOf({ ...BOLT, anchors: { ...anchors, hands: { left: [0, 8], right: [8, 8] } } })).toContain('must be a body pixel')
  expect(errorsOf({ ...BOLT, anchors: { ...anchors, head: [0, 0] } })).toContain('anchors.head')
  expect(errorsOf({ ...BOLT, anchors: { ...anchors, head: [5, 9] } })).toContain('nothing above it')
  const ring = withBody(['ddddddddddd', 'ddddddddddd', 'dsssssssssd', 'dsssssssssd', 'dd..ddd..dd', 'ddddddddddd'])
  const hole = { ...ring, anchors: { eyes: [[3, 2], [7, 2]], hands: { left: [4, 4], right: [10, 3] } } }
  expect(errorsOf(hole)).toContain('outer left edge')
  const twoTone = withBody(BOLT.body.map((row, y) => (y === 4 ? row.replace(/s/g, 'd') : row)))
  expect(errorsOf(twoTone)).toContain('barely show on #2F5D62')
})

test('unknown fields and wrong types are refused, not ignored', () => {
  expect(errorsOf('a robot')).toContain('must be an object')
  expect(errorsOf({ ...BOLT, scarf: 'red' })).toContain('unknown field "scarf"')
  expect(errorsOf({ ...BOLT, type: 'dragon' })).toContain('type: one of')
  expect(errorsOf({ ...BOLT, name: '' })).toContain('give it a name')
  expect(errorsOf({ ...BOLT, name: '<script>' })).toContain('letters, digits')
  expect(errorsOf({ ...BOLT, glyph: 'too long' })).toContain('glyph')
})

test('it must show on light and dark themes, and its eyes on its face', () => {
  const ghost = { ...MOCHI, palette: { b: '#FFFFFF', w: '#FFFFFF' } }
  expect(errorsOf(ghost)).toContain('on a light background')
  const shadow = { ...MOCHI, palette: { b: '#111111', w: '#333333' }, ink: '#EEEEEE' }
  expect(errorsOf(shadow)).toContain('on a dark background')
  expect(errorsOf({ ...BOLT, ink: '#DDEFEA' })).toContain('barely show')
  expect(contrast('#FFFFFF', '#000000')).toBe(21)
})

// ── The generic drawing ────────────────────────────────────────────────────
test('every pose draws, for Clawd and for generated characters', () => {
  for (const c of [CLAWD, BOLT, MOCHI]) {
    const k = compile(c)
    for (const pose of POSES)
      for (const shades of [false, true]) {
        const svg = scene(k, pose, shades)
        expect(svg.startsWith('<svg')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(/undefined|NaN/.test(svg)).toBe(false)
      }
    expect(/undefined|NaN/.test(minis(k, 2))).toBe(false)
  }
})

test('the drawing uses the character\'s own colours and its arms come from its hands', () => {
  const bolt = scene(compile(BOLT), 'idle', false)
  for (const colour of Object.values(BOLT.palette)) expect(bolt).toContain(colour)
  // Bolt's right arm hangs beside its right hand, at [9, 8], two pixels long.
  expect(bolt).toContain('x="9" y="8" width="1" height="2" fill="#2F5D62"')
  // Mochi is a critter: one-pixel arms.
  expect(scene(compile(MOCHI), 'idle', false)).toContain('x="8" y="6" width="1" height="1" fill="#8B5E3C"')
})

test('a smile shows with squinting eyes only when a clear row keeps them apart', () => {
  const smile = (c: Character) => scene(compile(c), 'proud', false).match(/fill="#1F1E1D"/g)?.length ?? 0
  // Bolt's mouth is right under its eyes: the "^ ^" alone says it.
  expect(smile(BOLT)).toBe(smile({ ...BOLT, anchors: { ...BOLT.anchors, mouth: undefined } }))
  const roomy = withBody([
    '.ddddddddd.',
    'dsssssssssd',
    'dsssssssssd',
    'dsssssssssd',
    'dsssssssssd',
    'dsssssssssd',
    'dsssssssssd',
    '.ddddddddd.',
    '..dgggggd..',
    '..dgggggd..',
    '..dd...dd..',
    '..dd...dd..',
  ], { palette: { d: '#2F5D62', s: '#DDEFEA', g: '#4FA3A5' } })
  const lowMouth = { ...roomy, anchors: { ...BOLT.anchors, eyes: [[3, 2], [7, 2]] as [number, number][], mouth: [5, 6] as [number, number], head: [5, 0] as [number, number] } }
  expect(validate(lowMouth).errors).toEqual([])
  expect(smile(lowMouth)).toBe(smile({ ...lowMouth, anchors: { ...lowMouth.anchors, mouth: undefined } }) + 3)
})

test('a tall buddy is drawn with smaller pixels, so the band stays the same height', () => {
  const tall = scene(compile(withBody([...BOLT.body, ...BOLT.body.slice(-4)])), 'idle', false)
  const height = (svg: string) => Number(/height="([\d.]+)"/.exec(svg)?.[1])
  expect(height(tall)).toBeLessThanOrEqual(50.01)
  expect(height(scene(compile(CLAWD), 'idle', false))).toBe(49)
})

// ── Saved buddies ──────────────────────────────────────────────────────────
test('saving switches to the new buddy, and the same name replaces it', () => {
  const empty = load(undefined, undefined)
  const one = save(empty, MOCHI)
  expect(one.library?.current).toBe('mochi')
  expect(one.message).toContain('Saved Mochi')
  const again = save(one.library!, { ...MOCHI, palette: { ...MOCHI.palette, b: '#7A4A2C' } })
  expect(again.message).toContain('Updated Mochi')
  expect(again.library!.characters.map(c => c.name)).toEqual(['Mochi'])
  expect(save(empty, JSON.stringify(BOLT)).library?.current).toBe('bolt')
})

test('a broken spec or the built-in name is not saved', () => {
  const empty = load(undefined, undefined)
  const broken = save(empty, { ...BOLT, body: ['...'] })
  expect(broken.library).toBe(undefined)
  expect(broken.message).toContain('Not saved')
  expect(save(empty, { ...BOLT, name: 'clawd' }).message).toContain('built-in')
})

test('only the newest few are kept, and broken saved ones are dropped on load', () => {
  let lib = load(undefined, undefined)
  for (let i = 0; i <= MAX_SAVED; i++) lib = save(lib, { ...BOLT, name: `Bolt ${i}` }).library!
  expect(lib.characters.length).toBe(MAX_SAVED)
  expect(lib.characters.some(c => c.name === 'Bolt 0')).toBe(false)
  const reloaded = load([MOCHI, { name: 'Bad' }], 'bad')
  expect(reloaded.characters.map(c => c.name)).toEqual(['Mochi'])
  expect(reloaded.current).toBe('clawd')
})

test('names are only names: not object properties, and numbers keep their place', () => {
  const lib = save(load(undefined, undefined), MOCHI).library!
  expect(use(lib, 'constructor').library).toBe(undefined)
  expect(forget(lib, 'toString').library).toBe(undefined)
  expect(load([MOCHI], 'constructor').current).toBe('clawd')
  let numbered = save(lib, { ...BOLT, name: '7' }).library!
  numbered = save(numbered, BOLT).library!
  expect(numbered.characters.map(c => c.name)).toEqual(['Mochi', '7', 'Bolt'])
})

test('switching and forgetting', () => {
  const lib = save(load(undefined, undefined), MOCHI).library!
  expect(use(lib, 'Clawd').library?.current).toBe('clawd')
  expect(use(lib, 'Nobody').message).toContain('No buddy called "Nobody"')
  const gone = forget(lib, 'mochi')
  expect(gone.library?.current).toBe('clawd')
  expect(gone.message).toContain('Clawd is back')
  expect(forget(lib, 'clawd').library).toBe(undefined)
})

// ── Through the engine: Claude's tool, the commands, the store ─────────────
const TOOL = 'mcp__pixel-buddy__set_character'
const TERMINAL_BAND = {
  plugin: 'pixel-buddy',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

type Engine = Parameters<TestBody>[0]
type On = Parameters<TestBody>[1]

async function start($: Engine, on: On, stored?: Record<string, unknown>) {
  mock.clock(on, { now: new Date(2026, 10, 16, 15).getTime() })
  mock.store(on, stored)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__pixel-buddy__${e.name}` } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
}

/** The band's drawing on a surface, as JSON text to search. */
async function band($: Engine, surface: 'terminal' | 'desktop' = 'desktop') {
  const ui = await $.ui.mount({ ...TERMINAL_BAND, surface })
  const drawn = JSON.stringify(await ui.drawn())
  await ui.unmount()
  return drawn
}

test('Claude\'s spec is checked: errors go back to Claude, and the buddy stays', async ($, on) => {
  await start($, on)
  const r = await $.tool.call({ tool: TOOL, character: { ...MOCHI, body: MOCHI.body.slice(0, 2) } } as never)
  expect(r.deny).toContain('5 to 16 rows')
  expect(await band($)).toContain('Clawd hanging out')
})

test('a valid spec becomes the buddy, shows its moods and is still there next session', async ($, on) => {
  await start($, on)
  const r = await $.tool.call({ tool: TOOL, character: MOCHI } as never)
  expect(String(r.result)).toContain('Saved Mochi')
  expect(await band($)).toContain('Mochi ')
  expect(await band($)).toContain('(1/18)')

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(await band($)).toContain('Mochi ')
})

test('/buddy-use lists and switches; /buddy-forget deletes', async ($, on) => {
  await start($, on, { characters: [MOCHI, BOLT], current: 'bolt' })
  expect(await band($)).toContain('Bolt hanging out')

  expect((await $.command.run({ command: 'buddy-use' } as never)).text).toContain('Clawd, Mochi, Bolt (shown)')
  expect((await $.command.run({ command: 'buddy-use', args: 'mochi' } as never)).text).toBe('Mochi is your buddy now.')
  expect(await band($)).toContain('Mochi ')

  expect((await $.command.run({ command: 'buddy-forget', args: 'Mochi' } as never)).text).toBe('Deleted Mochi. Clawd is back.')
  expect(await band($)).toContain('Clawd hanging out')
})

// ── The terminal: half-block portraits ─────────────────────────────────────
const cellsOf = (rows: Run[][]) => rows.map(r => r.map(run => run.text).join(''))

test('the terminal draws the buddy itself, two pixels per cell', () => {
  const clawd = portrait(compile(CLAWD), 'idle', false)!
  expect(clawd.length).toBe(4) // 7 pixels tall, padded to 8
  expect(cellsOf(clawd).every(r => [...r].length === CLAWD.body[0]!.length + 2)).toBe(true)
  expect(clawd.flat().some(r => r.fg === '#D97757')).toBe(true)
  expect(clawd.flat().some(r => r.fg === '#1F1E1D' || r.bg === '#1F1E1D')).toBe(true) // the eyes
  expect(portrait(compile(BOLT), 'idle', false)!.length).toBe(6)
})

test('the portrait takes the pose\'s face and a raised arm to wave', () => {
  const k = compile(CLAWD)
  expect(cellsOf(portrait(k, 'sleep', false)!)).not.toEqual(cellsOf(portrait(k, 'idle', false)!))
  const wave = portrait(k, 'wave', false)!
  expect(cellsOf(wave)).not.toEqual(cellsOf(portrait(k, 'idle', false)!))
})

test('a buddy too tall for the band falls back to its glyph', () => {
  expect(portrait(compile(withBody([...BOLT.body, ...BOLT.body.slice(-4)])), 'idle', false)).toBe(undefined)
})

test('the terminal row shows the portrait in the buddy\'s colours', async ($, on) => {
  await start($, on, { characters: [MOCHI], current: 'mochi' })
  const row = await band($, 'terminal')
  expect(row).toContain('▀')
  expect(row).toContain('#8B5E3C')
})

test('with Clawd Buddy installed too, only this buddy shows', async ($, on) => {
  await start($, on)
  const row = (plugin: string) => ({ plugin, tree: { type: 'Text', props: {}, children: [plugin] } })
  const ui = await $.ui.mount({
    plugin: 'pixel-buddy',
    surface: 'terminal',
    component: 'AbovePromptList',
    props: { ...TERMINAL_BAND.props, rows: [row('clawd-buddy'), row('pixel-buddy'), row('skywatch')] },
  } as never)
  const drawn = JSON.stringify(await ui.drawn())
  await ui.unmount()
  expect(drawn).not.toContain('clawd-buddy')
  expect(drawn).toContain('skywatch')
})

// ── Dancing ────────────────────────────────────────────────────────────────
test('a dancer dances when nothing else is going on, and its demo shows the moves', async ($, on) => {
  await start($, on, { characters: [{ ...BOLT, dance: true }], current: 'bolt' })
  expect(await band($)).toContain('Bolt dancing')
  expect((await $.command.run({ command: 'buddy-demo' } as never)).text).toContain('20 moods')
  expect(await band($)).toContain('(1/20)')
})

test('dancing is opt-in and checked', async ($, on) => {
  expect(errorsOf({ ...BOLT, dance: 'yes' })).toContain('dance: true or false')
  await start($, on, { characters: [BOLT], current: 'bolt' })
  expect(await band($)).toContain('Bolt hanging out')
})

test('the dance swaps the arms up and down and sways', () => {
  const svg = scene(compile(BOLT), 'dance', false)
  expect(svg).toContain('class="groove"')
  expect(svg).toContain('class="waveA"')
  expect(svg).toContain('class="waveB"')
})

test('a hat wobbles while dancing, and must end above the eyes', () => {
  expect(errorsOf({ ...BOLT, hat: 4 })).toContain('it must end above the eyes')
  const k = compile({ ...BOLT, dance: true, hat: 2 })
  expect(scene(k, 'dance', false)).toContain('class="wobble"')
  expect(scene(k, 'idle', false)).not.toContain('class="wobble"')
})

test('/buddy-flarhgunnstow goes wild for 30 seconds, but a question still gets a wave', async ($, on) => {
  const clock = mock.clock(on, { now: new Date(2026, 10, 16, 15).getTime() })
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__pixel-buddy__${e.name}` } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  on('classic.PermissionRequest', () => ({}))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  expect((await $.command.run({ command: 'buddy-flarhgunnstow' } as never)).text).toContain('FLARHGUNNSTOW')
  expect(await band($)).toContain('Clawd going absolutely wild')

  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } } as never)
  expect(await band($)).toContain('needs your OK')
  await $.prompt.submit({ text: 'ok' } as never).catch(() => {})

  await clock.advance(30_000)
  expect(await band($)).toContain('Clawd hanging out')
})

test('/buddy-dance switches dancing for the shown buddy, Clawd included', () => {
  const lib = save(load(undefined, undefined), MOCHI).library!
  const on = setDance(lib, '')
  expect(on.message).toBe('Mochi is dancing 🕺')
  expect(currentOfLib(on.library!).dance).toBe(true)
  expect(setDance(on.library!, '').message).toBe('Mochi stopped dancing.')
  expect(setDance(on.library!, 'on').message).toBe('Mochi is dancing 🕺')
  expect(setDance(lib, 'twirl').library).toBe(undefined)

  const clawd = setDance(use(lib, 'clawd').library!, 'on').library!
  expect(clawd.clawdDances).toBe(true)
  expect(clawd.characters.find(c => c.name === 'Mochi')?.dance).toBe(undefined)
  expect(load(clawd.characters, 'clawd', true).clawdDances).toBe(true)
})

test('/buddy-dance through the engine, kept for next time', async ($, on) => {
  await start($, on)
  expect((await $.command.run({ command: 'buddy-dance' } as never)).text).toBe('Clawd is dancing 🕺')
  expect(await band($)).toContain('Clawd dancing')
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(await band($)).toContain('Clawd dancing')
  await $.command.run({ command: 'buddy-dance', args: 'off' } as never)
  expect(await band($)).toContain('Clawd hanging out')
})
