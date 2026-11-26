// @contexto HANDOFF.md · api-peon/src/ws.ts · DER/src/03-plugins/websocket/
/**
 * ws.ts — el canal en vivo de la app: un WebSocket con el servidor, con el MISMO contrato que el servidor
 * (el plugin de DER: `protocolo.ts` + `schemas.ts` con Zod).
 *
 * Por el socket solo pasan avisos (cambios, notificaciones, el puesto que se acaba de encontrar) y consultas de
 * SOLO LECTURA. Nada que mute datos: eso va por HTTP, con su token y su proteccion.
 *
 * El socket se autentica con el mismo token de sesion que la API (JWT HS256). Si el servidor no acepta el
 * upgrade, la app sigue con el SSE (`api.ts`), que hace lo mismo: el tiempo real nunca se queda cojo.
 */
// La copia vendorizada del plugin de DER (el navegador no puede importar una URL https; la copia sale del
// SHA pineado de DER con `deno task vendor:DER`, asi que el contrato es el MISMO que usa el servidor).
import { crearClienteWebSocket } from "../../vendor/der/websocket/client.js";
import { elegirServidor, sesion } from "./api.js";
import type { ClienteWebSocket } from "../../vendor/der/websocket/client.js";

let cliente: ClienteWebSocket | null = null;
let tokenCliente: string | null = null;
const oyentes = new Map<string, Set<(datos: Record<string, unknown>) => void>>();

/** Convierte la base del API (`https://x/api`) en la URL del socket (`wss://x/api/ws`). */
function urlSocket(base: string): string {
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const ruta = url.pathname.replace(/\/$/, "");
  url.pathname = `${ruta}/ws`;
  url.search = "";
  return url.toString();
}

/** Conecta el socket (una sola vez; si cambia el servidor, se rehace). */
function conectar(): void {
  const token = sesion.token;
  if (!token) {
    cliente?.cerrar();
    cliente = null;
    tokenCliente = null;
    return;
  }
  if (cliente && tokenCliente === token) return;
  cliente?.cerrar();
  cliente = null;
  tokenCliente = token;
  void (async () => {
    const base = await elegirServidor();
    if (!base || token !== sesion.token) return;
    const c = crearClienteWebSocket({
      url: urlSocket(base),
      token,
      alCerrar: () => {
        // Si se cae, el SSE (api.ts) sigue avisando de los cambios: el tiempo real no se queda mudo.
      },
    });
    cliente = c;
    for (const [tipo, set] of oyentes) {
      for (const fn of set) c.alRecibir(tipo, fn);
    }
  })();
}

/**
 * Escucha un tipo de aviso en vivo («cambio», «notificacion», «puesto»…). Devuelve la funcion para soltarlo.
 * La conexion se hace sola la primera vez.
 */
export function escucharEnVivo(
  tipo: string,
  fn: (datos: Record<string, unknown>) => void,
): () => void {
  const set = oyentes.get(tipo) ?? new Set();
  set.add(fn);
  oyentes.set(tipo, set);
  conectar();
  cliente?.alRecibir(tipo, fn);
  return () => {
    set.delete(fn);
    cliente?.alRecibir(tipo, fn);
  };
}

/** Pide una consulta de SOLO LECTURA por el socket (la responde el servidor por el mismo socket). */
export function consultarEnVivo(datos: Record<string, unknown>): void {
  conectar();
  cliente?.pedir({ ...datos, id: `q${Date.now().toString(36)}`, ts: new Date().toISOString() });
}

/** Si el socket esta conectado. */
export function conectadoEnVivo(): boolean {
  return cliente?.conectado === true;
}

// Si cambia la sesion (o el servidor), el socket se rehace.
window.addEventListener("peon:sesion", () => conectar());
window.addEventListener("peon:servidor", () => {
  cliente?.cerrar();
  cliente = null;
  tokenCliente = null;
  conectar();
});