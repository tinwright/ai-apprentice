# Pixel Buddy

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md)

Un compañero de píxeles sobre tu cuadro de texto que Claude diseña a partir de tu descripción o de una imagen, y que luego se anima mientras piensa, escribe, te pide aprobación y duerme por la noche.

## Instalación

En Claude Code, agrega una vez el marketplace de tinwright y luego instala el plugin:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install pixel-buddy@tinwright
```

## Cómo usarlo

Tu compañero aparece solo sobre el cuadro de texto en la aplicación de escritorio, y como un pequeño retrato fijo con una leyenda en la terminal. Al principio es Clawd, el compañero incluido. Si también tienes instalado Clawd Buddy, solo se muestra Pixel Buddy, así que nunca verás dos compañeros.

**Crea el tuyo**: escribe `/buddy-make` y descríbelo, por ejemplo `/buddy-make una rana verde con sueño y una coronita`, o pega una imagen y escribe `/buddy-make como este`. Claude diseña un pequeño personaje de píxeles, el mod comprueba que sirva (tamaño, colores que se vean en temas claros y oscuros, una cara donde dibujar los ojos) y el personaje ocupa su lugar sobre el cuadro de texto, pasando una vez por todos sus estados de ánimo. Si `/buddy-make` no aparece en la lista, escribe `/pixel-buddy:buddy-make`.

**Cámbialo**: solo pídelo, por ejemplo «hazle las orejas más grandes», «hazlo morado» o «haz que baile». Claude actualiza el mismo compañero. Un bailarín se balancea y sube los brazos por turnos cuando no pasa nada más.

**Qué hace**: se vea como se vea, se comporta como Clawd Buddy. Una burbuja de pensamiento mientras Claude piensa; un tecladito mientras ejecuta comandos; una libreta mientras edita archivos; una lupa mientras busca; una copia a mitad de tamaño a su lado por cada agente auxiliar. Ojos muy abiertos y un «!» cuando falla un comando, un «ta-da» cuando pasan las pruebas, un estiramiento después de una tarea larga, un pulgar arriba después de un `git push`. Te saluda cuando Claude necesita tu aprobación y golpea el suelo con el pie si una pregunta lleva un minuto esperando. Café de 8:00 a 10:30, un sándwich de 12:00 a 13:00, dormido de 22:00 a 7:00 y lentes de sol los viernes por la tarde.

**Comandos**:

- `/buddy-make <descripción>`: diseñar un compañero nuevo.
- `/buddy-demo`: ver todos sus estados de ánimo, tres segundos cada uno.
- `/buddy-use`: listar tus compañeros; `/buddy-use <nombre>` cambia a uno. Clawd siempre está.
- `/buddy-forget <nombre>`: borrar un compañero. Se conservan los 12 más recientes.
- `/buddy-dance`: tu compañero baila cuando no pasa nada más; otra vez para que pare (o `/buddy-dance on` / `off`).
- `/buddy-flarhgunnstow`: 30 segundos de baile desatado (si tiene sombrero, también se bambolea).
- `/buddy-jump` y `/buddy-coffee`: un salto y una pausa para el café de 30 segundos.

Tus compañeros se conservan entre sesiones.

## Comentarios

¿Encontraste un error o tienes una idea? [Abre un issue](https://github.com/tinwright/ai-apprentice/issues/new/choose).
