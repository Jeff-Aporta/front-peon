// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * kit-tags.ts — REGISTRO ÚNICO de tags de la app (estándar iswc-foundation).
 *
 * Todo lo demás se deriva de aquí: el registrador (`peonLoader.min.mjs`, vía `registerApp`, lo escribe
 * `construirApp`), la galería de demos y los guardianes. Un componente nuevo se declara UNA vez, en la lista que le toca:
 *
 *   KIT_TAGS   → tags `iswc-*` del kit que la app pide al loader (solo padres registrables).
 *   SHELL_CRITICO → los de KIT_TAGS del primer pintado: su cierre se precarga desde el HTML (modulepreload).
 *   APP_TAGS   → componentes transversales → `dist/cdn/js/components/peon/<tag>.min.mjs`.
 *   VIEW_TAGS  → componentes de cada vista → `dist/cdn/view/<vista>/components/<tag>.min.mjs`.
 *
 * APP_TAGS y la unión de VIEW_TAGS son disjuntos: una vista no importa componentes de otra; lo
 * compartido sube a APP_TAGS. Se publica en `dist/cdn/js/kit-tags.min.mjs` para los hosts.
 */
export const KIT_TAGS = [
  'iswc-avatar',
  'iswc-badge',
  'iswc-button',
  'iswc-callout',
  'iswc-card',
  'iswc-checkbox',
  'iswc-combobox',
  'iswc-confirm-delete',
  'iswc-context-menu',
  'iswc-data-grid',
  'iswc-dialog',
  'iswc-drawer',
  'iswc-dropdown-item',
  'iswc-empty-state',
  'iswc-icon',
  'iswc-input',
  'iswc-masked-input',
  'iswc-media-recorder',
  'iswc-option',
  'iswc-org-chart',
  'iswc-person',
  'iswc-popover',
  'iswc-qrcode',
  'iswc-select',
  'iswc-session-menu',
  'iswc-share-button',
  'iswc-spinner',
  'iswc-stat',
  'iswc-switch',
  'iswc-tab-group',
  'iswc-tag',
  'iswc-textarea',
  'iswc-toast',
] as const;

/**
 * Shell crítico: tags del kit que se ven en el primer pintado (barra y toaster). El build lee su cierre de módulos en
 * `src/vendor/iswc-base/deps.json` (`tags[tag]`) y emite un `<link rel="modulepreload">` por ruta en cada HTML.
 */
export const SHELL_CRITICO = ['iswc-icon', 'iswc-person', 'iswc-session-menu', 'iswc-toast'] as const satisfies readonly (typeof KIT_TAGS)[number][];

export const PREFIJO = 'peon';

export const APP_TAGS = ['peon-acceso', 'peon-ficha-persona', 'peon-chat', 'peon-campana', 'peon-noticia', 'peon-app'] as const;

export const VIEW_TAGS = {
  inicio: ['peon-inicio'],
  noticias: ['peon-noticias'],
  registro: ['peon-registro'],
  listado: ['peon-listado'],
  lider: ['peon-panel-lider'],
  miembros: ['peon-miembros'],
  perfiles: ['peon-perfiles'],
  chat: ['peon-chat-vps'],
  ajustes: ['peon-ajustes'],
} as const satisfies Record<string, readonly `peon-${string}`[]>;

export type AppTag = (typeof APP_TAGS)[number] | (typeof VIEW_TAGS)[keyof typeof VIEW_TAGS][number];
export type Vista = keyof typeof VIEW_TAGS;

/** Carpeta publicada (relativa a `dist/cdn/`) de un componente propio; `null` si no es de la app. */
export function rutaComponente(tag: string): string | null {
  if ((APP_TAGS as readonly string[]).includes(tag)) return `js/components/${PREFIJO}/`;
  for (const [vista, tags] of Object.entries(VIEW_TAGS)) {
    if ((tags as readonly string[]).includes(tag)) return `view/${vista}/components/`;
  }
  return null;
}

/** tag → ruta del módulo relativa a `dist/cdn/` (exige el prefijo de la app). */
export function mapaRutas(): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const tag of [...APP_TAGS, ...Object.values(VIEW_TAGS).flat()]) {
    if (!tag.startsWith(`${PREFIJO}-`)) throw new Error(`kit-tags: ${tag} no lleva el prefijo ${PREFIJO}-`);
    mapa[tag] = `${rutaComponente(tag)}${tag}.js`;
  }
  return mapa;
}

/** Tags que el shell pide al arrancar (transversales + todas las vistas). */
export const tagsArranque = (): string[] => [...APP_TAGS, ...Object.values(VIEW_TAGS).flat()];