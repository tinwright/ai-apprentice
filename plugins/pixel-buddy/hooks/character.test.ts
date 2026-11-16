import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { Character } from '../types'
import { CLAWD, MAX_COLOURS, compile, contrast, validate } from './character'
import { POSES, minis, scene } from './draw'
import { MAX_SAVED, forget, load, save, use } from './library'
import { BOLT, MOCHI } from './samples'

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
  expect(errorsOf({ ...BOLT, hat: 'red' })).toContain('unknown field "hat"')
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

async function glyph($: Engine, text: RegExp) {
  const ui = await $.ui.mount(TERMINAL_BAND)
  const found = (await ui.find({ type: 'Text', text }))?.text
  await ui.unmount()
  return found
}

test('Claude\'s spec is checked: errors go back to Claude, and the buddy stays', async ($, on) => {
  await start($, on)
  const r = await $.tool.call({ tool: TOOL, character: { ...MOCHI, body: MOCHI.body.slice(0, 2) } } as never)
  expect(r.deny).toContain('5 to 16 rows')
  expect(await glyph($, /▐▛█▜▌/)).toBe('▐▛█▜▌')
})

test('a valid spec becomes the buddy, shows its moods and is still there next session', async ($, on) => {
  await start($, on)
  const r = await $.tool.call({ tool: TOOL, character: MOCHI } as never)
  expect(String(r.result)).toContain('Saved Mochi')
  expect(await glyph($, /=\^\.\^=/)).toBe('=^.^=')
  expect(await glyph($, /\(1\/18\)/)).toContain('(1/18)')

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(await glyph($, /=\^\.\^=/)).toBe('=^.^=')
})

test('/buddy-use lists and switches; /buddy-forget deletes', async ($, on) => {
  await start($, on, { characters: [MOCHI, BOLT], current: 'bolt' })
  expect(await glyph($, /\[•_•\]/)).toBe('[•_•]')

  expect((await $.command.run({ command: 'buddy-use' } as never)).text).toContain('Clawd, Mochi, Bolt (shown)')
  expect((await $.command.run({ command: 'buddy-use', args: 'mochi' } as never)).text).toBe('Mochi is your buddy now.')
  expect(await glyph($, /=\^\.\^=/)).toBe('=^.^=')

  expect((await $.command.run({ command: 'buddy-forget', args: 'Mochi' } as never)).text).toBe('Deleted Mochi. Clawd is back.')
  expect(await glyph($, /▐▛█▜▌/)).toBe('▐▛█▜▌')
})
