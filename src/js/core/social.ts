// @contexto api-peon/src/rutas/social.ts · DER plugins mensajes/reacciones
/**
 * social.ts — bloque social estilo red social para cualquier entidad (hoy: noticias):
 *   · barra de reacciones: resumen (emojis más usados + total; al tocarlo, el modal de VOTANTES: no es anónimo),
 *     «Me gusta» (mantener o pasar el puntero abre las 7 reacciones) y «Comentar».
 *   · comentarios por NIVELES: primera página de raíces (recientes primero) y «Ver más comentarios»; cada comentario
 *     muestra «Ver N respuestas», que se piden aparte (otra consulta) solo al abrirlas; las respuestas se responden.
 *   · Me gusta / Responder / Eliminar (autor o admin) en cada comentario; todo con su autor (auditable).
 * Estilos en `src/styles/_social.scss`.
 */
import { avisar, html } from '../base/componente.js';
import { api, puede, sesion, usuarioActivo } from './api.js';
import { tiempoNoticia } from './noticias.js';
import { textoError } from './ui.js';

type Resumen = { total: number; porReaccion: Record<string, number>; mia: string | null };
type Comentario = { indice: string; texto: string; creado: string | null; editado: boolean; autor: { ref: string | null; nombre: string; rol: string }; mio: boolean; respuestas: number; reacciones: Resumen };
type PaginaC = { total: number; page: number; hayMas: boolean; comentarios: Comentario[] };

export const REACCIONES: { e: string; t: string }[] = [
  { e: '👍', t: 'Me gusta' },
  { e: '❤️', t: 'Me encanta' },
  { e: '😂', t: 'Me divierte' },
  { e: '😮', t: 'Me asombra' },
  { e: '😢', t: 'Me entristece' },
  { e: '😡', t: 'Me enoja' },
  { e: '👏', t: 'Aplausos' },
];
const nombreDe = (e: string | null) => REACCIONES.find((r) => r.e === e)?.t ?? 'Me gusta';
const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

/** Los emojis más usados (hasta 3) para el resumen, como en las redes sociales. */
function top(r: Resumen): string[] {
  return Object.entries(r.porReaccion).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
}

/** Modal de votantes: pestañas por reacción y lista paginada de quién reaccionó. */
function abrirVotantes(espacio: string, ref: string, r: Resumen): void {
  if (!usuarioActivo()) return avisar('Entra para ver quién reaccionó', 'warning');
  const dialogo = document.createElement('iswc-dialog') as HTMLElement & { open?: boolean };
  dialogo.setAttribute('label', 'Reacciones');
  dialogo.className = 'peon-votantes';
  const lista = document.createElement('ul');
  lista.className = 'votantes';
  const mas = document.createElement('button');
  mas.type = 'button';
  mas.className = 'ver-mas';
  mas.textContent = 'Ver más';
  let filtro: string | null = null;
  let page = 1;
  const cargar = async (reiniciar: boolean) => {
    if (reiniciar) {
      page = 1;
      lista.replaceChildren();
    }
    try {
      const q = new URLSearchParams({ espacio, ref, page: String(page) });
      if (filtro) q.set('reaccion', filtro);
      const v = await api<{ hayMas: boolean; votantes: { reaccion: string; nombre: string; rol: string }[] }>('GET', `reacciones/votantes?${q}`);
      lista.append(...v.votantes.map((x) => html`<li><span class="avatar" aria-hidden="true">${iniciales(x.nombre)}</span><span class="quien"><strong>${x.nombre}</strong><small>${x.rol}</small></span><span class="emoji" title=${nombreDe(x.reaccion)}>${x.reaccion}</span></li>`));
      mas.hidden = !v.hayMas;
      page++;
    } catch (e) {
      lista.append(html`<li>${textoError(e)}</li>`);
    }
  };
  mas.addEventListener('click', () => void cargar(false));
  const chips = html`<div class="chips-votos" role="tablist">
    <button type="button" class="chip-voto" data-activa onclick=${(e: Event) => { filtro = null; marcar(e); void cargar(true); }}>Todas · ${r.total}</button>
    ${Object.entries(r.porReaccion).sort((a, b) => b[1] - a[1]).map(([emo, n]) => html`<button type="button" class="chip-voto" title=${nombreDe(emo)} onclick=${(e: Event) => { filtro = emo; marcar(e); void cargar(true); }}>${emo} ${n}</button>`)}
  </div>`;
  const marcar = (e: Event) => {
    dialogo.querySelectorAll('.chip-voto').forEach((b) => b.removeAttribute('data-activa'));
    (e.currentTarget as HTMLElement).setAttribute('data-activa', '');
  };
  dialogo.append(chips, lista, mas);
  dialogo.addEventListener('iswc-after-hide', () => dialogo.remove());
  document.body.append(dialogo);
  dialogo.setAttribute('open', '');
  void cargar(true);
}

