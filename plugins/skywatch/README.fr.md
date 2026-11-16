# Skywatch

🇬🇧 [English](README.md) · 🇪🇸 [Español](README.es.md)

Un ciel derrière la conversation qui suit le soleil là où vous êtes, avec un petit soleil ou une lune dans sa vraie phase, et une petite bestiole au-dessus de la zone de saisie qui somnole, rêve de temps en temps, et se réveille pour vous montrer les sessions qui ont terminé.

## Installation

Une fois la [marketplace tinwright](../../README.md#install) ajoutée :

```text
/plugin install skywatch@tinwright
```

Claude Code demande les réglages ci-dessous quand vous l'activez. Vous pourrez les changer ensuite dans `/config`.

Il est fait pour l'application de bureau Claude : le terminal n'a ni arrière-plan ni bandeau où dessiner, donc il n'y fait rien.

## Ce qu'il fait

- **Le ciel** : un arrière-plan derrière la conversation pour l'aube, le jour, le crépuscule et la nuit, avec les couleurs de l'application assorties. Le soleil traverse le ciel du lever au coucher ; la nuit, c'est la lune, éclairée selon sa vraie phase. Il avance toutes les quelques minutes.
- **La bestiole** : une petite bestiole orange toute carrée est posée au-dessus de la zone de saisie, endormie, qui respire. Environ une fois toutes les deux minutes, elle rêve quelques secondes de ce qui va avec le ciel : des moutons qui sautent une barrière la nuit, un papillon le jour, un lever de soleil à l'aube, des lucioles au crépuscule.
- **Les sessions terminées** : quand une autre session de l'application s'arrête, la bestiole se réveille, trottine de gauche à droite et montre une ligne comme « Fix the login page is ready for your eyes », avec un lien vers cette session. « Seen it » la rendort. Une session ne compte plus dès qu'elle repart, qu'elle quitte la liste de l'application, ou au bout de trois heures.
- **`/skywatch`** donne le lever et le coucher du soleil du jour. **`/skywatch test`** réveille la bestiole avec une fausse session, pour la voir marcher.

Tout bouge en animation CSS, et reste immobile si votre système demande de réduire les animations.

## Réglages

| Réglage | Par défaut | Ce qu'il fait |
|---|---|---|
| Latitude | aucun | Degrés nord, négatifs pour le sud. |
| Longitude | aucun | Degrés est, négatifs pour l'ouest. |

Laissez les deux vides et la journée va simplement de 06:00 à 18:00. Deux décimales suffisent, et les chiffres restent sur votre ordinateur : le lever et le coucher du soleil sont calculés sur place, sans aucune requête.

## Bon à savoir

- Il repère les sessions terminées grâce à la liste des sessions de l'application (les outils `ccd_session_mgmt`), qui dit seulement si chaque session tourne. « Vous attend » veut dire « tournait et s'est arrêtée », donc une session qui s'arrête pour poser une question compte aussi. Quand cette liste n'est pas disponible, le bandeau dit qu'il ne voit pas vos autres sessions.
- Il change le thème de l'application, il remplace donc tout autre mod de thème tant qu'il est actif. Désactivez l'un pour utiliser l'autre.
- Il ne peut pas dessiner dans la barre latérale ni montrer la ligne d'une session précise ; c'est le lien dans la ligne qui vous y mène.
- La bestiole est un petit dessin de fan, pas un personnage officiel.

## Retours

Un bug ou une idée ? [Ouvrez une issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
