import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderInput } from 'claude-code'

import type { Activity, Moment, Waiting } from '../types'
import {
  ALT, BODY, CAPTION, COFFEE_BREAK_MS, DEMO, DEMO_MS, DOZE_AFTER_MS, H, HELPER_STALE_MS,
  HOLD_MS, IMPATIENT_AFTER_MS, JUMP_MS, MINI_W, MIN_POSE_MS, MOMENT_MIN_MS, OOPS_COOLDOWN_MS, PROUD_TURN_MS, PUSH_RE,
  STRETCH_TURN_MS, TEST_RE, U, W,
  activityFor, choosePose, fridayAt, isPing, minis, phaseAt, scene,
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

// Terminal: Clawd's glyph in his orange, then the caption in the terminal's own
// text colour (orange text is hard to read on a light theme).
function terminalRow($: EngineInterface, e: RenderInput<'AbovePrompt', 'terminal'>, caption: string) {
  const { Box, Text } = $.ui.resolve(e)
  return (
    <Box flexDirection="row">
      <Text color={BODY}>▐▛█▜▌</Text>
      <Text>{` ${caption}`}</Text>
    </Box>
  )
}

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
let stopQuestion: (() => void) | undefined
let lastActive = 0
let turnStartedAt = 0
let isTurnRunning = false
let lastOopsAt = -Infinity

// ── Activity, smoothed ─────────────────────────────────────────────────────
// The oldest running call sets the pose, so short calls beside a long one don't
// flip it. A finished pose holds HOLD_MS; a new one stays at least MIN_POSE_MS.
const running = new Map<string, Activity>()
let shownActivity: Activity = 'none'
let shownAt = 0
let stopActivity: (() => void) | undefined

async function setActivity($: EngineInterface, isDue = false) {
  stopActivity?.()
  stopActivity = undefined
  const target: Activity = running.values().next().value ?? 'none'
  if (target === shownActivity) return
  const now = await $.clock.now()
  const wait = isDue
    ? 0
    : target === 'none'
      ? HOLD_MS
      : shownActivity === 'none'
        ? 0
        : Math.max(0, MIN_POSE_MS - (now - shownAt))
  if (wait > 0) {
    stopActivity = $.clock.after(wait, () => void setActivity($, true)).cancel
    return
  }
  shownActivity = target
  shownAt = now
  await update($, activity, prev => (prev === target ? prev : target))
}

// ── Reactions (moments) ────────────────────────────────────────────────────
// A reaction shows for its own time, but new work ends it once it has shown
// MOMENT_MIN_MS, so a finished turn's "ta-da" never hides the next turn's work.
let stopMoment: (() => void) | undefined
let momentAt = 0
let momentEndsAt = 0
let isCompacting = false

async function endMomentAt($: EngineInterface, at: number) {
  stopMoment?.()
  stopMoment = undefined
  momentEndsAt = at
  if (!Number.isFinite(at)) return // held until something ends it (compaction)
  const now = await $.clock.now()
  if (at <= now) {
    stopMoment = undefined
    await update($, moment, prev => (prev === 'none' ? prev : 'none'))
    return
  }
  stopMoment = $.clock.after(at - now, () => {
    void update($, moment, prev => (prev === 'none' ? prev : 'none'))
  }).cancel
}

async function flash($: EngineInterface, m: Moment, ms: number) {
  momentAt = await $.clock.now()
  await update($, moment, () => m)
  await endMomentAt($, momentAt + ms)
}

async function yieldMoment($: EngineInterface) {
  if (isCompacting || (await read($, moment)) === 'none') return
  const soonest = Math.max(await $.clock.now(), momentAt + MOMENT_MIN_MS)
  if (soonest < momentEndsAt) await endMomentAt($, soonest)
}

// ── Waiting on the person ──────────────────────────────────────────────────
// The wave shows only while a person is asked: a permission prompt or a
// question. tool.check's "ask" alone isn't enough (auto mode's classifier
// settles it with nobody asked), so asks are remembered until a prompt shows.
const ANY_TOOL = '*'
let waitingFor: string | undefined
const pendingAsks = new Map<string, string>() // tool_use_id → tool name

async function setWaiting($: EngineInterface, w: Waiting, owner?: string) {
  waitingFor = w === 'none' ? undefined : (owner ?? ANY_TOOL)
  if (w !== 'question') stopQuestion?.()
  await update($, waiting, prev => (prev === w ? prev : w))
  if (w === 'question') {
    stopQuestion?.()
    stopQuestion = $.clock.after(IMPATIENT_AFTER_MS, () => {
      void update($, waiting, prev => (prev === 'question' ? 'impatient' : prev))
    }).cancel
  }
}

/** The newest pending ask for this tool, else the newest of any. */
function askFor(tool?: string): string | undefined {
  const asks = [...pendingAsks]
  return (asks.reverse().find(([, t]) => t === tool) ?? asks[0])?.[0]
}

// ── Helpers (mini Clawds) ────────────────────────────────────────────────────
// Subagents come from the live agent list. Workflow agents aren't in it, so
// they're tracked from agent.spawn until their loop's turn.complete, with a
// staleness cutoff in case that never arrives.
const LIVE = new Set(['pending', 'running', 'waiting'])
const workflowAgents = new Map<string, number>() // agent id → last seen

async function syncHelpers($: EngineInterface) {
  const now = await $.clock.now()
  for (const [id, seen] of workflowAgents) if (now - seen > HELPER_STALE_MS) workflowAgents.delete(id)
  const listed = (await $.agent.list()).filter(a => LIVE.has(a.status)).length
  const n = listed + workflowAgents.size
  await update($, helpers, prev => (prev === n ? prev : n))
}

async function touch($: EngineInterface) {
  lastActive = await $.clock.now()
  await update($, isDozing, prev => (prev ? false : prev))
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

    running.clear()
    stopActivity?.()
    shownActivity = 'none'
    await update($, activity, () => 'none')
    pendingAsks.clear()
    await setWaiting($, 'none')
    stopMoment?.()
    isCompacting = false
    await update($, moment, () => 'none')
    // Their expiry timers died with the last module; the flags would stick.
    stopJump?.()
    stopCoffee?.()
    await update($, isJumping, () => false)
    await update($, isSipping, () => false)
    workflowAgents.clear()
    await update($, helpers, () => 0)
    // A demo's ticker would otherwise tick -1 back to 0 and restart it.
    stopDemo?.()
    stopDemo = undefined
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
      await syncHelpers($)
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
    pendingAsks.clear()
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
    if (e.agentId !== undefined) {
      if (workflowAgents.has(e.agentId)) workflowAgents.set(e.agentId, await $.clock.now())
      return next(e)
    }
    turnStartedAt = await $.clock.now()
    isTurnRunning = true
    await touch($)
    await yieldMoment($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) workflowAgents.delete(e.agentId)
    await syncHelpers($)
    if (e.agentId === undefined) {
      isTurnRunning = false
      running.clear()
      await setActivity($)
      pendingAsks.clear()
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
    if (e.agentId !== undefined) {
      if (workflowAgents.has(e.agentId)) workflowAgents.set(e.agentId, await $.clock.now())
      // A helper's approved call ends the wave it owns; its activity isn't Clawd's.
      try {
        return await next(e)
      } finally {
        if (e.tool_use_id) {
          pendingAsks.delete(e.tool_use_id)
          if (waitingFor === e.tool_use_id) await setWaiting($, 'none')
        }
      }
    }

    const id = e.tool_use_id ?? `${e.tool}:${Math.random()}`
    const isQuestion = e.tool === 'AskUserQuestion'
    const act = activityFor(e.tool)
    if (act !== 'none') {
      await yieldMoment($)
      running.set(id, act)
      await setActivity($)
    }
    if (isQuestion) await setWaiting($, 'question', id)

    const isShell = e.tool === 'Bash' || e.tool === 'PowerShell'
    const command = isShell ? String((e as { command?: unknown }).command ?? '') : ''
    try {
      const result = await next(e)
      const failed = result.isError === true
      const now = await $.clock.now()
      // Only a failing command says "oops", and not more than once in a while:
      // a missing file or a stale edit is routine, not a surprise.
      if (failed && isShell && now - lastOopsAt >= OOPS_COOLDOWN_MS) {
        lastOopsAt = now
        await flash($, 'oops', 2500)
      } else if (!failed && PUSH_RE.test(command)) await flash($, 'thumbs', 4000)
      else if (!failed && TEST_RE.test(command)) await flash($, 'proud', 3500)
      return result
    } finally {
      running.delete(id)
      pendingAsks.delete(id)
      await setActivity($)
      await touch($)
      // Only the call Clawd is waiting on ends the wait, not a parallel one finishing.
      if (waitingFor === id || waitingFor === ANY_TOOL) await setWaiting($, 'none')
    }
  })

  // An ask is remembered, not shown: it may never reach a person.
  on('tool.check', async ($, e, next) => {
    const result = await next(e)
    if (e.tool_use_id && result.decision === 'ask') pendingAsks.set(e.tool_use_id, e.tool)
    return result
  })

  // A person is being asked → wave, owned by the call it's about.
  on('classic.PermissionRequest', async ($, e, next) => {
    await setWaiting($, 'approval', askFor(e.tool_name))
    return next(e)
  })

  on('classic.Notification', async ($, e, next) => {
    if (e.notification_type === 'permission_prompt' && waitingFor === undefined) await setWaiting($, 'approval', askFor())
    return next(e)
  })

  on('classic.PermissionDenied', async ($, e, next) => {
    pendingAsks.delete(e.tool_use_id)
    if (waitingFor === e.tool_use_id) await setWaiting($, 'none')
    return next(e)
  })

  // Helpers → mini Clawds.
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    // Only a started agent counts: a denied spawn has no id, and an agent with
    // none (remote) raises no turn.complete that could ever remove it.
    if (e.workflow && !result.deny && result.agentId) workflowAgents.set(result.agentId, await $.clock.now())
    await syncHelpers($)
    return result
  })

  // Compacting → sweeping, which ends as soon as compaction does (after its minimum).
  on('session.compact', async ($, e, next) => {
    isCompacting = true
    await flash($, 'sweep', Number.POSITIVE_INFINITY)
    try {
      return await next(e)
    } finally {
      isCompacting = false
      await yieldMoment($)
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const step = await read($, demoStep)
    const demo = step >= 0 ? DEMO[step] : undefined
    if (demo) {
      if (e.surface === 'terminal') {
        return terminalRow($, e, `${demo.caption} (${step + 1}/${DEMO.length})`)
      }
      const { Box, Text, Svg } = $.ui.resolve(e)
      const demoHelpers = demo.helpers ?? 0
      return (
        <Box flexDirection="row" alignItems="center">
          <Svg source={scene(demo.pose, demo.shades ?? false)} alt={ALT[demo.pose]} width={W * U} height={H * U} isInteractive />
          {demoHelpers > 0 ? <Svg source={minis(demoHelpers)} alt={`${demoHelpers} mini Clawds`} width={MINI_W * U} height={H * U} isInteractive /> : null}
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
    // No jumping with hot coffee (or lunch) in hand.
    const pose: Pose = pinged && base !== 'coffee' && base !== 'lunch' ? 'jump' : base
    const shades = await read($, isFriday)
    const helperCount = await read($, helpers)
    const showHelpers = helperCount > 0 && pose !== 'sleep'

    let caption = pinged ? CAPTION.jump : CAPTION[pose]
    if (!caption && shades) caption = "it's Friday 😎"
    if (base === 'sleep' && (await read($, isDozing)) && (await read($, phase)) !== 'sleep') caption = 'dozing…'
    if (showHelpers) caption = [caption, `+ ${helperCount} helper${helperCount > 1 ? 's' : ''}`].filter(Boolean).join(' · ')

    if (e.surface === 'terminal') {
      return terminalRow($, e, caption || 'clawd')
    }

    const { Box, Text, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" alignItems="center">
        <Svg source={scene(pose, shades)} alt={ALT[pose]} width={W * U} height={H * U} isInteractive />
        {showHelpers ? <Svg source={minis(helperCount)} alt={`${helperCount} helper Clawd${helperCount > 1 ? 's' : ''}`} width={MINI_W * U} height={H * U} isInteractive /> : null}
        {caption ? <Text dimColor>{caption}</Text> : null}
      </Box>
    )
  })
}
