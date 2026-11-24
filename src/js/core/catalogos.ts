// @contexto PROMPT-CLAUDE.md §4
/**
 * catalogos.ts — navegación plana y pestañas de cada vista como DATO declarativo (sin router: el shell guarda
 * `activo` y monta el tag). `visible` solo oculta: el backend filtra cada ruta por permiso.
 * App ABIERTA: `visible(null)` decide qué se ve sin sesión (Inicio, Noticias y los atajos Cómo votar y Privacidad);
 * en las vistas públicas, solo las pestañas `publica` se ven sin sesión. La tabla de rutas públicas de la API está en
 * `api-peon/docs/RUTAS-PUBLICAS.md`.
 */
import type { Usuario, Vista } from '../consts/schemas/api.schemas.js';

const p = (u: Usuario | null, permiso: string) => u?.permisos[permiso] === true;
const esAdmin = (u: Usuario | null) => u?.rol === 'ADMIN';
const siempre = () => true;
const conSesion = (u: Usuario | null) => !!u;
const sinSesion = (u: Usuario | null) => !u;

export const VISTAS: Vista[] = [
  {
    id: 'inicio', titulo: 'Inicio', icono: 'mdi:home-outline', tag: 'peon-inicio', visible: siempre,
    pestanas: [{ id: 'campana', titulo: 'Campaña', icono: 'mdi:flag-variant-outline', publica: true }, { id: 'resumen', titulo: 'Mi resumen', icono: 'mdi:view-dashboard-outline' }, { id: 'recientes', titulo: 'Mis registros', icono: 'mdi:history' }],
  },
  {
    id: 'chat', titulo: 'Asistente', icono: 'mdi:message-text-outline', tag: 'peon-chat-vps', visible: (u) => p(u, 'chat_con_vps'),
    pestanas: [{ id: 'chat', titulo: 'Conversación', icono: 'mdi:chat-processing-outline' }],
  },
  {
    id: 'noticias', titulo: 'Noticias', icono: 'mdi:newspaper-variant-outline', tag: 'peon-noticias', visible: siempre,
    pestanas: [{ id: 'noticias', titulo: 'Noticias', icono: 'mdi:newspaper-variant-outline', publica: true }],
  },
  // Páginas de la campaña: cada una es su propia vista del menú (no van dentro de Noticias). Las pinta el mismo
  // <peon-noticias> con `seccion` fija.
  { id: 'candidato', titulo: 'El candidato', icono: 'mdi:account-star-outline', tag: 'peon-noticias', seccion: 'candidato', visible: siempre, pestanas: [{ id: 'candidato', titulo: 'El candidato', icono: 'mdi:account-star-outline', publica: true }] },
  { id: 'votar', titulo: 'Cómo votar', icono: 'mdi:vote-outline', tag: 'peon-noticias', seccion: 'votar', visible: siempre, pestanas: [{ id: 'votar', titulo: 'Cómo votar', icono: 'mdi:vote-outline', publica: true }] },
  { id: 'comparte', titulo: 'Comparte', icono: 'mdi:share-variant-outline', tag: 'peon-noticias', seccion: 'comparte', visible: siempre, pestanas: [{ id: 'comparte', titulo: 'Comparte', icono: 'mdi:share-variant-outline', publica: true }] },
  { id: 'privacidad', titulo: 'Privacidad', icono: 'mdi:shield-lock-outline', tag: 'peon-noticias', seccion: 'privacidad', visible: siempre, pestanas: [{ id: 'privacidad', titulo: 'Privacidad', icono: 'mdi:shield-lock-outline', publica: true }] },
  {
    id: 'registro', titulo: 'Registrar', icono: 'mdi:account-plus-outline', tag: 'peon-registro', visible: (u) => !!u?.escribe,
    pestanas: [{ id: 'persona', titulo: 'Nueva persona', icono: 'mdi:card-account-details-outline' }, { id: 'consulta', titulo: 'Consultar puesto', icono: 'mdi:map-marker-question-outline' }],
  },
  {
    id: 'listado', titulo: 'Registros', icono: 'mdi:format-list-bulleted', tag: 'peon-listado', visible: conSesion,
    pestanas: [{ id: 'todos', titulo: 'Todos', icono: 'mdi:table' }, { id: 'pendientes', titulo: 'Pendientes', icono: 'mdi:timer-sand' }],
  },
  {
    id: 'lider', titulo: 'Panel del líder', icono: 'mdi:account-group-outline', tag: 'peon-panel-lider', visible: (u) => u?.rol === 'ADMIN' || u?.rol === 'LIDER',
    pestanas: [{ id: 'equipo', titulo: 'Equipo', icono: 'mdi:account-multiple-outline' }, { id: 'vivo', titulo: 'En vivo', icono: 'mdi:access-point' }],
  },
  {
    id: 'miembros', titulo: 'Miembros', icono: 'mdi:badge-account-horizontal-outline', tag: 'peon-miembros', visible: (u) => p(u, 'ver_miembros'),
    pestanas: [{ id: 'lista', titulo: 'Lista', icono: 'mdi:account-search-outline' }, { id: 'arbol', titulo: 'Árbol', icono: 'mdi:family-tree' }],
  },
  {
    id: 'perfiles', titulo: 'Perfiles', icono: 'mdi:shield-account-outline', tag: 'peon-perfiles', visible: (u) => esAdmin(u) && (p(u, 'crear_perfiles') || p(u, 'editar_admins') || p(u, 'agregar_admins')),
    pestanas: [{ id: 'perfiles', titulo: 'Perfiles', icono: 'mdi:account-key-outline' }, { id: 'crear', titulo: 'Crear perfil', icono: 'mdi:account-plus' }, { id: 'mensajes', titulo: 'Mensajes', icono: 'mdi:whatsapp' }, { id: 'captchas', titulo: 'Verificaciones', icono: 'mdi:shield-check-outline' }, { id: 'bitacora', titulo: 'Bitácora', icono: 'mdi:clipboard-text-clock-outline' }],
  },
  {
    id: 'ajustes', titulo: 'Ajustes', icono: 'mdi:cog-outline', tag: 'peon-ajustes', visible: conSesion,
    pestanas: [{ id: 'perfil', titulo: 'Mi perfil', icono: 'mdi:account-circle-outline' }, { id: 'clave', titulo: 'Cambiar clave', icono: 'mdi:lock-reset' }, { id: 'sesion', titulo: 'Sesión', icono: 'mdi:monitor-cellphone' }],
  },
  // Pestañas de las fichas (no salen en el menú)
  {
    id: 'ficha', titulo: 'Ficha de la persona', icono: 'mdi:card-account-details-outline', tag: '', visible: () => false,
    pestanas: [{ id: 'datos', titulo: 'Datos', icono: 'mdi:account-details-outline' }, { id: 'votacion', titulo: 'Votación', icono: 'mdi:vote-outline' }, { id: 'bitacora', titulo: 'Bitácora', icono: 'mdi:clipboard-text-clock-outline' }],
  },
  {
    id: 'miembro', titulo: 'Ficha del miembro', icono: 'mdi:badge-account-horizontal-outline', tag: '', visible: () => false,
    pestanas: [{ id: 'datos', titulo: 'Datos', icono: 'mdi:account-details-outline' }, { id: 'votacion', titulo: 'Puesto y ubicación', icono: 'mdi:map-marker-radius-outline' }, { id: 'actividad', titulo: 'Actividad', icono: 'mdi:timeline-clock-outline' }, { id: 'equipo', titulo: 'Equipo', icono: 'mdi:account-group-outline' }],
  },
];

