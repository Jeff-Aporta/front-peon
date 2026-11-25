// @contexto HANDOFF.md «Prueba de fuentes oficiales» · api-peon/src/rutas/puestos.ts
/**
 * puestos.ts — el CATÁLOGO OFICIAL de puestos de votación: búsqueda contra la API y emparejamiento con lo que la
 * persona trae a mano.
 *
 * Contrato de la API (fijo; la API no se toca desde el front):
 *   GET /api/puestos?q=<texto>&municipio=<municipio>&limite=<n> → [{codigo,nombre,municipio,departamento,direccion,lat,lon,fuente}]
 *   GET /api/puestos/municipios                                  → [{municipio,departamento,total}]
 *
 * Lo que llega se PARSEA (Zod) y lo que no parsea se descarta: el catálogo manda, el front no inventa puestos.
 *
 * `emparejarPuesto()` es PURA (no toca la red): se prueba con catálogos de mentira (tests/puestos/puestos.test.ts).
 */
import { z } from '../base/zod.js';
import { api } from './api.js';
import { PuestoCatalogoSchema, PuestoMunicipioSchema } from '../consts/schemas/api.schemas.js';
import type { PuestoCatalogo, PuestoMunicipio } from '../consts/schemas/api.schemas.js';

/** Quita tildes, mayúsculas y signos: para comparar nombres de puesto («Café» = «cafe»). */
export function normalizar(texto: string): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Etiqueta de un puesto para las listas y el autocompletado: «Nombre · Dirección · Municipio». */
export function etiquetaPuesto(p: PuestoCatalogo): string {
  return [p.nombre, p.direccion, p.municipio].map((x) => (x ?? '').trim()).filter(Boolean).join(' · ');
}

/** Descompone la respuesta de la API en filas válidas (las que no parsea se descartan). */
function filas<T>(datos: unknown, esquema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }): T[] {
  const lista = z.array(z.unknown()).safeParse(datos);
  if (!lista.success) return [];
  const out: T[] = [];
  for (const fila of lista.data) {
    const r = esquema.safeParse(fila);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** Los municipios del catálogo (con cuántos puestos tiene cada uno). */
export async function buscarMunicipios(): Promise<PuestoMunicipio[]> {
  const datos = await api<unknown>('GET', 'puestos/municipios');
  return filas(datos, PuestoMunicipioSchema);
}

/** Busca puestos en el catálogo oficial (por nombre, dirección o municipio). */
export async function buscarPuestos(texto: string, municipio = '', limite = 20): Promise<PuestoCatalogo[]> {
  const params = new URLSearchParams();
  const q = (texto ?? '').trim();
  if (q) params.set('q', q);
  const m = (municipio ?? '').trim();
  if (m) params.set('municipio', m);
  params.set('limite', String(Math.max(1, Math.min(200, limite))));
  const datos = await api<unknown>('GET', `puestos?${params}`);
  return filas(datos, PuestoCatalogoSchema);
}

/** Lo que se compara con el catálogo para proponer un puesto. */
export type DatosPuesto = { nombre?: string; municipio?: string };

/** Por debajo de este puntaje no hay candidato «claro»: se deja los campos como están y se avisa. */
export const UMBRAL_EMPAREJE = 0.75;

/**
 * Puntaje de parecido entre dos nombres de puesto (0 = nada, 1 = el mismo):
 *   · iguales → 1;
 *   · uno contiene al otro → 0,85 × (cuánto del largo coincide);
 *   · si no → palabras compartidas sobre el total (Jaccard).
 */
export function puntajePuesto(a: string, b: string): number {
  const x = normalizar(a);
  const y = normalizar(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85 * (Math.min(x.length, y.length) / Math.max(x.length, y.length));
  const tx = new Set(x.split(' ').filter(Boolean));
  const ty = new Set(y.split(' ').filter(Boolean));
  if (!tx.size || !ty.size) return 0;
  let comunes = 0;
  for (const t of tx) if (ty.has(t)) comunes++;
  return comunes / (tx.size + ty.size - comunes);
}

/**
 * Empareja lo que la persona trajo con el catálogo oficial: devuelve el candidato CLARO o `null`.
 * «Claro» = un solo puesto que se parece mucho (≥ UMBRAL_EMPAREJE) en el mismo municipio y que gana por goleada al
 * segundo. Si hay dos candidatos igual de buenos, no hay candidato claro: se deja los campos como están y se avisa.
 */
export function emparejarPuesto(datos: DatosPuesto, catalogo: PuestoCatalogo[]): PuestoCatalogo | null {
  const nombre = (datos.nombre ?? '').trim();
  if (!nombre || !catalogo?.length) return null;
  const mun = normalizar(datos.municipio ?? '');
  const candidatos = mun
    ? catalogo.filter((c) => {
        const cm = normalizar(c.municipio ?? '');
        return !!cm && (cm === mun || cm.includes(mun) || mun.includes(cm));
      })
    : catalogo;
  if (!candidatos.length) return null;
  let mejor: PuestoCatalogo | null = null;
  let mejorPuntaje = 0;
  let empate = false;
  for (const c of candidatos) {
    const p = puntajePuesto(c.nombre, nombre);
    if (p > mejorPuntaje) {
      mejor = c;
      mejorPuntaje = p;
      empate = false;
    } else if (p === mejorPuntaje && p > 0) empate = true;
  }
  if (!mejor || mejorPuntaje < UMBRAL_EMPAREJE) return null;
  if (empate) return null;
  return mejor;
}
