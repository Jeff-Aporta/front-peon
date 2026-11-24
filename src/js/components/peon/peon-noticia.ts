// @contexto HANDOFF.md §2b punto 4 · api-peon/src/rutas/noticias.ts
/**
 * <peon-noticia> — lector (y editor, con `publicar_noticias`) de UNA noticia o página de la campaña.
 *
 *   props.id         la noticia a mostrar; si es 0 y hay `categoria`, la primera publicada de esa categoría
 *                    (así Inicio y la vista Noticias muestran la biografía, la trayectoria, el tutorial o la privacidad).
 *   props.sinTitulo  oculta la cabecera (cuando quien lo embebe ya pone el título).
 *
 * El cuerpo es Markdown con HTML y componentes `iswc-*` (core/md.ts: md-lite + md-hydrate del kit, saneado).
 * Editar con IA: el botón «Pedir al VPS» (y el asistente flotante) abren el chat con esta noticia como contexto.
 * Editor: título, resumen, imagen, categoría y cuerpo con vista previa en vivo; publicar, pasar a borrador, archivar.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../base/componente.js';
import type { PeonNoticiaProps } from '../../consts/schemas/componentes.schemas.js';
import type { Noticia, NoticiaFila } from '../../consts/schemas/api.schemas.js';
import { api, puede } from '../../core/api.js';
import { tiempoNoticia } from '../../core/noticias.js';
import { bloqueSocial } from '../../core/social.js';
import { CATEGORIAS_NOTICIA, fecha } from '../../core/catalogos.js';
import { pintarMd } from '../../core/md.js';
import { abrirChat, textoError, valor } from '../../core/ui.js';


const BLOQUES = 'p, li, h1, h2, h3, h4, blockquote, tr, iswc-callout, figure';
const PRESION_MS = 550;

/** Compartir con el menú del sistema (celular) o copiar el enlace (escritorio). */
async function compartir(n: Noticia): Promise<void> {
  const url = n.enlace_original && n.tipo === 'enlace' ? n.enlace_original : location.href.split('#')[0]!;
  try {
    const nav = navigator as Navigator;
    if (typeof nav.share === 'function') await nav.share({ title: n.titulo, text: n.resumen ?? n.titulo, url });
    else {
      await nav.clipboard.writeText(`${n.titulo} — ${url}`);
      avisar('Enlace copiado', 'success');
    }
  } catch { /* cancelado */ }
}

class PeonNoticia extends Componente<PeonNoticiaProps> {
  static tag = 'peon-noticia';
  static css = css;
  static deps = ['iswc-icon', 'iswc-tag', 'iswc-button', 'iswc-share-button', 'iswc-input', 'iswc-textarea', 'iswc-select', 'iswc-empty-state', 'iswc-callout', 'iswc-confirm-modal'];

  #noticia: Noticia | null = null;
  #editando = false;
  #hidratacion: { cancelar(): void } | null = null;

  protected override inicial(): PeonNoticiaProps {
    return { id: 0, categoria: '', sinTitulo: false };
  }

  override onConnected(): void {
    super.onConnected();
    window.addEventListener('peon:datos', this.#alCambiar);
  }

  override onDisconnected(): void {
    window.removeEventListener('peon:datos', this.#alCambiar);
    this.#hidratacion?.cancelar();
  }

  /** Otra sesión (o el VPS) editó: se recarga, salvo que aquí se esté editando. */
  #alCambiar = (e: Event): void => {
    const d = (e as CustomEvent<{ entidad?: string }>).detail;
    if (d?.entidad === 'noticia' && !this.#editando) this.props = {};
  };

  protected override parcial(props: PeonNoticiaProps, previos: PeonNoticiaProps): boolean {
    if (props.id !== previos.id || props.categoria !== previos.categoria) this.#editando = false;
    return false;
  }

  async #cargar(): Promise<Noticia | null> {
    let id = this.props.id;
    if (!id && this.props.categoria) {
      const lista = await api<NoticiaFila[]>('GET', `noticias?categoria=${encodeURIComponent(this.props.categoria)}&limite=1`);
      id = lista[0]?.id ?? 0;
    }
    if (!id) return null;
    return await api<Noticia>('GET', `noticias/${id}`);
  }

  async #guardar(cambios: Partial<Noticia>, boton?: HTMLElement): Promise<void> {
    const n = this.#noticia;
    if (!n) return;
    boton?.setAttribute('loading', '');
    try {
      this.#noticia = await api<Noticia>('PUT', `noticias/${n.id}`, cambios);
      this.#editando = false;
      avisar(cambios.estado === 'publicada' ? 'Publicada: les llega a todos en la campana' : 'Guardado', 'success');
      this.props = {};
    } catch (e) {
      avisar(textoError(e), 'danger');
    } finally {
      boton?.removeAttribute('loading');
    }
  }

