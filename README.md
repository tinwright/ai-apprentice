# ai-apprentice

Plugins, skills and mods for [Claude Code](https://claude.com/claude-code), free to use and adapt.
Part of [tinwright](https://github.com/tinwright).

| Plugin | What it is |
|---|---|
| [**example**](plugins/example) | A starting point: a mod with one slash command that says hello. |

Every plugin has a page on the [catalog site](https://tinwright.github.io/ai-apprentice), in
English, French and Spanish.

## Install

In Claude Code, add the marketplace once, then install what you want:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install example@tinwright
```

To get new versions automatically, run `/plugin`, open **Marketplaces**, select `tinwright` and
choose **Enable auto-update**.

## Make one

```sh
npm install
npm run create -- my-plugin --description "What it does, in one sentence."
npm run check          # this workshop's rules, plus a scan for secrets
npm test               # the site, and every plugin against the real engine
npm run dev            # the catalog site at http://localhost:3000
claude --plugin-dir ./plugins/my-plugin   # try it without installing
```

[`CLAUDE.md`](CLAUDE.md) is the full guide, written so Claude can follow it too.

## Licence

[MIT](LICENSE)
