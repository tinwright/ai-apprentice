import type { Register } from 'claude-code'

import { greeting } from './greeting'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'example',
      description: 'Says hello, to show the example plugin is installed',
      argumentHint: '[name]',
    })

    return next(e)
  })

  on('command.run', { command: 'example' }, (_$, e) => ({ text: greeting(e.args ?? '') }))
}
