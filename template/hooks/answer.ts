// The part of the plugin that doesn't need the engine, so its tests are plain function calls.
// Keep anything that uses `$` in register.ts: the engine refuses `$` passed into another file.

/** What /__NAME__ answers. */
export function answer(args = ''): string {
  return args.trim() ? `__TITLE__ got: ${args.trim()}` : '__TITLE__ is installed.'
}
