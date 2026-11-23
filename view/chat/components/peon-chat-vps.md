---
name: peon-chat-vps
description: Vista del chat con el VPS: monta el chat transversal `<peon-chat>`.
---

# `<peon-chat-vps>`

Vista del chat con el VPS: monta el chat transversal `<peon-chat>`.

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Chat con el VPS».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-chat-vps>
  #shadow-root
    <iswc-tab-group url-key="chat">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      chat
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`chat`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-chat-vps></peon-chat-vps>
<script type="module">
  document.querySelector('peon-chat-vps').props = {"pestana": "chat"};
</script>
```
