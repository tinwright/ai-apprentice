# Anaglyph Look

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md)

Un tema oscuro con una escena en 3D detrás de la conversación, para lentes rojo y cian: una arena de tanques y balizas que sigue lo que hace Claude, o una cuadrícula con figuras flotantes, y un paso de calibración que ajusta los colores a tus lentes.

## Instalación

En Claude Code, agrega una vez el marketplace de tinwright y luego instala el plugin:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install anaglyph-look@tinwright
```

Claude Code pide los ajustes de abajo al activarlo. Puedes cambiarlos después en `/config`.

Es para las aplicaciones de Claude de escritorio y móvil: la terminal no tiene fondo donde dibujar, así que ahí no hace nada.

## Cómo usarlo

Ponte unos lentes rojo y cian, con el lente rojo en el ojo izquierdo, y escribe primero `/anaglyph-calibrate`.

- **`/anaglyph-calibrate`** abre una carta de prueba: las palabras LEFT y RIGHT impresas una sobre otra. Cierra un ojo a la vez: cada lente debe mostrar solo su propia palabra. Oscurece el color que todavía se ve a través del otro lente, mantén los dos con un brillo parecido y pulsa **Save**. La escena detrás de la conversación cambia mientras ajustas, y tus colores se guardan para todas las sesiones.
- **La arena** está detrás de la conversación, vista justo detrás de tu tanque mientras sigue a otro. Sigue a Claude: quieta cuando no pasa nada, el piso de puntos avanza hacia ti y el mundo gira cuando Claude trabaja, salen disparos hacia el tanque de enfrente cuando se ejecuta una herramienta, las balizas se encienden cuando Claude espera tu respuesta, y el tanque de enfrente explota cuando Claude termina un trabajo que usó una herramienta.
- **El cielo** muestra el anillo de un planeta que sube desde el horizonte, muy por detrás de todo, y una larga nave nodriza que cruza por delante.
- **El tablero** sobre el cuadro de texto indica qué hace tu tanque, qué tan llena está la ventana de contexto de Claude, y los disparos y aciertos de la sesión.
- **`/anaglyph-demo`** muestra todos los estados de la arena en unos 25 segundos, y la línea de estado explica cada uno.

Sin lentes parece un viejo cartel de cine en 3D. El texto sigue plano y legible: el rojo y el cian nunca colorean el texto de la conversación.

## Ajustes

| Ajuste | Predeterminado | Qué hace |
|---|---|---|
| Scene | arena | `arena` sigue lo que hace Claude; `grid` es un piso que avanza hacia ti con figuras de alambre que salen de la pantalla y vuelven a entrar. |
| Depth | 1 | Cuánto se extiende la escena detrás y delante de la pantalla, de 0.2 a 2. |
| Glasses | typical | Los colores de partida mientras no calibres: `clean`, `typical` o `leaky`. |

- **¿Las líneas se ven dobles?** Baja la profundidad, en `/anaglyph-calibrate` o aquí.
- **¿Un contorno tenue de más a través de un lente?** Es una imagen fantasma: el lente deja pasar algo del otro color. Oscurece ese color en `/anaglyph-calibrate`. Los lentes de cartón suelen necesitar colores mucho más oscuros que los de vidrio o acrílico.
- Una calibración guardada tiene prioridad sobre los ajustes Glasses y Depth. **Back to settings**, en el panel de calibración, la borra.

## Bueno saber

- Una sesión tiene un solo tema a la vez, así que este reemplaza a otros mods de tema como Skywatch o Vim Look. Desactiva el otro para ver este.
- Todo se mueve con animación CSS y se queda quieto si tu sistema pide menos movimiento.
- Los tanques, pilones y balizas de la arena son de este plugin, en el espíritu de los juegos de tanques de alambre de principios de los 90.

## Comentarios

¿Encontraste un error o tienes una idea? [Abre un issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
