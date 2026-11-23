---
name: peon-noticias
description: Noticias diarias y páginas de la campaña: el candidato, cómo votar, publicidad descargable y privacidad.
---

# `<peon-noticias>`

Noticias diarias y páginas de la campaña: el candidato, cómo votar, publicidad descargable y privacidad.

- **Cuándo usarlo:** Lo monta `<peon-app>` al elegir «Noticias».
- **Cuándo no:** No la montes dentro de otra vista: se cambia con `ir(vista, pestana)`.

## Anatomía

```
<peon-noticias>
  #shadow-root
    <iswc-tab-group url-key="noticias">   ← pestañas del catálogo (core/catalogos.ts), paneles perezosos
      noticias · candidato · votar · publicidad · privacidad
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `pestana` | `string` | `""` | Pestaña activa; vacío = la primera (`noticias`, `candidato`, `votar`, `publicidad`, `privacidad`). |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<peon-noticias></peon-noticias>
<script type="module">
  document.querySelector('peon-noticias').props = {"pestana": "noticias"};
</script>
```
