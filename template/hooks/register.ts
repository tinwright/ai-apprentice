import type { Register } from 'claude-code'

import { answer } from './answer'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: '__NAME__', description: '__DESCRIPTION__' })

    return next(e)
  })

  on('command.run', { command: '__NAME__' }, (_$, e) => ({ text: answer(e.args ?? '') }))
}
