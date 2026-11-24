// @contexto HANDOFF.md · api-peon/src/rutas/
/**
 * api.ts — cliente de `api-peon` y estado de la sesión (patrón de front-cocontable/core/api.ts).
 *
 *   Base del API con cambio automático de contexto (local → en línea):
 *     · en localhost: primero la API local `http://localhost:8098/api`; si no responde, la en línea.
 *     · en github.io u otro host: primero la en línea; luego `./api` relativa (nginx del VPS sirve `/peon/api/`).
 *   La en línea es `localStorage['peon:api']` si existe (pruebas) o `API_PUBLICA` (core/config.ts; vacía hasta que la
 *   API tenga dominio con TLS: mientras tanto esa candidata simplemente no está).
 *   Se prueba `OPTIONS {base}/info` (preflight de CORS, sin lógica) a todas a la vez con 1,5 s de límite y se usa la
 *   primera, en orden de preferencia, que responda; la elegida se recuerda en
 *   `sessionStorage['peon:api-elegida']` y se vuelve a elegir si una llamada falla por red.
 *   Token en `localStorage['peon:token']` y cabecera `Authorization: Bearer <token>` en cada llamada.
 *   La app escucha el evento de ventana `peon:sesion` para repintarse cuando cambia la sesión.
 */
import { UsuarioSchema } from '../consts/schemas/api.schemas.js';
import { API_PUBLICA } from './config.js';
import type { Usuario } from '../consts/schemas/api.schemas.js';

const CLAVE_TOKEN = 'peon:token';

