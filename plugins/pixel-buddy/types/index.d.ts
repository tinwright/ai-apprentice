export type Phase = 'awake' | 'coffee' | 'lunch' | 'sleep'
export type Activity = 'none' | 'typing' | 'writing' | 'searching'
export type Moment = 'none' | 'oops' | 'proud' | 'stretch' | 'thumbs' | 'sweep'
/** Introducing itself: saying hello, then a little dance. */
export type Intro = 'none' | 'hello' | 'dance'
export type Waiting = 'none' | 'approval' | 'question' | 'impatient'

export type Point = [number, number]

/** A buddy's look: what /buddy-make produces and the set_character tool checks. */
export type Character = {
  name: string
  /** One character per colour (not "."), each a "#RRGGBB"; at most 8. */
  palette: Record<string, string>
  /** Rows of palette characters, "." for empty; every row the same length. */
  body: string[]
  anchors: {
    /** The top pixel of each eye (one or two), left first. Eyes are 1×2. */
    eyes: Point[]
    /** Where the mouth goes when it shows (a smile, an "o"). */
    mouth?: Point
    /** The body pixels at the left and right edges where the arms attach. */
    hands: { left: Point; right: Point }
    /** The top of the head, for the "!" when something fails. */
    head?: Point
  }
  /** Arms: "biped" two pixels long, "critter" one, "blob" only when it gestures. */
  type?: 'biped' | 'critter' | 'blob'
  /** The colour of eyes and mouth, "#RRGGBB"; dark ink when left out. */
  ink?: string
  /** Up to 5 characters standing for it in the terminal. */
  glyph?: string
  /** Dances when nothing else is going on, instead of bobbing. */
  dance?: boolean
  /** How many rows at the top are a hat, which wobbles while it dances. */
  hat?: number
}

declare module 'claude-code' {
  interface PluginState {
    'pixel-buddy': {
      phase: Phase
      isJumping: boolean
      isSipping: boolean
      isWild: boolean
      intro: Intro
      personName: string
      activity: Activity
      helpers: number
      moment: Moment
      waiting: Waiting
      isDozing: boolean
      isFriday: boolean
      demoStep: number
      character: Character
    }
  }
}
