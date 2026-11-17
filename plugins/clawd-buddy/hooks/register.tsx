import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Activity, Moment, Waiting } from '../types'
import {
  ALT, CAPTION, COFFEE_BREAK_MS, DEMO, DEMO_MS, DOZE_AFTER_MS, H, IMPATIENT_AFTER_MS, JUMP_MS,
  PROUD_TURN_MS, PUSH_RE, STRETCH_TURN_MS, TEST_RE, U, W,
  activityFor, choosePose, fridayAt, isPing, phaseAt, scene,
} from './clawd'
import type { Pose } from './clawd'

// ── State ──────────────────────────────────────────────────────────────────
const phase = atom({ plugin: 'clawd-buddy', key: 'phase' } as const, 'awake')
const isJumping = atom({ plugin: 'clawd-buddy', key: 'isJumping' } as const, false)
const isSipping = atom({ plugin: 'clawd-buddy', key: 'isSipping' } as const, false)
const activity = atom({ plugin: 'clawd-buddy', key: 'activity' } as const, 'none')
const helpers = atom({ plugin: 'clawd-buddy', key: 'helpers' } as const, 0)
const moment = atom({ plugin: 'clawd-buddy', key: 'moment' } as const, 'none')
const waiting = atom({ plugin: 'clawd-buddy', key: 'waiting' } as const, 'none')
const isDozing = atom({ plugin: 'clawd-buddy', key: 'isDozing' } as const, false)
const isFriday = atom({ plugin: 'clawd-buddy', key: 'isFriday' } as const, false)
const demoStep = atom({ plugin: 'clawd-buddy', key: 'demoStep' } as const, -1)

let stopDemo: (() => void) | undefined

async function startDemo($: EngineInterface) {
  stopDemo?.()
  await update($, demoStep, () => 0)
  const timer = $.clock.every(DEMO_MS, () => {
    void update($, demoStep, n => {
      const next = n + 1
      if (next >= DEMO.length) {
        stopDemo?.()
        return -1
      }
      return next
    })
  })
  stopDemo = timer.cancel
}

// ── Module-level bookkeeping (resets on reload; the atoms persist) ─────────
let stopTicker: (() => void) | undefined
let stopJump: (() => void) | undefined
let stopCoffee: (() => void) | undefined
let stopMoment: (() => void) | undefined
let stopQuestion: (() => void) | undefined
let lastActive = 0
let turnStartedAt = 0
let isTurnRunning = false
const running = new Map<string, Activity>()

async function setActivity($: EngineInterface) {
  const last = [...running.values()].pop() ?? 'none'
  await update($, activity, prev => (prev === last ? prev : last))
}

async function touch($: EngineInterface) {
  lastActive = await $.clock.now()
  await update($, isDozing, prev => (prev ? false : prev))
}

async function flash($: EngineInterface, m: Moment, ms: number) {
  stopMoment?.()
  await update($, moment, () => m)
  stopMoment = $.clock.after(ms, () => {
    void update($, moment, () => 'none')
  }).cancel
}

async function setWaiting($: EngineInterface, w: Waiting) {
  if (w !== 'question') stopQuestion?.()
  await update($, waiting, prev => (prev === w ? prev : w))
  if (w === 'question') {
    stopQuestion?.()
    stopQuestion = $.clock.after(IMPATIENT_AFTER_MS, () => {
      void update($, waiting, prev => (prev === 'question' ? 'impatient' : prev))
    }).cancel
  }
}

async function coffeeBreak($: EngineInterface) {
  stopCoffee?.()
  await update($, isSipping, () => true)
  stopCoffee = $.clock.after(COFFEE_BREAK_MS, () => {
    void update($, isSipping, () => false)
  }).cancel
}

async function jump($: EngineInterface) {
  stopJump?.()
  await update($, isJumping, () => true)
  stopJump = $.clock.after(JUMP_MS, () => {
    void update($, isJumping, () => false)
  }).cancel
}

