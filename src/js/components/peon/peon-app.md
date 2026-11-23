---
name: peon-app
description: Shell de Peon en Marcha. Úsalo una sola vez, en index.html; monta la barra y el shell de la vista activa.
---

# `<peon-app>`

Armazón de la app: barra superior (marca y conmutador de tema) y, debajo, el shell de la vista
activa. La app solo conoce el shell de cada vista; las vistas se registran en `kit-tags.ts`.

## Anatomía

```
<peon-app>
  #shadow-root
    <header part="barra">
      <strong class="marca">Peon en Marcha</strong>
      <iswc-theme-toggle scope="root">
    <main part="vista">
      <peon-hola>        ← shell de la vista activa
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `vista` | `string` | `"hola"` | Vista activa; una clave sin shell cae en `hola`. |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-app></peon-app>
<script type="module">
  document.querySelector('peon-app').props = { vista: 'hola' };
</script>
```
