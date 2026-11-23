// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * props-registro.ts — qué claves de `.props` reconoce cada tag. Lo que no está aquí se avisa.
 *
 * Al crear un componente con `props`: su schema va en `consts/schemas/componentes.schemas.ts` y se
 * registra AQUÍ con una línea. Todo setter de `props` pasa por `revisarProps`.
 */
import { avisarPropsNoIdentificadas, clavesDe, instalarVigilanciaAtributos } from './zod.js';
import { PeonAccesoPropsSchema, PeonAppPropsSchema, PeonCampanaPropsSchema, PeonChatPropsSchema, PeonFichaPersonaPropsSchema, PeonNoticiaPropsSchema, VistaPropsSchema } from '../consts/schemas/componentes.schemas.js';
import { VIEW_TAGS } from '../kit-tags.js';

const MAPA = new Map<string, ReadonlySet<string>>();

export function registrarClaves(tag: string, esquema: { shape: object }): void {
  MAPA.set(tag, clavesDe(esquema));
}

registrarClaves('peon-app', PeonAppPropsSchema);
registrarClaves('peon-acceso', PeonAccesoPropsSchema);
registrarClaves('peon-ficha-persona', PeonFichaPersonaPropsSchema);
registrarClaves('peon-chat', PeonChatPropsSchema);
registrarClaves('peon-campana', PeonCampanaPropsSchema);
registrarClaves('peon-noticia', PeonNoticiaPropsSchema);
for (const tags of Object.values(VIEW_TAGS)) for (const tag of tags) registrarClaves(tag, VistaPropsSchema);

export function revisarProps(tag: string, valor: unknown): void {
  if (!valor || typeof valor !== 'object') return;
  const claves = MAPA.get(tag);
  if (claves) avisarPropsNoIdentificadas(tag, claves, valor);
}

if (typeof document !== 'undefined') instalarVigilanciaAtributos('peon');
