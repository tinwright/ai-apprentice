import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Draft, Hud } from '../types'
import { arenaScene, type Mode } from './arena'
import { type Calibration, calibrationFrom, describe, type Step, STEPS, step, testCard } from './calibrate'
import { gridScene, lookFor, type Settings, settingsFrom } from './scene'

// Anaglyph Look: a dark theme with a red and cyan 3D scene behind the chat. The arena scene
// follows what Claude is doing; /anaglyph-calibrate tunes the inks to one pair of glasses.

const PANE = 'anaglyph-calibrate'
const STORE_KEY = 'calibration'
const HINT_KEY = 'hinted'
const KEEP_SCENES = 4 // scenes kept for the app to draw: the current one and a few before
const SHOT_MS = 1500 // how long a shot shows
const SHOT_GAP_MS = 2500 // the least time between shots
const BLAST_MS = 2600 // how long the tank ahead takes to blow up

const draft = atom({ plugin: 'anaglyph-look', key: 'draft' } as const, null as Draft, { shape: 'draft-1' })
const NO_HUD: Hud = { mode: 'idle', shots: 0, hits: 0, context: null }
const hud = atom({ plugin: 'anaglyph-look', key: 'hud' } as const, NO_HUD, { shape: 'hud-1' })

// What the readout above the prompt calls each state.
const CALLED: Record<Hud['mode'], string> = {
  idle: 'PARKED',
  working: 'ADVANCING',
  firing: 'FIRING',
  waiting: 'AWAITING ORDERS',
  blast: 'TARGET DOWN',
}

let settings: Settings = settingsFrom({})
const s = {
  saved: undefined as Calibration | undefined,
  preview: undefined as Calibration | undefined,
  mode: 'idle' as Mode,
  isTurnRunning: false,
  shotsThisTurn: 0,
  respawn: false,
  blastTimer: undefined as Timer | undefined,
  lastShotAt: 0,
  shotTimer: undefined as Timer | undefined,
  scenes: new Map<string, string>(),
  seq: 0,
  // While the demo runs it owns the arena: Claude's own activity waits until it ends.
  isDemo: false,
  demoTimers: [] as Timer[],
}

// The demo: every arena state in turn, with the status line saying what each one means.
const DEMO: ReadonlyArray<readonly [number, Mode, string]> = [
  [0, 'idle', 'idle: everything parked'],
  [3000, 'working', 'Claude works: the tanks drive and the floor rolls'],
  [7000, 'firing', 'a tool runs: shots fire'],
  [8500, 'working', 'Claude works'],
  [10000, 'firing', 'another tool: more shots'],
  [11500, 'working', 'Claude works'],
  [14000, 'waiting', 'Claude waits for you: the beacons light up'],
  [19000, 'working', 'Claude works'],
  [20500, 'blast', 'Claude finishes: the tank ahead blows up'],
  [23100, 'idle', 'a new tank rolls in, and everything parks'],
]
const DEMO_MS = 26000

const fallback = (): Calibration => ({ ...settings.inks, strength: settings.strength })
const current = (): Calibration => s.preview ?? s.saved ?? fallback()

async function show($: EngineInterface): Promise<void> {
  const cal = current()
  const scene = s.isDemo ? 'arena' : settings.scene
  const source =
    scene === 'grid'
      ? gridScene({ inks: cal, strength: cal.strength })
      : arenaScene({ inks: cal, strength: cal.strength, mode: s.mode, phase: (await $.clock.now()) / 1000, respawn: s.respawn })
  const key = `${scene}-${s.mode}-${++s.seq}`
  s.scenes.set(key, source)
  for (const old of [...s.scenes.keys()].slice(0, -KEEP_SCENES)) s.scenes.delete(old)
  await $.theme.set(lookFor(key))
  await update($, hud, h => ({ ...h, mode: s.mode }))
}

async function demoStep($: EngineInterface, mode: Mode, label: string): Promise<void> {
  s.respawn = s.mode === 'blast'
  s.mode = mode
  $.ui.status(`Anaglyph demo · ${label}`)
  await show($)
}

