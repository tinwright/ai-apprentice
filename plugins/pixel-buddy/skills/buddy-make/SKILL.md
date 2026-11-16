---
name: buddy-make
description: Design a pixel buddy for the Pixel Buddy mod from a description or a picture, and set it above the prompt with the set_character tool. Use when the person runs /buddy-make, asks for a new buddy or character, or asks to change the one they have ("make its hat red").
argument-hint: <a description, or paste a picture>
---

# Make a pixel buddy

The person wants a small pixel character above their prompt. You design it as a **spec**, and the
mod's `set_character` tool checks it, saves it and switches to it. The mod draws every pose itself
(thinking, typing, waving, sleeping...) from your spec: you draw only the character standing
still, without arms.

## 1. Read the inspiration

- **Text** (`$ARGUMENTS`): pick the two or three features that make it recognisable at 12 pixels
  (ears, a hat, an antenna, a beak, a colour) and drop the rest.
- **A picture** the person pasted: read its silhouette, its two to four main colours and its one
  signature feature, and draw that at pixel size.
- Nothing given: ask in one line what they'd like, with two or three quick ideas.
- **Fictional characters** (from books, films, shows, games, sketches) are fine as a fan-made
  pixel homage: their silhouette, colours and signature item, under their name if the person asks.
- **Well-known public and historical figures** are fine as a friendly caricature, built from
  what they're known for (Einstein's hair, a famous hat). Keep it affectionate, never mocking. A
  private person only if it's the person asking, or someone they say is happy to be drawn.
- Don't draw logos, wordmarks or company mascots. Leave text out of the drawing too: at this size
  it doesn't read.

## 2. Draw the body

Rules of thumb for pixel art this small:

- **Size**: about 9 to 12 wide and 7 to 12 tall (5 to 16 is allowed). Small is cuter and clearer.
- **Silhouette first**: a solid, chunky shape with a clear head. One-pixel details (ears, antenna,
  tail tip) carry a lot.
- **Colours**: 2 to 5 is plenty (8 at most). One main colour, one darker outline or shade, one
  accent.
- **Contrast**: it is shown on light and dark themes. Mid-tone bodies (oranges, teals, greens,
  purples) work without an outline. A very light body (white, cream, yellow) needs a darker
  outline around it; a very dark one needs a lighter outline.
- **Face**: leave a flat patch of one colour, at least 3×2 around each eye, for the eyes and mouth
  to be drawn on. Don't draw eyes or a mouth in the body: the mod draws them in every expression.
- **Feet**: the bottom row is what it stands on. Legs or a flat base both work.
- **No arms**: leave the pixel beside each hand empty. The mod draws the arms there.

The body is rows of palette characters, `.` for empty, every row the same width. `[x, y]` counts
from the top-left pixel, starting at 0.

## 3. Place the anchors

- `eyes`: the top pixel of each eye (eyes are 1 wide, 2 tall), left first, with at least two
  pixels between them. One eye is fine for a cyclops. The pixels around and below each eye must be
  body.
- `hands`: a body pixel on the left edge and one on the right edge, at shoulder height, where the
  arms attach and props are held: from row 1 down to two rows above the bottom row.
- `mouth` (optional): the middle of a small smile, below the eyes. The smile shows only with a
  clear row between it and the eyes (mouth row at least 3 below the eyes' top row); closer, the
  mouth shows only as an "o" when startled, and the squinting eyes alone make it look happy.
- `head` (optional): the top of the head, where a "!" pops up.
- `type`: `biped` (two-pixel arms, the default), `critter` (one-pixel paws) or `blob` (no arms
  until it gestures).
- `ink` (optional): eye colour if the face is dark (it defaults to near-black).
- `glyph` (optional): up to 5 characters for the terminal, such as `=^.^=`.
- `dance` (optional): `true` for a character who'd rather dance than stand still. It then sways,
  swapping its arms up and down, whenever nothing else is going on.
- `hat` (optional): how many rows at the top of the body are a hat. The hat then wobbles on its
  own while the buddy dances. It must end above the eyes.

## 4. Call the tool

Load it with ToolSearch (`select:mcp__pixel-buddy__set_character`) if it isn't loaded, then call it
with `{ "character": <spec> }`. A worked example, a little robot:

```json
{
  "name": "Bolt",
  "palette": { "d": "#2F5D62", "s": "#DDEFEA", "g": "#4FA3A5", "a": "#F2C14E" },
  "body": [
    ".....a.....",
    ".....d.....",
    "..ddddddd..",
    ".dsssssssd.",
    ".dsssssssd.",
    ".dsssssssd.",
    ".dsssssssd.",
    "..ddddddd..",
    "..dgggggd..",
    "..dgggggd..",
    "..dd...dd..",
    "..dd...dd.."
  ],
  "anchors": { "eyes": [[3, 3], [7, 3]], "mouth": [5, 5], "hands": { "left": [2, 8], "right": [8, 8] }, "head": [5, 0] },
  "type": "biped",
  "glyph": "[•_•]"
}
```

If it answers with errors, fix all of them and call it again; don't ask the person about them.
Before each call, count each row's width once more: uneven rows are the most common mistake.

## 5. Show it

When it's saved, the buddy plays all its moods once above the prompt. Tell the person in a
sentence or two what you made and the choices behind it, and that they can:

- ask for changes ("bigger ears", "make it purple"): call `set_character` again with the same name;
- watch the moods again with `/buddy-demo`;
- switch buddies with `/buddy-use` (Clawd is always there), or delete one with `/buddy-forget`.