/** Selector de reacción (mantener presionado o pasar el puntero sobre «Me gusta»). */
function selector(alElegir: (e: string) => void): HTMLElement {
  const s = document.createElement('div');
  s.className = 'selector-reaccion';
  s.setAttribute('role', 'menu');
  s.hidden = true;
  s.append(html`${REACCIONES.map((r) => html`<button type="button" role="menuitem" title=${r.t} aria-label=${r.t} onclick=${(ev: Event) => { ev.stopPropagation(); s.hidden = true; alElegir(r.e); }}>${r.e}</button>`)}`);
  return s;
}

/** Botón «Me gusta» con selector: toque = 👍 o quitar; mantener/pasar el puntero = elegir reacción. */
function botonReaccion(espacio: string, ref: string, r: Resumen, alCambiar: (r: Resumen) => void, compacto = false): HTMLElement {
  const caja = document.createElement('span');
  caja.className = 'reaccionar';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = compacto ? 'accion-c' : 'accion';
  const pintar = () => {
    b.toggleAttribute('data-activa', !!r.mia);
    b.replaceChildren(html`${compacto ? null : html`<span class="emoji">${r.mia ?? '👍'}</span>`}${nombreDe(r.mia)}`);
    b.title = r.mia ? 'Quitar tu reacción' : 'Me gusta (mantén presionado para más reacciones)';
  };
  const enviar = async (reaccion: string | null) => {
    if (!usuarioActivo()) return avisar('Entra para reaccionar', 'warning');
    try {
      r = await api<Resumen>('POST', 'reacciones', { espacio, ref, reaccion });
      pintar();
      alCambiar(r);
    } catch (e) {
      avisar(textoError(e), 'danger');
    }
  };
  const sel = selector((e) => void enviar(e));
  let presion: ReturnType<typeof setTimeout> | undefined;
  let largo = false;
  b.addEventListener('pointerdown', () => {
    largo = false;
    presion = setTimeout(() => {
      largo = true;
      sel.hidden = false;
    }, 450);
  });
  b.addEventListener('pointerup', () => clearTimeout(presion));
  b.addEventListener('pointerleave', () => clearTimeout(presion));
  b.addEventListener('click', () => {
    if (largo) return;
    void enviar(r.mia ? null : '👍');
  });
  caja.addEventListener('mouseenter', () => { presion = setTimeout(() => (sel.hidden = false), 500); });
  caja.addEventListener('mouseleave', () => { clearTimeout(presion); sel.hidden = true; });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  pintar();
  caja.append(sel, b);
  return caja;
}

