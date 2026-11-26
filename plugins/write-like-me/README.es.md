# Write Like Me

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md)

Enséñale a Claude a escribir como tú: indícale tu blog, tus notas, tus documentos y tus conversaciones, y crea una habilidad con tu propia voz, además de una versión corta para otras herramientas de IA.

## Instalación

En Claude Code, añade una vez el marketplace de tinwright y después instala el plugin:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install write-like-me@tinwright
```

## Cómo usarlo

Escribe `/write-like-me` seguido de dónde escribes, por ejemplo
`/write-like-me mi blog en example.com y mis notas en ~/Notes`. Si `/write-like-me` no aparece en
la lista, escribe `/write-like-me:write-like-me`.

Claude lee cada fuente en paralelo, y siempre también tus sesiones anteriores de Claude Code: cada
«hazlo más corto» que hayas escrito ahí es la mejor pista de todas. Deja de lado los textos que
parecen retocados por una IA (la herramienta `check_tells` cuenta rayas, flechas y frases hechas)
y luego escribe:

- una habilidad `<tú>-voice` en `~/.claude/skills/`, con las reglas que muestra tu escritura para
  mensajes, documentos de trabajo y textos más largos;
- tus propias frases, como ejemplos de referencia;
- una versión de 400 palabras para pegar en las instrucciones personalizadas de cualquier otra
  herramienta de IA.

Para demostrarlo, reescribe un texto real tuyo y te muestra las dos versiones. Después te ofrece
cargar la habilidad cada vez que Claude redacte algo para ti.

Evita las carpetas que parecen privadas y nunca cita nada personal. Si encuentra contraseñas o
claves en tus notas, te dice dónde están, sin abrirlas.

## Comentarios

¿Has encontrado un error o tienes una idea? [Abre una incidencia](https://github.com/tinwright/ai-apprentice/issues/new/choose).
