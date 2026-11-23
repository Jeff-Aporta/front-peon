---
name: peon-noticia
description: Lector y editor de una noticia o página de la campaña (Markdown con HTML e iswc-*), con menú contextual «Enviar al VPS para editar».
---

# `<peon-noticia>`

Lector y editor de una noticia o página de la campaña (Markdown con HTML e iswc-*), con menú contextual «Enviar al VPS para editar».

- **Cuándo usarlo:** Embebida (páginas del candidato, tutorial, privacidad) o en el cajón con `abrirNoticia(id)`.
- **Cuándo no:** No para listas: las tarjetas van en `<peon-noticias>`.

## Anatomía

```
<peon-noticia>
  #shadow-root
    <article class="noticia">
      .cabeza          ← sección, estado, título, resumen, fecha
      .cinta           ← bandera verde · blanco · amarillo
      .cuerpo.md       ← Markdown (clic derecho / mantener presionado → <iswc-context-menu>)
      .acciones        ← compartir · pedir al VPS · editar · publicar · archivar (<iswc-confirm-modal>)
    <form class="editor"> ← título, sección, resumen, imagen, cuerpo + vista previa
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `id` | `number` | `0` | Noticia a mostrar. |
| `categoria` | `string` | `""` | Si `id` es 0: la primera publicada de esa sección. |
| `sinTitulo` | `boolean` | `false` | Oculta la cabecera. |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-noticia></peon-noticia>
<script type="module">
  document.querySelector('peon-noticia').props = {"categoria": "tutorial"};
</script>
```
