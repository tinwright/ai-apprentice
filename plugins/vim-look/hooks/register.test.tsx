import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'vim-look',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('the status line names the folder and branch and counts calls, and /q refuses', async ($, on) => {
  // Nothing sits beneath the plugin: each hook here stands for the engine.
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', () => ({ value: { isDrawn: true } as never }))
  on('session.cwd', () => ({ value: '/home/me/proj' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'main\n', stderr: '' } as never }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/home/me/proj', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'ls' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect((await ui.find({ type: 'Text', text: /NORMAL/ }))?.text).toContain('proj  main')
    expect((await ui.find({ type: 'Text', text: /0L, 1C/ }))?.text).toContain('utf-8')
    await ui.unmount()
  }

  const quit = await $.command.run({ command: 'q', args: '' } as never)
  expect(quit.text).toContain('E37')
})

test(':q! typed as a prompt never reaches the model', async ($, on) => {
  on('prompt.submit', (_, e) => ({ text: e.text }))

  const dropped = await $.prompt.submit({ text: ':q!' } as never)
  expect(dropped.drop).toContain('E492')

  const kept = await $.prompt.submit({ text: 'how do I quit vim?' } as never)
  expect(kept.text).toBe('how do I quit vim?')
})
