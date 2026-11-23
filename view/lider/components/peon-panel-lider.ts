// @contexto PROMPT-CLAUDE.md §4 (vista 6 · Panel del líder) · PLAN Fase 5 (Realtime)
/**
 * <peon-panel-lider> — estado del equipo EN VIVO, sin recargar. Escucha los eventos `registro` del API
 * (SSE `GET /api/eventos`; en Cloudflare, el WebSocket de worker-peon) y refresca cifras y feed al instante.
 * Pestañas: Equipo (registros por miembro, hoy y total) · En vivo (feed de registros recientes).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import { api, escuchar } from '../../../src/js/core/api.js';
import { ROLES, fecha } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { abrirFicha, estadoPuesto, textoError } from '../../../src/js/core/ui.js';

type Equipo = {
  miembros: { ref: string; nombre: string; rol: string; activo: boolean; registros: number; hoy: number; ultimoIngreso: string | null }[];
  recientes: { ref: string; nombre: string; puesto: string | null; estado: string; por: string; creado: string }[];
  conectados: number;
};

class PeonPanelLider extends Componente<VistaProps> {
  static tag = 'peon-panel-lider';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-stat', 'iswc-callout', 'iswc-empty-state', 'iswc-tag', 'iswc-person', 'peon-ficha-persona'];

  #datos: Equipo | null = null;
  #soltar: (() => void) | null = null;
  #vistas = new Set<() => void>();

  protected override inicial(): VistaProps {
    return { pestana: '' };
  }

  override onConnected(): void {
    super.onConnected();
    this.#soltar = escuchar('registro', (d) => {
      const x = d as { por?: string; nombre?: string };
      avisar(`${x.por ?? 'Alguien'} registró a ${x.nombre ?? 'una persona'}`, 'brand');
      void this.#cargar();
    });
    void this.#cargar();
  }

  override onDisconnected(): void {
    this.#soltar?.();
  }

  async #cargar(): Promise<void> {
    try {
      this.#datos = await api<Equipo>('GET', 'equipo');
    } catch (e) {
      avisar(textoError(e), 'danger');
    }
    for (const v of this.#vistas) v();
  }

  #panel(cual: string): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    const pintar = () => {
      const d = this.#datos;
      if (!d) {
        caja.replaceChildren(html`<iswc-empty-state estado="cargando"></iswc-empty-state>`);
        return;
      }
      const hoy = d.miembros.reduce((a, m) => a + m.hoy, 0);
      const total = d.miembros.reduce((a, m) => a + m.registros, 0);
      if (cual === 'vivo') {
        caja.replaceChildren(html`
          <p class="nota"><iswc-icon icon="mdi:access-point"></iswc-icon> En vivo: cada registro nuevo aparece aquí sin recargar.</p>
          ${d.recientes.length
            ? html`<ul class="lista">${d.recientes.map((r) => html`<li><button type="button" class="fila" onclick=${() => abrirFicha(r.ref)}><span class="quien"><strong>${r.nombre}</strong><small>${r.por} · ${fecha(r.creado)} · ${r.puesto ?? 'puesto por verificar'}</small></span>${estadoPuesto(r.estado)}</button></li>`)}</ul>`
            : html`<iswc-empty-state icono="mdi:account-clock-outline" titulo="Aún no hay registros"></iswc-empty-state>`}`);
        return;
      }
      caja.replaceChildren(html`
        <div class="cifras">
          <iswc-stat label="Registros hoy" value=${String(hoy)} icon="mdi:calendar-today"></iswc-stat>
          <iswc-stat label="Registros en total" value=${String(total)} icon="mdi:account-multiple-check-outline"></iswc-stat>
          <iswc-stat label="Miembros" value=${String(d.miembros.length)} icon="mdi:account-group-outline"></iswc-stat>
        </div>
        <ul class="lista">${[...d.miembros].sort((a, b) => b.hoy - a.hoy || b.registros - a.registros).map((m) => html`
          <li class="fila miembro" ?data-inactivo=${!m.activo}>
            <iswc-person nombre=${m.nombre} detalle=${`${ROLES[m.rol] ?? m.rol} · último ingreso ${fecha(m.ultimoIngreso)}`}></iswc-person>
            <span class="conteo"><strong>${m.hoy}</strong> hoy · ${m.registros} total</span>
          </li>`)}</ul>`);
    };
    this.#vistas.add(pintar);
    pintar();
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    this.#vistas.clear();
    root.append(grupoPestanas('lider', props.pestana, (p) => this.#panel(p)));
  }
}

define(PeonPanelLider);
