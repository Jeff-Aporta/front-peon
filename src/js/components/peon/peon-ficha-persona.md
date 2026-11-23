---
name: peon-ficha-persona
description: Ficha (diálogo) de una persona por su ref opaco: Datos, Votación y Bitácora.
---

# `<peon-ficha-persona>`

Ficha (diálogo) de una persona por su ref opaco: Datos, Votación y Bitácora.

- **Cuándo usarlo:** Ábrela con `abrirFicha(ref)` (core/ui.ts): hay una sola en el documento.
- **Cuándo no:** No la pidas por cédula: siempre por `ref`.

## Anatomía

```
<peon-ficha-persona>
  #shadow-root
    <iswc-dialog>
      <iswc-tab-group>   ← Datos · Votación (puesto y consulta asistida) · Bitácora
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `ref` | `string` | `""` | Ref opaco de la persona. |
| `abierta` | `boolean` | `false` | Diálogo visible. |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-ficha-persona></peon-ficha-persona>
<script type="module">
  document.querySelector('peon-ficha-persona').props = {"abierta": false};
</script>
```
