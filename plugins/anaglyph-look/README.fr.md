# Anaglyph Look

🇬🇧 [English](README.md) · 🇪🇸 [Español](README.es.md)

Un thème sombre avec une scène en 3D derrière la conversation, pour lunettes rouge et cyan : un sol quadrillé qui défile vers vous, des étoiles, une planète à anneaux et des formes en fil de fer qui sortent de l'écran et y rentrent.

## Installation

Dans Claude Code, ajoutez une fois la place de marché tinwright, puis installez le plugin :

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install anaglyph-look@tinwright
```

Claude Code demande les réglages ci-dessous à l'activation. Vous pouvez les changer ensuite dans `/config`.

## Comment l'utiliser

Mettez des lunettes rouge et cyan, verre rouge sur l'œil gauche. La scène se trouve derrière la conversation :

- **Le sol** part de derrière l'écran à l'horizon, passe devant l'écran en bas et défile vers vous.
- **Les étoiles et une planète à anneaux** sont derrière l'écran, à plusieurs profondeurs.
- **Des formes en fil de fer** tournent et flottent sur les bords, certaines derrière l'écran, d'autres devant, et un cube sort vers vous puis repart.

Sans lunettes, on dirait une vieille affiche de film en 3D. Le texte reste plat et lisible : le rouge et le cyan ne colorent jamais le texte de la conversation.

C'est pour les applications Claude de bureau et mobile : le terminal n'a pas d'arrière-plan où dessiner, donc il n'y fait rien.

## Réglages

| Réglage | Par défaut | Ce qu'il fait |
|---|---|---|
| Depth | 1 | Jusqu'où la scène s'étend derrière et devant l'écran, de 0,2 à 2. |
| Glasses | typical | La part de la mauvaise couleur que vos verres laissent passer : `clean`, `typical` ou `leaky`. |

- **Les lignes restent doubles ?** Baissez Depth. La profondeur garde le même nombre de pixels quelle que soit la taille de la fenêtre, mais de près, sur un grand écran, il en faut moins.
- **Un léger second contour à travers un verre ?** C'est une image fantôme : le verre laisse passer un peu de l'autre couleur. Choisissez `leaky` pour des couleurs plus sombres et plus pures. Les lunettes en carton en ont souvent besoin ; des verres en verre ou en acrylique supportent `clean`, plus lumineux.

## Bon à savoir

- Une session n'a qu'un thème à la fois : celui-ci remplace les autres mods de thème comme Skywatch ou Vim Look. Désactivez l'autre pour voir celui-ci.
- Tout bouge en animation CSS, et reste immobile si votre système demande moins de mouvement.

## Retours

Un bug ou une idée ? [Ouvrez une issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
