// @contexto HANDOFF.md · api-peon/src/rutas/
/**
 * api.ts — cliente de `api-peon` y estado de la sesión (patrón de front-cocontable/core/api.ts).
 *
 *   Base del API: en desarrollo (localhost con puerto) `http://localhost:8098/api`; publicado, `./api/` relativo a la app
 *   (nginx sirve `/peon/` y `/peon/api/`). Se puede forzar con `localStorage['peon:api']`.
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

export function baseApi(): string {
  const forzada = leer('peon:api');
  if (forzada) return forzada.replace(/\/$/, '');
  if (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '8098') return `http://${location.hostname}:8098/api`;
  if (location.hostname.endsWith('github.io')) return API_PUBLICA.replace(/\/$/, '');
  return new URL('api', location.href.replace(/[^/]*$/, '')).href;
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

export async function api<T = unknown>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers['content-type'] = 'application/json';
  if (sesion.token) headers.authorization = `Bearer ${sesion.token}`;
  if (!baseApi()) throw new ErrorApi(0, 'El servidor de la app todavía no está publicado. Vuelve a intentarlo más tarde.');
  let r: Response;
  try {
    r = await fetch(`${baseApi()}/${ruta}`, { method: metodo, headers, body: cuerpo === undefined ? null : JSON.stringify(cuerpo) });
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
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

/** ¿El usuario tiene este interruptor? (el backend manda: esto solo oculta lo que no podría usar). */
export function puede(permiso: string): boolean {
  return sesion.usuario?.permisos[permiso] === true;
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
  if (fuente && tokenFuente === sesion.token) return;
  fuente?.close();
  fuente = null;
  tokenFuente = sesion.token;
  if (!sesion.token || !baseApi()) return;
  fuente = new EventSource(`${baseApi()}/eventos?token=${encodeURIComponent(sesion.token)}`);
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

window.addEventListener('peon:sesion', () => {
  if (sesion.token) return conectar();
  fuente?.close();
  fuente = null;
  tokenFuente = null;
});
