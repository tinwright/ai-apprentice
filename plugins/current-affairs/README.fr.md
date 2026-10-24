# Current Affairs

🇬🇧 [English](README.md) · 🇪🇸 [Español](README.es.md)

Un mod Claude Code qui ajoute des panneaux construits à partir de vos sessions Claude Code locales : votre travail récent regroupé par dépôt et par ticket GitHub ou par branche, avec ce que chaque sujet a coûté (`/work`), le remplissage du contexte de la session en cours et ce que vous avez consommé de vos limites d'utilisation, et votre activité et vos heures de travail de la semaine écoulée, avec des tendances (`/timeline`).

## Installation

Une fois la [place de marché tinwright](../../README.md#install) ajoutée (en anglais) :

```text
/plugin install current-affairs@tinwright
```

Claude Code vous demande les réglages ci-dessous quand vous l'activez. Modifiez-les ensuite dans `/config`.

## Ce qu'il fait

- **Recent work** (`/work`, s'ouvre au début d'une session) : les sessions des 14 derniers jours dans tous vos dossiers, regroupées par dépôt, puis par sujet. Un sujet est un ticket GitHub, trouvé dans la branche (`12-fix-login`, comme GitHub nomme une branche créée depuis un ticket, ou `issue-12`, `fix/12-login`), le dossier du worktree ou les liens vers des tickets dans vos prompts (`owner/repo#12` ou l'URL du ticket). Sans ticket, c'est la branche elle-même. Les lignes de ticket affichent son titre et son statut dans GitHub Projects. Cliquer sur une session copie sa commande `claude --resume`. Le ✕ d'un sujet le range jusqu'à sa prochaine activité, et les tickets fermés ou dans une colonne Done se rangent d'eux-mêmes ; `h` (le bouton `2 hidden`) les réaffiche, chacun avec un ↺ pour le faire revenir.
- **Utilisation**, en haut de Recent work : une jauge du remplissage du contexte de la session en cours (tokens utilisés sur la fenêtre du modèle), et une pour chaque limite d'utilisation de votre forfait, comme les limites sur 5 heures et hebdomadaire, avec l'heure de sa remise à zéro, et en dessous ce que la session a coûté jusqu'ici, avec le coût du dernier tour (sous-agents compris) et sa durée. Les jauges passent au jaune au-delà de 70 % et au rouge au-delà de 90 %, et se mettent à jour après chaque réponse. Chaque ligne de session indique aussi le remplissage de son contexte à son arrêt (`84k ctx`). Quand le contexte de la session en cours est plein à 80 %, une notification suggère `/compact` ou une nouvelle session, puis de nouveau à 90 %.
- **Rythme et totaux**, sous les jauges : où vont les limites de 5 heures et hebdomadaire au rythme où elles se sont remplies jusqu'ici (`on pace for 18% by reset`, ou dans combien de temps l'une est épuisée), puis les heures de travail, les sessions et le coût d'aujourd'hui et des 7 derniers jours. Dans l'app Claude, qui liste déjà vos sessions, Recent work affiche ces chiffres sans la liste des sessions.
- **Coût de chaque sujet** : chaque session, ticket ou branche, et chaque dépôt dans Recent work indique ce que son travail a coûté, sous-agents compris. C'est une estimation aux tarifs publics de l'API d'Anthropic, à partir des tokens des transcriptions. Avec un forfait Pro ou Max, vous ne payez pas au token : c'est alors ce que le même travail coûterait via l'API.
- **Last week** (`/timeline`, ou `t` dans Recent work) : une ligne par ticket ou par branche sur les 7 derniers jours, et vos heures de travail, par jour et sur la semaine : chaque tranche de 5 minutes où une session était active, comptée une fois quel que soit le nombre de sessions en parallèle, les pauses de 15 minutes au plus comptant comme du travail. En dessous, des tendances qui comparent les deux dernières semaines aux six précédentes : pull requests fusionnées, durée de cycle médiane (de la première session à la pull request fusionnée qui ferme le ticket), part de reprises et sujets traités par jour d'activité. Le mod enregistre des statistiques quotidiennes : la base de comparaison s'enrichit avec le temps et survit au nettoyage des transcriptions.

Il lit uniquement vos transcriptions locales (`~/.claude/projects`), git, et GitHub via `gh`.

## Réglages

| Réglage | Par défaut | Rôle |
|---|---|---|
| **Issue titles** | `github` | D'où viennent les titres des tickets. `github` récupère le titre et le statut GitHub Projects de chaque ticket avec `gh`, au plus toutes les six heures par ticket. `none` utilise les titres des conversations et ne recherche rien. |
| **Default branches** | `main, master, develop, trunk` | Les branches qui ne représentent jamais un sujet. |
| **Context warning** | `80` | Le remplissage du contexte de la session, en pourcentage, à partir duquel une notification suggère `/compact` ou une nouvelle session. Une seconde arrive à 90 %. `0` les désactive. |

## Prérequis

- `git` dans votre `PATH`.
- `jq` dans votre `PATH` pour les sessions dont la transcription dépasse 4 Mo. Sans lui, ces sessions sont omises et le volet indique combien.
- `gh`, connecté, pour les titres des tickets et les tendances des pull requests. Le statut GitHub Projects demande aussi la portée `read:project` (`gh auth refresh -s read:project`). Sans elle, les lignes affichent le titre seul, ou `closed` une fois le ticket fermé.

## Développement

```sh
claude --plugin-dir ./plugins/current-affairs
claude plugin test ./plugins/current-affairs   # les tests du mod
```
