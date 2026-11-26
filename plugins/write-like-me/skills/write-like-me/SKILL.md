---
name: write-like-me
description: Learn how the person writes from their own sources (a blog, notes, work docs, chats, past sessions with Claude) and turn it into a voice skill Claude loads whenever it drafts something for them, plus a short portable version for other AI tools. Use when the person runs /write-like-me, asks Claude to write "like me" or "in my voice", or wants their style captured, refreshed or tested.
argument-hint: <where you write: a blog URL, a notes folder, a wiki, ...>
---

# Write like me

The goal is a skill that makes Claude's drafts sound like the person, built from evidence and
not from vibes. It has four parts: their own sentences, the rules those sentences show, what they
have already told an agent to fix, and one real piece of writing rewritten to prove it works.

## 1. Ask what to read

Take sources from `$ARGUMENTS` and ask once for anything missing, in one message:

- **Where they write**, as many as they like. Typical ones: a blog or website; a notes folder
  (Obsidian, plain markdown); a work wiki or docs (through a connected tool); pull requests and
  review comments (`gh`); chat (through a connected tool); their past Claude Code sessions, which
  are always worth reading (see below).
- **What to stay out of**: private folders, a journal, anything about other people. Default to
  skipping folders named like Personal, Journal, Health or Finance unless they say otherwise.
- **Their name** for the skill (`<name>-voice`).

## 2. Read each source in its own subagent

Start one subagent per source, all at once, so the raw text never fills this conversation. Give
each one the source, the privacy boundary, and this brief: read 10 to 25 pieces that the person
wrote themselves, favouring recent and longer ones and spread across kinds (posts, memos, replies,
drafts). Return:

1. What was read: titles, dates, kinds.
2. 15 to 20 short verbatim excerpts (under 60 words each), labelled by kind: openings, closings,
   how they explain, how they disagree, jokes, asks. Only about ideas and work, never private
   details about the person or anyone else.
3. Observations, each backed by an excerpt: sentence length and rhythm, person (I, we, you),
   formality, humour, punctuation (which dash, parentheses, colons, exclamation marks, emoji),
   headings and lists, how pieces open and close, recurring words, words they never use,
   spelling (British or American), other languages.
4. Pieces that look AI-assisted, and why.

**Past Claude Code sessions** live in `~/.claude/projects/*/*.jsonl`. The person's own messages
are the lines with `"type":"user"` whose `message.content` is a plain string; skip tool results,
`<system-reminder>` and `<command-…>` wrappers, and pasted logs. Ask that subagent for one more
thing: **every time the person corrected an agent's wording or tone** ("too long", "don't say",
"more bullet points", "rewrite"), verbatim, with how often each theme comes up. Those corrections
are the strongest evidence you will get: they are the person saying exactly what's wrong.

Session logs and chats hold pasted logs, keys, customer data and other people's messages, so tell
the person you'll read them before you do, and skip them if they'd rather you didn't. Every
subagent quotes only text the person wrote, and leaves out anything that names a customer, a
colleague's private detail, an internal hostname or an ID. If it finds passwords, keys or other
secrets, it reports where they are without opening or quoting them, and you pass that on.

## 3. Set aside what a model wrote

Writing from the last year or two is often drafted or polished with AI, and learning from it
teaches Claude its own habits. Before you trust a sample:

- Run the `check_tells` tool on a few samples from every source, each at least 30 words of the
  person's own prose (it ignores code, quotes and URLs, but not someone else's paragraphs, so
  leave those out). It counts em dashes, arrows and stock phrases and finds the person's usual
  dash; a sample marked "likely assisted" counts for less. It's a heuristic: trust it when it
  agrees with the other signs below, and ask when it doesn't.
- Look for a date where the style turns: more em dashes, tidier headings, generic section names.
- Ask the person when unsure ("Were your wiki pages since March drafted with an AI?").

Assisted pieces aren't useless: what the person kept after editing shows what they sign off on.
Weight them below what they wrote alone, and say which was which.

## 4. Write the voice skill

Write to `~/.claude/skills/<name>-voice/`. A project's `.claude/skills/` gets committed with the
repo, and the examples are the person's private writing: put it there only if they ask, after
they've read `references/examples.md`. Before writing the examples, read them once more for
secrets, customer names and other people's details, and drop any you find. Then:

- **`SKILL.md`**. A `description` that makes it load whenever Claude drafts something the
  person will send or publish, including when another skill decides the structure. Then:
  - **The constant voice**: the five to eight traits every source shares, each with the evidence
    in a few words.
  - **Punctuation tells**: their dash, and what they never use. Name the AI tells to avoid.
  - **Registers**: usually casual (chat, DMs), work docs (PRs, tickets, specs) and long form
    (posts, essays). Give each one its openings, closings, structure and length. When editing a
    casual draft of theirs, fix substance only and leave their typos and phrasing alone, unless
    they say otherwise.
  - **Their corrections**, turned into rules.
  - **A checklist** to run before handing a draft over.
- **`references/examples.md`**: their own sentences, by register, plus the corrections verbatim.
  Typos stay in the casual ones: they are part of how the person sounds.
- **`portable.md`**: the same rules in about 400 words with no Claude-specific words, for other
  AI tools' custom instructions.

Write all three in plain sentences and follow the new rules yourself: if the person never uses an
em dash, the skill has none either.

## 5. Prove it on something real

Ask for one real piece of writing (a recent pull request description, a doc, a long message), or
find one in a source they named. Rewrite it with the new skill and show both versions, with
what changed, what you cut and anything they might want back. Fold what you learn into the
skill: a rewrite nearly always turns up a rule nobody wrote down.

## 6. Make it load every time

Offer, and do each one only on a yes:

- A line in `~/.claude/CLAUDE.md`: "Before drafting anything that goes out under my name, load
  the `<name>-voice` skill."
- A symlink for other agents that read skills from a folder, for example
  `ln -s ~/.claude/skills/<name>-voice ~/.kiro/skills/<name>-voice`.
- `portable.md` on the clipboard (`pbcopy` on macOS), for ChatGPT, Gemini or any custom
  instructions box.

Then tell them how to refresh it: run `/write-like-me` again in a few months, since writing
changes and new corrections pile up.
