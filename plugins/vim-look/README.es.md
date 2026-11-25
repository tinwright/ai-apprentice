# Vim Look

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md)

Un aspecto de Vim para Claude Code: grises oscuros de terminal, letra monoespaciada en todas partes, tildes en el margen, una línea de estado NORMAL, INSERT y COMMAND encima del cuadro de mensaje, y los comandos `:w`, `:q` y `:wq`, que responden como lo haría Vim.

## Instalación

En Claude Code, añade una vez el marketplace de tinwright y después instala el plugin:

```text
/plugin marketplace add tinwright/ai-apprentice
/plugin install vim-look@tinwright
```

## Cómo usarlo

No hay nada que activar. El tema es siempre oscuro, sea cual sea el modo de la aplicación.

- **La línea de estado** está encima del cuadro de mensaje. Muestra `NORMAL` cuando Claude te espera, `INSERT` cuando Claude escribe y `COMMAND` con el nombre de la herramienta (`:!Bash`) cuando se ejecuta una herramienta. Al lado aparecen la carpeta y la rama de git en las que estás, y un contador como `3L, 12C`: 3 mensajes y 12 llamadas a herramientas en esta sesión.
- **`:w`, `:q`, `:wq` y `:x`**, escritos solos como mensaje, reciben la respuesta que daría Vim y nunca llegan a Claude. Prueba `:q` y después `:q!`. `/w`, `/q` y `/wq` hacen lo mismo desde el menú de comandos.

Los colores, la letra y las tildes se dibujan en las aplicaciones de escritorio y móvil. En un terminal tienes la línea de estado y los comandos.

Una sesión tiene un solo tema a la vez, así que Vim Look y otro mod de tema, como Skywatch, se reemplazan mutuamente los colores y el fondo. Desactiva el otro para ver este completo.

## Comentarios

¿Has encontrado un error o tienes una idea? [Abre una incidencia](https://github.com/tinwright/ai-apprentice/issues/new/choose).
