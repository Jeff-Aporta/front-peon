---
name: peon-campana
description: Notificaciones al estilo de Facebook: contador rojo, lista con avatar y hora relativa, Todas/No leídas, título con (n) y aviso del navegador.
---

# `<peon-campana>`

Notificaciones al estilo de Facebook: contador rojo, lista con avatar y hora relativa, Todas/No leídas, título con (n) y aviso del navegador.

- **Cuándo usarlo:** En el panel (md+) y en la barra inferior móvil; la monta `<peon-app>`.
- **Cuándo no:** Una por disposición: no la repitas dentro de las vistas.

## Anatomía

```
<peon-campana>
  #shadow-root
    <button class="campana">     ← ícono + insignia roja (+ rótulo)
    <iswc-drawer>                ← hoja inferior (barra) o panel izquierdo (md+)
      .lista
        .cabeza · .filtros (Todas / No leídas) · .activar (permiso del navegador)
        ul.items > .item         ← avatar + insignia del tipo · frase · hora relativa · punto de no leída
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `compacta` | `boolean` | `false` | Solo el ícono (panel colapsado). |
| `barra` | `boolean` | `false` | Versión de la barra inferior (rótulo corto, hoja inferior). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-campana></peon-campana>
<script type="module">
  document.querySelector('peon-campana').props = {"compacta": false, "barra": false};
</script>
```
