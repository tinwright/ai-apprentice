# Write Like Me

🇬🇧 [English](README.md) · 🇪🇸 [Español](README.es.md)

Apprenez à Claude à écrire comme vous : indiquez-lui votre blog, vos notes, vos documents et vos conversations, et il en tire une compétence à votre image, ainsi qu'une version courte pour les autres outils d'IA.

## Installation

Dans Claude Code, ajoutez une fois la place de marché tinwright, puis installez le plugin :

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install write-like-me@tinwright
```

## Comment l'utiliser

Tapez `/write-like-me` suivi de l'endroit où vous écrivez, par exemple
`/write-like-me mon blog sur example.com et mes notes dans ~/Notes`. Si `/write-like-me`
n'apparaît pas dans la liste, tapez `/write-like-me:write-like-me`.

Claude lit chaque source en parallèle, et toujours vos anciennes sessions Claude Code : chaque
« fais plus court » que vous y avez tapé est le meilleur indice qui soit. Il met de côté les
textes qui semblent retouchés par une IA (l'outil `check_tells` compte les tirets cadratins, les
flèches et les tournures toutes faites), puis il écrit :

- une compétence `<vous>-voice` dans `~/.claude/skills/`, avec les règles que montre votre
  écriture pour les messages, les documents de travail et les textes plus longs ;
- vos propres phrases, comme exemples de référence ;
- une version de 400 mots à coller dans les instructions personnalisées de n'importe quel autre
  outil d'IA.

Pour le prouver, il réécrit un vrai texte de votre main et vous montre les deux versions. Il vous
propose ensuite de charger la compétence chaque fois que Claude rédige quelque chose pour vous.

Il évite les dossiers qui semblent privés et ne cite jamais rien de personnel. S'il trouve des
mots de passe ou des clés dans vos notes, il vous dit où, sans les ouvrir.

## Retours

Un bug ou une idée ? [Ouvrez une discussion](https://github.com/tinwright/ai-apprentice/issues/new/choose).
