// @contexto src/js/base/componente.ts
/** ui.ts — utilidades de vista compartidas (sin estilos ni dominio). */
import { html } from '../base/componente.js';
import { ESTADOS } from './catalogos.js';
import type { ResultadoPuesto } from '../consts/schemas/api.schemas.js';

/** Valor de un campo del kit (`iswc-input`, `iswc-select`, `iswc-masked-input`…) por `data-campo`. */
export function valor(raiz: ParentNode | null | undefined, campo: string): string {
  const el = raiz?.querySelector(`[data-campo="${campo}"]`) as (HTMLElement & { value?: unknown; raw?: unknown; checked?: unknown }) | null;
  if (!el) return '';
  if (el.localName === 'iswc-masked-input' && typeof el.raw === 'string') return el.raw.trim();
  return String(el.value ?? '').trim();
}

export function marcado(raiz: ParentNode | null | undefined, campo: string): boolean {
  const el = raiz?.querySelector(`[data-campo="${campo}"]`) as (HTMLElement & { checked?: unknown }) | null;
  return el?.checked === true;
}

/** sm/xs (< 48rem): el menú no va en el layout, va en un cajón izquierdo. */
export const MEDIO_ANGOSTO = '(max-width: 47.99rem)';
export const angosto = (): boolean => matchMedia(MEDIO_ANGOSTO).matches;

/** Etiqueta del estado del puesto. */
export function estadoPuesto(estado: string) {
  const e = ESTADOS[estado] ?? ESTADOS.pendiente!;
  return html`<iswc-tag color=${e.color} pill><iswc-icon icon=${e.icono}></iswc-icon> ${e.texto}</iswc-tag>`;
}

/** Copia texto al portapapeles; `true` si pudo. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/** Mensaje de error legible. */
export const textoError = (e: unknown): string => (e instanceof Error ? e.message : 'Algo salió mal');

/** Pide al shell cambiar de vista (y de pestaña). */
export const ir = (vista: string, pestana = ''): void => {
  window.dispatchEvent(new CustomEvent('peon:ir', { detail: { vista, pestana } }));
};

/** Abre la ficha de una persona (un solo `<peon-ficha-persona>` en el documento). */
export function abrirFicha(ref: string): void {
  const ficha = document.querySelector('peon-ficha-persona') ?? document.body.appendChild(document.createElement('peon-ficha-persona'));
  Object.assign(ficha, { props: { ref, abierta: true } });
}

/** Tarjeta con el resultado de la consulta del puesto. */
export function tarjetaPuesto(r: ResultadoPuesto | null, cargando = false): DocumentFragment {
  if (cargando) return html`<div class="puesto cargando"><iswc-spinner></iswc-spinner><span>Consultando el puesto de votación…</span></div>`;
  if (!r) return html`<div class="puesto vacio"><iswc-icon icon="mdi:map-marker-outline"></iswc-icon><span>Escribe la cédula: el puesto se busca solo.</span></div>`;
  return html`
    <div class="puesto" data-estado=${r.estado}>
      <div class="cabeza">${estadoPuesto(r.estado)}${r.desdeCache ? html`<small>consultado antes</small>` : null}${r.yaRegistrada ? html`<iswc-tag color="warning" pill>Ya registrada</iswc-tag>` : null}</div>
      ${r.puesto
        ? html`<strong>${r.puesto.nombre}</strong><span>${r.puesto.direccion ?? ''} · ${r.puesto.municipio}${r.mesa ? ` · Mesa ${r.mesa}` : ''}</span>`
        : html`<span>${r.aviso ?? 'Sin datos del puesto.'}</span>`}
    </div>`;
}
