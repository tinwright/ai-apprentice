# Skywatch

🇬🇧 [English](README.md) · 🇪🇸 [Español](README.es.md)

Un ciel derrière la conversation qui suit le soleil là où vous êtes, avec un petit soleil ou une lune dans sa vraie phase. Il ne dessine que le ciel et laisse libre l'espace au-dessus de la zone de saisie, pour cohabiter avec Clawd Buddy ou tout autre mod qui s'y installe.

## Installation

Une fois la [marketplace tinwright](../../README.md#install) ajoutée :

```text
/plugin install skywatch@tinwright
```

Claude Code demande les réglages ci-dessous quand vous l'activez. Vous pourrez les changer ensuite dans `/config`.

Il est fait pour l'application de bureau Claude : le terminal n'a pas d'arrière-plan où dessiner, donc il n'y fait rien.

## Ce qu'il fait

- **Le ciel** : un arrière-plan derrière la conversation pour l'aube, le jour, le crépuscule et la nuit, avec les couleurs de l'application assorties. Le soleil traverse le ciel du lever au coucher ; la nuit, c'est la lune, éclairée selon sa vraie phase. Il avance toutes les quelques minutes.
- **Ambiances** : réglez le ciel sur morning, day, evening ou night pour y rester quelle que soit l'heure, ou tapez `/skywatch night` (ou `morning`, `day`, `evening`) pour vous y évader un moment. `/skywatch live` suit de nouveau le soleil. La lune garde sa vraie phase.
- **`/skywatch`** donne le lever et le coucher du soleil du jour.

Tout bouge en animation CSS, et reste immobile si votre système demande de réduire les animations.

## Réglages

| Réglage | Par défaut | Ce qu'il fait |
|---|---|---|
| Sky | live | `live` suit le soleil ; `morning`, `day`, `evening` ou `night` garde ce ciel. |
| Latitude | aucun | Degrés nord, négatifs pour le sud. |
| Longitude | aucun | Degrés est, négatifs pour l'ouest. |

Laissez les deux vides et la journée va simplement de 06:00 à 18:00. Deux décimales suffisent, et les chiffres restent sur votre ordinateur : le lever et le coucher du soleil sont calculés sur place, sans aucune requête.

## Bon à savoir

- Il change le thème de l'application, il remplace donc tout autre mod de thème tant qu'il est actif. Désactivez l'un pour utiliser l'autre.

## Retours

Un bug ou une idée ? [Ouvrez une issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
