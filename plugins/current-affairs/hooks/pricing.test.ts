import { expect, test } from 'claude-code/testing'

import { costOf, formatUsd } from './pricing'

test('a transcript costs its tokens at its model\'s list price, cache writes by how long they keep', () => {
  // A million of each kind on Opus 5.5: $4 input, $5 and $8 cache writes, $0.20 reads, $20 output.
  expect(Math.round(costOf({ 'claude-opus-5-5': [1e6, 1e6, 1e6, 1e6, 1e6] }) * 100)).toBe(3720)
  // Opus 5.5 isn't priced as Opus 5, though its name starts with it.
  expect(costOf({ 'claude-opus-5': [1e6, 0, 0, 0, 0] })).toBe(5)
  expect(costOf({ 'claude-opus-5-5': [1e6, 0, 0, 0, 0] })).toBe(4)
  // Fast mode is twice the price, and models add up.
  expect(costOf({ 'claude-opus-5-5/fast': [0, 0, 0, 0, 1e6], 'claude-haiku-4-5': [0, 0, 0, 0, 1e6] })).toBe(45)
})

test('a model with no known price is left out, not guessed', () => {
  expect(costOf({ '<synthetic>': [1e6, 0, 0, 0, 1e6], 'claude-sonnet-5': [1e6, 0, 0, 0, 0] })).toBe(2)
  expect(costOf(undefined)).toBe(0)
})

test('dollars read short', () => {
  expect(formatUsd(0.4249)).toBe('$0.42')
  expect(formatUsd(3.1)).toBe('$3.10')
  expect(formatUsd(27.4)).toBe('$27')
  expect(formatUsd(1234)).toBe('$1.2k')
})
