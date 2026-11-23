// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * componentes.schemas.ts — forma de las `props` de cada componente y tipos auxiliares de la base.
 *
 * Regla: los tipos salen de `z.infer<>`; no hay `type`/`interface` sueltos fuera de `*.schemas.ts`.
 * Datos que vienen de fuera (API, URL, almacenamiento) se PARSEAN con su schema (`safeParse`).
 */
import { z } from '../../base/zod.js';

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

/** Base (`componente.ts`): atributos e hijos del helper `el()`. */
export type Atributos = Record<string, unknown>;
export type Hijos = Array<Node | string | null | undefined> | Node | string | null | undefined;
