// @contexto HANDOFF.md §2b puntos 3 y 4
/**
 * <peon-noticias> — noticias diarias y páginas de la campaña. Secciones en un CARRUSEL (no pestañas):
 *   Noticias      tarjetas (con `publicar_noticias` también los borradores) · «Nueva noticia» · «Redactar con el VPS»
 *   El candidato  biografía + trayectoria (páginas editables: `<peon-noticia categoria=…>`)
 *   Cómo votar    tutorial paso a paso + acceso a la consulta del puesto
 *   Publicidad    piezas descargables dibujadas en el navegador (core/publicidad.ts) y el logo
 *   Para redes    creador de piezas para redes a partir de una noticia (SVG determinista → PNG, core/piezas-redes.ts)
 *   Privacidad    política de tratamiento de datos + aviso «no es app oficial del Gobierno»
 * Noticias tiene portada de periódico (core/noticias.ts) y, para editores, «Administrar con IA»: pegar el enlace de
 * otro medio y elegir Enlazar (tarjeta que abre la original), Adaptar o Replicar (con fuente y enlace) vía el VPS.
 * Todo se refresca solo con `peon:datos` (evento «cambio» de la API).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import type { Noticia, NoticiaFila } from '../../../src/js/consts/schemas/api.schemas.js';
import { api, puede, sesion, usuarioActivo } from '../../../src/js/core/api.js';
import { CATEGORIAS_NOTICIA, fecha } from '../../../src/js/core/catalogos.js';
import { CAMPANA } from '../../../src/js/core/config.js';
import { portadaNoticias } from '../../../src/js/core/noticias.js';
import { carruselSecciones } from '../../../src/js/core/carrusel.js';
import { creadorPiezas } from '../../../src/js/core/piezas-redes.js';
import { vista } from '../../../src/js/core/catalogos.js';
import { FORMATOS, archivoPieza, dibujarPieza } from '../../../src/js/core/publicidad.js';
import { abrirChat, abrirNoticia, ir, textoError, valor } from '../../../src/js/core/ui.js';

/** Tarjeta de una noticia (también la usa Inicio a través de su propio marcado). */
class PeonNoticias extends Componente<VistaProps> {
  static tag = 'peon-noticias';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-button', 'iswc-input', 'iswc-tag', 'iswc-icon', 'iswc-empty-state', 'iswc-callout', 'iswc-qrcode', 'peon-noticia'];

  #lista: HTMLElement | null = null;
  #filas: NoticiaFila[] = [];
  #seccion = 'noticias';

  protected override inicial(): VistaProps {
    return { pestana: '' };
  }

  override onConnected(): void {
    super.onConnected();
    window.addEventListener('peon:datos', this.#alCambiar);
  }

  override onDisconnected(): void {
    window.removeEventListener('peon:datos', this.#alCambiar);
  }

  /** Solo la lista se refresca (las páginas `<peon-noticia>` se refrescan solas). */
  #alCambiar = (e: Event): void => {
    const d = (e as CustomEvent<{ entidad?: string }>).detail;
    if (d?.entidad === 'noticia') void this.#cargarLista();
  };

  async #cargarLista(): Promise<void> {
    const l = this.#lista;
    if (!l) return;
    try {
      const filas = await api<NoticiaFila[]>('GET', `noticias?categoria=noticia${puede('publicar_noticias') ? '&todas=1' : ''}`);
      this.#filas = filas;
      l.replaceChildren(filas.length
        ? portadaNoticias(filas)
        : html`<iswc-empty-state icono="mdi:newspaper-variant-outline" titulo="Aún no hay noticias" texto=${puede('publicar_noticias') ? 'Crea la primera o pídesela al VPS.' : 'Las noticias de la campaña aparecerán aquí.'}></iswc-empty-state>`);
    } catch (e) {
      l.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`);
    }
  }

  async #crear(form: HTMLElement, boton: HTMLElement): Promise<void> {
    const titulo = valor(form, 'n-titulo');
    if (!titulo) return avisar('Escribe el título', 'warning');
    boton.setAttribute('loading', '');
    try {
      const n = await api<Noticia>('POST', 'noticias', { titulo, cuerpo_md: valor(form, 'n-cuerpo') || `## ${titulo}\n\nEscribe aquí la noticia.`, estado: 'borrador' });
      avisar('Borrador creado: complétalo y publícalo', 'success');
      form.querySelectorAll('[data-campo]').forEach((c) => ((c as HTMLElement & { value?: string }).value = ''));
      abrirNoticia(n.id);
    } catch (e) {
      avisar(textoError(e), 'danger');
    } finally {
      boton.removeAttribute('loading');
    }
  }

