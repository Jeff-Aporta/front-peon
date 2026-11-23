---
name: peon-registro
description: Registro de una persona con cédula, datos básicos y puesto de votación (consulta asistida).
---

# `<peon-registro>`

Registro de una persona con cédula, datos básicos y puesto de votación (consulta asistida).

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Registrar».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-registro>
  #shadow-root
    <iswc-tab-group url-key="registro">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      persona · consulta
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`persona`, `consulta`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-registro></peon-registro>
<script type="module">
  document.querySelector('peon-registro').props = {"pestana": "persona"};
</script>
```
