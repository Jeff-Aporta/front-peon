// @contexto HANDOFF.md (décima tanda) · src/styles/_noticia-tarjeta.scss
/**
 * noticias.ts — tarjeta de noticia compartida (Inicio y vista Noticias), al estilo de los lectores de noticias:
 * fuente (logo + «La Fuerza del Peón»), titular de hasta 3 líneas, adelanto opcional, tiempo relativo («hace 2 horas»;
 * pasada una semana, la fecha) e imagen cuadrada a la derecha (si la noticia no trae, el logo sobre morado).
 * Los estilos van en `src/styles/_noticia-tarjeta.scss` (cada componente lo incluye en su sombra).
 */
import { html } from '../base/componente.js';
import type { NoticiaFila } from '../consts/schemas/api.schemas.js';
import { abrirNoticia } from './ui.js';

/** «ahora», «hace 5 minutos», «hace 2 horas», «hace 3 días»; con más de una semana, la fecha («12 de nov. de 2026»). */
export function tiempoNoticia(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  const n = (v: number, uno: string, varios: string) => `hace ${v} ${v === 1 ? uno : varios}`;
  if (s < 60) return 'ahora';
  if (s < 3600) return n(Math.floor(s / 60), 'minuto', 'minutos');
  if (s < 86400) return n(Math.floor(s / 3600), 'hora', 'horas');
  if (s < 7 * 86400) return n(Math.floor(s / 86400), 'día', 'días');
  return new Date(t).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Abrir una noticia: la de tipo «enlace» va a la original (pestaña nueva); las demás, al cajón de lectura. */
export function abrirNoticiaFila(n: NoticiaFila): void {
  if (n.tipo === 'enlace' && n.enlace_original) window.open(n.enlace_original, '_blank', 'noopener,noreferrer');
  else abrirNoticia(n.id);
}

/** Fuente visible: la del medio original (adaptadas y enlaces) o la campaña. */
export function fuenteDe(n: NoticiaFila): string {
  return n.tipo && n.tipo !== 'propia' && n.fuente ? n.fuente : 'La Fuerza del Peón';
}

/** Una tarjeta de noticia. `conAdelanto`: en la vista Noticias (lista ancha) se muestra el adelanto. */
export function tarjetaNoticia(n: NoticiaFila, conAdelanto = false): DocumentFragment {
  const cuando = n.publicada ?? n.creado;
  const imagen = n.imagen ? n.imagen.replace(/"/g, '') : '';
  const externa = n.tipo === 'enlace';
  return html`
    <button type="button" class="nt" data-noticia=${String(n.id)} data-estado=${n.estado} data-tipo=${n.tipo ?? 'propia'} ?data-adelanto=${conAdelanto} title=${externa ? `Abre la noticia en ${fuenteDe(n)}` : ''} onclick=${() => abrirNoticiaFila(n)}>
      <span class="nt-texto">
        <span class="nt-fuente">${n.tipo && n.tipo !== 'propia' ? html`<iswc-icon icon="mdi:web"></iswc-icon>` : html`<img src="./assets/logo-160.webp" alt="" width="18" height="18">`}${fuenteDe(n)}${externa ? html`<iswc-icon class="nt-externa" icon="mdi:open-in-new"></iswc-icon>` : null}${n.estado === 'borrador' ? html`<span class="nt-borrador">Borrador</span>` : null}</span>
        <strong class="nt-titulo">${n.titulo}</strong>
        ${conAdelanto ? html`<span class="nt-adelanto">${n.adelanto}</span>` : null}
        <time class="nt-tiempo" datetime=${cuando} title=${new Date(cuando).toLocaleString('es-CO')}>${n.destacada ? html`<span class="nt-destacada">Destacada</span>` : null}${tiempoNoticia(cuando)}</time>
      </span>
      <span class="nt-imagen" style=${imagen ? `background-image:url("${imagen}")` : ''} aria-hidden="true">${imagen ? null : html`<img src="./assets/logo-160.webp" alt="" width="56" height="56">`}</span>
    </button>`;
}

const fondo = (n: NoticiaFila): string => (n.imagen ? `background-image:url("${n.imagen.replace(/"/g, '')}")` : '');

/**
 * Portada de noticias al estilo de un periódico digital: la nota principal grande (la destacada o la más reciente),
 * hasta cuatro secundarias con imagen arriba y el resto como lista de tarjetas (fuente, titular, tiempo, imagen).
 */
export function portadaNoticias(filas: NoticiaFila[]): DocumentFragment {
  const orden = [...filas].sort((a, b) => Number(b.destacada) - Number(a.destacada));
  const [principal, ...resto] = orden;
  const secundarias = resto.slice(0, 4);
  const mas = resto.slice(4);
  if (!principal) return html``;
  const cuando = (n: NoticiaFila) => tiempoNoticia(n.publicada ?? n.creado);
  return html`
    <article class="np">
      <button type="button" class="np-principal" data-noticia=${String(principal.id)} onclick=${() => abrirNoticiaFila(principal)}>
        <span class="np-imagen" style=${fondo(principal)}>${principal.imagen ? null : html`<img src="./assets/logo-512.webp" alt="" width="160" height="160">`}</span>
        <span class="np-texto">
          <span class="nt-fuente">${fuenteDe(principal)}${principal.tipo === 'enlace' ? html`<iswc-icon class="nt-externa" icon="mdi:open-in-new"></iswc-icon>` : null}</span>
          <strong class="np-titulo">${principal.titulo}</strong>
          <span class="np-adelanto">${principal.adelanto}</span>
          <time class="nt-tiempo">${principal.destacada ? html`<span class="nt-destacada">Destacada</span>` : null}${cuando(principal)}</time>
        </span>
      </button>
      ${secundarias.length
        ? html`<div class="np-secundarias">${secundarias.map((n) => html`
          <button type="button" class="np-sec" data-noticia=${String(n.id)} onclick=${() => abrirNoticiaFila(n)}>
            <span class="np-imagen" style=${fondo(n)}>${n.imagen ? null : html`<img src="./assets/logo-160.webp" alt="" width="64" height="64">`}</span>
            <span class="nt-fuente">${fuenteDe(n)}${n.tipo === 'enlace' ? html`<iswc-icon class="nt-externa" icon="mdi:open-in-new"></iswc-icon>` : null}</span>
            <strong class="nt-titulo">${n.titulo}</strong>
            <time class="nt-tiempo">${cuando(n)}</time>
          </button>`)}</div>`
        : null}
    </article>
    ${mas.length ? html`<h3 class="np-mas">Más noticias</h3><div class="nt-rejilla">${mas.map((n) => tarjetaNoticia(n, true))}</div>` : null}`;
}