/**
 * Herramientas del chat con el VPS (barra tipo NotebookLM): un toque deja la instrucción lista para enviar.
 * Se muestran en el chat y, para quien tiene el permiso, también en Inicio (para promover su uso).
 */
export const HERRAMIENTAS_CHAT: { id: string; titulo: string; icono: string; texto: string; ayuda: string }[] = [
  { id: 'resumen', titulo: 'Resumen del día', icono: 'mdi:text-box-search-outline', texto: 'Hazme un resumen de los registros de hoy: cuántos, quién registró más y qué puestos se repiten.', ayuda: 'Cifras del día en un párrafo' },
  { id: 'pendientes', titulo: 'Pendientes', icono: 'mdi:timer-sand', texto: '¿Qué registros tienen el puesto pendiente de verificar y por qué? Propón cómo resolverlos.', ayuda: 'Qué falta verificar y cómo' },
  { id: 'escuadra', titulo: 'Informe de escuadra', icono: 'mdi:account-group-outline', texto: 'Prepara un informe por escuadra: miembros, registros de la semana y quién necesita apoyo.', ayuda: 'Avance por equipo' },
  { id: 'ideas', titulo: 'Ideas para registrar', icono: 'mdi:lightbulb-on-outline', texto: 'Dame 5 ideas concretas para registrar más personas esta semana en Armenia, según los barrios con menos registros.', ayuda: 'Barrios y estrategias' },
  { id: 'archivo', titulo: 'Analizar archivo', icono: 'mdi:file-search-outline', texto: 'Analiza el archivo adjunto y dime qué personas o datos útiles contiene para la escuadra.', ayuda: 'Adjunta un Excel, PDF o foto' },
];

/** Secciones de las noticias y páginas de la campaña (`categoria` de la entidad `noticias`). */
export const CATEGORIAS_NOTICIA: Record<string, { titulo: string; icono: string }> = {
  noticia: { titulo: 'Noticia', icono: 'mdi:newspaper-variant-outline' },
  biografia: { titulo: 'Biografía', icono: 'mdi:account-star-outline' },
  trayectoria: { titulo: 'Trayectoria', icono: 'mdi:timeline-text-outline' },
  tutorial: { titulo: 'Cómo votar', icono: 'mdi:vote-outline' },
  privacidad: { titulo: 'Privacidad', icono: 'mdi:shield-lock-outline' },
};

export const vista = (id: string): Vista => VISTAS.find((v) => v.id === id) ?? VISTAS[0]!;

export const ESTADOS: Record<string, { texto: string; color: string; icono: string }> = {
  verificado: { texto: 'Verificado', color: 'success', icono: 'mdi:check-decagram' },
  pendiente: { texto: 'Pendiente', color: 'warning', icono: 'mdi:timer-sand' },
  error: { texto: 'No encontrado', color: 'danger', icono: 'mdi:alert-circle-outline' },
};

export const ROLES: Record<string, string> = { ADMIN: 'Administración', LIDER: 'Líder de escuadra', REGISTRADOR: 'Registrador', LECTURA: 'Solo lectura' };

export const PERMISOS_TEXTO: Record<string, string> = {
  crear_perfiles: 'Crear perfiles',
  agregar_admins: 'Agregar administradores',
  editar_admins: 'Editar perfiles y permisos',
  ver_miembros: 'Ver miembros',
  chat_con_vps: 'Asistente',
  ver_todos_los_registros: 'Ver todos los datos de contacto',
  publicar_noticias: 'Publicar noticias',
};

/** Fecha corta legible (es-CO). */
export function fecha(iso: string | null | undefined, conHora = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', conHora ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

/** Iniciales para el avatar. */
export const iniciales = (nombre: string): string => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join('');

/** Hora relativa corta, como en las redes sociales: «ahora», «hace 5 min», «hace 3 h», «hace 2 d», o la fecha. */
export function haceCuanto(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(t).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
