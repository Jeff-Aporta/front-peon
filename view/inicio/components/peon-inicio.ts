// @contexto PROMPT-CLAUDE.md §4 (vista 2 · Inicio)
/**
 * <peon-inicio> — resumen del usuario: cuántos registros hizo, cuántos están pendientes de verificar y avisos.
 * Pestañas: Resumen · Mis registros (los últimos que hizo, con acceso a la ficha).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import type { PersonaFila } from '../../../src/js/consts/schemas/api.schemas.js';
import { api, puede, sesion } from '../../../src/js/core/api.js';
import { HERRAMIENTAS_CHAT, fecha } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { abrirFicha, estadoPuesto, ir, textoError } from '../../../src/js/core/ui.js';

type Resumen = { misRegistros: number; misRegistrosHoy: number; misPendientes: number; visibles: number; pendientes: number; verificados: number; avisos: { tipo: string; texto: string; ir?: string }[] };

class PeonInicio extends Componente<VistaProps> {
  static tag = 'peon-inicio';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-stat', 'iswc-callout', 'iswc-button', 'iswc-empty-state', 'iswc-tag', 'peon-ficha-persona'];

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

  #alCambiar = (): void => {
    this.props = {};
  };

  #resumen(): Node {
    const caja = document.createElement('div');
    caja.className = 'resumen';
    caja.append(html`<iswc-empty-state estado="cargando" texto-cargando="Cargando tu resumen…"></iswc-empty-state>`);
    void api<Resumen>('GET', 'inicio').then((r) => {
      const u = sesion.usuario!;
      caja.replaceChildren(html`
        <p class="saludo">Hola, <strong>${u.nombre.split(' ')[0]}</strong>. Esto es lo que llevas.</p>
        <div class="cifras">
          <iswc-stat label="Mis registros" value=${String(r.misRegistros)} icon="mdi:account-check-outline" helper=${`${r.misRegistrosHoy} hoy`}></iswc-stat>
          <iswc-stat label="Mis pendientes" value=${String(r.misPendientes)} icon="mdi:timer-sand" color=${r.misPendientes ? 'warning' : 'success'} helper="puesto por verificar"></iswc-stat>
          ${u.alcance !== 'propio' ? html`<iswc-stat label=${u.alcance === 'todo' ? 'Registros en total' : 'Registros de mi escuadra'} value=${String(r.visibles)} icon="mdi:account-group-outline" helper=${`${r.verificados} verificados`}></iswc-stat>` : null}
        </div>
        ${puede('chat_con_vps') ? this.#promoChat() : null}
        <ul class="avisos" aria-label="Avisos">
          ${r.avisos.length
            ? r.avisos.map((a) => html`<li class="aviso" data-tipo=${a.tipo}><iswc-icon icon=${a.tipo === 'warning' ? 'mdi:alert-circle-outline' : 'mdi:bell-outline'}></iswc-icon><span class="texto" title=${a.texto}>${a.texto}</span>${a.ir ? html`<button type="button" onclick=${() => { const [v, p] = a.ir!.split(':'); ir(v!, p); }}>Ver</button>` : null}</li>`)
            : html`<li class="aviso" data-tipo="success"><iswc-icon icon="mdi:check-circle-outline"></iswc-icon><span class="texto">Todo al día: no hay avisos.</span></li>`}
        </ul>
        ${u.escribe ? html`<iswc-button class="accion" color="brand" onclick=${() => ir('registro')}><iswc-icon slot="start" icon="mdi:account-plus-outline"></iswc-icon>Registrar una persona</iswc-button>` : null}
      `);
    }).catch((e) => caja.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
    return caja;
  }

  /** Acceso destacado al chat con el VPS (solo con el permiso): se promueve su uso con herramientas de un toque. */
  #promoChat(): DocumentFragment {
    const usar = (texto: string) => {
      try {
        sessionStorage.setItem('peon:chat-borrador', texto);
      } catch { /* sin almacenamiento */ }
      ir('chat');
    };
    return html`
      <section class="promo-chat">
        <div class="cabeza-promo">
          <iswc-icon icon="mdi:robot-outline"></iswc-icon>
          <div><strong>Pregúntale al VPS</strong><small>Resúmenes, informes, ideas y análisis de archivos en segundos.</small></div>
          <iswc-button size="small" color="brand" onclick=${() => ir('chat')}>Abrir chat</iswc-button>
        </div>
        <div class="herramientas">${HERRAMIENTAS_CHAT.slice(0, 4).map((h) => html`<button type="button" class="herramienta" title=${h.ayuda} onclick=${() => usar(h.texto)}><iswc-icon icon=${h.icono}></iswc-icon>${h.titulo}</button>`)}</div>
      </section>`;
  }

  #recientes(): Node {
    const caja = document.createElement('div');
    caja.className = 'recientes';
    caja.append(html`<iswc-empty-state estado="cargando"></iswc-empty-state>`);
    void api<PersonaFila[]>('GET', 'personas?mias=1&limite=20').then((filas) => {
      if (!filas.length) {
        caja.replaceChildren(html`<iswc-empty-state icono="mdi:account-plus-outline" titulo="Aún no registras a nadie" texto="Cuando registres personas aparecerán aquí."></iswc-empty-state>`);
        return;
      }
      caja.replaceChildren(html`<ul class="lista">${filas.map((p) => html`
        <li><button type="button" class="fila" onclick=${() => abrirFicha(p.ref)}>
          <span class="quien"><strong>${p.nombres} ${p.apellidos}</strong><small>${p.puesto ?? 'Puesto sin verificar'} · ${fecha(p.creado)}</small></span>
          ${estadoPuesto(p.puesto_estado)}
        </button></li>`)}</ul>`);
    }).catch((e) => caja.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    root.append(grupoPestanas('inicio', props.pestana, (p) => (p === 'recientes' ? this.#recientes() : this.#resumen())));
  }
}

define(PeonInicio);
