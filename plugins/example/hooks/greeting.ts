// The part of the plugin that doesn't need the engine, so its tests are plain function calls.

/** What /example answers: a hello to whoever is named after it, or to the world. */
export function greeting(args = ''): string {
  const name = args.trim()
  return `Hello, ${name || 'world'}! This answer came from the example plugin.`
}
