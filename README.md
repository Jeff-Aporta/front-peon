# Peon en Marcha

App de web components (vanilla, sin framework) sobre el kit
[iswc-base](https://github.com/Jeff-Aporta/is-webcomponents), creada con `create-iswc-app`.

```bash
deno install
deno task build
deno task serve        # http://127.0.0.1:4200/
```

- Galería de componentes: `/view/demo/`.
- Vista de ejemplo aislada: `/view/hola/`.
- Agentes: [`AGENTS.md`](AGENTS.md). Specs: [`specs/`](specs/README.md).

## Puestos de votación (captura asistida)

Dos páginas estáticas (no entran en el build: se publican tal cual):

| Página | Qué es |
|---|---|
| `/assets/marcador.html` | Donde se copia el código del marcador a los favoritos del navegador. |
| `/captura.html` | La ventana emergente que recibe el resultado de la Registraduría y lo guarda. |

La persona consulta en su propio navegador (ella resuelve lo que la página le pida), pulsa el marcador y la ventanita
lee **lo que ya está en pantalla** y lo manda a la API (`POST /api/puesto/texto` → `POST /api/personas/{ref}/puesto`).
El marcador **no consulta nada por su cuenta**.

**El botón «Actualizar desde la Registraduría»** (pestaña *Votación* de cada ficha) va a la página oficial **en ese
momento** y guarda **solo lo que la página dice**: puesto, dirección, mesa y coordenadas. Si la página no da un
puesto, no se inventa nada y **no se borra** lo que ya había: se avisa y se conserva. Es **uno por registro**, no un
lote.

Detalle técnico (qué habla con qué y lo que costó aprender probando en la página oficial real):
`api-peon/docs/PUESTOS.md` §5.1 y §5.8.

**Para que funcione en producción, la API tiene que estar en una dirección pública con TLS válido** (y en
`src/js/core/config.ts` hay que poner esa URL en `API_PUBLICA`). La ventana es una página suelta: no puede importar el
módulo de la API, así que lee de `localStorage['peon:api-base']` la base que la app está usando. Y desde una página
https (GitHub Pages) el navegador no deja llamar a una dirección privada, así que una API en `http://localhost` o en
una IP de la red interna no sirve para la web publicada.
