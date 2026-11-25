import { expect, test } from 'claude-code/testing'

import { parseEx, reply, shortTool } from './vim'

const NOW = { tool: null, turns: 3, calls: 12, folder: 'proj', branch: 'main' }

test('an ex command is a whole prompt, and nothing else is', () => {
  expect(parseEx(':q')).toEqual({ command: 'q', hasBang: false })
  expect(parseEx(' /q! ')).toEqual({ command: 'q', hasBang: true })
  expect(parseEx(':x')).toEqual({ command: 'wq', hasBang: false })
  expect(parseEx(':w and then explain this file')).toBe(null)
  expect(parseEx('q')).toBe(null)
})

test('Vim answers, and nobody leaves', () => {
  expect(reply({ command: 'w', hasBang: false }, NOW)).toBe('"proj" 3L, 12C written')
  expect(reply({ command: 'q', hasBang: false }, NOW)).toContain('E37')
  expect(reply({ command: 'q', hasBang: true }, NOW)).toContain('E492')
  expect(reply({ command: 'wq', hasBang: false }, NOW)).toContain('E173')
})

test('an MCP tool is named by its last part', () => {
  expect(shortTool('mcp__server__search')).toBe('search')
  expect(shortTool('Bash')).toBe('Bash')
})
