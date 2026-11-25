# Write Like Me

🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md)

Teach Claude to write like you: point it at your blog, notes, docs and chats, and it builds a skill in your own voice, plus a short version for other AI tools.

## Install

In Claude Code, add the tinwright marketplace once, then install the plugin:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install write-like-me@tinwright
```

## How to use it

Type `/write-like-me` followed by where you write, for example
`/write-like-me my blog at example.com and my notes in ~/Notes`. If `/write-like-me` isn't in the
list, type `/write-like-me:write-like-me`.

Claude reads each source in parallel, and always your past Claude Code sessions too, where every
"make it shorter" you've typed is the best evidence of all. It sets aside text that looks
AI-polished (the `check_tells` tool counts em dashes, arrows and stock phrases), then writes:

- a `<you>-voice` skill in `~/.claude/skills/`, with the rules your writing shows for chat, work
  docs and longer pieces;
- your own sentences, as examples to calibrate against;
- a 400-word version to paste into any other AI tool's custom instructions.

To prove it works, it rewrites a real piece of your writing and shows you both versions. Then it
offers to make the skill load every time Claude drafts something for you.

It skips folders that look private and never quotes anything personal. If it finds passwords or
keys in your notes, it tells you where, without opening them.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
