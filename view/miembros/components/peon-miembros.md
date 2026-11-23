---
name: peon-miembros
description: Miembros de la campaña y árbol de quién creó a quién.
---

# `<peon-miembros>`

Miembros de la campaña y árbol de quién creó a quién.

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Miembros».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-miembros>
  #shadow-root
    <iswc-tab-group url-key="miembros">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      lista · arbol
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`lista`, `arbol`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-miembros></peon-miembros>
<script type="module">
  document.querySelector('peon-miembros').props = {"pestana": "lista"};
</script>
```
