# ai-apprentice

Claude Code plugins, skills and mods, one folder each under `plugins/`, listed in the
`tinwright` marketplace (`.claude-plugin/marketplace.json`), with a catalog site built from their
READMEs. This file has two halves: helping someone install a plugin, and building a new one.

## Helping someone install a plugin

Assume the person has never used a terminal or a plugin. One step at a time, and wait for each to
work before the next.

1. They need Claude Code first. If `claude` isn't a command they have, point them to
   https://claude.com/claude-code and stop until it's installed.
2. In Claude Code, they type `/plugin marketplace add tinwright/ai-apprentice` and press Enter.
   Claude Code asks to add the marketplace: they answer `y`.
3. They type `/plugin install <plugin>@tinwright` and press Enter, then choose where to install it.
   "User" (every project) is right for almost everyone.
4. Most plugins work straight away. If the plugin's README says to, they run `/reload-plugins` or
   restart Claude Code.
5. The plugin's README says what to try first. Have them try it, and confirm it worked.

If something fails, ask for the exact message. `Marketplace file not found` means the marketplace
name was mistyped; `Plugin "<name>" not found` means the plugin's name was.

## Building a plugin

### Start

```sh
npm run create -- <name> --description "What it does, in one sentence."
```

This copies `template/` to `plugins/<name>/` and lists it in the marketplace. The name is
lowercase with hyphens, and leaves out "claude" and "anthropic" (Claude Code reserves those
prefixes, and they read as official).

### What a plugin folder holds

- `.claude-plugin/plugin.json`: `name` (the folder's), `displayName`, `description`, `author`. No
  `version`: plugins here are version-less, so every merge to `main` is an update for everyone.
- `hooks/hooks.json` and `hooks/register.ts`: the mod's hooks. Anything that touches `$` stays in
  `register.ts` (the engine refuses `$` passed into a function from another file); everything else
  goes in plain modules next to it, which tests can call directly.
- `skills/<skill>/SKILL.md` instead, or as well, for a skill.
- `*.test.ts`: tests run by `claude plugin test`, with `test`, `expect` and `mock` from
  `claude-code/testing`. Test the real hooks through the engine's `$` (`$.command.run`,
  `$.ui.mount`...), not mocks of the plugin's own functions.
- `README.md`, `README.fr.md`, `README.es.md`: the first paragraph under the title is the
  description on the catalog site. Translations are France French and neutral Spanish.
- `screenshot.png`, optional: the plugin's card image on the site.

For the hooks API, load Claude Code's plugin-authoring skill, or read the types it points to.

### Before a pull request

```sh
npm run check   # names, READMEs, tests, template leftovers, the marketplace, claude plugin validate, secrets
npm test        # the catalog site, and every plugin through the real engine
```

CI runs both, and the private-data guard, which fails on company hosts, internal IDs and work
email addresses anywhere in the change or its commits. Never write any of those, even as examples:
use `example.com`, `owner/repo` and made-up names.

Commit messages are conventional commits scoped to the plugin: `feat(word-count): count selections`.

### Site

`npm run build` writes the catalog site to `dist/` from every plugin's READMEs and
`screenshot.png`; `npm run dev` serves it at http://localhost:3000. `site.config.js` holds the
title, tagline, languages and per-plugin overrides (`kicker`, `title`, `focus`). The install steps
on each page come from `scripts/page.js`'s extension points. The build also writes `items.json`,
which the org-wide gallery at https://tinwright.github.io reads.
