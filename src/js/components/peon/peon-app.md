---
name: peon-app
description: Shell de Peón en Marcha. Úsalo una sola vez, en index.html: panel izquierdo (o barra inferior en el celular) y la vista activa.
---

# `<peon-app>`

Shell de Peón en Marcha. Úsalo una sola vez, en index.html: panel izquierdo (o barra inferior en el celular) y la vista activa.

- **Cuándo usarlo:** Una sola vez, en index.html.
- **Cuándo no:** No lo montes dentro de otra vista.

## Anatomía

```
<peon-app>
  #shadow-root
    <div class="marco">                      ← grid: panel · tirador · contenido (sm/xs: contenido · barra)
      <aside class="lateral">                ← md+: marca (colapsa) · nav plana · <peon-campana> · usuario y salir
      <div class="tirador" role="separator"> ← ancho del panel 13–26 em (se recuerda)
      <main class="trabajo">                 ← título + vista activa (<peon-inicio>, <peon-noticias>…)
      <nav class="barra">                    ← sm/xs: Inicio · Chat/Registros · Registrar/Noticias · Avisos · Menú
    <iswc-drawer class="cajon">              ← sm/xs: «Menú» con todas las vistas, el usuario y salir
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `activo` | `string` | `"inicio"` | Vista activa (se recuerda en `localStorage['peon:vista']`). |
| `colapsado` | `boolean` | `false` | Panel solo con íconos. |
| `cajon` | `boolean` | `false` | Cajón del menú abierto (sm/xs). |

## Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `peon:ir (ventana)` | `{ vista, pestana? }` | Otra vista pide cambiar de vista. |
| `peon:datos (ventana)` | `{ entidad, accion }` | Lo emite: un cambio en vivo por entidad (SSE `cambio`). |

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-app></peon-app>
<script type="module">
  document.querySelector('peon-app').props = {"activo": "inicio", "colapsado": false};
</script>
```
