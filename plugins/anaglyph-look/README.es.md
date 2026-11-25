# Anaglyph Look

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md)

Un tema oscuro con una escena en 3D detrás de la conversación, para lentes rojo y cian: un piso cuadriculado que avanza hacia ti, estrellas, un planeta con anillos y figuras de alambre que salen de la pantalla y vuelven a entrar.

## Instalación

En Claude Code, agrega una vez el marketplace de tinwright y luego instala el plugin:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install anaglyph-look@tinwright
```

Claude Code pide los ajustes de abajo al activarlo. Puedes cambiarlos después en `/config`.

## Cómo usarlo

Ponte unos lentes rojo y cian, con el lente rojo en el ojo izquierdo. La escena está detrás de la conversación:

- **El piso** va desde detrás de la pantalla en el horizonte hasta delante de ella en el borde inferior, y avanza hacia ti.
- **Las estrellas y un planeta con anillos** están detrás de la pantalla, a varias profundidades.
- **Figuras de alambre** giran y flotan en los bordes, unas detrás de la pantalla y otras delante, y un cubo sale hacia ti y vuelve.

Sin lentes parece un viejo cartel de cine en 3D. El texto sigue plano y legible: el rojo y el cian nunca colorean el texto de la conversación.

Es para las aplicaciones de Claude de escritorio y móvil: la terminal no tiene fondo donde dibujar, así que ahí no hace nada.

## Ajustes

| Ajuste | Predeterminado | Qué hace |
|---|---|---|
| Depth | 1 | Cuánto se extiende la escena detrás y delante de la pantalla, de 0.2 a 2. |
| Glasses | typical | Cuánto del color equivocado dejan pasar tus lentes: `clean`, `typical` o `leaky`. |

- **¿Las líneas se ven dobles?** Baja Depth. La profundidad mide los mismos píxeles en cualquier tamaño de ventana, pero de cerca, en una pantalla grande, hace falta menos.
- **¿Un contorno tenue de más a través de un lente?** Es una imagen fantasma: el lente deja pasar algo del otro color. Elige `leaky` para colores más oscuros y puros. Los lentes de cartón suelen necesitarlo; los de vidrio o acrílico aguantan `clean`, que es más brillante.

## Bueno saber

- Una sesión tiene un solo tema a la vez, así que este reemplaza a otros mods de tema como Skywatch o Vim Look. Desactiva el otro para ver este.
- Todo se mueve con animación CSS y se queda quieto si tu sistema pide menos movimiento.

## Comentarios

¿Encontraste un error o tienes una idea? [Abre un issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
