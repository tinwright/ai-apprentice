export type Phase = 'awake' | 'coffee' | 'lunch' | 'sleep'
export type Activity = 'none' | 'typing' | 'writing' | 'searching'
export type Moment = 'none' | 'oops' | 'proud' | 'stretch' | 'thumbs' | 'sweep'
export type Waiting = 'none' | 'approval' | 'question' | 'impatient'

declare module 'claude-code' {
  interface PluginState {
    'clawd-buddy': {
      phase: Phase
      isJumping: boolean
      isSipping: boolean
      activity: Activity
      helpers: number
      moment: Moment
      waiting: Waiting
      isDozing: boolean
      isFriday: boolean
      demoStep: number
    }
  }
}
