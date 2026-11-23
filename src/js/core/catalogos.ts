// @contexto PROMPT-CLAUDE.md §4
/**
 * catalogos.ts — navegación plana y pestañas de cada vista como DATO declarativo (sin router: el shell guarda
 * `activo` y monta el tag). `visible` solo oculta: el backend filtra cada ruta por permiso.
 */
import type { Usuario, Vista } from '../consts/schemas/api.schemas.js';

const p = (u: Usuario, permiso: string) => u.permisos[permiso] === true;
const esAdmin = (u: Usuario) => u.rol === 'ADMIN';

export const VISTAS: Vista[] = [
  {
    id: 'inicio', titulo: 'Inicio', icono: 'mdi:home-outline', tag: 'peon-inicio', visible: () => true,
    pestanas: [{ id: 'resumen', titulo: 'Resumen', icono: 'mdi:view-dashboard-outline' }, { id: 'recientes', titulo: 'Mis registros', icono: 'mdi:history' }],
  },
  {
    id: 'registro', titulo: 'Registrar', icono: 'mdi:account-plus-outline', tag: 'peon-registro', visible: (u) => u.escribe,
    pestanas: [{ id: 'persona', titulo: 'Nueva persona', icono: 'mdi:card-account-details-outline' }, { id: 'consulta', titulo: 'Consultar puesto', icono: 'mdi:map-marker-question-outline' }],
  },
  {
    id: 'listado', titulo: 'Registros', icono: 'mdi:format-list-bulleted', tag: 'peon-listado', visible: () => true,
    pestanas: [{ id: 'todos', titulo: 'Todos', icono: 'mdi:table' }, { id: 'pendientes', titulo: 'Pendientes', icono: 'mdi:timer-sand' }],
  },
  {
    id: 'lider', titulo: 'Panel del líder', icono: 'mdi:account-group-outline', tag: 'peon-panel-lider', visible: (u) => u.rol === 'ADMIN' || u.rol === 'LIDER',
    pestanas: [{ id: 'equipo', titulo: 'Equipo', icono: 'mdi:account-multiple-outline' }, { id: 'vivo', titulo: 'En vivo', icono: 'mdi:access-point' }],
  },
  {
    id: 'miembros', titulo: 'Miembros', icono: 'mdi:badge-account-horizontal-outline', tag: 'peon-miembros', visible: (u) => p(u, 'ver_miembros'),
    pestanas: [{ id: 'lista', titulo: 'Lista', icono: 'mdi:account-search-outline' }],
  },
  {
    id: 'perfiles', titulo: 'Perfiles', icono: 'mdi:shield-account-outline', tag: 'peon-perfiles', visible: (u) => esAdmin(u) && (p(u, 'crear_perfiles') || p(u, 'editar_admins') || p(u, 'agregar_admins')),
    pestanas: [{ id: 'perfiles', titulo: 'Perfiles', icono: 'mdi:account-key-outline' }, { id: 'crear', titulo: 'Crear perfil', icono: 'mdi:account-plus' }, { id: 'mensajes', titulo: 'Mensajes', icono: 'mdi:whatsapp' }, { id: 'captchas', titulo: 'Verificaciones', icono: 'mdi:shield-check-outline' }, { id: 'bitacora', titulo: 'Bitácora', icono: 'mdi:clipboard-text-clock-outline' }],
  },
  {
    id: 'chat', titulo: 'Chat con el VPS', icono: 'mdi:robot-outline', tag: 'peon-chat-vps', visible: (u) => p(u, 'chat_con_vps'),
    pestanas: [{ id: 'chat', titulo: 'Conversación', icono: 'mdi:chat-processing-outline' }],
  },
  {
    id: 'ajustes', titulo: 'Ajustes', icono: 'mdi:cog-outline', tag: 'peon-ajustes', visible: () => true,
    pestanas: [{ id: 'perfil', titulo: 'Mi perfil', icono: 'mdi:account-circle-outline' }, { id: 'clave', titulo: 'Cambiar clave', icono: 'mdi:lock-reset' }, { id: 'sesion', titulo: 'Sesión y apariencia', icono: 'mdi:monitor-cellphone' }],
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
  chat_con_vps: 'Chat con el VPS',
  ver_todos_los_registros: 'Ver todos los datos de contacto',
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
