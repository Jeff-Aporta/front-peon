// @contexto PROMPT-CLAUDE.md §4 · specs/foundation/20-componentes-y-vistas.md
/**
 * <peon-app> — shell de Peón en Marcha. SIN barra superior: todo el control vive en el panel izquierdo.
 *
 *   panel izquierdo   arriba: marca (logo) + botón que colapsa a solo iconos
 *                     centro: navegación PLANA (icono + rótulo; sin grupos ni acordeones)
 *                     abajo:  usuario (avatar con iniciales, nombre y rol) + salir
 *   contenido         la vista activa; dentro, sus herramientas en pestañas (`iswc-tab-group`)
 *
 * Grid CSS (no `iswc-split-panel`). El panel se redimensiona con el tirador (13–26 em, se recuerda) y se colapsa
 * tocando la marca (logo + rótulo). En sm/xs (< 48rem) no va en el layout: barra inferior fija (4 destinos + «Menú»,
 * como FB/IG) y el «Menú» abre un cajón izquierdo (`iswc-drawer`) con todas las vistas, el usuario y salir.
 * Sin scroll en html/body: desplazan sus secciones (la navegación y el contenido).
 * Sin router: `activo` es estado (y se recuerda en `localStorage['peon:vista']`). Sin sesión → `<peon-acceso>`;
 * con clave temporal → `<peon-acceso modo="cambiar">` antes de cualquier vista.
 * Otras vistas piden cambiar de vista con el evento de ventana `peon:ir` `{ vista, pestana? }`.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, html } from '../../base/componente.js';
import type { PeonAppProps } from '../../consts/schemas/componentes.schemas.js';
import type { Vista } from '../../consts/schemas/api.schemas.js';
import { cargarSesion, escuchar, salir, sesion } from '../../core/api.js';
import { VISTAS, vista } from '../../core/catalogos.js';
import { MEDIO_ANGOSTO, angosto } from '../../core/ui.js';

const leer = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const guardar = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch { /* sin almacenamiento */ }
};

/** Ancho del panel izquierdo (em): redimensionable entre el mínimo y el máximo; doble clic en el tirador lo restablece. */
const ANCHO_MIN = 13;
const ANCHO_MAX = 26;
const ANCHO_INICIAL = 16.5;
/** Rótulos cortos de la barra inferior (caben debajo del ícono en 360 px). */
const CORTOS: Record<string, string> = { inicio: 'Inicio', chat: 'Chat', listado: 'Registros', registro: 'Registrar', noticias: 'Noticias' };

const limitar = (n: number): number => Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, n));
const anchoGuardado = (): number => {
  const n = Number(leer('peon:ancho'));
  return Number.isFinite(n) && n > 0 ? limitar(n) : ANCHO_INICIAL;
};

class PeonApp extends Componente<PeonAppProps> {
  static tag = 'peon-app';
  static css = css;
  static deps = ['iswc-icon', 'iswc-person', 'iswc-drawer', 'iswc-spinner', 'peon-acceso', 'peon-campana'];

  #listo = false;
  #soltarCambios: (() => void) | null = null;
  #ancho = anchoGuardado();
  #pestana = '';
  #medio = matchMedia(MEDIO_ANGOSTO);

  protected override inicial(): PeonAppProps {
    return { activo: leer('peon:vista') ?? 'inicio', colapsado: leer('peon:menu') === 'colapsado', cajon: false };
  }

  override onConnected(): void {
    super.onConnected();
    window.addEventListener('peon:sesion', this.#alCambiarSesion);
    window.addEventListener('peon:ir', this.#alIr);
    this.#medio.addEventListener('change', this.#alCambiarMedio);
    void cargarSesion().finally(() => {
      this.#listo = true;
      this.props = {};
    });
    // Tiempo real: cualquier escritura (de otra sesión o de esta) llega como «cambio» y las vistas refrescan sus datos.
    // Se agrupan las ráfagas (350 ms) pero sin perder entidades: sale UN `peon:datos` por entidad distinta
    // (p. ej. publicar una noticia trae «noticia» y «notificacion»; cada vista atiende la suya).
    let espera: ReturnType<typeof setTimeout> | undefined;
    const pendientes = new Map<string, unknown>();
    this.#soltarCambios = escuchar('cambio', (d) => {
      const entidad = d && typeof d === 'object' && 'entidad' in d ? String((d as { entidad: unknown }).entidad) : '';
      pendientes.set(entidad, d);
      clearTimeout(espera);
      espera = setTimeout(() => {
        const lote = [...pendientes.values()];
        pendientes.clear();
        for (const detalle of lote) window.dispatchEvent(new CustomEvent('peon:datos', { detail: detalle }));
      }, 350);
    });
  }

