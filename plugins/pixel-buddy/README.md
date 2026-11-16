# Pixel Buddy

🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md)

A pixel buddy above your prompt that Claude designs from your description or a picture, then animates as it thinks, types, waves for approval and sleeps at night.

## Install

In Claude Code, add the tinwright marketplace once, then install the plugin:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install pixel-buddy@tinwright
```

## How to use it

Your buddy appears above the prompt by itself, in the desktop app, and as a small still portrait with a caption in the terminal. It starts as Clawd, the built-in buddy. If Clawd Buddy is installed too, only Pixel Buddy shows, so you never get two.

**Make your own**: type `/buddy-make` and describe it, for example `/buddy-make a sleepy green frog with a tiny crown`, or paste a picture and type `/buddy-make like this`. Claude designs a small pixel character, the mod checks it fits (size, colours that show on light and dark themes, a face to draw on), and it takes over above the prompt: it waves, says "Hey Alex, I'm Bolt, your new buddy!", and dances a little. If `/buddy-make` isn't listed, type `/pixel-buddy:buddy-make`.

**Change it**: just ask, for example "make its ears bigger", "make it purple" or "make it dance". Claude updates the same buddy. A dancer sways and swaps its arms whenever nothing else is going on.

**What it does**: whatever it looks like, it acts like Clawd Buddy. A thought bubble while Claude thinks; a tiny keyboard while it runs commands; a notepad while it edits files; a magnifying glass while it searches; a half-size copy beside it for each helper agent. Wide eyes and a "!" when a command fails, a ta-da when tests pass, a stretch after a long task, a thumbs-up after a `git push`. It waves when Claude needs your OK, and taps its foot if a question has waited a minute. Coffee from 8:00 to 10:30, a sandwich from 12:00 to 1:00, asleep from 10pm to 7am, sunglasses on Friday afternoons.

**Commands**:

- `/buddy-make <description>`: design a new buddy.
- `/buddy-demo`: watch every mood, three seconds each.
- `/buddy-use`: list your buddies; `/buddy-use <name>` switches to one. Clawd is always there.
- `/buddy-rename <new name>`: give the buddy shown a new name.
- `/buddy-forget <name>`: delete a buddy. The 12 newest are kept.
- `/buddy-hello [your name]`: your buddy introduces itself again. It greets you by your computer's login name until you give it another.
- `/buddy-dance`: your buddy dances whenever nothing else is going on; again to stop (or `/buddy-dance on` / `off`).
- `/buddy-flarhgunnstow`: 30 seconds of dancing like nobody is watching (a hat, if it has one, wobbles along).
- `/buddy-jump` and `/buddy-coffee`: a jump, and a 30-second coffee break.

Your buddies are kept between sessions.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
