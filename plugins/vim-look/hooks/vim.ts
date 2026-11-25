// The part of the plugin that doesn't need the engine, so its tests are plain function calls.

import type { Status } from '../types'

export type Ex = { command: 'w' | 'q' | 'wq'; hasBang: boolean }

/** An ex command typed as a whole prompt: `:q`, `:wq!`, `/q!`, `:x`. Anything else is a real prompt. */
export function parseEx(text: string): Ex | null {
  const found = /^[:/](wq|w|q|x)(!?)$/.exec(text.trim())

  if (found === null) {
    return null
  }

  const command = found[1] === 'x' ? 'wq' : (found[1] as Ex['command'])

  return { command, hasBang: found[2] === '!' }
}

/** The last part of a tool's name: `mcp__server__search` reads `search`. */
export const shortTool = (tool: string): string => tool.split('__').at(-1) ?? tool

const written = (now: Status) => `"${now.folder}" ${now.turns}L, ${now.calls}C written`

/** What Vim would say, more or less. Nobody leaves. */
export function reply(ex: Ex, now: Status): string {
  if (ex.command === 'w') {
    return written(now)
  }

  if (ex.command === 'wq') {
    return `${written(now)}\nE173: 1 more conversation to edit`
  }

  return ex.hasBang
    ? 'E492: Not an editor command: leaving. Nobody has ever left.'
    : 'E37: No write since last change (add ! to override)'
}