async function endDemo($: EngineInterface): Promise<void> {
  for (const t of s.demoTimers) t.cancel()
  s.demoTimers = []
  s.isDemo = false
  s.mode = settings.scene === 'arena' ? settled() : 'idle'
  $.ui.status(undefined)
  await show($)
}

async function startDemo($: EngineInterface): Promise<void> {
  for (const t of s.demoTimers) t.cancel()
  s.shotTimer?.cancel()
  s.isDemo = true
  s.demoTimers = [
    ...DEMO.map(([at, mode, label]) => $.clock.after(at, () => demoStep($, mode, label))),
    $.clock.after(DEMO_MS, () => endDemo($)),
  ]
}

async function setMode($: EngineInterface, mode: Mode): Promise<void> {
  if (settings.scene !== 'arena' || s.isDemo || s.mode === mode) return
  s.mode = mode
  await show($)
}

const settled = (): Mode => (s.isTurnRunning ? 'working' : 'idle')

async function shoot($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  if (settings.scene !== 'arena' || s.isDemo || s.mode === 'waiting' || now - s.lastShotAt < SHOT_GAP_MS) return
  s.lastShotAt = now
  s.shotsThisTurn += 1
  await update($, hud, h => ({ ...h, shots: h.shots + 1 }))
  s.shotTimer?.cancel()
  await setMode($, 'firing')
  s.shotTimer = $.clock.after(SHOT_MS, () => (s.mode === 'firing' ? setMode($, settled()) : undefined))
}

// Claude finished a turn that did something: the tank ahead blows up, then a new one rolls in.
async function finish($: EngineInterface): Promise<void> {
  s.shotTimer?.cancel()
  s.blastTimer?.cancel()
  const usage = await $.session.usage().catch(() => undefined)
  const context = usage?.context.percent ?? null
  if (settings.scene !== 'arena' || s.isDemo || s.shotsThisTurn === 0) {
    await update($, hud, h => ({ ...h, context }))
    await setMode($, 'idle')
    return
  }
  await update($, hud, h => ({ ...h, context, hits: h.hits + 1 }))
  await setMode($, 'blast')
  s.blastTimer = $.clock.after(BLAST_MS, () => (s.mode === 'blast' ? respawn($) : undefined))
}

async function respawn($: EngineInterface): Promise<void> {
  s.respawn = true
  await setMode($, settled())
  s.respawn = false
}