function leer(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function escribir(k: string, v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch { /* almacenamiento bloqueado */ }
}

const CLAVE_ELEGIDA = 'peon:api-elegida';
const LIMITE_PRUEBA_MS = 1500;
export const SIN_SERVIDOR = 'No pudimos conectar con el servidor local ni con el en línea. Inténtalo de nuevo en un momento.';

function leerSesion(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}

function escribirSesion(k: string, v: string | null): void {
  try {
    if (v === null) sessionStorage.removeItem(k);
    else sessionStorage.setItem(k, v);
  } catch { /* almacenamiento bloqueado */ }
}

const sinBarra = (u: string): string => u.replace(/\/$/, '');
const esLocalhost = (): boolean => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

/** La API local de desarrollo. */
export function apiLocal(): string {
  return `http://${location.hostname === '[::1]' ? 'localhost' : location.hostname}:8098/api`;
}

/** La API en línea: la forzada para pruebas o la publicada. Vacía si aún no hay ninguna. */
function apiEnLinea(): string {
  return sinBarra(leer('peon:api') || API_PUBLICA || '');
}

/** Servidores a probar, en orden: en localhost primero el local; en cualquier otro host primero el en línea. */
export function candidatas(): string[] {
  const relativa = sinBarra(new URL('api', location.href.replace(/[^/]*$/, '')).href);
  const lista = esLocalhost() ? [apiLocal(), apiEnLinea()] : [apiEnLinea(), relativa];
  return [...new Set(lista.filter(Boolean))];
}

let elegida: string | null = leerSesion(CLAVE_ELEGIDA);
if (elegida && !candidatas().includes(elegida)) elegida = null;
let eligiendo: Promise<string | null> | null = null;

async function responde(base: string): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), LIMITE_PRUEBA_MS);
  try {
    // OPTIONS: el router de DER lo responde con el preflight de CORS sin ejecutar nada (ni base ni lógica): es la
    // petición más barata para saber si el servidor está vivo. Cualquier 2xx cuenta.
    const r = await fetch(`${base}/info`, { method: 'OPTIONS', signal: ctl.signal, cache: 'no-store' });
    return r.status >= 200 && r.status < 300;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Elige el servidor: la primera candidata que responda a `GET /info`. Con `otraVez` descarta la recordada y vuelve a
 * probar todas (tras un fallo de red o desde «Reintentar conexión»). Las llamadas simultáneas comparten la prueba.
 */
export function elegirServidor(otraVez = false): Promise<string | null> {
  if (elegida && !otraVez) return Promise.resolve(elegida);
  eligiendo ??= (async () => {
    const antes = elegida;
    // Todas las candidatas se prueban A LA VEZ (el cambio tarda como mucho el límite, no la suma); gana la primera
    // en el orden de preferencia que respondió.
    const lista = candidatas();
    const vivas = await Promise.all(lista.map((c) => responde(c)));
    const nueva = lista.find((_, i) => vivas[i]) ?? null;
    elegida = nueva;
    escribirSesion(CLAVE_ELEGIDA, nueva);
    if (nueva !== antes) window.dispatchEvent(new CustomEvent('peon:servidor', { detail: servidor() }));
    return nueva;
  })().finally(() => {
    eligiendo = null;
  });
  return eligiendo;
}

/** Base del API en uso (síncrona): la elegida o, mientras no se haya probado, la primera candidata. */
export function baseApi(): string {
  return elegida ?? candidatas()[0] ?? '';
}

/** A qué servidor está conectada la app, para mostrarlo en Ajustes. */
export function servidor(): { base: string | null; tipo: 'local' | 'en-linea' | null; nombre: string } {
  if (!elegida) return { base: null, tipo: null, nombre: 'Sin conexión' };
  const local = esLocalhost() && elegida === apiLocal();
  return { base: elegida, tipo: local ? 'local' : 'en-linea', nombre: local ? 'Local' : 'En línea' };
}

export class ErrorApi extends Error {
  constructor(readonly status: number, mensaje: string) {
    super(mensaje);
  }
}

export const sesion = {
  token: leer(CLAVE_TOKEN),
  usuario: null as Usuario | null,
  get activa(): boolean {
    return !!this.usuario;
  },
};

function avisarSesion(): void {
  window.dispatchEvent(new CustomEvent('peon:sesion'));
}

/**
 * Respaldo de lo PÚBLICO sin servidor: cada respuesta buena de `GET noticias…` / `GET info` se guarda en el navegador;
 * si ni el servidor local ni el en línea responden, se devuelve la última copia (las noticias y páginas siguen
 * visibles). Lo protegido nunca se guarda.
 */
const RESPALDO = 'peon:respaldo:';
const esPublica = (metodo: string, ruta: string): boolean => metodo === 'GET' && /^(noticias|info)(\?|\/|$)/.test(ruta) && !ruta.includes('todas=1');

function guardarRespaldo(ruta: string, datos: unknown): void {
  try {
    localStorage.setItem(RESPALDO + ruta, JSON.stringify(datos));
  } catch { /* lleno o bloqueado: sin respaldo */ }
}

function leerRespaldo<T>(ruta: string): T | undefined {
  const t = leer(RESPALDO + ruta);
  if (!t) return undefined;
  try {
    return JSON.parse(t) as T;
  } catch {
    return undefined;
  }
}

export async function api<T = unknown>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  try {
    const datos = await apiDirecta<T>(metodo, ruta, cuerpo);
    if (esPublica(metodo, ruta)) guardarRespaldo(ruta, datos);
    return datos;
  } catch (e) {
    if (e instanceof ErrorApi && e.status === 0 && esPublica(metodo, ruta)) {
      const copia = leerRespaldo<T>(ruta);
      if (copia !== undefined) return copia;
    }
    throw e;
  }
}

async function apiDirecta<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers['content-type'] = 'application/json';
  if (sesion.token) headers.authorization = `Bearer ${sesion.token}`;
  const pedir = (base: string) => fetch(`${base}/${ruta}`, { method: metodo, headers, body: cuerpo === undefined ? null : JSON.stringify(cuerpo) });
  let base = await elegirServidor();
  if (!base) throw new ErrorApi(0, SIN_SERVIDOR);
  let r: Response;
  try {
    r = await pedir(base);
  } catch {
    // Falló por red: el servidor elegido se cayó. Se vuelve a elegir (local → en línea) y se reintenta una vez.
    base = await elegirServidor(true);
    if (!base) throw new ErrorApi(0, SIN_SERVIDOR);
    try {
      r = await pedir(base);
    } catch {
      throw new ErrorApi(0, SIN_SERVIDOR);
    }
  }
  const texto = await r.text();
  let datos: unknown = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  if (!r.ok) {
    const msg = datos && typeof datos === 'object' && 'error' in datos ? String((datos as { error: unknown }).error) : datos && typeof datos === 'object' && 'message' in datos ? String((datos as { message: unknown }).message) : `Error ${r.status}`;
    if (r.status === 401 && ruta !== 'sesion') cerrarLocal();
    throw new ErrorApi(r.status, msg);
  }
  return datos as T;
}

