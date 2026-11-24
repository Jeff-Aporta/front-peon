---
name: peon-acceso
description: Formulario compacto - cambio obligatorio de la clave temporal (en un diálogo) o acceso por cédula y clave.
---

# `<peon-acceso>`

Formulario compacto: cambio obligatorio de la clave temporal en el primer ingreso (en un diálogo) o acceso por
cédula y clave (mínimo 4).

- **Cuándo usarlo:** Lo monta `<peon-app>` en un diálogo pequeño cuando la clave es temporal (la app es abierta:
  entrar es desde el desplegable `iswc-session-menu` del panel, no hay pantalla de acceso).
- **Cuándo no:** No lo uses para cambiar la clave estando dentro: eso va en Ajustes.

## Anatomía

```
<peon-acceso>
  #shadow-root
    <form class="campos">       ← formulario compacto (sin logo ni pantalla completa)
      <iswc-masked-input>       ← cédula («entrar»)
      <iswc-input type=password>← clave (temporal, nueva y confirmación en «cambiar»)
      <div class="acciones">    ← Salir · Cambiar clave y entrar / Entrar
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `modo` | `"entrar" | "cambiar"` | `"entrar"` | Login o cambio obligatorio de la clave temporal. |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-acceso></peon-acceso>
<script type="module">
  document.querySelector('peon-acceso').props = {"modo": "entrar"};
</script>
```
