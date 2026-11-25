import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Status } from '../types'

import { parseEx, reply, shortTool } from './vim'

import { makeColors } from './make-colors.js'

const { theme, problems } = makeColors({
  label: 'Vim',
  roles: { accent: '#3d9a4a', danger: '#d75f5f', success: '#7a9a1f', warning: '#c08a1e', pro: '#af87d7' },
  only: 'dark',
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1a1c1b',
        'surface-1': '#202221',
        'surface-2': '#262827',
        'surface-3': '#2b2d2c',
        'text-primary': '#dadcd6',
        'text-secondary': '#bcbeb8',
        'text-muted': '#a0a29c',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'empty-buffer', glass: false },
  style: {
    Text: { fontFamily: ['mono'], fontSize: 14, lineHeight: 22 },
    Heading: { fontFamily: ['mono'], fontWeight: 'bold' },
    UserMessage: { backgroundColor: 'surface-2', radius: 0, paddingX: 12, paddingY: 6 },
    ToolUse: { fontFamily: ['mono'], radius: 0 },
  },
}

const TILDE = 'q3 -5 6 0 t6 0'
const tildes = Array.from({ length: 120 }, (_, row) => `M14 ${24 + row * 22}${TILDE}`).join('')
const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMinYMin slice"><path d="${tildes}" fill="none" stroke="#5f87d7" stroke-width="1.6" stroke-linecap="round" opacity="0.75"/></svg>`

const MODES = {
  normal: { label: ' NORMAL ', backgroundColor: '#afd700', color: '#005f00' },
  insert: { label: ' INSERT ', backgroundColor: '#5fafd7', color: '#00305f' },
  command: { label: ' COMMAND ', backgroundColor: '#d7af5f', color: '#5f3700' },
} as const

const EMPTY: Status = { tool: null, turns: 0, calls: 0, folder: '[No Name]', branch: null }
const status = atom({ plugin: 'vim-look', key: 'status' } as const, EMPTY, { shape: 'status-1' })

const COMMANDS = [
  { name: 'w', description: ':w, write the buffer (Vim look)' },
  { name: 'q', description: ':q, try to quit (Vim look)' },
  { name: 'wq', description: ':wq, write and try to quit (Vim look)' },
] as const

const whereabouts = async ($: EngineInterface) => {
  const cwd = await $.session.cwd()
  const folder = cwd.split('/').filter(Boolean).at(-1) ?? '/'
  let branch: string | null = null

  try {
    const ran = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 3000 })
    branch = ran.exitCode === 0 ? ran.stdout.trim() || null : null
  } catch {
    branch = null
  }

  await update($, status, now => ({ ...now, folder, branch }))
}

export const register: Register = on => {
  let running = 0

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    try {
      await $.theme.set(LOOK)
    } catch (error) {
      $.ui.log(String(error))
      await $.theme.set({ colors: theme })
    }

    for (const command of COMMANDS) {
      try {
        await $.command.register(command)
      } catch (error) {
        $.ui.log(`/${command.name} not registered: ${String(error)}`)
      }
    }
    await whereabouts($)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const ex = parseEx(e.text)

    if (ex !== null) {
      return { drop: reply(ex, await read($, status)) }
    }

    await update($, status, now => ({ ...now, turns: now.turns + 1 }))

    return next(e)
  }).catch((_, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    running += 1
    await update($, status, now => ({ ...now, tool: shortTool(e.tool), calls: now.calls + 1 }))

    try {
      return await next(e)
    } finally {
      running -= 1

      if (running <= 0) {
        running = 0
        await update($, status, now => ({ ...now, tool: null }))
      }
    }
  }).catch((_, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    running = 0
    await update($, status, now => ({ ...now, tool: null }))
    await whereabouts($)

    return next(e)
  })

  for (const { name } of COMMANDS) {
    on('command.run', { command: name }, async ($, e) => ({
      text: reply({ command: name, hasBang: e.args.trim().startsWith('!') }, await read($, status)),
      isTextDisplayOnly: true,
    }))
  }

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="An empty Vim buffer: a column of tildes down the left edge" />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const now = await read($, status)
    const mode = now.tool !== null ? MODES.command : e.props.isWorking ? MODES.insert : MODES.normal
    const where = now.branch === null ? now.folder : `${now.folder}  ${now.branch}`
    const doing = now.tool !== null ? `:!${now.tool}` : e.props.isWorking ? '-- INSERT --' : 'utf-8  unix'

    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Text mono>
          <Text mono weight="bold" color={mode.color} backgroundColor={mode.backgroundColor}>
            {mode.label}
          </Text>
          {` ${where} `}
          <Text mono dimColor>
            {e.props.isWorking ? '[+]' : ''}
          </Text>
        </Text>
        <Text mono dimColor>
          {`${doing}  ${now.turns}L, ${now.calls}C`}
        </Text>
      </Box>
    )
  })
}