function fijarUsuario(u: unknown): Usuario | null {
  const p = UsuarioSchema.safeParse(u);
  sesion.usuario = p.success ? p.data : null;
  return sesion.usuario;
}

function cerrarLocal(): void {
  const habia = !!sesion.usuario || !!sesion.token;
  sesion.token = null;
  sesion.usuario = null;
  escribir(CLAVE_TOKEN, null);
  if (habia) avisarSesion();
}

/** Recupera la sesión guardada (al arrancar). */
export async function cargarSesion(): Promise<Usuario | null> {
  if (!sesion.token) return null;
  try {
    const r = await api<{ usuario: unknown }>('GET', 'sesion');
    return fijarUsuario(r.usuario);
  } catch {
    cerrarLocal();
    return null;
  }
}

export async function entrar(cedula: string, clave: string): Promise<Usuario | null> {
  const r = await api<{ token: string; usuario: unknown }>('POST', 'sesion', { cedula, clave });
  sesion.token = r.token;
  escribir(CLAVE_TOKEN, r.token);
  const u = fijarUsuario(r.usuario);
  avisarSesion();
  return u;
}

export async function cambiarClave(actual: string, nueva: string): Promise<void> {
  const r = await api<{ usuario: unknown }>('PUT', 'sesion/clave', { actual, nueva });
  fijarUsuario(r.usuario);
  avisarSesion();
}

export async function salir(): Promise<void> {
  try {
    await api('DELETE', 'sesion');
  } catch { /* la sesión local se cierra igual */ }
  cerrarLocal();
}

/**
 * Usuario con sesión COMPLETA (ya cambió la clave temporal). La app es abierta: con `null` se ve solo lo público,
 * y con la clave temporal también (el backend responde 403 a lo demás hasta que la cambie).
 */
export function usuarioActivo(): Usuario | null {
  return sesion.usuario && !sesion.usuario.claveTemporal ? sesion.usuario : null;
}

/** ¿El usuario tiene este interruptor? (el backend manda: esto solo oculta lo que no podría usar). */
export function puede(permiso: string): boolean {
  return usuarioActivo()?.permisos[permiso] === true;
}

/* ── Tiempo real: UNA conexión SSE compartida (`GET /api/eventos`) para toda la app ── */

let fuente: EventSource | null = null;
let tokenFuente: string | null = null;
const oyentes = new Map<string, Set<(datos: unknown) => void>>();
const enganchados = new WeakMap<EventSource, Set<string>>();

function engancharTipo(tipo: string): void {
  if (!fuente) return;
  const ya = enganchados.get(fuente) ?? new Set<string>();
  if (ya.has(tipo)) return;
  ya.add(tipo);
  enganchados.set(fuente, ya);
  fuente.addEventListener(tipo, ((e: MessageEvent) => {
    let datos: unknown = null;
    try {
      datos = JSON.parse(String(e.data));
    } catch { /* evento ilegible */ }
    for (const fn of oyentes.get(tipo) ?? []) fn(datos);
  }) as EventListener);
}

function conectar(): void {
  if (fuente && tokenFuente === sesion.token && fuente.url.startsWith(baseApi())) return;
  fuente?.close();
  fuente = null;
  tokenFuente = sesion.token;
  if (!sesion.token || !baseApi()) return;
  fuente = new EventSource(`${baseApi()}/eventos?token=${encodeURIComponent(sesion.token)}`);
  // Si el servidor deja de responder, se vuelve a elegir (local → en línea); el evento `peon:servidor` reconecta.
  fuente.addEventListener('error', () => void elegirServidor(true));
  for (const tipo of oyentes.keys()) engancharTipo(tipo);
}

/** Escucha un tipo de evento en vivo (`registro`, `cambio`, `chat`…). Devuelve la función para soltarlo. */
export function escuchar(tipo: string, fn: (datos: unknown) => void): () => void {
  const set = oyentes.get(tipo) ?? new Set();
  set.add(fn);
  oyentes.set(tipo, set);
  conectar();
  engancharTipo(tipo);
  return () => set.delete(fn);
}

// Si cambia el servidor (p. ej. se cayó el local y pasó al en línea), la conexión en vivo se rehace contra el nuevo.
window.addEventListener('peon:servidor', () => conectar());

window.addEventListener('peon:sesion', () => {
  if (sesion.token) return conectar();
  fuente?.close();
  fuente = null;
  tokenFuente = null;
});
