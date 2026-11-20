# Skywatch

🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md)

A sky behind the chat that follows the sun where you are, with a small sun or a moon in its real phase. It draws only the sky and leaves the space above the prompt free, so it sits alongside Clawd Buddy or any other mod there.

## Install

With the [tinwright marketplace](../../README.md#install) added:

```text
/plugin install skywatch@tinwright
```

Claude Code asks for the settings below when you enable it. Change them later in `/config`.

It's for the Claude desktop app: the terminal has no backdrop to draw in, so there it does nothing.

## What it does

- **The sky**: a backdrop behind the conversation for dawn, day, dusk and night, with the app's colours to match. The sun crosses the sky from sunrise to sunset; at night the moon does, lit in its real phase. It moves on every few minutes.
- **Moods**: set the sky to morning, day, evening or night to stay there, whatever the time, or type `/skywatch night` (or `morning`, `day`, `evening`) to escape into one for now. `/skywatch live` follows the sun again. The moon keeps its real phase.
- **`/skywatch`** says today's sunrise and sunset.

Everything moves with CSS animation, and holds still if your system asks for reduced motion.

## Settings

| Setting | Default | What it does |
|---|---|---|
| Sky | live | `live` follows the sun; `morning`, `day`, `evening` or `night` holds that sky. |
| Latitude | none | Degrees north, negative for south. |
| Longitude | none | Degrees east, negative for west. |

Leave both empty and the day runs a plain 06:00 to 18:00. Two decimal places is plenty, and the numbers stay on your computer: sunrise and sunset are worked out locally, with no lookups.

## Good to know

- It sets the app's theme, so it replaces any other theme mod while it's on. Turn one off to use the other.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
