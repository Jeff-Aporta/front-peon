// @contexto HANDOFF.md §2b punto 6 · DER skills/notificaciones.md
/**
 * <peon-campana> — notificaciones al estilo de Facebook, para que se sientan familiares:
 *   · campana con contador ROJO de no leídas (en el panel, colapsada, o en la barra inferior móvil con `barra`);
 *   · lista con el avatar de quien lo hizo, el texto («Eva registró a Luz Marín»), la hora relativa («hace 5 min»),
 *     fondo y punto de «no leída», pestañas «Todas / No leídas» y «Marcar todas como leídas»;
 *   · tocar una notificación la marca leída y lleva a lo notificado (`irEnlace`: noticia, ficha, chat…);
 *   · fuera de la app: título de la pestaña con «(3)» y aviso del sistema si la app está en segundo plano
 *     (core/avisos-navegador.ts; el permiso se pide solo con un toque, desde la propia lista).
 * Datos: plugin `notificaciones` de DER (`GET /api/notificaciones`, `POST /api/notificaciones/leer`). En vivo: la API
 * emite «cambio» { entidad: "notificacion" } y el shell lo reparte como `peon:datos`.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../base/componente.js';
import type { PeonCampanaProps } from '../../consts/schemas/componentes.schemas.js';
import type { Bandeja, Notificacion } from '../../consts/schemas/api.schemas.js';
import { api } from '../../core/api.js';
import { haceCuanto, iniciales } from '../../core/catalogos.js';
import { avisarNuevas, pedirPermisoAvisos, permisoAvisos, tituloConContador } from '../../core/avisos-navegador.js';
import { irEnlace, textoError } from '../../core/ui.js';

/** Ícono pequeño sobre el avatar según el tipo (como las insignias de FB: comentario, me gusta…). */
const INSIGNIAS: Record<string, string> = {
  noticia: 'mdi:newspaper-variant',
  vps: 'mdi:robot',
  registro: 'mdi:account-plus',
  bienvenida: 'mdi:hand-wave',
};

/** Cuántas instancias hay montadas: el título y los avisos del sistema los maneja una sola (la primera). */
let lider: PeonCampana | null = null;

class PeonCampana extends Componente<PeonCampanaProps> {
  static tag = 'peon-campana';
  static css = css;
  static deps = ['iswc-icon', 'iswc-drawer', 'iswc-empty-state', 'iswc-avatar'];

  #bandeja: Bandeja = { items: [], noLeidas: 0 };
  #abierta = false;
  #filtro: 'todas' | 'noLeidas' = 'todas';

  protected override inicial(): PeonCampanaProps {
    return { compacta: false, barra: false };
  }

