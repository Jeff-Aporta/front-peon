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
/** `publica`: se ve sin sesión (app abierta). */
export type Pestana = { id: string; titulo: string; icono: string; publica?: boolean };
/** `visible(null)` = sin sesión. `ir`: atajo del menú que abre otra vista en una pestaña (no tiene tag propio). */
export type Vista = { id: string; titulo: string; icono: string; tag: string; pestanas: Pestana[]; visible: (u: Usuario | null) => boolean; ir?: { vista: string; pestana: string }; seccion?: string };

export type Puesto = { codigo: string; nombre: string; municipio: string; departamento: string | null; direccion: string | null; lat: number | null; lon: number | null; fuente: string };

/**
 * El puesto ESCRITO A MANO (lo que la persona trae de la Registraduría): «POST personas» y «POST personas/{ref}/puesto».
 * Lo escribe el bloque de consulta asistida (core/puesto-manual.ts).
 */
export const PuestoManualSchema = z.object({
  nombre: z.string(),
  direccion: z.string(),
  municipio: z.string(),
  departamento: z.string(),
  mesa: z.string(),
});
export type PuestoManual = z.infer<typeof PuestoManualSchema>;

/**
 * Puesto del CATÁLOGO OFICIAL («GET /api/puestos»). El `codigo` es lo que se manda como `puestoCodigo`: si llega,
 * la API toma el puesto del catálogo y queda verificado.
 * Las filas del servidor se parsean una por una (las que no sirvan se descartan): el catálogo manda, el front no inventa.
 */
export const PuestoCatalogoSchema = z.object({
  codigo: z.union([z.string(), z.number()]).transform((v) => String(v)),
  nombre: z.string(),
  municipio: z.string().catch(''),
  departamento: z.string().nullable().catch(null),
  direccion: z.string().nullable().catch(null),
  lat: z.number().nullable().catch(null),
  lon: z.number().nullable().catch(null),
  fuente: z.string().catch(''),
});
export type PuestoCatalogo = z.infer<typeof PuestoCatalogoSchema>;

/** Municipio con puestos en el catálogo oficial («GET /api/puestos/municipios»). */
export const PuestoMunicipioSchema = z.object({
  municipio: z.string(),
  departamento: z.string().nullable().catch(null),
  total: z.number().catch(0),
});
export type PuestoMunicipio = z.infer<typeof PuestoMunicipioSchema>;
export type ResultadoPuesto = { estado: 'verificado' | 'pendiente' | 'error'; puesto: Puesto | null; mesa: string | null; desdeCache: boolean; aviso: string | null; captcha: string | null; yaRegistrada?: boolean };
export type PersonaFila = { ref: string; cedula: string | null; cedula_visible: string; completo: boolean; nombres: string; apellidos: string; celular: string | null; email: string | null; direccion: string | null; municipio: string | null; barrio: string | null; puesto: string | null; puesto_codigo: string | null; mesa: string | null; puesto_estado: 'verificado' | 'pendiente' | 'error'; consentimiento: boolean; registrado_por_nombre: string; creado: string; actualizado: string | null; puestoDetalle?: Puesto | null };
export type Miembro = { ref: string; cedula: string | null; cedula_visible: string; nombre: string; whatsapp: string | null; rol: string; activo: boolean; clave_temporal: boolean; creado: string; ultimo_ingreso: string | null; liderNombre: string | null; registros: number };
export type Actividad = { id: number; accion: string; texto: string; creado: string; ip: string | null; agente: string | null };
export type FichaMiembro = Miembro & { puesto: Puesto | null; mesa: string | null; puestoEstado: string; ubicacion: { lat: number; lon: number; municipio: string } | null; equipo: { ref: string; nombre: string; rol: string; registros: number }[]; actividad: Actividad[] };
export type PerfilAdmin = Miembro & { lider: string | null; permisos: Record<string, boolean>; creado_por: string | null; mensajeDisponible: boolean };
export type Catalogo = { permisos: { clave: string; texto: string }[]; roles: { clave: string; nombre: string; alcance: string; escribe: boolean }[] };

/** Noticias y páginas de la campaña (`GET /api/noticias`): Markdown con HTML y componentes iswc-*. */
export type CategoriaNoticia = 'noticia' | 'biografia' | 'trayectoria' | 'tutorial' | 'privacidad';
/** `tipo`: propia · adaptada (de otro medio, cita `fuente` y `enlace_original`) · enlace (abre la original). */
export type NoticiaFila = { id: number; categoria: CategoriaNoticia; titulo: string; resumen: string | null; imagen: string | null; tipo?: 'propia' | 'adaptada' | 'enlace'; fuente?: string | null; enlace_original?: string | null; estado: 'borrador' | 'publicada' | 'archivada'; destacada: boolean; orden: number; autor: string | null; creado: string; actualizado: string | null; publicada: string | null; adelanto: string };
export type Noticia = Omit<NoticiaFila, 'adelanto'> & { cuerpo_md: string };

/** Campana (plugin `notificaciones` de DER): bandeja de la sesión y contador. */
export type Notificacion = { id: string; iusuario: string; iactor: string | null; actor: string | null; titulo: string; texto: string | null; tipo: string; enlace: string | null; leida: string | null; fhcre: string };
export type Bandeja = { items: Notificacion[]; noLeidas: number };

/** Contexto con que se abre el chat desde otra pantalla (noticia y fragmento citado, o la vista). */
export const ContextoChatSchema = z.object({
  tipo: z.string(),
  id: z.union([z.string(), z.number()]).nullable().default(null),
  titulo: z.string().nullable().default(null),
  fragmento: z.string().nullable().default(null),
  pantalla: z.string().nullable().default(null),
  /** Elementos visibles en pantalla cuando se invocó el asistente (página, índice del fragmento y texto). */
  visibles: z.array(z.object({ pagina: z.string(), indice: z.string(), texto: z.string() })).optional(),
});
export type ContextoChat = z.infer<typeof ContextoChatSchema>;
