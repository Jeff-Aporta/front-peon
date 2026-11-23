// @contexto HANDOFF.md §2b punto 6 (notificaciones como en Facebook)
/**
 * avisos-navegador.ts — lo que hace sentir la campana como una red social FUERA del panel:
 *   · título de la pestaña con el contador: «(3) Peón en Marcha»;
 *   · notificación del sistema (Notification API) cuando llega algo nuevo y la app está en segundo plano;
 *   · permiso pedido en el momento oportuno: solo tras un toque del usuario (botón «Activar» en la campana).
 * El push con la app cerrada (Web Push/VAPID, y FCM en Android con Capacitor) lo deja listo el plugin de DER
 * (`POST /api/notificaciones/suscribir`); se activa cuando haya claves VAPID y service worker (HANDOFF).
 */
import type { Notificacion } from '../consts/schemas/api.schemas.js';

const TITULO = document.title.replace(/^\(\d+\+?\)\s*/, '') || 'Peón en Marcha';
let vistos: Set<string> | null = null;

/** ¿Este navegador puede mostrar notificaciones del sistema? */
export const hayNotificaciones = (): boolean => typeof Notification !== 'undefined';

/** Estado del permiso: `default` (aún no se pidió), `granted`, `denied`, o `no` si el navegador no lo trae. */
export const permisoAvisos = (): NotificationPermission | 'no' => (hayNotificaciones() ? Notification.permission : 'no');

/** Pide el permiso (llamar SOLO desde un toque del usuario). */
export async function pedirPermisoAvisos(): Promise<NotificationPermission | 'no'> {
  if (!hayNotificaciones()) return 'no';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Contador en el título de la pestaña. */
export function tituloConContador(n: number): void {
  document.title = n ? `(${n > 99 ? '99+' : n}) ${TITULO}` : TITULO;
}

/**
 * Recibe la bandeja recién cargada: la primera vez solo memoriza lo que hay; después, por cada no leída nueva y con la
 * pestaña oculta (o sin foco), lanza una notificación del sistema. `alTocar` sigue su enlace al hacer clic.
 */
export function avisarNuevas(items: Notificacion[], alTocar: (n: Notificacion) => void): void {
  const nuevas = vistos ? items.filter((n) => !n.leida && !vistos!.has(n.id)) : [];
  vistos = new Set(items.map((n) => n.id));
  if (!nuevas.length || permisoAvisos() !== 'granted' || (document.visibilityState === 'visible' && document.hasFocus())) return;
  for (const n of nuevas.slice(0, 3)) {
    try {
      const aviso = new Notification(n.actor ? `${n.actor}` : TITULO, { body: n.actor ? n.titulo : n.texto ?? n.titulo, icon: './assets/logo-192.png', badge: './assets/logo-96.png', tag: n.id, lang: 'es-CO' });
      aviso.onclick = () => {
        window.focus();
        alTocar(n);
        aviso.close();
      };
    } catch { /* algunos navegadores móviles solo permiten avisos desde un service worker */ }
  }
}

/** Clave pública VAPID (base64url) → bytes para `pushManager.subscribe`. */
function bytesDe(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64u.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Push con la app CERRADA (Web Push): si el permiso está dado y la API tiene VAPID, registra `sw.js` y guarda la
 * suscripción de este navegador (`POST notificaciones/suscribir`). Silencioso: si algo falta, no hace nada.
 * `pedir(metodo, ruta, cuerpo)` es el cliente de la API (se inyecta para no acoplar este módulo a la sesión).
 */
export async function suscribirPush(pedir: <T>(metodo: string, ruta: string, cuerpo?: unknown) => Promise<T>): Promise<boolean> {
  if (permisoAvisos() !== 'granted' || !('serviceWorker' in navigator) || typeof PushManager === 'undefined') return false;
  try {
    const info = await pedir<{ activo: boolean; vapidPublica: string | null }>('GET', 'notificaciones/push');
    if (!info.activo || !info.vapidPublica) return false;
    const reg = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDe(info.vapidPublica) as BufferSource }));
    const j = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
    if (!j.endpoint) return false;
    await pedir('POST', 'notificaciones/suscribir', { canal: 'webpush', endpoint: j.endpoint, claves: j.keys ?? null });
    return true;
  } catch {
    return false;
  }
}

/** Lo que pide el service worker al tocar una notificación con la app abierta (o `?ir=` si la abrió). */
export function escucharIrDesdePush(seguir: (enlace: string) => void): void {
  navigator.serviceWorker?.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as { tipo?: string; enlace?: string } | null;
    if (d?.tipo === 'peon:ir' && d.enlace) seguir(d.enlace);
  });
  const ir = new URLSearchParams(location.search).get('ir');
  if (ir) {
    history.replaceState(null, '', location.pathname);
    seguir(ir);
  }
}
