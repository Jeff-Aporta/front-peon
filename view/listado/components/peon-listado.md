---
name: peon-listado
description: Tabla de registros con búsqueda y filtros (municipio, puesto, estado).
---

# `<peon-listado>`

Tabla de registros con búsqueda y filtros (municipio, puesto, estado).

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Registros».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-listado>
  #shadow-root
    <iswc-tab-group url-key="listado">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      todos · pendientes
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`todos`, `pendientes`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-listado></peon-listado>
<script type="module">
  document.querySelector('peon-listado').props = {"pestana": "todos"};
</script>
```