/** El bloque social completo de una entidad (resumen, acciones y comentarios por niveles). */
export function bloqueSocial(espacio: string, ref: string): HTMLElement {
  const caja = document.createElement('section');
  caja.className = 'social';
  caja.setAttribute('aria-label', 'Reacciones y comentarios');
  const resumen = document.createElement('div');
  resumen.className = 'resumen-social';
  const lista = document.createElement('div');
  lista.className = 'comentarios';
  const masRaices = document.createElement('button');
  masRaices.type = 'button';
  masRaices.className = 'ver-mas';
  masRaices.hidden = true;
  let r: Resumen = { total: 0, porReaccion: {}, mia: null };
  let totalComentarios = 0;
  let page = 1;

  const pintarResumen = () => {
    resumen.replaceChildren(html`
      ${r.total ? html`<button type="button" class="conteo" title="Ver quién reaccionó" onclick=${() => abrirVotantes(espacio, ref, r)}><span class="emojis">${top(r).map((e) => html`<span>${e}</span>`)}</span>${r.total}</button>` : html`<span></span>`}
      ${totalComentarios ? html`<span class="n-com">${totalComentarios} comentario${totalComentarios === 1 ? '' : 's'}</span>` : null}`);
  };

  /** Una fila de comentario (y su espacio para respuestas, que se cargan al abrirlas). */
  const filaComentario = (c: Comentario, nivel: number): HTMLElement => {
    const fila = document.createElement('div');
    fila.className = 'comentario';
    fila.dataset.indice = c.indice;
    fila.style.setProperty('--nivel', String(Math.min(nivel, 3)));
    const hijos = document.createElement('div');
    hijos.className = 'respuestas';
    let reac = c.reacciones;
    const conteo = document.createElement('button');
    conteo.type = 'button';
    conteo.className = 'conteo-c';
    const pintarConteo = () => {
      conteo.hidden = !reac.total;
      conteo.replaceChildren(html`${top(reac).join('')} ${reac.total}`);
    };
    conteo.addEventListener('click', () => abrirVotantes('comentario', `${espacio}:${ref}:${c.indice}`, reac));
    pintarConteo();
    let respPage = 1;
    const verResp = document.createElement('button');
    verResp.type = 'button';
    verResp.className = 'ver-respuestas';
    const pintarVer = (pendientes: number) => {
      verResp.hidden = pendientes <= 0;
      verResp.replaceChildren(html`<iswc-icon icon="mdi:subdirectory-arrow-right"></iswc-icon>Ver ${pendientes} respuesta${pendientes === 1 ? '' : 's'}`);
    };
    let mostradas = 0;
    const cargarResp = async () => {
      try {
        const p = await api<PaginaC>('GET', `comentarios/respuestas?espacio=${espacio}&ref=${encodeURIComponent(ref)}&padre=${c.indice}&page=${respPage}&pageSize=5`);
        hijos.append(...p.comentarios.map((h) => filaComentario(h, nivel + 1)));
        mostradas += p.comentarios.length;
        respPage++;
        pintarVer(p.total - mostradas);
      } catch (e) {
        avisar(textoError(e), 'danger');
      }
    };
    verResp.addEventListener('click', () => void cargarResp());
    pintarVer(c.respuestas);
    const responder = () => {
      if (!usuarioActivo()) return avisar('Entra para responder', 'warning');
      if (fila.querySelector(':scope > .redactor')) return;
      fila.insertBefore(redactor(`Responder a ${c.autor.nombre.split(' ')[0]}…`, async (texto) => {
        const nuevo = await api<Comentario>('POST', 'comentarios', { espacio, ref, texto, padre: c.indice });
        hijos.append(filaComentario(nuevo, nivel + 1));
        fila.querySelector(':scope > .redactor')?.remove();
      }, true), hijos);
    };
    const quitar = async () => {
      try {
        await api('DELETE', `comentarios/${espacio}/${encodeURIComponent(ref)}/${c.indice}`);
        fila.remove();
        totalComentarios = Math.max(0, totalComentarios - (nivel === 0 ? 1 : 0));
        pintarResumen();
      } catch (e) {
        avisar(textoError(e), 'danger');
      }
    };
    fila.append(html`
      <span class="avatar" aria-hidden="true">${iniciales(c.autor.nombre)}</span>
      <div class="cuerpo-c">
        <div class="burbuja-c"><strong>${c.autor.nombre}</strong>${c.autor.rol ? html`<small class="rol">${c.autor.rol}</small>` : null}<p>${c.texto}</p>${conteo}</div>
        <div class="acciones-c">
          <time title=${c.creado ? new Date(c.creado).toLocaleString('es-CO') : ''}>${tiempoNoticia(c.creado)}${c.editado ? ' · editado' : ''}</time>
          ${botonReaccion('comentario', `${espacio}:${ref}:${c.indice}`, reac, (n) => { reac = n; pintarConteo(); }, true)}
          <button type="button" class="accion-c" onclick=${responder}>Responder</button>
          ${c.mio || puede('editar_admins') || sesion.usuario?.rol === 'ADMIN' ? html`<button type="button" class="accion-c peligro" onclick=${() => void quitar()}>Eliminar</button>` : null}
        </div>
        ${verResp}
      </div>`, hijos);
    // El redactor de respuesta va dentro del cuerpo (debajo de las acciones), antes de las respuestas.
    return fila;
  };

  /** Campo para comentar o responder (Enter envía). */
  const redactor = (placeholder: string, enviar: (t: string) => Promise<void>, foco = false): HTMLElement => {
    const f = document.createElement('form');
    f.className = 'redactor';
    const i = document.createElement('input');
    i.placeholder = placeholder;
    i.maxLength = 4000;
    i.setAttribute('aria-label', placeholder);
    const b = html`<button type="submit" class="enviar-c" title="Publicar" aria-label="Publicar"><iswc-icon icon="mdi:send"></iswc-icon></button>`;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const t = i.value.trim();
      if (!t) return;
      i.disabled = true;
      try {
        await enviar(t);
        i.value = '';
      } catch (er) {
        avisar(textoError(er), 'danger');
      } finally {
        i.disabled = false;
      }
    });
    const u = usuarioActivo();
    f.append(html`<span class="avatar" aria-hidden="true">${u ? iniciales(u.nombre) : '?'}</span>`, i, b);
    if (foco) requestAnimationFrame(() => i.focus());
    return f;
  };

  const cargarRaices = async () => {
    try {
      const p = await api<PaginaC>('GET', `comentarios?espacio=${espacio}&ref=${encodeURIComponent(ref)}&page=${page}&pageSize=10`);
      totalComentarios = p.total;
      lista.append(...p.comentarios.map((c) => filaComentario(c, 0)));
      masRaices.hidden = !p.hayMas;
      masRaices.textContent = 'Ver más comentarios';
      page++;
      pintarResumen();
    } catch (e) {
      lista.append(html`<p class="nota">${textoError(e)}</p>`);
    }
  };
  masRaices.addEventListener('click', () => void cargarRaices());

  const principal = usuarioActivo()
    ? redactor('Escribe un comentario…', async (texto) => {
      const c = await api<Comentario>('POST', 'comentarios', { espacio, ref, texto });
      lista.prepend(filaComentario(c, 0));
      totalComentarios++;
      pintarResumen();
    })
    : html`<p class="entra-comentar"><iswc-icon icon="mdi:login"></iswc-icon>Entra para comentar y reaccionar.</p>`;

  const acciones = document.createElement('div');
  acciones.className = 'acciones-social';
  const montarAcciones = () => acciones.replaceChildren(
    botonReaccion(espacio, ref, r, (n) => { r = n; pintarResumen(); }),
    html`<button type="button" class="accion" onclick=${() => (caja.querySelector('.redactor input') as HTMLInputElement | null)?.focus()}><iswc-icon icon="mdi:comment-outline"></iswc-icon>Comentar</button>`,
  );
  caja.append(resumen, acciones, principal, lista, masRaices);
  void api<Record<string, Resumen>>('GET', `reacciones?espacio=${espacio}&refs=${encodeURIComponent(ref)}`).then((res) => {
    r = res[ref] ?? r;
    montarAcciones();
    pintarResumen();
  }).catch(() => montarAcciones());
  void cargarRaices();
  return caja;
}
