# Current Affairs

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md)

Un mod de Claude Code que añade paneles construidos a partir de tus sesiones locales de Claude Code: tu trabajo reciente agrupado por repositorio y por issue de GitHub o rama, con lo que costó cada tarea (`/work`), cuánto ocupa el contexto de la sesión actual y cuánto has usado de tus límites de uso, y tu actividad y horas trabajadas de la última semana, con tendencias (`/timeline`).

## Instalación

Con el [marketplace tinwright](../../README.md#install) añadido (en inglés):

```text
/plugin install current-affairs@tinwright
```

Claude Code te pide los ajustes de abajo al activarlo. Cámbialos después en `/config`.

## Qué hace

- **Recent work** (`/work`, se abre al iniciar una sesión): las sesiones de los últimos 14 días en todas tus carpetas, agrupadas por repositorio y luego por tarea. Una tarea es una issue de GitHub, encontrada en la rama (`12-fix-login`, como GitHub nombra una rama creada desde una issue, o `issue-12`, `fix/12-login`), en la carpeta del worktree o en enlaces a issues en tus prompts (`owner/repo#12` o la URL de la issue). Sin issue, es la propia rama. Las filas de issue muestran su título y su estado en GitHub Projects. Al pulsar una sesión se copia su comando `claude --resume`. La ✕ de una tarea la guarda hasta que tenga actividad nueva, y las issues cerradas o en una columna Done se guardan solas; `h` (el botón `2 hidden`) las vuelve a mostrar, cada una con un ↺ para recuperarla.
- **Uso**, arriba en Recent work: un medidor de cuánto ocupa el contexto de la sesión actual (tokens usados de la ventana del modelo), y uno por cada límite de uso que informa tu plan, como los límites de 5 horas y semanal, con cuándo se reinicia, y debajo lo que lleva costado la sesión, con el coste del último turno (subagentes incluidos) y cuánto duró. Los medidores se ponen amarillos al pasar del 70 % y rojos al pasar del 90 %, y se actualizan tras cada respuesta. Cada fila de sesión muestra también cuánto ocupaba su contexto al detenerse (`84k ctx`). Cuando el contexto de la sesión actual llega al 80 %, un aviso sugiere `/compact` o una sesión nueva, y otra vez al 90 %.
- **Coste de cada tarea**: cada sesión, issue o rama, y cada repositorio en Recent work muestra lo que costó su trabajo, subagentes incluidos. Es una estimación a los precios públicos de la API de Anthropic, a partir de los tokens de las transcripciones. Con un plan Pro o Max no pagas por token, así que ahí es lo que costaría el mismo trabajo mediante la API.
- **Last week** (`/timeline`, o `t` en Recent work): una línea por issue o rama en los últimos 7 días, y las horas que trabajaste, por día y en la semana: cada tramo de 5 minutos en que alguna sesión estuvo activa, contado una vez aunque hubiera varias sesiones a la vez, y las pausas de hasta 15 minutos cuentan como trabajo. Debajo, tendencias que comparan las dos últimas semanas con las seis anteriores: pull requests fusionadas, tiempo de ciclo mediano (de la primera sesión a la pull request fusionada que cierra la issue), proporción de retrabajo y tareas por día activo. El mod guarda estadísticas diarias, así que la referencia crece con el tiempo y sobrevive a la limpieza de transcripciones.

Solo lee tus transcripciones locales (`~/.claude/projects`), git, y GitHub mediante `gh`.

## Ajustes

| Ajuste | Predeterminado | Qué hace |
|---|---|---|
| **Issue titles** | `github` | De dónde salen los títulos de las issues. `github` consulta el título y el estado en GitHub Projects de cada issue con `gh`, como mucho cada seis horas por issue. `none` usa los títulos de las conversaciones y no busca nada. |
| **Default branches** | `main, master, develop, trunk` | Ramas que nunca representan una tarea. |
| **Context warning** | `80` | Cuánto se llena el contexto de la sesión, en porcentaje, antes de que un aviso sugiera `/compact` o una sesión nueva. Un segundo aviso llega al 90 %. `0` los desactiva. |

## Requisitos

- `jq` y `git` en tu `PATH`.
- `gh`, con sesión iniciada, para los títulos de las issues y las tendencias de pull requests. El estado en GitHub Projects también necesita el permiso `read:project` (`gh auth refresh -s read:project`). Sin él, las filas muestran solo el título, o `closed` cuando la issue está cerrada.

## Desarrollo

```sh
claude --plugin-dir ./plugins/current-affairs
claude plugin test ./plugins/current-affairs   # las pruebas del mod
```
