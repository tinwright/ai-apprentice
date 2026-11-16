import type { Character } from '../types'

// Characters as /buddy-make might write them, for the tests and the README's picture.

/** "A little teal robot with an antenna light." */
export const BOLT: Character = {
  name: 'Bolt',
  palette: { d: '#2F5D62', s: '#DDEFEA', g: '#4FA3A5', a: '#F2C14E' },
  body: [
    '.....a.....',
    '.....d.....',
    '..ddddddd..',
    '.dsssssssd.',
    '.dsssssssd.',
    '.dsssssssd.',
    '.dsssssssd.',
    '..ddddddd..',
    '..dgggggd..',
    '..dgggggd..',
    '..dd...dd..',
    '..dd...dd..',
  ],
  anchors: { eyes: [[3, 3], [7, 3]], mouth: [5, 5], hands: { left: [2, 8], right: [8, 8] }, head: [5, 0] },
  type: 'biped',
  glyph: '[•_•]',
}

/** "A cream cat with brown outlines." */
export const MOCHI: Character = {
  name: 'Mochi',
  palette: { b: '#8B5E3C', w: '#F3E3C3' },
  body: [
    '.b.....b.',
    'bwb...bwb',
    'bwwbbbwwb',
    'bwwwwwwwb',
    'bwwwwwwwb',
    'bwwwwwwwb',
    '.bwwwwwb.',
    '.bwwwwwb.',
    '.bb.b.bb.',
  ],
  anchors: { eyes: [[2, 3], [6, 3]], mouth: [4, 5], hands: { left: [1, 6], right: [7, 6] } },
  type: 'critter',
  glyph: '=^.^=',
}
