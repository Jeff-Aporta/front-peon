---
name: peon-panel-lider
description: Estado del equipo y registros en vivo, sin recargar.
---

# `<peon-panel-lider>`

Estado del equipo y registros en vivo, sin recargar.

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Panel del líder».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-panel-lider>
  #shadow-root
    <iswc-tab-group url-key="lider">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      equipo · vivo
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`equipo`, `vivo`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-panel-lider></peon-panel-lider>
<script type="module">
  document.querySelector('peon-panel-lider').props = {"pestana": "equipo"};
</script>
```
