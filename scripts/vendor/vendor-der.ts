// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * vendor-der.ts — copia el plugin de WebSocket de DER al front (para que el navegador lo pueda usar).
 *
 * DER se consume desde el CDN por Deno, pero el navegador NO puede importar una URL https: el bundle del
 * front tiene que llevar el codigo dentro. Por eso se vendoriza (el mismo truco que el kit iswc-base).
 *
 * - La copia sale del SHA pineado de DER (el de deno.json), nunca de una rama.
 * - Los import internos que apuntan al prefijo de DER se reescriben a rutas relativas.
 * - El cliente valida con el MISMO Zod que el servidor: el contrato sigue siendo uno solo.
 *
 * deno task vendor:DER
 */
import { join } from "node:path";

const RAIZ = join(import.meta.dirname!, "..", "..");
const DESTINO = join(RAIZ, "src", "vendor", "der", "websocket");
const SHA = "5f73804f37ff92a8b3610df8c8326c7d78dc864d";
const BASE = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/DER@${SHA}/src/03-plugins/websocket`;
const PREFIJO = "@Jeff-Aporta/DER/src/03-plugins/websocket/";
const ARCHIVOS = ["protocolo.ts", "schemas.ts", "client.ts"];

await Deno.mkdir(DESTINO, { recursive: true });
for (const archivo of ARCHIVOS) {
  const url = `${BASE}/${archivo}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo bajar ${url}: ${respuesta.status}`);
  let texto = await respuesta.text();
  texto = texto.split(PREFIJO).join("./");
  const cabecera = [
    "// @contexto INDICE.md · skills/iswc-foundation/SKILL.md",
    "/**",
    ` * ${archivo} — COPIA vendorizada del plugin de WebSocket de DER (${SHA}).`,
    " * No se edita aqui: se cambia en DER y se vuelve a copiar con deno task vendor:DER.",
    " */",
    "",
  ].join("\n");
  await Deno.writeTextFile(join(DESTINO, archivo), cabecera + texto);
  console.log(`[vendor:DER] ${archivo}`);
}
console.log(`[vendor:DER] listo en ${DESTINO}`);