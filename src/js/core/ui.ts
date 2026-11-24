// @contexto src/js/base/componente.ts
/** ui.ts — utilidades de vista compartidas (sin estilos ni dominio). */
import { html } from '../base/componente.js';
import { ESTADOS } from './catalogos.js';
import type { ContextoChat, ResultadoPuesto } from '../consts/schemas/api.schemas.js';

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

/** Un cajón lateral derecho único por clase (chat, noticia), montado en el documento y reutilizado. */
function cajon(clase: string, etiqueta: string, tag: string): { cajon: HTMLElement & { open?: boolean }; hijo: HTMLElement } {
  let c = document.querySelector(`iswc-drawer.${clase}`) as (HTMLElement & { open?: boolean }) | null;
  if (!c) {
    c = document.createElement('iswc-drawer') as HTMLElement & { open?: boolean };
    c.className = clase;
    c.setAttribute('placement', 'end');
    c.setAttribute('label', etiqueta);
    c.setAttribute('light-dismiss', '');
    c.append(document.createElement(tag));
    document.body.append(c);
  }
  return { cajon: c, hijo: c.querySelector(tag) as HTMLElement };
}

/**
 * Abre el chat con el VPS en un cajón (desde cualquier pantalla), con el contexto citado: una noticia y el fragmento
 * que se quiere editar, o la pantalla desde donde se pidió. Requiere el permiso `chat_con_vps` (lo filtra quien llama).
 */
export function abrirChat(contexto: ContextoChat | null = null, borrador = ''): void {
  const { cajon: c, hijo } = cajon('peon-cajon-chat', 'Asistente', 'peon-chat');
  // Hilo fijo del contexto (al editar una noticia se abre SOLO su chat, sin la lista de todos).
  Object.assign(hijo, { props: { contexto, compacto: true, hilo: '', hiloTitulo: null } });
  if (borrador) (hijo as HTMLElement & { borrador?(t: string): void }).borrador?.(borrador);
  c.setAttribute('open', '');
}

/** Abre una noticia o página de la campaña en el cajón de lectura. */
export function abrirNoticia(id: number): void {
  const { cajon: c, hijo } = cajon('peon-cajon-noticia', 'Noticia', 'peon-noticia');
  Object.assign(hijo, { props: { id, categoria: '', sinTitulo: false } });
  c.setAttribute('open', '');
}

/**
 * Sigue el `enlace` de una notificación: `noticias:7` (abre la noticia), `ficha:<ref>` (ficha de la persona),
 * `chat`, o el id de una vista (`inicio`, `registro:consulta`…).
 */
export function irEnlace(enlace: string | null): void {
  if (!enlace) return;
  const [tipo, valor = ''] = enlace.split(':');
  if (tipo === 'noticias' && Number(valor)) return abrirNoticia(Number(valor));
  if (tipo === 'ficha' && valor) return abrirFicha(valor);
  ir(tipo ?? 'inicio', valor);
}

/**
 * Elementos visibles en pantalla para el asistente (DISENO-ASISTENTE §3): recorre las sombras desde `raiz` y toma los
 * fragmentos con `[data-indice]` (página + índice + texto) que se ven; si no hay, los títulos y párrafos visibles.
 */
export function visiblesDe(raiz: Element, max = 30): { pagina: string; indice: string; texto: string }[] {
  const alto = innerHeight;
  const ve = (e: Element) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < alto;
  };
  const todos: Element[] = [];
  const recorrer = (n: Element | ShadowRoot) => {
    for (const e of Array.from(n.children)) {
      todos.push(e);
      if (e.shadowRoot) recorrer(e.shadowRoot);
      recorrer(e);
    }
  };
  if (raiz.shadowRoot) recorrer(raiz.shadowRoot);
  recorrer(raiz);
  const texto = (e: Element) => (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 600);
  const frag = todos.filter((e) => e instanceof HTMLElement && e.dataset.indice && ve(e));
  if (frag.length) return frag.slice(0, max).map((e) => ({ pagina: (e as HTMLElement).dataset.pagina ?? '', indice: (e as HTMLElement).dataset.indice ?? '', texto: texto(e) }));
  return todos.filter((e) => /^(H1|H2|H3|P|LI|STRONG)$/.test(e.tagName) && ve(e) && texto(e).length > 2).slice(0, max).map((e) => ({ pagina: '', indice: '', texto: texto(e) }));
}
