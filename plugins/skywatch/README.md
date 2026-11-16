# Skywatch

🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md)

A sky behind the chat that follows the sun where you are, with a small sun or a moon in its real phase, and a little critter above the prompt that snoozes, dreams now and then, and wakes to point you at sessions that have finished.

## Install

With the [tinwright marketplace](../../README.md#install) added:

```text
/plugin install skywatch@tinwright
```

Claude Code asks for the settings below when you enable it. Change them later in `/config`.

It's for the Claude desktop app: the terminal has no backdrop or band to draw in, so there it does nothing.

## What it does

- **The sky**: a backdrop behind the conversation for dawn, day, dusk and night, with the app's colours to match. The sun crosses the sky from sunrise to sunset; at night the moon does, lit in its real phase. It moves on every few minutes.
- **The critter**: a small blocky orange critter sits above the prompt, asleep and breathing. About once every two minutes it dreams for a few seconds, of whatever suits the sky: sheep jumping a fence at night, a butterfly by day, a sunrise at dawn, fireflies at dusk.
- **Finished sessions**: when another session in the app stops running, the critter wakes, scuttles side to side, and points at a line like "Fix the login page is ready for your eyes", with a link to that session. "Seen it" puts it back to sleep. A session stops counting once it runs again, leaves the app's list, or after three hours.
- **Moods**: set the sky to morning, day, evening or night to stay there, whatever the time, or type `/skywatch night` (or `morning`, `day`, `evening`) to escape into one for now. `/skywatch live` follows the sun again. The moon keeps its real phase.
- **`/skywatch`** says today's sunrise and sunset. **`/skywatch test`** wakes the critter with a pretend session, to see it walk.

Everything moves with CSS animation, and holds still if your system asks for reduced motion.

## Settings

| Setting | Default | What it does |
|---|---|---|
| Sky | live | `live` follows the sun; `morning`, `day`, `evening` or `night` holds that sky. |
| Latitude | none | Degrees north, negative for south. |
| Longitude | none | Degrees east, negative for west. |

Leave both empty and the day runs a plain 06:00 to 18:00. Two decimal places is plenty, and the numbers stay on your computer: sunrise and sunset are worked out locally, with no lookups.

## Good to know

- It finds finished sessions through the app's own session list (the `ccd_session_mgmt` tools), which says only whether each session is running. "Needs you" means "was running and has stopped", so a session that stops to ask a question counts too. Where the list isn't there, the band says it can't see your other sessions.
- It sets the app's theme, so it replaces any other theme mod while it's on. Turn one off to use the other.
- It can't draw in the sidebar or point at a particular session's row; the link in the line is how you get there.
- The critter is a fan-made doodle, not an official character.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
