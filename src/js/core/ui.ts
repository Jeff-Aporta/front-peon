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
  const { cajon: c, hijo } = cajon('peon-cajon-chat', 'Chat con el VPS', 'peon-chat');
  Object.assign(hijo, { props: { contexto, compacto: true } });
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
