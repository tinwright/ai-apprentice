# Current Affairs

🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md)

A Claude Code mod that adds panes built from your local Claude Code sessions: your recent work grouped by repo and by GitHub issue or branch (`/work`), how full this session's context is and how much of your usage limits you've used, and an activity timeline (`/timeline`).

## Install

With the [tinwright marketplace](../../README.md#install) added:

```text
/plugin install current-affairs@tinwright
```

Claude Code asks for the settings below when you enable it. Change them later in `/config`.

## What it does

- **Recent work** (`/work`, opens when a session starts): the last 14 days of sessions in every folder, grouped by repo and then by piece of work. A piece of work is a GitHub issue, found in the branch (`12-fix-login`, as GitHub names a branch made from an issue, or `issue-12`, `fix/12-login`), the worktree folder, or issue links in your prompts (`owner/repo#12` or the issue's URL). Without an issue, it's the branch itself. Issue rows show the issue's title and its Project status. Pressing a session copies its `claude --resume` command. A piece of work's ✕ puts it away until it has new activity, and issues that are closed or in a Done column go by themselves; `h` (the `2 hidden` button) shows them again, each with a ↺ to bring it back.
- **Usage**, at the top of Recent work: a meter for how full this session's context is (tokens used out of the model's window), one for each usage limit your plan reports, such as the 5-hour and weekly limits, with when it resets, and below them what the session has cost so far, with the last turn's cost (subagents included) and how long it took. Meters turn yellow past 70% and red past 90%, and update after every reply. Each session row also shows how full its context was when it stopped (`84k ctx`). When this session's context is 80% full, a notice suggests `/compact` or a fresh session, and again at 90%.
- **Cost of each piece of work**: every session, issue or branch, and repo in Recent work shows what its work cost, subagents included. It's an estimate at Anthropic's API list prices, from the tokens in the transcripts. On a Pro or Max plan you don't pay per token, so there it's what the same work would cost through the API.
- **Last week** (`/timeline`, or `t` in Recent work): one lane per issue or branch across the last 7 days, and the hours you worked, each day and for the week: every 5 minutes any session was active, counted once however many sessions ran at the same time, with pauses of up to 15 minutes counted as working. Below that, trends comparing the last two weeks to the six before: PRs merged, median cycle time (from first session to the merged PR that closes the issue), rework share and items worked on per active day. Daily stats are saved by the mod, so the baseline builds up over time and survives transcript cleanup.

It only reads your local transcripts (`~/.claude/projects`), git, and GitHub through `gh`.

## Settings

| Setting | Default | What it does |
|---|---|---|
| **Issue titles** | `github` | Where issue rows get their titles. `github` looks up each issue's title and Project status with `gh`, at most every six hours per issue. `none` uses the chat titles and looks nothing up. |
| **Default branches** | `main, master, develop, trunk` | Branches that never stand for a piece of work. |
| **Context warning** | `80` | How full this session's context gets, in percent, before a notice suggests `/compact` or a fresh session. A second notice comes at 90%. `0` turns them off. |

## What it needs

- `jq` and `git` on your `PATH`.
- `gh`, logged in, for issue titles and the PR trends. Project status also needs the `read:project` scope (`gh auth refresh -s read:project`). Without it, rows show the title alone, or `closed` once the issue is closed.

## Developing

```sh
claude --plugin-dir ./plugins/current-affairs
claude plugin test ./plugins/current-affairs   # the mod's tests
```
