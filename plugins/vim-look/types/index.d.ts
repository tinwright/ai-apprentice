export type Status = {
  tool: string | null
  turns: number
  calls: number
  folder: string
  branch: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'vim-look': { status: Shaped<Status> }
  }
}