  override onDisconnected(): void {
    window.removeEventListener('peon:sesion', this.#alCambiarSesion);
    window.removeEventListener('peon:ir', this.#alIr);
    this.#soltarCambios?.();
    this.#medio.removeEventListener('change', this.#alCambiarMedio);
  }

  #alCambiarSesion = (): void => {
    this.props = { cajon: false };
  };

  #alCambiarMedio = (): void => {
    this.props = { cajon: false };
  };

  #alIr = (e: Event): void => {
    const d: unknown = e instanceof CustomEvent ? e.detail : null;
    if (d && typeof d === 'object' && 'vista' in d && typeof d.vista === 'string') {
      this.#pestana = 'pestana' in d && typeof d.pestana === 'string' ? d.pestana : '';
      this.#abrir(d.vista);
    }
  };

  #abrir(id: string): void {
    guardar('peon:vista', id);
    this.props = { activo: id, cajon: false };
  }

  #colapsar(): void {
    const colapsado = !this.props.colapsado;
    guardar('peon:menu', colapsado ? 'colapsado' : 'abierto');
    this.props = { colapsado };
  }

  /** Aplica el ancho sin repintar (el arrastre no reconstruye la vista). */
  #fijarAncho(em: number, guardarlo: boolean): void {
    this.#ancho = limitar(em);
    const marco = this.shadow?.querySelector('.marco') as HTMLElement | null | undefined;
    marco?.style.setProperty('--ancho', `${this.#ancho}em`);
    this.shadow?.querySelector('.tirador')?.setAttribute('aria-valuenow', String(Math.round(this.#ancho)));
    if (guardarlo) guardar('peon:ancho', String(this.#ancho));
  }

  #arrastrar(e: PointerEvent): void {
    const tirador = e.currentTarget as HTMLElement;
    const marco = this.shadow?.querySelector('.marco') as HTMLElement | null | undefined;
    if (!marco) return;
    e.preventDefault();
    tirador.setPointerCapture(e.pointerId);
    const em = parseFloat(getComputedStyle(marco).fontSize) || 16;
    const izquierda = marco.getBoundingClientRect().left;
    marco.setAttribute('data-arrastrando', '');
    const mover = (ev: PointerEvent) => this.#fijarAncho((ev.clientX - izquierda) / em, false);
    const soltar = () => {
      tirador.removeEventListener('pointermove', mover);
      marco.removeAttribute('data-arrastrando');
      guardar('peon:ancho', String(this.#ancho));
    };
    tirador.addEventListener('pointermove', mover);
    tirador.addEventListener('pointerup', soltar, { once: true });
    tirador.addEventListener('pointercancel', soltar, { once: true });
  }

  #teclaTirador(e: KeyboardEvent): void {
    const paso = e.shiftKey ? 2 : 0.5;
    if (e.key === 'ArrowLeft') this.#fijarAncho(this.#ancho - paso, true);
    else if (e.key === 'ArrowRight') this.#fijarAncho(this.#ancho + paso, true);
    else if (e.key === 'Home') this.#fijarAncho(ANCHO_MIN, true);
    else if (e.key === 'End') this.#fijarAncho(ANCHO_MAX, true);
    else return;
    e.preventDefault();
  }

  #visibles(): Vista[] {
    const u = sesion.usuario;
    return u ? VISTAS.filter((v) => v.visible(u)) : [];
  }

  #lateral(props: PeonAppProps, actual: string, enCajon: boolean): DocumentFragment {
    const u = sesion.usuario!;
    const colapsado = props.colapsado && !enCajon;
    return html`
      <aside class="lateral" part="lateral" ?data-colapsado=${colapsado} aria-label="Navegación">
        <button class="marca" type="button" data-colapsar title=${enCajon ? 'Cerrar el menú' : colapsado ? 'Desplegar el menú' : 'Colapsar el menú'} aria-expanded=${colapsado ? 'false' : 'true'} onclick=${() => (enCajon ? (this.props = { cajon: false }) : this.#colapsar())}>
          <img class="logo" src="./assets/logo-160.webp" alt="La Fuerza del Peón en Marcha" width="40" height="40">
          <span class="nombre texto"><strong><span class="peon">Peón</span> en Marcha</strong><small>Armenia · Quindío</small></span>
        </button>
        <nav class="nav" aria-label="Vistas">
          ${this.#visibles().map((v) => html`<button class="item" type="button" title=${v.titulo} data-vista=${v.id} ?data-actual=${v.id === actual} aria-current=${v.id === actual ? 'page' : 'false'} onclick=${() => this.#abrir(v.id)}><iswc-icon icon=${v.icono}></iswc-icon><span class="texto">${v.titulo}</span></button>`)}
        </nav>
        ${enCajon ? null : html`<div class="avisos-panel">${this.#campana(colapsado, false)}</div>`}
        <footer class="pie" part="pie">
          <iswc-person class="usuario" nombre=${u.nombre} detalle=${u.rolNombre} ?compacto=${colapsado}></iswc-person>
          <button class="icono salir" type="button" title="Cerrar sesión" data-salir onclick=${() => void salir()}><iswc-icon icon="mdi:logout"></iswc-icon></button>
        </footer>
      </aside>`;
  }

  /** Campana con contador (plugin `notificaciones` de DER): en el panel (md+) o en la barra inferior (sm/xs). */
  #campana(compacta: boolean, barra: boolean): HTMLElement {
    const c = document.createElement('peon-campana');
    Object.assign(c, { props: { compacta, barra } });
    return c;
  }

  /**
   * Barra inferior móvil (como Facebook/Instagram): hasta 4 destinos fijos según permisos + «Menú» (hamburguesa), que
   * abre el cajón con TODAS las vistas, el usuario y salir. Destinos: Inicio · Chat (o Registros) · Registrar (o
   * Noticias) · Avisos (campana con contador). El activo va en el color de marca; «Menú» se marca si la vista actual
   * no está en la barra.
   */
  #barra(actual: string): DocumentFragment {
    const u = sesion.usuario!;
    const ids = new Set(this.#visibles().map((x) => x.id));
    const destinos = ['inicio', ids.has('chat') ? 'chat' : 'listado', ids.has('registro') ? 'registro' : 'noticias'].filter((id) => ids.has(id));
    const enBarra = destinos.includes(actual);
    void u;
    return html`
      <nav class="barra" aria-label="Navegación principal">
        ${destinos.map((id) => {
          const x = vista(id);
          return html`<button type="button" class="pestana-barra" data-barra=${id} ?data-actual=${id === actual} aria-current=${id === actual ? 'page' : 'false'} onclick=${() => this.#abrir(id)}><iswc-icon icon=${x.icono}></iswc-icon><span>${CORTOS[id] ?? x.titulo}</span></button>`;
        })}
        <div class="pestana-barra campana-barra">${this.#campana(false, true)}</div>
        <button type="button" class="pestana-barra" data-menu ?data-actual=${!enBarra} aria-expanded=${this.props.cajon ? 'true' : 'false'} onclick=${() => { this.props = { cajon: true }; }}><iswc-icon icon="mdi:menu"></iswc-icon><span>Menú</span></button>
      </nav>`;
  }

  protected override pintar(root: ShadowRoot, props: PeonAppProps): void {
    if (!this.#listo) {
      root.append(html`<div class="cargando"><img src="./assets/logo-160.webp" alt="" width="96" height="96"><iswc-spinner></iswc-spinner></div>`);
      return;
    }
    const u = sesion.usuario;
    if (!u || u.claveTemporal) {
      const acceso = document.createElement('peon-acceso');
      Object.assign(acceso, { props: { modo: u ? 'cambiar' : 'entrar' } });
      root.append(acceso);
      return;
    }
    const visibles = this.#visibles();
    const actual = visibles.some((v) => v.id === props.activo) ? props.activo : 'inicio';
    const v = vista(actual);
    const contenido = document.createElement(v.tag);
    Object.assign(contenido, { props: { pestana: this.#pestana } });
    this.#pestana = '';
    const chico = angosto();
    root.append(html`
      <div class="marco" style=${`--ancho: ${this.#ancho}em`} ?data-colapsado=${props.colapsado} ?data-angosto=${chico}>
        ${chico ? null : this.#lateral(props, actual, false)}
        ${chico || props.colapsado ? null : html`<div class="tirador" role="separator" aria-orientation="vertical" aria-label="Ancho del menú" aria-valuemin=${String(ANCHO_MIN)} aria-valuemax=${String(ANCHO_MAX)} aria-valuenow=${String(Math.round(this.#ancho))} tabindex="0" onpointerdown=${(e: PointerEvent) => this.#arrastrar(e)} onkeydown=${(e: KeyboardEvent) => this.#teclaTirador(e)} ondblclick=${() => this.#fijarAncho(ANCHO_INICIAL, true)}></div>`}
        <main class="trabajo" part="trabajo">
          <h1 class="titulo-vista"><iswc-icon icon=${v.icono}></iswc-icon>${v.titulo}</h1>
          ${contenido}
        </main>
        ${chico ? this.#barra(actual) : null}
      </div>
      ${chico
        ? html`
          <iswc-drawer class="cajon" placement="start" without-header light-dismiss ?open=${props.cajon} oniswc-after-hide=${() => { if (this.props.cajon) this.props = { cajon: false }; }}>${this.#lateral(props, actual, true)}</iswc-drawer>`
        : null}
    `);
  }
}

define(PeonApp);