// ── Hooks ──────────────────────────────────────────────────────────────────
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: 'clawd-jump', description: 'Make Clawd jump as if a session just pinged you' })
    await $.command.register({ name: 'clawd-coffee', description: 'Give Clawd a cup of coffee for a little while' })
    await $.command.register({ name: 'clawd-demo', description: 'Watch Clawd cycle through all his moods' })
    await $.command.register({ name: 'clawd-nap', description: 'Let Clawd doze off now, as if 20 quiet minutes had passed' })

    running.clear()
    await update($, activity, () => 'none')
    await update($, waiting, () => 'none')
    await update($, moment, () => 'none')
    await update($, helpers, () => 0)
    await update($, demoStep, () => -1)
    lastActive = await $.clock.now()

    const refresh = async () => {
      const now = await $.clock.now()
      const p = phaseAt(now)
      await update($, phase, prev => (prev === p ? prev : p))
      const fri = fridayAt(now)
      await update($, isFriday, prev => (prev === fri ? prev : fri))
      const doze = !isTurnRunning && now - lastActive > DOZE_AFTER_MS
      await update($, isDozing, prev => (prev === doze ? prev : doze))
    }
    await refresh()
    stopTicker?.()
    stopTicker = $.clock.every(30_000, () => void refresh()).cancel
    return result
  })

  on('command.run', { command: 'clawd-jump' }, async $ => {
    await jump($)
    return { text: 'Clawd is jumping!' }
  })

  on('command.run', { command: 'clawd-coffee' }, async $ => {
    await coffeeBreak($)
    return { text: 'Clawd is enjoying a coffee ☕' }
  })

  on('command.run', { command: 'clawd-nap' }, async $ => {
    lastActive = (await $.clock.now()) - DOZE_AFTER_MS - 1
    await update($, isDozing, () => true)
    return { text: 'Clawd is dozing off… 💤' }
  })

  on('command.run', { command: 'clawd-demo' }, async $ => {
    await startDemo($)
    return { text: `Clawd's mood show: ${DEMO.length} moods, 3 seconds each 🎬` }
  })

  // Pings from other sessions → jump.
  on('session.receive', async ($, e, next) => {
    if (!e.agentId && isPing(e.origin, e.text)) await jump($)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (isPing(e.origin, e.text)) await jump($)
    await touch($)
    await setWaiting($, 'none')
    return next(e)
  })

  // You typing in the box wakes him from a daytime doze.
  on('prompt.change', async ($, e, next) => {
    await touch($)
    return next(e)
  })

  // Turn timing → ta-da or stretch at the end of long work.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      turnStartedAt = await $.clock.now()
      isTurnRunning = true
      await touch($)
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      isTurnRunning = false
      running.clear()
      await setActivity($)
      await setWaiting($, 'none')
      await touch($)
      const took = (await $.clock.now()) - turnStartedAt
      if (turnStartedAt && took >= STRETCH_TURN_MS) await flash($, 'stretch', 6000)
      else if (turnStartedAt && took >= PROUD_TURN_MS) await flash($, 'proud', 3500)
    }
    return result
  })

  // Tools → typing / writing / searching, plus oops, tests passing and pushes.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    const id = e.tool_use_id ?? `${e.tool}:${Math.random()}`
    const isQuestion = e.tool === 'AskUserQuestion'
    const act = activityFor(e.tool)
    if (act !== 'none') {
      running.set(id, act)
      await setActivity($)
    }
    if (isQuestion) await setWaiting($, 'question')

    const command = e.tool === 'Bash' ? String((e as { command?: unknown }).command ?? '') : ''
    try {
      const result = await next(e)
      const failed = result.isError === true
      if (failed && !isQuestion) await flash($, 'oops', 2500)
      else if (!failed && PUSH_RE.test(command)) await flash($, 'thumbs', 4000)
      else if (!failed && TEST_RE.test(command)) await flash($, 'proud', 3500)
      return result
    } finally {
      running.delete(id)
      await setActivity($)
      await touch($)
      const w = await read($, waiting)
      if (w !== 'none') await setWaiting($, 'none')
    }
  })

  // Waiting on your approval → wave.
  on('tool.check', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined && e.tool_use_id && result.decision === 'ask') await setWaiting($, 'approval')
    return result
  })

  on('classic.Notification', async ($, e, next) => {
    if (e.notification_type === 'permission_prompt') await setWaiting($, 'approval')
    return next(e)
  })

  // Helpers → mini Clawds.
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    await update($, helpers, n => n + 1)
    return result
  })

  on('classic.SubagentStop', async ($, e, next) => {
    await update($, helpers, n => Math.max(0, n - 1))
    return next(e)
  })

  // Compacting → sweeping.
  on('session.compact', async ($, e, next) => {
    stopMoment?.()
    await update($, moment, () => 'sweep')
    try {
      return await next(e)
    } finally {
      await flash($, 'sweep', 3000)
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const step = await read($, demoStep)
    const demo = step >= 0 ? DEMO[step] : undefined
    if (demo) {
      if (e.surface === 'terminal') {
        const { Text } = $.ui.resolve(e)
        return <Text color="#D97757">{`▐▛█▜▌ ${demo.caption} (${step + 1}/${DEMO.length})`}</Text>
      }
      const { Box, Text, Svg } = $.ui.resolve(e)
      return (
        <Box flexDirection="row" alignItems="center">
          <Svg source={scene(demo.pose, demo.shades ?? false, demo.helpers ?? 0)} alt={ALT[demo.pose]} width={W * U} height={H * U} isInteractive />
          <Text dimColor>{`${demo.caption}  (${step + 1}/${DEMO.length})`}</Text>
        </Box>
      )
    }

    const base = choosePose({
      phase: await read($, phase),
      sipping: await read($, isSipping),
      activity: await read($, activity),
      moment: await read($, moment),
      waiting: await read($, waiting),
      dozing: await read($, isDozing),
      working: e.props.isWorking,
    })
    const pinged = await read($, isJumping)
    // No jumping with hot coffee (or lunch) in hand: he just says so.
    const pose: Pose = pinged && base !== 'coffee' && base !== 'lunch' ? 'jump' : base
    const shades = await read($, isFriday)
    const helperCount = await read($, helpers)

    let caption = pinged ? CAPTION.jump : CAPTION[pose]
    if (!caption && shades) caption = "it's Friday 😎"
    // A daytime doze (not night-time sleep) can be ended with a press.
    const dozing = base === 'sleep' && (await read($, isDozing)) && (await read($, phase)) !== 'sleep'
    if (dozing) caption = 'dozing…'
    if (helperCount > 0 && pose !== 'sleep') caption = [caption, `+ ${helperCount} helper${helperCount > 1 ? 's' : ''}`].filter(Boolean).join(' · ')

    const { Box, Text, Svg, Button } = $.ui.resolve(e)
    const wake = dozing ? <Button key="wake" label="👋 wake up" plain dimColor onPress={() => void touch($)} /> : null

    if (e.surface === 'terminal') {
      const line = <Text color="#D97757">{'▐▛█▜▌ ' + (caption || 'clawd')}</Text>
      return wake ? <Box flexDirection="row" gap={1}>{line}{wake}</Box> : line
    }

    return (
      <Box flexDirection="row" alignItems="center">
        <Svg source={scene(pose, shades, helperCount)} alt={ALT[pose]} width={W * U} height={H * U} isInteractive />
        {caption ? <Text dimColor>{caption}</Text> : null}
        {wake}
      </Box>
    )
  })
}