export const register: Register = (on, options) => {
  settings = settingsFrom(options)
  Object.assign(s, { saved: undefined, preview: undefined, mode: 'idle', isTurnRunning: false, lastShotAt: 0, shotTimer: undefined, scenes: new Map(), seq: 0, isDemo: false, demoTimers: [], shotsThisTurn: 0, respawn: false, blastTimer: undefined })

  on('session.start', async ($, e, next) => {
    s.saved = calibrationFrom(await $.store.get(STORE_KEY))
    s.preview = undefined
    s.mode = 'idle'
    await $.command.register({ name: PANE, description: 'Anaglyph Look: tune the red and cyan to your glasses' })
    await $.command.register({ name: 'anaglyph-demo', description: 'Anaglyph Look: play every arena state in about 25 seconds' })
    await show($)
    if (!s.saved && !(await $.store.get(HINT_KEY))) {
      await $.store.set(HINT_KEY, true)
      $.ui.toast('Anaglyph Look: type /anaglyph-calibrate to tune the colors to your glasses.')
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      s.isTurnRunning = true
      s.shotsThisTurn = 0
      s.blastTimer?.cancel()
      if (s.mode !== 'firing') await setMode($, 'working')
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      s.isTurnRunning = false
      await finish($)
    }
    return result
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    if (e.tool === 'AskUserQuestion') await setMode($, 'waiting')
    else await shoot($)
    try {
      return await next(e)
    } finally {
      if (s.mode === 'waiting') await setMode($, settled())
    }
  })

  on('classic.PermissionRequest', async ($, e, next) => {
    s.shotTimer?.cancel()
    await setMode($, 'waiting')
    return next(e)
  })

  on('classic.PermissionDenied', async ($, e, next) => {
    if (s.mode === 'waiting') await setMode($, settled())
    return next(e)
  })

  on('command.run', { command: 'anaglyph-demo' }, async $ => {
    await startDemo($)
    return { text: 'Demo running for about 25 seconds: watch the scene behind the chat and the status line.' }
  })

  on('command.run', { command: PANE }, async $ => {
    const start = current()
    s.preview = start
    await update($, draft, () => start)
    await $.ui.open({ id: PANE, title: 'Calibrate Anaglyph Look', focus: true, closeOnEscape: true })
    return { text: 'Calibration open. The scene behind the chat follows your changes; Save keeps them.' }
  })

  on('ui.press', async ($, e, next) => {
    if (e.plugin !== $.plugin.name || e.requestId !== PANE) return next(e)
    const now = await read($, draft)
    if (!now) return next(e)
    if ((STEPS as readonly string[]).includes(e.element)) {
      const changed = step(now, e.element as Step)
      s.preview = changed
      await update($, draft, () => changed)
      await show($)
    } else if (e.element === 'save') {
      await $.store.set(STORE_KEY, now)
      s.saved = now
      s.preview = undefined
      await update($, draft, () => null)
      await $.ui.close({ id: PANE })
      await show($)
      $.ui.toast('Anaglyph Look: calibration saved.')
    } else if (e.element === 'reset') {
      await $.store.delete(STORE_KEY)
      s.saved = undefined
      s.preview = fallback()
      await update($, draft, () => fallback())
      await show($)
    } else if (e.element === 'cancel') {
      s.preview = undefined
      await update($, draft, () => null)
      await $.ui.close({ id: PANE })
      await show($)
    }
    return next(e)
  })

  // Closing the pane any other way than Save (Esc, its close mark) drops the unsaved colors.
  on('ui.close', async ($, e, next) => {
    const result = await next(e)
    if (e.id === PANE && s.preview) {
      s.preview = undefined
      await update($, draft, () => null)
      await show($)
    }
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const d = await read($, draft)
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    if (!d) return <Text dimColor>Type /anaglyph-calibrate to start.</Text>
    const button = (key: string, label: string) => (
      <Button key={key} onPress={() => undefined}>
        {label}
      </Button>
    )
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Tune the colors to your glasses</Text>
        <Text dimColor>
          Red lens on the left eye. Close your right eye: you should see only LEFT. Close your left eye: only RIGHT. Dim
          whichever color still shows through the other lens, but keep the two about as bright as each other. The scene
          behind the chat follows your changes.
        </Text>
        {'Svg' in ui ? <ui.Svg source={testCard(d)} alt="The words LEFT in red and RIGHT in cyan, over each other" /> : null}
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          {button('red-', 'Red dimmer')}
          {button('red+', 'Red brighter')}
          {button('cyan-', 'Cyan dimmer')}
          {button('cyan+', 'Cyan brighter')}
          {button('greener', 'Cyan greener')}
          {button('bluer', 'Cyan bluer')}
          {button('depth-', 'Less depth')}
          {button('depth+', 'More depth')}
        </Box>
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          <Text dimColor>Start from:</Text>
          {button('clean', 'Clean lenses')}
          {button('typical', 'Typical')}
          {button('leaky', 'Leaky')}
        </Box>
        <Text>{describe(d)}</Text>
        <Box flexDirection="row" gap={1}>
          <Button key="save" variant="primary" onPress={() => undefined}>
            Save
          </Button>
          {button('reset', 'Back to settings')}
          {button('cancel', 'Cancel')}
        </Box>
      </Box>
    )
  })

  // A readout above the prompt while the arena shows: what the tank is doing, how full the
  // context window is, and the shots and hits this session.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.plugin !== $.plugin.name || e.props.hasSurvey || (settings.scene !== 'arena' && !s.isDemo)) return next(e)
    const readout = await read($, hud)
    const { Box, Progress, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" gap={3} flexWrap="wrap">
        <Text bold color="accent">
          ◢ {CALLED[readout.mode]}
        </Text>
        {readout.context === null ? null : <Progress label="Context" value={readout.context} max={100} valueText={`${Math.round(readout.context)}%`} />}
        <Text dimColor>Shots {readout.shots}</Text>
        <Text dimColor>Hits {readout.hits}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const source = s.scenes.get(e.props.scene)
    if (source === undefined) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={source} alt="A red and cyan 3D scene for anaglyph glasses" isInteractive />
  })
}
