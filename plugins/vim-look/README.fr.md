# Vim Look

🇬🇧 [English](README.md) · 🇪🇸 [Español](README.es.md)

Une allure Vim pour Claude Code : des gris sombres de terminal, une police à chasse fixe partout, des tildes dans la marge, une ligne d'état NORMAL, INSERT et COMMAND au-dessus de la zone de saisie, et des commandes `:w`, `:q` et `:wq` qui répondent comme le ferait Vim.

## Installation

Dans Claude Code, ajoutez une fois la place de marché tinwright, puis installez le plugin :

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install vim-look@tinwright
```

## Comment l'utiliser

Il n'y a rien à activer. Le thème est toujours sombre, quel que soit le mode de l'application.

- **La ligne d'état** se trouve au-dessus de la zone de saisie. Elle affiche `NORMAL` quand Claude vous attend, `INSERT` quand Claude écrit, et `COMMAND` avec le nom de l'outil (`:!Bash`) quand un outil s'exécute. À côté figurent le dossier et la branche git où vous êtes, ainsi qu'un compteur comme `3L, 12C` : 3 messages et 12 appels d'outils pendant cette session.
- **`:w`, `:q`, `:wq` et `:x`**, saisis seuls comme message, reçoivent la réponse que donnerait Vim et ne sont jamais envoyés à Claude. Essayez `:q`, puis `:q!`. `/w`, `/q` et `/wq` font la même chose depuis le menu des commandes.

Les couleurs, la police et les tildes s'affichent dans les applications de bureau et mobile. Dans un terminal, vous avez la ligne d'état et les commandes.

## Retours

Un bug ou une idée ? [Ouvrez une discussion](https://github.com/tinwright/ai-apprentice/issues/new/choose).
