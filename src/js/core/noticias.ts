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

/** Una tarjeta de noticia. `conAdelanto`: en la vista Noticias (lista ancha) se muestra el adelanto. */
export function tarjetaNoticia(n: NoticiaFila, conAdelanto = false): DocumentFragment {
  const cuando = n.publicada ?? n.creado;
  const imagen = n.imagen ? n.imagen.replace(/"/g, '') : '';
  return html`
    <button type="button" class="nt" data-noticia=${String(n.id)} data-estado=${n.estado} ?data-adelanto=${conAdelanto} onclick=${() => abrirNoticia(n.id)}>
      <span class="nt-texto">
        <span class="nt-fuente"><img src="./assets/logo-160.webp" alt="" width="18" height="18">La Fuerza del Peón${n.estado === 'borrador' ? html`<span class="nt-borrador">Borrador</span>` : null}</span>
        <strong class="nt-titulo">${n.titulo}</strong>
        ${conAdelanto ? html`<span class="nt-adelanto">${n.adelanto}</span>` : null}
        <time class="nt-tiempo" datetime=${cuando} title=${new Date(cuando).toLocaleString('es-CO')}>${n.destacada ? html`<span class="nt-destacada">Destacada</span>` : null}${tiempoNoticia(cuando)}</time>
      </span>
      <span class="nt-imagen" style=${imagen ? `background-image:url("${imagen}")` : ''} aria-hidden="true">${imagen ? null : html`<img src="./assets/logo-160.webp" alt="" width="56" height="56">`}</span>
    </button>`;
}
