# Anaglyph Look

🇬🇧 [English](README.md) · 🇪🇸 [Español](README.es.md)

Un thème sombre avec une scène en 3D derrière la conversation, pour lunettes rouge et cyan : une arène de chars et de balises qui suit ce que fait Claude, ou un quadrillage avec des formes flottantes, et une étape d'étalonnage qui adapte les couleurs à vos lunettes.

## Installation

Dans Claude Code, ajoutez une fois la place de marché tinwright, puis installez le plugin :

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install anaglyph-look@tinwright
```

Claude Code demande les réglages ci-dessous à l'activation. Vous pouvez les changer ensuite dans `/config`.

C'est pour les applications Claude de bureau et mobile : le terminal n'a pas d'arrière-plan où dessiner, donc il n'y fait rien.

## Comment l'utiliser

Mettez des lunettes rouge et cyan, verre rouge sur l'œil gauche, et tapez d'abord `/anaglyph-calibrate`.

- **`/anaglyph-calibrate`** ouvre une mire : les mots LEFT et RIGHT imprimés l'un sur l'autre. Fermez un œil à la fois : chaque verre ne doit montrer que son propre mot. Assombrissez la couleur qui se voit encore à travers l'autre verre, gardez les deux à peu près aussi lumineuses, puis appuyez sur **Save**. La scène derrière la conversation change au fur et à mesure, et vos couleurs sont gardées pour toutes les sessions.
- **L'arène** se trouve derrière la conversation, vue juste derrière votre char qui en suit un autre. Elle suit Claude : à l'arrêt quand il ne se passe rien, le sol pointillé défile vers vous et le monde tourne quand Claude travaille, des tirs partent vers le char devant vous quand un outil s'exécute, les balises s'allument quand Claude attend votre réponse, et le char devant explose quand Claude termine un travail qui a utilisé un outil.
- **Le tableau de bord** au-dessus de la zone de saisie indique ce que fait votre char, le remplissage de la fenêtre de contexte de Claude, et les tirs et coups au but de la session.
- **`/anaglyph-demo`** montre tous les états de l'arène en vingt-cinq secondes environ, avec la ligne d'état qui explique chacun.

Sans lunettes, on dirait une vieille affiche de film en 3D. Le texte reste plat et lisible : le rouge et le cyan ne colorent jamais le texte de la conversation.

## Réglages

| Réglage | Par défaut | Ce qu'il fait |
|---|---|---|
| Scene | arena | `arena` suit ce que fait Claude ; `grid` est un sol qui défile vers vous avec des formes en fil de fer qui sortent de l'écran et y rentrent. |
| Depth | 1 | Jusqu'où la scène s'étend derrière et devant l'écran, de 0,2 à 2. |
| Glasses | typical | Les couleurs de départ tant que vous n'avez pas étalonné : `clean`, `typical` ou `leaky`. |

- **Les lignes restent doubles ?** Baissez la profondeur, dans `/anaglyph-calibrate` ou ici.
- **Un léger second contour à travers un verre ?** C'est une image fantôme : le verre laisse passer un peu de l'autre couleur. Assombrissez cette couleur dans `/anaglyph-calibrate`. Les lunettes en carton demandent souvent des couleurs bien plus sombres que celles en verre ou en acrylique.
- Un étalonnage enregistré l'emporte sur les réglages Glasses et Depth. **Back to settings**, dans le panneau d'étalonnage, l'efface.

## Bon à savoir

- Une session n'a qu'un thème à la fois : celui-ci remplace les autres mods de thème comme Skywatch ou Vim Look. Désactivez l'autre pour voir celui-ci.
- Tout bouge en animation CSS, et reste immobile si votre système demande moins de mouvement.
- Les chars, pylônes et balises de l'arène sont propres à ce plugin, dans l'esprit des jeux de chars en fil de fer du début des années 90.

## Retours

Un bug ou une idée ? [Ouvrez une issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