  async #archivar(): Promise<void> {
    const n = this.#noticia;
    if (!n) return;
    try {
      await api('DELETE', `noticias/${n.id}`);
      avisar('Archivada (no se borra: queda en la bitácora)', 'success');
      this.#noticia = null;
      this.closest('iswc-drawer')?.removeAttribute('open');
      this.props = {};
    } catch (e) {
      avisar(textoError(e), 'danger');
    }
  }

  #lector(n: Noticia, root: ShadowRoot): DocumentFragment {
    const editor = puede('publicar_noticias');
    const chat = puede('chat_con_vps');
    const cat = CATEGORIAS_NOTICIA[n.categoria];
    const cuerpo = document.createElement('div');
    cuerpo.className = 'md cuerpo';
    cuerpo.setAttribute('data-cuerpo', '');
    this.#hidratacion?.cancelar();
    this.#hidratacion = pintarMd(cuerpo, n.cuerpo_md);
    void root;
    return html`
      <article class="noticia" data-categoria=${n.categoria}>
        <nav class="herramientas" aria-label="Herramientas de la noticia">
          ${n.estado === 'publicada' ? html`<button type="button" class="herr" title="Compartir" aria-label="Compartir" onclick=${() => void compartir(n)}><iswc-icon icon="mdi:share-variant-outline"></iswc-icon></button>` : null}
          ${chat ? html`<button type="button" class="herr" data-pedir-vps title="Pedir cambios al asistente" aria-label="Pedir cambios al asistente" onclick=${() => abrirChat({ tipo: 'noticia', id: n.id, titulo: n.titulo, fragmento: null, pantalla: null }, '')}><iswc-icon icon="mdi:robot-outline"></iswc-icon></button>` : null}
          ${editor ? html`
            <button type="button" class="herr" data-editar title="Editar" aria-label="Editar" onclick=${() => { this.#editando = true; this.props = {}; }}><iswc-icon icon="mdi:pencil-outline"></iswc-icon></button>
            ${n.estado === 'borrador'
              ? html`<button type="button" class="herr destacada" data-publicar title="Publicar" aria-label="Publicar" onclick=${(e: Event) => void this.#guardar({ estado: 'publicada' }, e.currentTarget as HTMLElement)}><iswc-icon icon="mdi:send-check-outline"></iswc-icon></button>`
              : html`<button type="button" class="herr" data-despublicar title="Pasar a borrador" aria-label="Pasar a borrador" onclick=${(e: Event) => void this.#guardar({ estado: 'borrador' }, e.currentTarget as HTMLElement)}><iswc-icon icon="mdi:file-undo-outline"></iswc-icon></button>`}
            <button type="button" class="herr peligro" data-archivar title="Archivar" aria-label="Archivar" onclick=${(e: Event) => ((e.currentTarget as HTMLElement).parentElement?.querySelector('iswc-confirm-modal') as HTMLElement | null)?.setAttribute('open', '')}><iswc-icon icon="mdi:archive-outline"></iswc-icon></button>
            <iswc-confirm-modal heading="Archivar noticia" message="Deja de verse en la app. No se borra: queda en la bitácora." color="danger" confirm-label="Archivar" oniswc-confirm-confirm=${() => void this.#archivar()}></iswc-confirm-modal>` : null}
        </nav>
        ${this.props.sinTitulo ? null : html`
          <header class="cabeza">
            <p class="antetitulo"><span>${cat?.titulo ?? n.categoria}</span>${n.tipo && n.tipo !== 'propia' && n.fuente ? html` · ${n.tipo === 'adaptada' ? 'Adaptada de' : 'En'} <strong>${n.fuente}</strong>` : null}
              ${n.estado === 'borrador' ? html`<iswc-tag size="small" pill color="warning">Borrador</iswc-tag>` : null}
              ${n.destacada ? html`<iswc-tag size="small" pill color="brand">Destacada</iswc-tag>` : null}</p>
            <h2 class="titulo">${n.titulo}</h2>
            ${n.resumen ? html`<p class="resumen">${n.resumen}</p>` : null}
            <div class="firma">
              <img src="./assets/logo-160.webp" alt="" width="36" height="36">
              <span><strong>${n.tipo && n.tipo !== 'propia' && n.fuente ? n.fuente : 'La Fuerza del Peón en Marcha'}</strong>
                <small title=${fecha(n.publicada ?? n.creado)}>${n.publicada ? `Publicada ${tiempoNoticia(n.publicada)}` : `Creada ${tiempoNoticia(n.creado)}`}${n.actualizado && n.actualizado !== n.creado ? ` · editada ${tiempoNoticia(n.actualizado)}` : ''}</small></span>
            </div>
          </header>`}
        ${n.imagen ? html`<figure class="portada"><img src=${n.imagen} alt="" loading="lazy">${n.fuente && n.tipo !== 'propia' ? html`<figcaption>Imagen: ${n.fuente}</figcaption>` : null}</figure>` : html`<div class="cinta" aria-hidden="true"></div>`}
        ${cuerpo}
        ${n.estado === 'publicada' && !this.props.sinTitulo ? bloqueSocial('noticia', String(n.id)) : null}
        ${n.enlace_original ? html`<a class="original" href=${n.enlace_original} target="_blank" rel="noopener noreferrer"><iswc-icon icon="mdi:open-in-new"></iswc-icon>Leer la noticia original${n.fuente ? ` en ${n.fuente}` : ''}</a>` : null}
      </article>`;
  }

  #editor(n: Noticia): DocumentFragment {
    const vista = document.createElement('div');
    vista.className = 'md cuerpo vista-previa';
    let h = pintarMd(vista, n.cuerpo_md);
    let espera: ReturnType<typeof setTimeout> | undefined;
    const alEscribir = (e: Event) => {
      clearTimeout(espera);
      const v = String((e.currentTarget as HTMLElement & { value?: string }).value ?? '');
      espera = setTimeout(() => {
        h.cancelar();
        h = pintarMd(vista, v);
      }, 250);
    };
    const caja = document.createElement('form');
    caja.className = 'editor';
    caja.addEventListener('submit', (e) => e.preventDefault());
    caja.append(html`
      <div class="rejilla-editor">
        <iswc-input data-campo="titulo" label="Título" value=${n.titulo} maxlength="160" full-width></iswc-input>
        <iswc-select data-campo="categoria" label="Sección" value=${n.categoria} full-width>${Object.entries(CATEGORIAS_NOTICIA).map(([k, v]) => html`<iswc-option value=${k}>${v.titulo}</iswc-option>`)}</iswc-select>
        <iswc-input data-campo="resumen" label="Resumen (una línea)" value=${n.resumen ?? ''} maxlength="400" full-width></iswc-input>
        <iswc-input data-campo="imagen" label="Imagen (URL https o ./assets/…)" value=${n.imagen ?? ''} full-width></iswc-input>
        <iswc-select data-campo="tipo" label="Tipo" value=${n.tipo ?? 'propia'} full-width><iswc-option value="propia">Propia</iswc-option><iswc-option value="adaptada">Adaptada de otro medio</iswc-option><iswc-option value="enlace">Enlace a la original</iswc-option></iswc-select>
        <iswc-input data-campo="fuente" label="Medio (fuente)" value=${n.fuente ?? ''} maxlength="80" full-width></iswc-input>
        <iswc-input data-campo="enlace_original" label="Enlace a la noticia original (https)" value=${n.enlace_original ?? ''} full-width></iswc-input>
      </div>
      <div class="dos">
        <iswc-textarea data-campo="cuerpo" label="Contenido (Markdown: acepta HTML y componentes iswc-*)" rows="14" value=${n.cuerpo_md} oniswc-input=${alEscribir}></iswc-textarea>
        <div class="previa"><small class="rotulo">Vista previa</small>${vista}</div>
      </div>
      <p class="ayuda"><iswc-icon icon="mdi:information-outline"></iswc-icon>Avisos: <code>&gt; [!TIP] Título</code> · tablas con <code>|</code> · componentes como <code>&lt;iswc-tag&gt;</code> en su propia línea. También puedes pedírselo al VPS desde el chat.</p>
      <footer class="acciones">
        <iswc-button size="small" color="brand" data-guardar onclick=${(e: Event) => {
          const raiz = caja;
          void this.#guardar({ titulo: valor(raiz, 'titulo'), categoria: valor(raiz, 'categoria') as Noticia['categoria'], resumen: valor(raiz, 'resumen') || null, imagen: valor(raiz, 'imagen') || null, tipo: (valor(raiz, 'tipo') || 'propia') as Noticia['tipo'], fuente: valor(raiz, 'fuente') || null, enlace_original: valor(raiz, 'enlace_original') || null, cuerpo_md: String((raiz.querySelector('[data-campo="cuerpo"]') as HTMLElement & { value?: string } | null)?.value ?? '') }, e.currentTarget as HTMLElement);
        }}><iswc-icon slot="start" icon="mdi:content-save-outline"></iswc-icon>Guardar</iswc-button>
        <iswc-button size="small" variant="text" data-cancelar onclick=${() => { this.#editando = false; this.props = {}; }}>Cancelar</iswc-button>
      </footer>`);
    return html`${caja}`;
  }

  protected override pintar(root: ShadowRoot): void {
    const caja = document.createElement('div');
    caja.className = 'caja-noticia';
    root.append(caja);
    if (this.#editando && this.#noticia) {
      caja.append(this.#editor(this.#noticia));
      return;
    }
    caja.append(html`<iswc-empty-state estado="cargando" texto-cargando="Cargando…"></iswc-empty-state>`);
    void this.#cargar().then((n) => {
      this.#noticia = n;
      if (!n) {
        caja.replaceChildren(html`<iswc-empty-state icono="mdi:newspaper-remove" titulo="Todavía no hay nada aquí" texto=${puede('publicar_noticias') ? 'Créala desde la vista Noticias o pídesela al VPS en el chat.' : 'El equipo de campaña la publicará pronto.'}></iswc-empty-state>`);
        return;
      }
      caja.replaceChildren(this.#lector(n, root));
    }).catch((e) => caja.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
  }
}

define(PeonNoticia);
