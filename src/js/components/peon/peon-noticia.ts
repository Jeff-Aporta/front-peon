// @contexto HANDOFF.md §2b punto 4 · api-peon/src/rutas/noticias.ts
/**
 * <peon-noticia> — lector (y editor, con `publicar_noticias`) de UNA noticia o página de la campaña.
 *
 *   props.id         la noticia a mostrar; si es 0 y hay `categoria`, la primera publicada de esa categoría
 *                    (así Inicio y la vista Noticias muestran la biografía, la trayectoria, el tutorial o la privacidad).
 *   props.sinTitulo  oculta la cabecera (cuando quien lo embebe ya pone el título).
 *
 * El cuerpo es Markdown con HTML y componentes `iswc-*` (core/md.ts: md-lite + md-hydrate del kit, saneado).
 * EDITAR UN FRAGMENTO: mantener presionado (táctil) o clic derecho sobre un párrafo → `<iswc-context-menu>` del kit
 * → «Enviar al VPS para editar» abre el chat (cajón) con ese fragmento citado; también «Copiar fragmento». Si hay
 * texto seleccionado, el fragmento es la selección; si no, el bloque (párrafo, ítem, título, fila) bajo el dedo.
 * Editor: título, resumen, imagen, categoría y cuerpo con vista previa en vivo; publicar, pasar a borrador, archivar.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../base/componente.js';
import type { PeonNoticiaProps } from '../../consts/schemas/componentes.schemas.js';
import type { Noticia, NoticiaFila } from '../../consts/schemas/api.schemas.js';
import { api, puede } from '../../core/api.js';
import { CATEGORIAS_NOTICIA, fecha } from '../../core/catalogos.js';
import { pintarMd } from '../../core/md.js';
import { abrirChat, copiar, textoError, valor } from '../../core/ui.js';

type Menu = HTMLElement & { openAt?(x: number, y: number): void; close?(): void };

const BLOQUES = 'p, li, h1, h2, h3, h4, blockquote, tr, iswc-callout, figure';
const PRESION_MS = 550;

class PeonNoticia extends Componente<PeonNoticiaProps> {
  static tag = 'peon-noticia';
  static css = css;
  static deps = ['iswc-icon', 'iswc-tag', 'iswc-button', 'iswc-context-menu', 'iswc-share-button', 'iswc-input', 'iswc-textarea', 'iswc-select', 'iswc-empty-state', 'iswc-callout', 'iswc-confirm-modal'];

  #noticia: Noticia | null = null;
  #editando = false;
  #fragmento = '';
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

  /** El fragmento bajo el dedo/puntero: la selección, o el bloque más cercano dentro del cuerpo. */
  #fragmentoEn(e: Event, cuerpo: HTMLElement): string {
    const sel = (this.shadow as ShadowRoot & { getSelection?(): Selection | null })?.getSelection?.() ?? document.getSelection();
    const elegido = sel?.toString().trim() ?? '';
    if (elegido) return elegido.slice(0, 2000);
    const origen = e.composedPath().find((n) => n instanceof Element && n.matches(BLOQUES) && cuerpo.contains(n)) as Element | undefined;
    return (origen ?? cuerpo).textContent?.replace(/\s+/g, ' ').trim().slice(0, 2000) ?? '';
  }

  /** Menú contextual: clic derecho, o mantener presionado en pantallas táctiles. */
  #engancharMenu(cuerpo: HTMLElement, menu: Menu): void {
    const abrir = (e: Event, x: number, y: number) => {
      this.#fragmento = this.#fragmentoEn(e, cuerpo);
      if (!this.#fragmento) return;
      menu.querySelector('[data-fragmento]')?.replaceChildren(this.#fragmento.length > 90 ? `${this.#fragmento.slice(0, 90)}…` : this.#fragmento);
      menu.openAt?.(x, y);
    };
    cuerpo.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      abrir(e, e.clientX, e.clientY);
    });
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let inicio = { x: 0, y: 0 };
    cuerpo.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      inicio = { x: e.clientX, y: e.clientY };
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        cuerpo.setAttribute('data-presionado', '');
        abrir(e, inicio.x, inicio.y);
      }, PRESION_MS);
    });
    const cancelar = () => {
      clearTimeout(temporizador);
      cuerpo.removeAttribute('data-presionado');
    };
    cuerpo.addEventListener('pointerup', cancelar);
    cuerpo.addEventListener('pointercancel', cancelar);
    cuerpo.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 10) cancelar();
    });
  }

  #alElegir(valorMenu: string): void {
    const n = this.#noticia;
    if (!n) return;
    if (valorMenu === 'vps') {
      abrirChat({ tipo: 'noticia', id: n.id, titulo: n.titulo, fragmento: this.#fragmento, pantalla: null });
    } else if (valorMenu === 'copiar') {
      void copiar(this.#fragmento).then((ok) => avisar(ok ? 'Fragmento copiado' : 'No se pudo copiar', ok ? 'success' : 'warning'));
    }
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
    const menu = document.createElement('iswc-context-menu') as Menu;
    menu.append(html`
      <div class="menu-fragmento" data-fragmento></div>
      ${chat ? html`<button class="item" data-value="vps"><iswc-icon icon="mdi:robot-outline"></iswc-icon> Enviar al VPS para editar</button>` : null}
      <button class="item" data-value="copiar"><iswc-icon icon="mdi:content-copy"></iswc-icon> Copiar fragmento</button>`);
    menu.addEventListener('iswc-select', (e) => this.#alElegir((e as CustomEvent<{ value: string }>).detail.value));
    this.#engancharMenu(cuerpo, menu);
    void root;
    return html`
      <article class="noticia" data-categoria=${n.categoria}>
        ${this.props.sinTitulo ? null : html`
          <header class="cabeza">
            <div class="etiquetas">
              <iswc-tag size="small" pill class="cat"><iswc-icon icon=${cat?.icono ?? 'mdi:newspaper-variant-outline'}></iswc-icon> ${cat?.titulo ?? n.categoria}</iswc-tag>
              ${n.estado === 'borrador' ? html`<iswc-tag size="small" pill color="warning">Borrador</iswc-tag>` : null}
              ${n.destacada ? html`<iswc-tag size="small" pill color="brand">Destacada</iswc-tag>` : null}
            </div>
            <h2 class="titulo">${n.titulo}</h2>
            ${n.resumen ? html`<p class="resumen">${n.resumen}</p>` : null}
            <small class="fecha">${n.publicada ? `Publicada ${fecha(n.publicada)}` : `Creada ${fecha(n.creado)}`}${n.actualizado && n.actualizado !== n.creado ? ` · editada ${fecha(n.actualizado)}` : ''}</small>
          </header>`}
        <div class="cinta" aria-hidden="true"></div>
        ${n.imagen ? html`<img class="portada" src=${n.imagen} alt="" loading="lazy">` : null}
        ${cuerpo}
        ${menu}
        <p class="pista"><iswc-icon icon="mdi:gesture-tap-hold"></iswc-icon>${chat ? 'Mantén presionado (o clic derecho) un párrafo para enviarlo al VPS y editarlo.' : 'Mantén presionado (o clic derecho) un párrafo para copiarlo.'}</p>
        <footer class="acciones">
          ${n.estado === 'publicada' ? html`<iswc-share-button share-title=${n.titulo} text=${n.resumen ?? n.titulo}></iswc-share-button>` : null}
          ${chat ? html`<iswc-button size="small" variant="outlined" data-pedir-vps onclick=${() => abrirChat({ tipo: 'noticia', id: n.id, titulo: n.titulo, fragmento: null, pantalla: null }, 'Mejora esta noticia: hazla más clara y cercana, sin cambiar los datos.')}><iswc-icon slot="start" icon="mdi:robot-outline"></iswc-icon>Pedir al VPS</iswc-button>` : null}
          ${editor ? html`
            <iswc-button size="small" variant="outlined" data-editar onclick=${() => { this.#editando = true; this.props = {}; }}><iswc-icon slot="start" icon="mdi:pencil-outline"></iswc-icon>Editar</iswc-button>
            ${n.estado === 'borrador'
              ? html`<iswc-button size="small" color="brand" class="morado" data-publicar onclick=${(e: Event) => void this.#guardar({ estado: 'publicada' }, e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:send-check-outline"></iswc-icon>Publicar</iswc-button>`
              : html`<iswc-button size="small" variant="text" data-despublicar onclick=${(e: Event) => void this.#guardar({ estado: 'borrador' }, e.currentTarget as HTMLElement)}>Pasar a borrador</iswc-button>`}
            <iswc-button size="small" variant="text" color="danger" data-archivar onclick=${(e: Event) => {
              const m = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement | null;
              m?.setAttribute('open', '');
            }}><iswc-icon slot="start" icon="mdi:archive-outline"></iswc-icon>Archivar</iswc-button>
            <iswc-confirm-modal heading="Archivar noticia" message="Deja de verse en la app. No se borra: queda en la bitácora." color="danger" confirm-label="Archivar" oniswc-confirm-confirm=${() => void this.#archivar()}></iswc-confirm-modal>` : null}
        </footer>
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
      </div>
      <div class="dos">
        <iswc-textarea data-campo="cuerpo" label="Contenido (Markdown: acepta HTML y componentes iswc-*)" rows="14" value=${n.cuerpo_md} oniswc-input=${alEscribir}></iswc-textarea>
        <div class="previa"><small class="rotulo">Vista previa</small>${vista}</div>
      </div>
      <p class="ayuda"><iswc-icon icon="mdi:information-outline"></iswc-icon>Avisos: <code>&gt; [!TIP] Título</code> · tablas con <code>|</code> · componentes como <code>&lt;iswc-tag&gt;</code> en su propia línea. También puedes pedírselo al VPS desde el chat.</p>
      <footer class="acciones">
        <iswc-button size="small" color="brand" data-guardar onclick=${(e: Event) => {
          const raiz = caja;
          void this.#guardar({ titulo: valor(raiz, 'titulo'), categoria: valor(raiz, 'categoria') as Noticia['categoria'], resumen: valor(raiz, 'resumen') || null, imagen: valor(raiz, 'imagen') || null, cuerpo_md: String((raiz.querySelector('[data-campo="cuerpo"]') as HTMLElement & { value?: string } | null)?.value ?? '') }, e.currentTarget as HTMLElement);
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
