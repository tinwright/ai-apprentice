export type Draft = { red: string; cyan: string; strength: number } | null

export type Hud = {
  mode: 'idle' | 'working' | 'firing' | 'waiting' | 'blast'
  shots: number
  hits: number
  context: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'anaglyph-look': { draft: Shaped<Draft>; hud: Shaped<Hud> }
  }
}
