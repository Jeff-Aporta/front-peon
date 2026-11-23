---
name: peon-inicio
description: Portada de la campaña (candidato, accesos, últimas noticias, aviso legal), resumen del usuario y sus últimos registros.
---

# `<peon-inicio>`

Portada de la campaña (candidato, accesos, últimas noticias, aviso legal), resumen del usuario y sus últimos registros.

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Inicio».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-inicio>
  #shadow-root
    <iswc-tab-group url-key="inicio">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      campana · resumen · recientes
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`campana`, `resumen`, `recientes`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-inicio></peon-inicio>
<script type="module">
  document.querySelector('peon-inicio').props = {"pestana": "campana"};
</script>
```
