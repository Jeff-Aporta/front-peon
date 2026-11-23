---
name: peon-perfiles
description: Administración de perfiles, mensajes de credencial, verificaciones y bitácora.
---

# `<peon-perfiles>`

Administración de perfiles, mensajes de credencial, verificaciones y bitácora.

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Perfiles».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-perfiles>
  #shadow-root
    <iswc-tab-group url-key="perfiles">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      perfiles · crear · mensajes · captchas · bitacora
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`perfiles`, `crear`, `mensajes`, `captchas`, `bitacora`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-perfiles></peon-perfiles>
<script type="module">
  document.querySelector('peon-perfiles').props = {"pestana": "perfiles"};
</script>
```