  override onConnected(): void {
    super.onConnected();
    lider ??= this;
    window.addEventListener('peon:datos', this.#alCambiar);
    document.addEventListener('visibilitychange', this.#alVolver);
    void this.#cargar();
  }

  override onDisconnected(): void {
    window.removeEventListener('peon:datos', this.#alCambiar);
    document.removeEventListener('visibilitychange', this.#alVolver);
    if (lider === this) lider = null;
    this.#cerrar();
  }

  #alCambiar = (e: Event): void => {
    const d = (e as CustomEvent<{ entidad?: string }>).detail;
    if (!d || d.entidad === 'notificacion') void this.#cargar();
  };

  /** Al volver a la pestaña se refresca (pudo perderse algún evento en segundo plano). */
  #alVolver = (): void => {
    if (document.visibilityState === 'visible') void this.#cargar();
  };

  async #cargar(): Promise<void> {
    try {
      this.#bandeja = await api<Bandeja>('GET', 'notificaciones?limite=40');
    } catch {
      return;
    }
    if (lider === this || !lider?.isConnected) {
      lider = this;
      tituloConContador(this.#bandeja.noLeidas);
      avisarNuevas(this.#bandeja.items, (n) => this.#seguir(n));
    }
    this.#pintarInsignia();
    if (this.#abierta) this.#pintarLista();
  }

  #pintarInsignia(): void {
    const n = this.#bandeja.noLeidas;
    const b = this.shadow?.querySelector('[data-insignia]');
    if (b) {
      b.textContent = n > 99 ? '99+' : String(n);
      b.toggleAttribute('hidden', !n);
    }
    const boton = this.shadow?.querySelector('[data-campana]');
    boton?.setAttribute('aria-label', n ? `Notificaciones: ${n} sin leer` : 'Notificaciones');
    boton?.querySelector('iswc-icon')?.setAttribute('icon', n ? 'mdi:bell-badge-outline' : 'mdi:bell-outline');
  }

  async #leer(ids: string[] | 'todas'): Promise<void> {
    try {
      const r = await api<{ noLeidas: number }>('POST', 'notificaciones/leer', ids === 'todas' ? { todas: true } : { ids });
      const ahora = new Date().toISOString();
      this.#bandeja = { noLeidas: r.noLeidas, items: this.#bandeja.items.map((x) => (ids === 'todas' || ids.includes(x.id) ? { ...x, leida: x.leida ?? ahora } : x)) };
      tituloConContador(r.noLeidas);
      this.#pintarInsignia();
      this.#pintarLista();
    } catch (e) {
      avisar(textoError(e), 'danger');
    }
  }

  #seguir(n: Notificacion): void {
    if (!n.leida) void this.#leer([n.id]);
    this.#cerrar();
    irEnlace(n.enlace);
  }

  /** Contenedor de la lista: `iswc-drawer` (hoja inferior en móvil, panel izquierdo en md+). */
  #pop(): (HTMLElement & { open?: boolean }) | null {
    return this.shadow?.querySelector('iswc-drawer') ?? null;
  }

  #abrir(): void {
    const p = this.#pop();
    if (!p) return;
    this.#abierta = true;
    this.#pintarLista();
    p.open = true;
    p.setAttribute('open', '');
    this.shadow?.querySelector('[data-campana]')?.setAttribute('aria-expanded', 'true');
    void this.#cargar();
    window.addEventListener('pointerdown', this.#fuera, true);
    window.addEventListener('keydown', this.#tecla);
  }

  #cerrar(): void {
    const p = this.#pop();
    if (p) {
      p.open = false;
      p.removeAttribute('open');
    }
    this.#abierta = false;
    this.shadow?.querySelector('[data-campana]')?.setAttribute('aria-expanded', 'false');
    window.removeEventListener('pointerdown', this.#fuera, true);
    window.removeEventListener('keydown', this.#tecla);
  }

  /** Cierre por clic fuera o Escape. */
  #fuera = (e: Event): void => {
    if (!e.composedPath().includes(this)) this.#cerrar();
  };

  #tecla = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.#cerrar();
  };

