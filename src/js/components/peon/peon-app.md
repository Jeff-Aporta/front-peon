---
name: peon-app
description: Shell de Peón en Marcha. Úsalo una sola vez, en index.html: panel izquierdo (o barra inferior en el celular) y la vista activa.
---

# `<peon-app>`

Shell de Peón en Marcha. Úsalo una sola vez, en index.html: panel izquierdo (o barra inferior en el celular) y la vista activa.

- **Cuándo usarlo:** Una sola vez, en index.html.
- **Cuándo no:** No lo montes dentro de otra vista.

App **abierta**: sin sesión pinta el shell con lo público (Inicio, Noticias, Cómo votar, Privacidad) y el
desplegable «Entrar» (`iswc-session-menu`); al entrar aparecen las vistas protegidas sin recargar. Una vista
protegida pedida sin sesión despliega «Entrar». La clave temporal se cambia en un diálogo pequeño.

## Anatomía

```
<peon-app>
  #shadow-root
    <div class="marco">                      ← grid: panel · tirador · contenido (sm/xs: contenido · barra)
      <aside class="lateral">                ← md+: marca (colapsa) · nav plana · <peon-campana> · <iswc-session-menu>
      <div class="tirador" role="separator"> ← ancho del panel 13–26 em (se recuerda)
      <main class="trabajo">                 ← título + vista activa (<peon-inicio>, <peon-noticias>…)
      <nav class="barra">                    ← sm/xs: Inicio · Chat/Registros · Registrar/Noticias · Avisos · Menú
                                               (sin sesión: Inicio · Noticias · Cómo votar · Entrar · Menú)
    <iswc-drawer class="cajon">              ← sm/xs: «Menú» con las vistas y el menú de sesión
    <iswc-dialog class="dialogo-clave">      ← solo con clave temporal: <peon-acceso modo="cambiar">
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
