# Anaglyph Look

🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md)

A dark theme with a 3D scene behind the chat for red-cyan glasses: a grid floor rolling toward you, stars, a ringed planet and wireframe shapes floating in and out of the screen.

## Install

In Claude Code, add the tinwright marketplace once, then install the plugin:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install anaglyph-look@tinwright
```

Claude Code asks for the settings below when you enable it. Change them later in `/config`.

## How to use it

Put on red-cyan glasses, red lens on the left eye. The scene sits behind the chat:

- **The floor** runs from behind the screen at the horizon to in front of it at the bottom edge, and rolls toward you.
- **Stars and a ringed planet** sit behind the screen, at a few different depths.
- **Wireframe shapes** spin and bob at the edges, some behind the screen and some in front, and one cube floats out toward you and back.

Without glasses it still reads as an old 3D movie poster. The words stay flat and readable: red and cyan never color the chat's text.

It's for the Claude desktop and mobile apps: the terminal has no backdrop to draw in, so there it does nothing.

## Settings

| Setting | Default | What it does |
|---|---|---|
| Depth | 1 | How far the scene reaches behind and in front of the screen, from 0.2 to 2. |
| Glasses | typical | How much of the wrong color your lenses let through: `clean`, `typical` or `leaky`. |

- **Lines stay doubled?** Lower Depth. The depth is the same number of pixels at any window size, but sitting close to a large screen needs less of it.
- **A faint second outline through one lens?** That's ghosting: the lens lets some of the other color through. Set Glasses to `leaky` for dimmer, purer colors. Cardboard glasses usually need it; glass or acrylic lenses can take `clean`, which is brighter.

## Good to know

- A session has one look at a time, so this replaces other theme mods such as Skywatch or Vim Look. Turn the other one off to see this one.
- Everything moves with CSS animation, and holds still if your system asks for reduced motion.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
