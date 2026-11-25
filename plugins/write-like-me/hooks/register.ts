import type { Register } from 'claude-code'

import { CHECK_TELLS, TOOL_NAME, report } from './tells'
import type { Sample } from './tells'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register(CHECK_TELLS)
    return next(e)
  })

  // The write-like-me skill hands its samples over here before it reads them for voice.
  on('tool.call', { tool: TOOL_NAME }, (_$, e) => {
    const samples = (e as { samples?: Sample[] }).samples
    if (!Array.isArray(samples)) return { deny: 'Pass samples: a list of { label, text }.' }
    return { result: report(samples) }
  })
}
