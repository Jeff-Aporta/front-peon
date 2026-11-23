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
import { api, sesion } from '../../../src/js/core/api.js';
import { fecha } from '../../../src/js/core/catalogos.js';
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
        <div class="avisos">
          ${r.avisos.length
            ? r.avisos.map((a) => html`<iswc-callout color=${a.tipo} icon="mdi:bell-outline">${a.texto}${a.ir ? html` <iswc-button size="small" variant="text" onclick=${() => { const [v, p] = a.ir!.split(':'); ir(v!, p); }}>Ver</iswc-button>` : null}</iswc-callout>`)
            : html`<iswc-callout color="success" icon="mdi:check-circle-outline">Todo al día: no hay avisos.</iswc-callout>`}
        </div>
        ${u.escribe ? html`<iswc-button class="accion" color="brand" onclick=${() => ir('registro')}><iswc-icon slot="start" icon="mdi:account-plus-outline"></iswc-icon>Registrar una persona</iswc-button>` : null}
      `);
    }).catch((e) => caja.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
    return caja;
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
