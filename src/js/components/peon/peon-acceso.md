---
name: peon-acceso
description: Acceso por cédula y clave (mínimo 4), o cambio obligatorio de la clave temporal en el primer ingreso.
---

# `<peon-acceso>`

Acceso por cédula y clave (mínimo 4), o cambio obligatorio de la clave temporal en el primer ingreso.

- **Cuándo usarlo:** Lo monta `<peon-app>` cuando no hay sesión o la clave es temporal.
- **Cuándo no:** No lo uses para cambiar la clave estando dentro: eso va en Ajustes.

## Anatomía

```
<peon-acceso>
  #shadow-root
    <section class="tarjeta">   ← logo, lema y formulario
      <iswc-masked-input>       ← cédula
      <iswc-input type=password>← clave (y confirmación en «cambiar»)
      <iswc-button>             ← Entrar / Guardar clave
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
