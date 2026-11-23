// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * componentes.schemas.ts — forma de las `props` de cada componente y tipos auxiliares de la base.
 *
 * Regla: los tipos salen de `z.infer<>`; no hay `type`/`interface` sueltos fuera de `*.schemas.ts`.
 * Datos que vienen de fuera (API, URL, almacenamiento) se PARSEAN con su schema (`safeParse`).
 */
import { z } from '../../base/zod.js';
import { ContextoChatSchema } from './api.schemas.js';

/** `<peon-app>`: el shell. `activo` = vista visible; `colapsado` = panel solo con iconos. */
export const PeonAppPropsSchema = z.object({
  activo: z.string().default('inicio'),
  colapsado: z.boolean().default(false),
  cajon: z.boolean().default(false),
});
export type PeonAppProps = z.infer<typeof PeonAppPropsSchema>;

/** `<peon-acceso>`: login (`entrar`) o cambio obligatorio de la clave temporal (`cambiar`). */
export const PeonAccesoPropsSchema = z.object({
  modo: z.enum(['entrar', 'cambiar']).default('entrar'),
});
export type PeonAccesoProps = z.infer<typeof PeonAccesoPropsSchema>;

/** `<peon-ficha-persona>`: ficha (diálogo) de una persona por su `ref` opaco. */
export const PeonFichaPersonaPropsSchema = z.object({
  ref: z.string().default(''),
  abierta: z.boolean().default(false),
});
export type PeonFichaPersonaProps = z.infer<typeof PeonFichaPersonaPropsSchema>;

/** Vistas (`peon-inicio`, `peon-registro`, …): la pestaña activa. Vacío = la primera del catálogo. */
export const VistaPropsSchema = z.object({
  pestana: z.string().default(''),
});
export type VistaProps = z.infer<typeof VistaPropsSchema>;

/** `<peon-chat>`: chat con el VPS reutilizable (vista, cajón o embebido). `contexto` = noticia/fragmento/pantalla citados. */
export const PeonChatPropsSchema = z.object({
  contexto: ContextoChatSchema.nullable().default(null),
  compacto: z.boolean().default(false),
});
export type PeonChatProps = z.infer<typeof PeonChatPropsSchema>;

/** `<peon-campana>`: campana con contador (en el panel). `compacta` = solo el ícono (panel colapsado). */
export const PeonCampanaPropsSchema = z.object({
  compacta: z.boolean().default(false),
  /** En la barra inferior móvil: ícono con rótulo corto debajo y la lista abre hacia arriba, a todo el ancho. */
  barra: z.boolean().default(false),
});
export type PeonCampanaProps = z.infer<typeof PeonCampanaPropsSchema>;

/** `<peon-noticia>`: lector de una noticia/página por `id`, con menú contextual «Enviar al VPS para editar». */
export const PeonNoticiaPropsSchema = z.object({
  id: z.number().default(0),
  categoria: z.string().default(''),
  sinTitulo: z.boolean().default(false),
});
export type PeonNoticiaProps = z.infer<typeof PeonNoticiaPropsSchema>;

/** Base (`componente.ts`): atributos e hijos del helper `el()`. */
export type Atributos = Record<string, unknown>;
export type Hijos = Array<Node | string | null | undefined> | Node | string | null | undefined;
