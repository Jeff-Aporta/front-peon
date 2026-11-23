// @contexto api-peon/src/rutas/sesion.ts
/** api.schemas.ts — lo que llega del API se parsea aquí (Zod); los tipos salen de `z.infer<>`. */
import { z } from '../../base/zod.js';

export const UsuarioSchema = z.object({
  cedula: z.string(),
  ref: z.string(),
  nombre: z.string(),
  whatsapp: z.string(),
  rol: z.enum(['ADMIN', 'LIDER', 'REGISTRADOR', 'LECTURA']),
  rolNombre: z.string(),
  lider: z.string().nullable(),
  claveTemporal: z.boolean(),
  permisos: z.record(z.string(), z.boolean()),
  alcance: z.string(),
  escribe: z.boolean(),
});
export type Usuario = z.infer<typeof UsuarioSchema>;

/** Entrada del menú lateral (catálogo declarativo en `core/catalogos.ts`). */
export type Pestana = { id: string; titulo: string; icono: string };
export type Vista = { id: string; titulo: string; icono: string; tag: string; pestanas: Pestana[]; visible: (u: Usuario) => boolean };

export type Puesto = { codigo: string; nombre: string; municipio: string; departamento: string | null; direccion: string | null; lat: number | null; lon: number | null; fuente: string };
export type ResultadoPuesto = { estado: 'verificado' | 'pendiente' | 'error'; puesto: Puesto | null; mesa: string | null; desdeCache: boolean; aviso: string | null; captcha: string | null; yaRegistrada?: boolean };
export type PersonaFila = { ref: string; cedula: string | null; cedula_visible: string; completo: boolean; nombres: string; apellidos: string; celular: string | null; email: string | null; direccion: string | null; municipio: string | null; barrio: string | null; puesto: string | null; puesto_codigo: string | null; mesa: string | null; puesto_estado: 'verificado' | 'pendiente' | 'error'; consentimiento: boolean; registrado_por_nombre: string; creado: string; actualizado: string | null; puestoDetalle?: Puesto | null };
export type Miembro = { ref: string; cedula: string | null; cedula_visible: string; nombre: string; whatsapp: string | null; rol: string; activo: boolean; clave_temporal: boolean; creado: string; ultimo_ingreso: string | null; liderNombre: string | null; registros: number };
export type Actividad = { id: number; accion: string; texto: string; creado: string; ip: string | null; agente: string | null };
export type FichaMiembro = Miembro & { puesto: Puesto | null; mesa: string | null; puestoEstado: string; ubicacion: { lat: number; lon: number; municipio: string } | null; equipo: { ref: string; nombre: string; rol: string; registros: number }[]; actividad: Actividad[] };
export type PerfilAdmin = Miembro & { lider: string | null; permisos: Record<string, boolean>; creado_por: string | null; mensajeDisponible: boolean };
export type Catalogo = { permisos: { clave: string; texto: string }[]; roles: { clave: string; nombre: string; alcance: string; escribe: boolean }[] };

/** Noticias y páginas de la campaña (`GET /api/noticias`): Markdown con HTML y componentes iswc-*. */
export type CategoriaNoticia = 'noticia' | 'biografia' | 'trayectoria' | 'tutorial' | 'privacidad';
export type NoticiaFila = { id: number; categoria: CategoriaNoticia; titulo: string; resumen: string | null; imagen: string | null; estado: 'borrador' | 'publicada' | 'archivada'; destacada: boolean; orden: number; autor: string | null; creado: string; actualizado: string | null; publicada: string | null; adelanto: string };
export type Noticia = Omit<NoticiaFila, 'adelanto'> & { cuerpo_md: string };

/** Campana (plugin `notificaciones` de DER): bandeja de la sesión y contador. */
export type Notificacion = { id: string; iusuario: string; titulo: string; texto: string | null; tipo: string; enlace: string | null; leida: string | null; fhcre: string };
export type Bandeja = { items: Notificacion[]; noLeidas: number };

/** Contexto con que se abre el chat desde otra pantalla (noticia y fragmento citado, o la vista). */
export const ContextoChatSchema = z.object({
  tipo: z.string(),
  id: z.union([z.string(), z.number()]).nullable().default(null),
  titulo: z.string().nullable().default(null),
  fragmento: z.string().nullable().default(null),
  pantalla: z.string().nullable().default(null),
});
export type ContextoChat = z.infer<typeof ContextoChatSchema>;
