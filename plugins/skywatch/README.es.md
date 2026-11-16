# Skywatch

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md)

Un cielo detrás del chat que sigue al sol donde estés, con un sol pequeño o una luna en su fase real. Solo dibuja el cielo y deja libre el espacio sobre el cuadro de texto, para convivir con Clawd Buddy o cualquier otro mod que se ponga ahí.

## Instalación

Con el [marketplace de tinwright](../../README.md#install) agregado:

```text
/plugin install skywatch@tinwright
```

Claude Code pide los ajustes de abajo cuando lo activas. Puedes cambiarlos después en `/config`.

Es para la aplicación de escritorio de Claude: la terminal no tiene fondo donde dibujar, así que ahí no hace nada.

## Qué hace

- **El cielo**: un fondo detrás de la conversación para el amanecer, el día, el atardecer y la noche, con los colores de la aplicación a juego. El sol cruza el cielo desde que sale hasta que se pone; de noche lo hace la luna, iluminada en su fase real. Avanza cada pocos minutos.
- **Ambientes**: pon el cielo en morning, day, evening o night para quedarte ahí sin importar la hora, o escribe `/skywatch night` (o `morning`, `day`, `evening`) para escaparte a uno por un rato. `/skywatch live` vuelve a seguir al sol. La luna mantiene su fase real.
- **`/skywatch`** te dice a qué hora sale y se pone el sol hoy.

Todo se mueve con animaciones CSS, y se queda quieto si tu sistema pide reducir el movimiento.

## Ajustes

| Ajuste | Predeterminado | Qué hace |
|---|---|---|
| Sky | live | `live` sigue al sol; `morning`, `day`, `evening` o `night` mantiene ese cielo. |
| Latitude | ninguno | Grados norte, negativos para el sur. |
| Longitude | ninguno | Grados este, negativos para el oeste. |

Si dejas los dos vacíos, el día va simplemente de 06:00 a 18:00. Con dos decimales basta, y los números se quedan en tu computadora: la salida y la puesta del sol se calculan ahí mismo, sin ninguna consulta.

## Bueno saber

- Cambia el tema de la aplicación, así que reemplaza cualquier otro mod de tema mientras está activo. Desactiva uno para usar el otro.

## Comentarios

¿Encontraste un error o tienes una idea? [Abre un issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
