# Pixel Buddy

🇬🇧 [English](README.md) · 🇪🇸 [Español](README.es.md)

Un compagnon en pixels au-dessus de votre zone de saisie, que Claude dessine d'après votre description ou une image, puis anime quand il réfléchit, tape, vous demande votre accord et dort la nuit.

## Installation

Dans Claude Code, ajoutez une fois la place de marché tinwright, puis installez le plugin :

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install pixel-buddy@tinwright
```

## Comment l'utiliser

Votre compagnon apparaît tout seul au-dessus de la zone de saisie dans l'application de bureau (et sous forme d'une ligne d'état dans le terminal). Au départ, c'est Clawd, le compagnon intégré.

**Créez le vôtre** : tapez `/buddy-make` suivi d'une description, par exemple `/buddy-make une grenouille verte endormie avec une petite couronne`, ou collez une image et tapez `/buddy-make comme ça`. Claude dessine un petit personnage en pixels, le mod vérifie qu'il convient (taille, couleurs visibles sur les thèmes clair et sombre, un visage où dessiner les yeux), puis il prend place au-dessus de la zone de saisie et passe une fois par toutes ses humeurs. Si `/buddy-make` n'apparaît pas dans la liste, tapez `/pixel-buddy:buddy-make`.

**Modifiez-le** : demandez simplement, par exemple « agrandis ses oreilles » ou « fais-le en violet ». Claude met à jour le même compagnon.

**Ce qu'il fait** : quelle que soit son apparence, il se comporte comme Clawd Buddy. Une bulle de pensée quand Claude réfléchit, un petit clavier quand il lance des commandes, un bloc-notes quand il modifie des fichiers, une loupe quand il cherche, et une copie en demi-taille à côté de lui pour chaque agent auxiliaire. De grands yeux et un « ! » quand une commande échoue, un « ta-da » quand les tests passent, un étirement après une longue tâche, un pouce levé après un `git push`. Il vous fait signe quand Claude attend votre accord, et tape du pied si une question attend depuis une minute. Café de 8 h à 10 h 30, sandwich de 12 h à 13 h, sommeil de 22 h à 7 h, lunettes de soleil le vendredi après-midi.

**Commandes** :

- `/buddy-make <description>` : créer un nouveau compagnon.
- `/buddy-demo` : voir toutes ses humeurs, trois secondes chacune.
- `/buddy-use` : lister vos compagnons ; `/buddy-use <nom>` passe à l'un d'eux. Clawd est toujours là.
- `/buddy-forget <nom>` : supprimer un compagnon. Les 12 plus récents sont conservés.
- `/buddy-jump` et `/buddy-coffee` : un saut, et une pause café de 30 secondes.

Vos compagnons sont conservés d'une session à l'autre.

## Retours

Un bug ou une idée ? [Ouvrez une discussion](https://github.com/tinwright/ai-apprentice/issues/new/choose).