  #noticias(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    this.#lista = document.createElement('div');
    this.#lista.className = 'portada-lista';
    this.#lista.append(html`<iswc-empty-state estado="cargando"></iswc-empty-state>`);
    const editor = puede('publicar_noticias');
    const form = document.createElement('div');
    form.className = 'admin-ia';
    if (editor) {
      const conVps = puede('chat_con_vps');
      const pedirVps = (modo: 'enlace' | 'adaptada' | 'replica') => {
        const url = valor(form, 'n-url');
        if (!/^https:\/\//.test(url)) return avisar('Pega el enlace https de la noticia original', 'warning');
        const instruccion = modo === 'enlace'
          ? `Crea una noticia de tipo «enlace» a ${url}: saca el título, un resumen de 2 líneas, la imagen principal (URL https) y el nombre del medio (fuente). Sin cuerpo propio. Déjala como borrador.`
          : modo === 'adaptada'
            ? `Adapta para la campaña la noticia de ${url} (tipo «adaptada»): reescríbela corta y clara en Markdown, con título, resumen e imagen, y cita la fuente y el enlace original. Déjala como borrador.`
            : `Replica la noticia de ${url} (tipo «adaptada», fiel al original): título, resumen, imagen y cuerpo en Markdown, citando la fuente y con el enlace original al final. Déjala como borrador.`;
        abrirChat({ tipo: 'pantalla', id: null, titulo: null, fragmento: null, pantalla: 'Noticias' }, instruccion);
      };
      const enlazarManual = async (boton: HTMLElement) => {
        const url = valor(form, 'n-url');
        const titulo = valor(form, 'n-titulo');
        if (!/^https:\/\//.test(url) || !titulo) return avisar('Para enlazar sin IA escribe el título y pega el enlace https', 'warning');
        boton.setAttribute('loading', '');
        try {
          const fuente = valor(form, 'n-fuente') || new URL(url).hostname.replace(/^www\./, '');
          await api('POST', 'noticias', { titulo, tipo: 'enlace', enlace_original: url, fuente, estado: 'borrador' });
          avisar('Enlace creado como borrador: revísalo y publícalo', 'success');
          void this.#cargarLista();
        } catch (e) {
          avisar(textoError(e), 'danger');
        } finally {
          boton.removeAttribute('loading');
        }
      };
      form.append(html`
        <div class="cabeza-nueva"><iswc-icon icon="mdi:robot-happy-outline"></iswc-icon><strong>Administrar noticias con IA</strong><small>Pega el enlace de una noticia de otro medio y elige: enlazarla (se abre la original), adaptarla o replicarla citando la fuente. O pídele al VPS que redacte una nueva.</small></div>
        <div class="campos-nueva">
          <iswc-input data-campo="n-url" label="Enlace de la noticia original" placeholder="https://…" full-width><iswc-icon slot="prefix" icon="mdi:link-variant"></iswc-icon></iswc-input>
        </div>
        <div class="acciones">
          ${conVps ? html`
            <iswc-button size="small" color="brand" onclick=${() => pedirVps('enlace')}><iswc-icon slot="start" icon="mdi:open-in-new"></iswc-icon>Enlazar</iswc-button>
            <iswc-button size="small" color="brand" onclick=${() => pedirVps('adaptada')}><iswc-icon slot="start" icon="mdi:auto-fix"></iswc-icon>Adaptar</iswc-button>
            <iswc-button size="small" variant="outlined" onclick=${() => pedirVps('replica')}><iswc-icon slot="start" icon="mdi:content-copy"></iswc-icon>Replicar</iswc-button>
            <iswc-button size="small" variant="outlined" data-redactar-vps onclick=${() => abrirChat({ tipo: 'pantalla', id: null, titulo: null, fragmento: null, pantalla: 'Noticias' }, 'Redacta una noticia corta para la campaña sobre: ')}><iswc-icon slot="start" icon="mdi:pencil-outline"></iswc-icon>Redactar con el VPS</iswc-button>` : null}
        </div>
        <details class="sin-ia">
          <summary>Sin IA: enlace manual o borrador propio</summary>
          <div class="campos-nueva">
            <iswc-input data-campo="n-titulo" label="Título" maxlength="160" full-width></iswc-input>
            <iswc-input data-campo="n-fuente" label="Medio (fuente)" placeholder="El Tiempo, La Crónica…" full-width></iswc-input>
            <iswc-input data-campo="n-cuerpo" label="Primer párrafo (para un borrador propio)" full-width></iswc-input>
          </div>
          <div class="acciones">
            <iswc-button size="small" variant="outlined" onclick=${(e: Event) => void enlazarManual(e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:link-plus"></iswc-icon>Crear enlace</iswc-button>
            <iswc-button size="small" variant="outlined" data-crear onclick=${(e: Event) => void this.#crear(form, e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:plus"></iswc-icon>Crear borrador propio</iswc-button>
          </div>
        </details>`);
    }
    caja.append(html`${editor ? form : null}${this.#lista}`);
    void this.#cargarLista();
    return caja;
  }

  #pagina(categoria: string): HTMLElement {
    const p = document.createElement('peon-noticia');
    p.className = 'pagina';
    Object.assign(p, { props: { id: 0, categoria, sinTitulo: false } });
    return p;
  }

