---
name: peon-chat
description: Chat con el VPS reutilizable, al estilo de WhatsApp: clip, campo con cámara, micrófono/enviar, soltar archivos; cita de noticia/fragmento y notas de voz transcritas.
---

# `<peon-chat>`

Chat con el VPS reutilizable, al estilo de WhatsApp: clip, campo con cámara, micrófono/enviar, soltar archivos; cita de noticia/fragmento y notas de voz transcritas.

- **Cuándo usarlo:** Donde haga falta hablar con el VPS; desde otras pantallas, con `abrirChat(contexto)` (cajón).
- **El puesto de la Registraduría:** la herramienta «Puesto» (en la fila de herramientas) deja pegar el resultado
  oficial, leerlo de una imagen (OCR en el navegador) o dictarlo; lo que se lee se pone en el campo para que el
  asistente lo procese. Es la única vía de captura asistida de la app (la pantalla de registro ya no la tiene).
- **Cuándo no:** Sin el permiso `chat_con_vps` no se muestra.

## Anatomía

```
<peon-chat>
  #shadow-root
    <div class="chat">
      .herramientas        ← instrucciones de un toque (estilo NotebookLM)
      .lineas (role=log)   ← burbujas en Markdown (md-lite + md-hydrate del kit), audios, adjuntos
      .escribir
        .puesto-panel      ← captura del puesto de la Registraduría (pegar, foto o dictado)
        .cita              ← fragmento citado (props.contexto)
        .estado-voz        ← reloj + transcripción en vivo
        .chips             ← adjuntos pendientes
        .fila-escribir     ← clip (archivo) · <iswc-textarea> con cámara dentro · botón redondo: micrófono/enviar
      .soltar              ← «Suelta para adjuntar» al arrastrar archivos
      <iswc-media-recorder source="mic"> ← graba sin verse
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `contexto` | `{ tipo, id, titulo, fragmento, pantalla } | null` | `null` | Lo que se cita (noticia y fragmento, o pantalla). |
| `compacto` | `boolean` | `false` | Versión de cajón. |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-chat></peon-chat>
<script type="module">
  document.querySelector('peon-chat').props = {"compacto": false};
</script>
```
