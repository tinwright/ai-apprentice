import { expect, test } from 'claude-code/testing'

import { greeting } from './greeting'

test('greets whoever is named, or the world', () => {
  expect(greeting(' Ada ')).toBe('Hello, Ada! This answer came from the example plugin.')
  expect(greeting('')).toBe('Hello, world! This answer came from the example plugin.')
})

test('/example answers through the engine', async $ => {
  const { text } = await $.command.run({ command: 'example', args: 'Ada' })
  expect(text).toBe('Hello, Ada! This answer came from the example plugin.')
})
