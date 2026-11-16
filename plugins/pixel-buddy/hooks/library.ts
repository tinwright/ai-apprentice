import type { ToolSpec } from 'claude-code'

import type { Character } from '../types'
import { CLAWD, MAX_COLOURS, MAX_H, MAX_W, keyOf, validate } from './character'

export const TOOL_NAME = 'mcp__pixel-buddy__set_character'
export const MAX_SAVED = 12
export const BUILT_IN = keyOf(CLAWD.name)

const point = { type: 'array', items: { type: 'integer' }, minItems: 2, maxItems: 2 }

export const SET_CHARACTER: ToolSpec = {
  name: 'set_character',
  description:
    'Sets the pixel buddy shown above the prompt: checks a character spec and, if it is valid, saves it and switches to it ' +
    '(it then plays every pose once). If not, it answers with the errors to fix: fix them all and call it again. ' +
    'Calling it again with the same name replaces that buddy, which is how changes ("make the hat red") are made. ' +
    'Follow the pixel-buddy:buddy-make skill for how to design one.',
  inputSchema: {
    type: 'object',
    required: ['character'],
    properties: {
      character: {
        type: 'object',
        required: ['name', 'palette', 'body', 'anchors'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'Up to 24 letters, digits, spaces, hyphens, underscores or apostrophes, starting with a letter or digit.' },
          palette: {
            type: 'object',
            description: `Up to ${MAX_COLOURS} colours: one-character keys (not ".") to "#RRGGBB".`,
            additionalProperties: { type: 'string' },
          },
          body: {
            type: 'array',
            items: { type: 'string' },
            description: `Rows of palette keys, "." for empty; 5 to ${MAX_H} rows, all the same width of 5 to ${MAX_W}. [x, y] counts from the top-left, 0-based. Leave the arms out: they are drawn from the hands.`,
          },
          anchors: {
            type: 'object',
            required: ['eyes', 'hands'],
            additionalProperties: false,
            properties: {
              eyes: { type: 'array', items: point, minItems: 1, maxItems: 2, description: 'The top pixel of each 1×2 eye, left first.' },
              mouth: { ...point, description: 'Optional: the middle of a 3-wide smile.' },
              hands: {
                type: 'object',
                required: ['left', 'right'],
                additionalProperties: false,
                properties: { left: point, right: point },
                description: "Body pixels on the left and right edges where the arms attach; the pixel beyond each must be empty.",
              },
              head: { ...point, description: 'Optional: the top of the head.' },
            },
          },
          type: { type: 'string', enum: ['biped', 'critter', 'blob'], description: 'Arms two pixels long, one, or none at rest.' },
          ink: { type: 'string', description: 'Optional "#RRGGBB" for the eyes and mouth (dark by default).' },
          glyph: { type: 'string', description: 'Optional: up to 5 characters standing for it in the terminal.' },
          dance: { type: 'boolean', description: 'Optional: true to dance when idle instead of bobbing.' },
          hat: { type: 'integer', description: 'Optional: how many rows at the top are a hat; it wobbles while dancing.' },
        },
      },
    },
  },
}

export type Library = {
  /** Saved buddies, oldest first. An array, so no name can clash with an object's own properties or reorder it. */
  characters: Character[]
  /** The lower-case name of the buddy shown. */
  current: string
  /** Whether the built-in Clawd dances (/buddy-dance); he isn't saved, so it's kept apart. */
  clawdDances: boolean
}

const find = (lib: Library, key: string) => lib.characters.find(c => keyOf(c.name) === key)

/** The saved buddies from the store's raw values, dropping any that no longer validate. */
export function load(characters: unknown, current: unknown, clawdDances?: unknown): Library {
  const kept: Character[] = []
  for (const c of Array.isArray(characters) ? characters : []) {
    const checked = validate(c).character
    if (!checked) continue
    const key = keyOf(checked.name)
    if (key !== BUILT_IN && !kept.some(k => keyOf(k.name) === key)) kept.push(checked)
  }
  const lib = { characters: kept, current: BUILT_IN, clawdDances: clawdDances === true }
  return typeof current === 'string' && find(lib, current) ? { ...lib, current } : lib
}

export function currentOf(lib: Library): Character {
  return find(lib, lib.current) ?? (lib.clawdDances ? { ...CLAWD, dance: true } : CLAWD)
}

/** A spec sent as JSON text instead of an object is read as the object. */
function parsed(input: unknown): unknown {
  if (typeof input !== 'string') return input
  try {
    return JSON.parse(input)
  } catch {
    return input
  }
}

