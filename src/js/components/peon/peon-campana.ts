// @contexto HANDOFF.md §2b punto 6 · DER skills/notificaciones.md
/**
 * <peon-campana> — campana del panel: contador de no leídas, lista y «marcar todas leídas», sobre el plugin
 * `notificaciones` de DER (`GET /api/notificaciones`, `POST /api/notificaciones/leer`).
 *
 * En vivo: la API emite «cambio» { entidad: "notificacion" } a los destinatarios y el shell lo reparte como
 * `peon:datos`; aquí solo se refresca el contador (y la lista si está abierta). `compacta` = solo el ícono con su
 * insignia (panel colapsado). Cada notificación lleva un `enlace` que se sigue con `irEnlace()` (noticia, ficha…).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../base/componente.js';
import type { PeonCampanaProps } from '../../consts/schemas/componentes.schemas.js';
import type { Bandeja, Notificacion } from '../../consts/schemas/api.schemas.js';
import { api } from '../../core/api.js';
import { fecha } from '../../core/catalogos.js';
import { irEnlace, textoError } from '../../core/ui.js';

const ICONOS: Record<string, string> = {
  noticia: 'mdi:newspaper-variant-outline',
  vps: 'mdi:robot-outline',
  registro: 'mdi:account-plus-outline',
  bienvenida: 'mdi:hand-wave-outline',
};

class PeonCampana extends Componente<PeonCampanaProps> {
  static tag = 'peon-campana';
  static css = css;
  static deps = ['iswc-icon', 'iswc-popover', 'iswc-empty-state', 'iswc-button'];

  #bandeja: Bandeja = { items: [], noLeidas: 0 };
  #abierta = false;

  protected override inicial(): PeonCampanaProps {
    return { compacta: false };
  }

  override onConnected(): void {
    super.onConnected();
    window.addEventListener('peon:datos', this.#alCambiar);
    void this.#cargar();
  }

  override onDisconnected(): void {
    window.removeEventListener('peon:datos', this.#alCambiar);
    this.#cerrar();
  }

  #alCambiar = (e: Event): void => {
    const d = (e as CustomEvent<{ entidad?: string }>).detail;
    // Cualquier escritura puede traer una notificación (noticia publicada, registro de la escuadra…).
    if (!d || d.entidad === 'notificacion' || d.entidad === 'noticia' || d.entidad === 'persona' || d.entidad === 'perfil') void this.#cargar();
  };

  async #cargar(): Promise<void> {
    try {
      this.#bandeja = await api<Bandeja>('GET', 'notificaciones?limite=30');
    } catch {
      return;
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
    this.shadow?.querySelector('[data-campana]')?.setAttribute('aria-label', n ? `Notificaciones: ${n} sin leer` : 'Notificaciones');
    this.shadow?.querySelector('[data-campana] iswc-icon')?.setAttribute('icon', n ? 'mdi:bell-ring-outline' : 'mdi:bell-outline');
  }

  async #leer(ids: string[] | 'todas'): Promise<void> {
    try {
      const r = await api<{ noLeidas: number }>('POST', 'notificaciones/leer', ids === 'todas' ? { todas: true } : { ids });
      const ahora = new Date().toISOString();
      this.#bandeja = { noLeidas: r.noLeidas, items: this.#bandeja.items.map((x) => (ids === 'todas' || ids.includes(x.id) ? { ...x, leida: x.leida ?? ahora } : x)) };
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

  #pop(): (HTMLElement & { open?: boolean; anchor?: Element | null }) | null {
    return this.shadow?.querySelector('iswc-popover') ?? null;
  }

  #abrir(): void {
    const p = this.#pop();
    if (!p) return;
    this.#abierta = true;
    this.#pintarLista();
    p.open = true;
    void this.#cargar();
    window.addEventListener('pointerdown', this.#fuera, true);
    window.addEventListener('keydown', this.#tecla);
  }

  #cerrar(): void {
    const p = this.#pop();
    if (p) p.open = false;
    this.#abierta = false;
    window.removeEventListener('pointerdown', this.#fuera, true);
    window.removeEventListener('keydown', this.#tecla);
  }

  /** Cierre por clic fuera o Escape (la campana vive en el panel y la lista flota a su lado). */
  #fuera = (e: Event): void => {
    if (!e.composedPath().includes(this)) this.#cerrar();
  };

  #tecla = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.#cerrar();
  };

  #pintarLista(): void {
    const caja = this.shadow?.querySelector('[data-lista]');
    if (!caja) return;
    const { items, noLeidas } = this.#bandeja;
    caja.replaceChildren(html`
      <header class="cabeza">
        <strong>Notificaciones</strong>
        ${noLeidas ? html`<button type="button" class="leer-todas" data-leer-todas onclick=${() => void this.#leer('todas')}><iswc-icon icon="mdi:check-all"></iswc-icon>Marcar todas leídas</button>` : null}
      </header>
      ${items.length
        ? html`<ul class="items">${items.map((n) => html`
          <li>
            <button type="button" class="item" ?data-nueva=${!n.leida} data-tipo=${n.tipo} onclick=${() => this.#seguir(n)}>
              <iswc-icon icon=${ICONOS[n.tipo] ?? 'mdi:bell-outline'}></iswc-icon>
              <span class="texto"><strong>${n.titulo}</strong>${n.texto ? html`<small class="detalle">${n.texto}</small>` : null}<small class="cuando">${fecha(n.fhcre)}</small></span>
              ${n.leida ? null : html`<span class="punto" aria-label="sin leer"></span>`}
            </button>
          </li>`)}</ul>`
        : html`<iswc-empty-state icono="mdi:bell-check-outline" titulo="Nada nuevo" texto="Aquí llegan las noticias, las respuestas del VPS y los registros de tu escuadra."></iswc-empty-state>`}
    `);
  }

  protected override pintar(root: ShadowRoot, props: PeonCampanaProps): void {
    const boton = html`<button type="button" class="campana" ?data-compacta=${props.compacta} data-campana title="Notificaciones" aria-label="Notificaciones" aria-haspopup="dialog" onclick=${() => (this.#abierta ? this.#cerrar() : this.#abrir())}>
      <iswc-icon icon="mdi:bell-outline"></iswc-icon>
      ${props.compacta ? null : html`<span class="rotulo">Notificaciones</span>`}
      <span class="insignia" data-insignia hidden>0</span>
    </button>`;
    const disparador = boton.firstElementChild;
    const pop = document.createElement('iswc-popover') as HTMLElement & { anchor?: Element | null; placement?: string };
    pop.className = 'pop';
    pop.placement = 'right-start';
    pop.setAttribute('placement', 'right-start');
    pop.append(html`<div class="lista" data-lista role="dialog" aria-label="Notificaciones"></div>`);
    root.append(boton, pop);
    pop.anchor = disparador;
    this.#abierta = false;
    this.#pintarInsignia();
  }
}

define(PeonCampana);
