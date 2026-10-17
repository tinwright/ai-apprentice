import { expect, test } from 'claude-code/testing'

import { answer } from './answer'

test('answers with what it was given', () => {
  expect(answer(' this ')).toBe('__TITLE__ got: this')
  expect(answer('')).toBe('__TITLE__ is installed.')
})

test('/__NAME__ answers through the engine', async $ => {
  const { text } = await $.command.run({ command: '__NAME__' })
  expect(text).toBe('__TITLE__ is installed.')
})
