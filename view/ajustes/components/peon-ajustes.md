---
name: peon-ajustes
description: Mi perfil, cambio de clave, sesión (servidor conectado y salir).
---

# `<peon-ajustes>`

Mi perfil, cambio de clave, sesión (servidor conectado y salir).

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Ajustes».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-ajustes>
  #shadow-root
    <iswc-tab-group url-key="ajustes">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      perfil · clave · sesion
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`perfil`, `clave`, `sesion`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-ajustes></peon-ajustes>
<script type="module">
  document.querySelector('peon-ajustes').props = {"pestana": "perfil"};
</script>
```
