// @contexto PROMPT-CLAUDE.md §4 (vista 4 · Listado)
/**
 * <peon-listado> — tabla (`iswc-data-grid`) con búsqueda y filtros (municipio, puesto, estado) que filtra el
 * BACKEND (alcance por rol + recorte de contacto). Clic en una fila → ficha. Pestañas: Todos · Pendientes.
 * Se refresca sola cuando la ficha cambia algo (evento `peon:datos`).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import type { PersonaFila, Puesto } from '../../../src/js/consts/schemas/api.schemas.js';
import { api } from '../../../src/js/core/api.js';
import { ESTADOS, fecha } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { abrirFicha, textoError, valor } from '../../../src/js/core/ui.js';

type Grid = HTMLElement & { columns: unknown[]; rows: unknown[]; hooks?: unknown };

class PeonListado extends Componente<VistaProps> {
  static tag = 'peon-listado';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-data-grid', 'iswc-input', 'iswc-select', 'iswc-button', 'iswc-callout', 'iswc-empty-state'];

  #recargas = new Set<() => void>();
  #puestos: Puesto[] = [];

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
    for (const r of this.#recargas) r();
  };

  #tabla(soloPendientes: boolean): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    const grid = document.createElement('iswc-data-grid') as Grid;
    grid.setAttribute('density', 'compact');
    grid.setAttribute('pagination', '');
    grid.setAttribute('page-size', '25');
    grid.setAttribute('auto-height', '');
    grid.setAttribute('disable-row-selection-on-click', '');
    grid.columns = [
      { field: 'nombre', headerName: 'Nombre', flex: 1.4, minWidth: 180 },
      { field: 'cedula_visible', headerName: 'Cédula', width: 130 },
      { field: 'municipio', headerName: 'Municipio', width: 120 },
      { field: 'barrio', headerName: 'Barrio', width: 140 },
      { field: 'puesto', headerName: 'Puesto', flex: 1.2, minWidth: 180 },
      { field: 'estado', headerName: 'Estado', width: 130 },
      { field: 'celular', headerName: 'Celular', width: 130 },
      { field: 'registrado_por_nombre', headerName: 'Registró', width: 150 },
      { field: 'fecha', headerName: 'Fecha', width: 170 },
    ];
    grid.addEventListener('iswc-row-click', (e) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id) abrirFicha(String(id));
    });
    const info = document.createElement('p');
    info.className = 'nota';
    const cargar = async () => {
      const q = new URLSearchParams();
      const buscar = valor(caja, 'q');
      if (buscar) q.set('q', buscar);
      const municipio = valor(caja, 'municipio');
      if (municipio) q.set('municipio', municipio);
      const puesto = valor(caja, 'puesto');
      if (puesto) q.set('puesto', puesto);
      const estado = soloPendientes ? 'pendiente' : valor(caja, 'estado');
      if (estado) q.set('estado', estado);
      grid.setAttribute('loading', '');
      try {
        const filas = await api<PersonaFila[]>('GET', `personas?${q}`);
        grid.rows = filas.map((p) => ({
          id: p.ref,
          nombre: `${p.nombres} ${p.apellidos}`,
          cedula_visible: p.cedula_visible,
          municipio: p.municipio ?? '',
          barrio: p.barrio ?? '',
          puesto: p.puesto ?? '—',
          estado: ESTADOS[p.puesto_estado]?.texto ?? p.puesto_estado,
          celular: p.celular ?? (p.completo ? '' : 'oculto'),
          registrado_por_nombre: p.registrado_por_nombre,
          fecha: fecha(p.creado),
        }));
        info.textContent = `${filas.length} registro(s). Toca una fila para ver la ficha.`;
      } catch (e) {
        info.textContent = textoError(e);
      } finally {
        grid.removeAttribute('loading');
      }
    };
    let espera = 0;
    const alEscribir = () => {
      clearTimeout(espera);
      espera = setTimeout(() => void cargar(), 400);
    };
    const opcionesPuesto = this.#puestos.map((p) => html`<iswc-option value=${p.codigo}>${p.nombre}</iswc-option>`);
    caja.append(html`
      <div class="filtros">
        <iswc-input data-campo="q" label="Buscar" placeholder="Nombre, apellido o barrio" clearable oniswc-input=${alEscribir}><iswc-icon slot="prefix" icon="mdi:magnify"></iswc-icon></iswc-input>
        <iswc-input data-campo="municipio" label="Municipio" clearable oniswc-input=${alEscribir}></iswc-input>
        <iswc-select data-campo="puesto" label="Puesto" placeholder="Todos" clearable oniswc-change=${() => void cargar()}>${opcionesPuesto}</iswc-select>
        ${soloPendientes ? null : html`<iswc-select data-campo="estado" label="Estado" placeholder="Todos" clearable oniswc-change=${() => void cargar()}>${Object.entries(ESTADOS).map(([k, v]) => html`<iswc-option value=${k}>${v.texto}</iswc-option>`)}</iswc-select>`}
      </div>
      ${info}
      ${grid}
    `);
    this.#recargas.add(() => void cargar());
    void cargar();
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    this.#recargas.clear();
    const montar = () => {
      root.querySelector('.pestanas')?.remove();
      root.append(grupoPestanas('listado', props.pestana, (p) => this.#tabla(p === 'pendientes')));
    };
    if (this.#puestos.length) return montar();
    void api<Puesto[]>('GET', 'puestos').then((p) => {
      this.#puestos = p;
    }).catch(() => null).finally(montar);
  }
}

define(PeonListado);