  #candidato(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja paginas';
    caja.append(html`
      <header class="ficha-candidato">
        <img src=${CAMPANA.fotoChica} alt=${CAMPANA.candidato} width="238" height="180" loading="lazy">
        <div>
          <p class="manuscrito">Pequeño en apariencia, grande en propósito</p>
          <h2 class="titular">${CAMPANA.candidato}</h2>
          <p class="lema-cinta"><span>${CAMPANA.lema}</span></p>
        </div>
      </header>`, this.#pagina('biografia'), this.#pagina('trayectoria'));
    return caja;
  }

  #votar(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja paginas';
    caja.append(html`
      ${sesion.usuario?.escribe ? html`<button type="button" class="llamado" data-consultar-puesto onclick=${() => ir('registro', 'consulta')}><iswc-icon icon="mdi:map-marker-radius-outline"></iswc-icon><span><strong>¿Dónde voto?</strong><small>Consulta el puesto y la mesa con la cédula</small></span><iswc-icon icon="mdi:chevron-right"></iswc-icon></button>` : null}
      ${this.#pagina('tutorial')}`);
    return caja;
  }

  #publicidad(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    const piezas = document.createElement('div');
    piezas.className = 'piezas';
    for (const f of FORMATOS) {
      const marco = document.createElement('figure');
      marco.className = 'pieza';
      marco.dataset.formato = f.id;
      marco.style.setProperty('--proporcion', `${f.ancho} / ${f.alto}`);
      const lienzo = document.createElement('div');
      lienzo.className = 'lienzo';
      void dibujarPieza(f).then((c) => lienzo.replaceChildren(c));
      const bajar = async (compartir: boolean) => {
        try {
          const archivo = await archivoPieza(f);
          const nav = navigator as Navigator & { canShare?(d: { files: File[] }): boolean };
          if (compartir && nav.canShare?.({ files: [archivo] })) return await navigator.share({ files: [archivo], title: CAMPANA.candidato, text: CAMPANA.lema });
          const url = URL.createObjectURL(archivo);
          const a = document.createElement('a');
          a.href = url;
          a.download = archivo.name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (e) {
          if ((e as Error).name !== 'AbortError') avisar(textoError(e), 'danger');
        }
      };
      marco.append(lienzo, html`
        <figcaption><strong>${f.titulo}</strong><small>${f.ayuda} · ${f.ancho}×${f.alto}</small></figcaption>
        <div class="acciones">
          <iswc-button size="small" color="brand" data-descargar=${f.id} onclick=${() => void bajar(false)}><iswc-icon slot="start" icon="mdi:download-outline"></iswc-icon>Descargar</iswc-button>
          ${'share' in navigator ? html`<iswc-button size="small" variant="outlined" onclick=${() => void bajar(true)}><iswc-icon slot="start" icon="mdi:share-variant-outline"></iswc-icon>Compartir</iswc-button>` : null}
        </div>`);
      piezas.append(marco);
    }
    const app = location.href.split('#')[0]!.split('?')[0]!;
    caja.append(html`
      <p class="nota-publicidad"><iswc-icon icon="mdi:information-outline"></iswc-icon>${CAMPANA.fotoCompleta ? 'Las piezas llevan la foto oficial del candidato.' : 'Mientras llega la foto oficial del candidato, las piezas llevan el logo de la campaña.'}</p>
      ${piezas}
      <div class="extras">
        <figure class="pieza logo"><img src="./assets/logo-512.webp" alt="Logo de La Fuerza del Peón en Marcha" width="256" height="256"><figcaption><strong>Logo</strong><small>512×512</small></figcaption><div class="acciones"><a class="enlace-boton" href="./assets/logo-512.webp" download="logo-peon-en-marcha.webp"><iswc-icon icon="mdi:download-outline"></iswc-icon>Descargar</a></div></figure>
        <figure class="pieza qr"><iswc-qrcode value=${app} size="180"></iswc-qrcode><figcaption><strong>Código QR de la app</strong><small>Para imprimir en volantes</small></figcaption></figure>
      </div>`);
    return caja;
  }

  #privacidad(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja paginas';
    caja.append(this.#pagina('privacidad'));
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    const secciones = vista('noticias').pestanas.filter((p) => p.publica || usuarioActivo());
    if (props.pestana && secciones.some((p) => p.id === props.pestana)) this.#seccion = props.pestana;
    const cuerpo = document.createElement('div');
    cuerpo.className = 'cuerpo-seccion';
    const mostrar = (id: string) => {
      this.#seccion = id;
      cuerpo.replaceChildren(id === 'candidato' ? this.#candidato() : id === 'votar' ? this.#votar() : id === 'publicidad' ? this.#publicidad() : id === 'redes' ? creadorPiezas(() => this.#filas) : id === 'privacidad' ? this.#privacidad() : this.#noticias());
    };
    root.append(carruselSecciones(secciones.map((p) => ({ id: p.id, titulo: p.titulo, icono: p.icono })), this.#seccion, mostrar), cuerpo);
    mostrar(this.#seccion);
  }
}

define(PeonNoticias);