  async #activarAvisos(): Promise<void> {
    const r = await pedirPermisoAvisos();
    avisar(r === 'granted' ? 'Listo: te avisaremos en este navegador' : r === 'denied' ? 'El navegador bloqueó los avisos (puedes cambiarlo en el candado de la barra de direcciones)' : 'Avisos sin activar', r === 'granted' ? 'success' : 'warning');
    this.#pintarLista();
  }

  #avatar(n: Notificacion): DocumentFragment {
    const insignia = INSIGNIAS[n.tipo] ?? 'mdi:bell';
    const quien = n.actor ?? 'Peón en Marcha';
    return html`<span class="avatar" data-tipo=${n.tipo}>
      ${quien === 'VPS' ? html`<span class="avatar-vps"><iswc-icon icon="mdi:robot-outline"></iswc-icon></span>` : html`<iswc-avatar initials=${iniciales(quien)} label=${quien}></iswc-avatar>`}
      <span class="insignia-tipo"><iswc-icon icon=${insignia}></iswc-icon></span>
    </span>`;
  }

  #pintarLista(): void {
    const caja = this.shadow?.querySelector('[data-lista]');
    if (!caja) return;
    const { items, noLeidas } = this.#bandeja;
    const lista = this.#filtro === 'noLeidas' ? items.filter((n) => !n.leida) : items;
    const permiso = permisoAvisos();
    caja.replaceChildren(html`
      <header class="cabeza">
        <h2>Notificaciones</h2>
        ${noLeidas ? html`<button type="button" class="leer-todas" data-leer-todas onclick=${() => void this.#leer('todas')}>Marcar todas como leídas</button>` : null}
      </header>
      <div class="filtros" role="tablist" aria-label="Filtrar">
        <button type="button" role="tab" aria-selected=${this.#filtro === 'todas' ? 'true' : 'false'} data-filtro="todas" onclick=${() => { this.#filtro = 'todas'; this.#pintarLista(); }}>Todas</button>
        <button type="button" role="tab" aria-selected=${this.#filtro === 'noLeidas' ? 'true' : 'false'} data-filtro="no-leidas" onclick=${() => { this.#filtro = 'noLeidas'; this.#pintarLista(); }}>No leídas${noLeidas ? ` (${noLeidas})` : ''}</button>
      </div>
      ${permiso === 'default' ? html`<div class="activar"><iswc-icon icon="mdi:bell-ring-outline"></iswc-icon><span>Recibe avisos aunque no tengas la app abierta.</span><button type="button" data-activar-avisos onclick=${() => void this.#activarAvisos()}>Activar</button></div>` : null}
      ${lista.length
        ? html`<ul class="items">${lista.map((n) => html`
          <li>
            <button type="button" class="item" ?data-nueva=${!n.leida} data-tipo=${n.tipo} onclick=${() => this.#seguir(n)}>
              ${this.#avatar(n)}
              <span class="texto">
                <span class="frase">${n.actor && n.actor !== 'VPS' ? html`<strong>${n.actor.split(' ').slice(0, 2).join(' ')}</strong> ` : n.actor === 'VPS' ? html`<strong>El VPS</strong> ` : null}${n.actor ? n.titulo.charAt(0).toLowerCase() + n.titulo.slice(1) : n.titulo}</span>
                ${n.texto ? html`<small class="detalle">${n.texto}</small>` : null}
                <small class="cuando" title=${new Date(n.fhcre).toLocaleString('es-CO')}>${haceCuanto(n.fhcre)}</small>
              </span>
              ${n.leida ? null : html`<span class="punto" aria-label="sin leer"></span>`}
            </button>
          </li>`)}</ul>`
        : html`<iswc-empty-state icono="mdi:bell-check-outline" titulo=${this.#filtro === 'noLeidas' ? 'Estás al día' : 'Nada nuevo por ahora'} texto="Aquí llegan las noticias, las respuestas del VPS y los registros de tu escuadra."></iswc-empty-state>`}
    `);
  }

  protected override pintar(root: ShadowRoot, props: PeonCampanaProps): void {
    const boton = html`<button type="button" class="campana" ?data-compacta=${props.compacta} ?data-barra=${props.barra} data-campana title="Notificaciones" aria-label="Notificaciones" aria-haspopup="dialog" aria-expanded="false" onclick=${() => (this.#abierta ? this.#cerrar() : this.#abrir())}>
      <span class="icono"><iswc-icon icon="mdi:bell-outline"></iswc-icon><span class="insignia" data-insignia hidden>0</span></span>
      ${props.compacta ? null : html`<span class="rotulo">${props.barra ? 'Avisos' : 'Notificaciones'}</span>`}
    </button>`;
    const disparador = boton.firstElementChild;
    const lista = html`<div class="lista" data-lista role="dialog" aria-label="Notificaciones"></div>`;
    // Móvil: hoja que sube desde abajo (como FB en el teléfono). Panel: se desliza desde la izquierda junto al menú
    // (como Instagram en escritorio). Ambos son el `iswc-drawer` del kit.
    const pop = document.createElement('iswc-drawer') as HTMLElement & { open?: boolean };
    pop.className = props.barra ? 'hoja' : 'panel-avisos';
    pop.setAttribute('placement', props.barra ? 'bottom' : 'start');
    pop.setAttribute('label', 'Notificaciones');
    pop.setAttribute('without-header', '');
    pop.setAttribute('light-dismiss', '');
    pop.addEventListener('iswc-after-hide', () => {
      if (this.#abierta) this.#cerrar();
    });
    pop.append(lista);
    root.append(boton, pop);
    void disparador;
    this.#abierta = false;
    this.#pintarInsignia();
  }
}

define(PeonCampana);