export type Change = { library?: Library; message: string; isNew?: boolean }

/** Validates a spec from the tool and saves it as the shown buddy. */
export function save(lib: Library, input: unknown): Change {
  const { character, errors, warnings } = validate(parsed(input))
  if (!character) return { message: `Not saved. Fix every one of these, then call set_character again:\n- ${errors.join('\n- ')}` }
  const key = keyOf(character.name)
  if (key === BUILT_IN) return { message: `Not saved: ${CLAWD.name} is the built-in buddy. Give this one another name.` }

  const replaced = Boolean(find(lib, key))
  const others = lib.characters.filter(c => keyOf(c.name) !== key)
  const dropped = others.slice(0, Math.max(0, others.length + 1 - MAX_SAVED))
  const characters = [...others.slice(dropped.length), character]
  const lines = [
    replaced
      ? `Updated ${character.name}: it is going through all its moods above the prompt now (/buddy-demo shows them again).`
      : `Saved ${character.name} and switched to it: it is introducing itself above the prompt now (/buddy-demo shows all its moods).`,
    ...warnings.map(w => `Note: ${w}.`),
    ...(dropped.length ? [`To keep ${MAX_SAVED} buddies, the oldest was removed: ${dropped.map(c => c.name).join(', ')}.`] : []),
  ]
  return { library: { ...lib, characters, current: key }, message: lines.join('\n'), isNew: !replaced }
}

export function use(lib: Library, name: string): Change {
  const key = keyOf(name)
  const found = key === BUILT_IN ? CLAWD : find(lib, key)
  if (!found) return { message: `No buddy called "${name}". ${listing(lib)}` }
  return { library: { ...lib, current: key }, message: `${found.name} is your buddy now.` }
}

export function forget(lib: Library, name: string): Change {
  const key = keyOf(name)
  if (!name) return { message: 'Say which buddy to delete: /buddy-forget <name>.' }
  if (key === BUILT_IN) return { message: `${CLAWD.name} is built in and can't be deleted.` }
  const found = find(lib, key)
  if (!found) return { message: `No buddy called "${name}". ${listing(lib)}` }
  const characters = lib.characters.filter(c => c !== found)
  const current = lib.current === key ? BUILT_IN : lib.current
  return {
    library: { ...lib, characters, current },
    message: `Deleted ${found.name}.${current !== lib.current ? ` ${CLAWD.name} is back.` : ''}`,
  }
}

/** /buddy-rename: gives the shown buddy a new name, keeping its place in the list. */
export function rename(lib: Library, newName: string): Change {
  const name = newName.trim()
  if (!name) return { message: 'Say what to call it: /buddy-rename <new name>.' }
  if (lib.current === BUILT_IN) return { message: `${CLAWD.name} is built in and keeps his name. Make your own with /buddy-make.` }
  const old = currentOf(lib)
  const key = keyOf(name)
  if (key === BUILT_IN || (key !== lib.current && find(lib, key))) return { message: `There's already a buddy called ${name}.` }
  const renamed = { ...old, name }
  const errors = validate(renamed).errors
  if (errors.length) return { message: errors.join(' ') }
  return {
    library: { ...lib, current: key, characters: lib.characters.map(c => (c === old ? renamed : c)) },
    message: `${old.name} is now ${name}.`,
  }
}

/** /buddy-dance: "on", "off", or nothing to switch. */
export function setDance(lib: Library, arg: string): Change {
  const word = arg.trim().toLowerCase()
  if (word && word !== 'on' && word !== 'off') return { message: 'Use /buddy-dance on, /buddy-dance off, or /buddy-dance to switch.' }
  const shown = currentOf(lib)
  const dance = word === 'on' ? true : word === 'off' ? false : shown.dance !== true
  const library =
    lib.current === BUILT_IN
      ? { ...lib, clawdDances: dance }
      : { ...lib, characters: lib.characters.map(c => (keyOf(c.name) === lib.current ? { ...c, dance } : c)) }
  return { library, message: dance ? `${shown.name} is dancing 🕺` : `${shown.name} stopped dancing.` }
}

export function listing(lib: Library): string {
  const shown = currentOf(lib).name
  const all = [CLAWD, ...lib.characters].map(c => (c.name === shown ? `${c.name} (shown)` : c.name)).join(', ')
  return `Your buddies: ${all}. Switch with /buddy-use <name>, or make a new one with /buddy-make <description>.`
}
