# Tiempo real (WebSocket) — la app de Peón en Marcha

> Cómo la app se entera de las cosas sin preguntar: el socket del servidor, el contrato de DER y el SSE de
> respaldo.

## 1. Qué hay

| Pieza | Dónde | Qué hace |
|---|---|---|
| El plugin (contrato + servidor + cliente) | DER: `src/03-plugins/websocket/` | El WebSocket con el MISMO esquema en servidor y cliente. |
| La skill | DER: `skills/websocket.md` | La guía del plugin (seguridad, contrato, Deno Deploy). |
| El cliente de la app | `src/js/core/ws.ts` | Conecta, reconecta y entrega los avisos. |
| El respaldo | `src/js/core/api.ts` | El SSE (`GET /api/eventos`), de antes. Sigue vivo. |
| El contrato de la app | `src/js/consts/schemas/api.schemas.ts` | `PuestoEncontradoSchema` (el aviso del puesto). |
| Quien lo consume | `view/registro/components/peon-registro.ts` | La pantalla de registro: el puesto se actualiza solo. |

## 2. Cómo se usa en una vista

```ts
import { escucharEnVivo } from "../../../src/js/core/ws.js";

// en onConnected (y se suelta en onDisconnected)
this.#soltar = escucharEnVivo("puesto", (datos) => {
  const aviso = PuestoEncontradoSchema.safeParse(datos);
  if (!aviso.success) return;
  this.#pintar(aviso.data);
});
```

Y para una consulta de solo lectura:

```ts
import { consultarEnVivo } from "../../../src/js/core/ws.js";
consultarEnVivo({ tipo: "consultar", ref: "nix123" });   // la responde el servidor por el mismo socket
```

## 3. La regla que no se rompe

Por el socket solo pasan **avisos** y **consultas de solo lectura**. Lo que muta datos (registrar, cambiar el
puesto, escribir en el chat, tocar permisos) va por HTTP, con su token, su permiso y su bitácora.

El front nunca manda una cédula ni un dato sensible por el socket, y el servidor nunca acepta una mutación por
ahí. El token viaja en la query (el navegador no puede mandar cabeceras en un WebSocket) y es el mismo JWT de la
sesión.

## 4. La búsqueda del puesto, en vivo

1. La persona escribe la cédula y sale del campo (`focusout`) o la confirma (`iswc-change`).
2. El front pide la consulta por HTTP y **enseguida** pinta «Buscando automáticamente el puesto de votación en la
   Registraduría…».
3. Cuando el servidor termina (o el lote automático lo encuentra), empuja el aviso `puesto` por el socket.
4. La pantalla se actualiza sola: el puesto oficial **reemplaza** lo que estuviera escrito; si lo escrito no
   coincide con el oficial, aparece el aviso con la ubicación encontrada y el botón «Reemplazar».

El HTTP y el socket usan la misma función (`#aplica`), así que el resultado se ve igual llegue como llegue.

## 5. Si el socket no levanta

Los proxies que no aceptan el upgrade (y los navegadores con la red cortada) dejan el SSE como respaldo: los dos
escuchan el mismo bus de eventos del servidor, así que **el tiempo real nunca se queda mudo**.