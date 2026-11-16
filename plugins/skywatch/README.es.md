# Skywatch

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md)

Un cielo detrás del chat que sigue al sol donde estés, con un sol pequeño o una luna en su fase real, y un bichito sobre el cuadro de texto que dormita, sueña de vez en cuando y se despierta para señalarte las sesiones que han terminado.

## Instalación

Con el [marketplace de tinwright](../../README.md#install) agregado:

```text
/plugin install skywatch@tinwright
```

Claude Code pide los ajustes de abajo cuando lo activas. Puedes cambiarlos después en `/config`.

Es para la aplicación de escritorio de Claude: la terminal no tiene fondo ni banda donde dibujar, así que ahí no hace nada.

## Qué hace

- **El cielo**: un fondo detrás de la conversación para el amanecer, el día, el atardecer y la noche, con los colores de la aplicación a juego. El sol cruza el cielo desde que sale hasta que se pone; de noche lo hace la luna, iluminada en su fase real. Avanza cada pocos minutos.
- **El bichito**: un bichito naranja y cuadrado descansa sobre el cuadro de texto, dormido y respirando. Más o menos una vez cada dos minutos sueña unos segundos con lo que va con el cielo: ovejas saltando una cerca de noche, una mariposa de día, un amanecer al alba, luciérnagas al atardecer.
- **Sesiones terminadas**: cuando otra sesión de la aplicación deja de ejecutarse, el bichito se despierta, corretea de un lado a otro y señala una línea como «Fix the login page is ready for your eyes», con un enlace a esa sesión. «Seen it» lo vuelve a dormir. Una sesión deja de contar cuando vuelve a ejecutarse, sale de la lista de la aplicación o pasadas tres horas.
- **Ambientes**: pon el cielo en morning, day, evening o night para quedarte ahí sin importar la hora, o escribe `/skywatch night` (o `morning`, `day`, `evening`) para escaparte a uno por un rato. `/skywatch live` vuelve a seguir al sol. La luna mantiene su fase real.
- **`/skywatch`** te dice a qué hora sale y se pone el sol hoy. **`/skywatch test`** despierta al bichito con una sesión de mentira, para verlo caminar.

Todo se mueve con animaciones CSS, y se queda quieto si tu sistema pide reducir el movimiento.

## Ajustes

| Ajuste | Predeterminado | Qué hace |
|---|---|---|
| Sky | live | `live` sigue al sol; `morning`, `day`, `evening` o `night` mantiene ese cielo. |
| Latitude | ninguno | Grados norte, negativos para el sur. |
| Longitude | ninguno | Grados este, negativos para el oeste. |

Si dejas los dos vacíos, el día va simplemente de 06:00 a 18:00. Con dos decimales basta, y los números se quedan en tu computadora: la salida y la puesta del sol se calculan ahí mismo, sin ninguna consulta.

## Bueno saber

- Encuentra las sesiones terminadas con la lista de sesiones de la propia aplicación (las herramientas `ccd_session_mgmt`), que solo dice si cada sesión se está ejecutando. «Te espera» significa «se estaba ejecutando y se detuvo», así que también cuenta una sesión que se detiene para hacerte una pregunta. Si esa lista no está disponible, la banda dice que no puede ver tus otras sesiones.
- Cambia el tema de la aplicación, así que reemplaza cualquier otro mod de tema mientras está activo. Desactiva uno para usar el otro.
- No puede dibujar en la barra lateral ni señalar la fila de una sesión concreta; el enlace de la línea es lo que te lleva ahí.
- El bichito es un dibujito hecho por un fan, no un personaje oficial.

## Comentarios

¿Encontraste un error o tienes una idea? [Abre un issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
