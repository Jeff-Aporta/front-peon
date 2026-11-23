// @contexto PROMPT-CLAUDE.md §4 (vista 8 · Miembros) · PLAN Fase 4b
/**
 * <peon-miembros> — listado de TODOS los miembros (permiso `ver_miembros`, encendido por defecto) con búsqueda;
 * al entrar a uno, su ficha completa: datos, cédula y contacto (si hay permiso; si no, ocultos por el backend),
 * puesto de votación, ubicación (lat/lon del puesto), equipo y toda su actividad (qué, cuándo y desde dónde).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import type { FichaMiembro, Miembro } from '../../../src/js/consts/schemas/api.schemas.js';
import { api } from '../../../src/js/core/api.js';
import { ROLES, fecha } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { estadoPuesto, tarjetaPuesto, textoError } from '../../../src/js/core/ui.js';

const oculto = (v: string | null) => v ?? html`<span class="oculto">oculto</span>`;

/** Dispositivo legible a partir del user-agent (sin guardar nada nuevo). */
function dispositivo(ua: string | null): string {
  if (!ua) return '—';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad/i.test(ua)) return 'iPhone / iPad';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Otro';
}

class PeonMiembros extends Componente<VistaProps> {
  static tag = 'peon-miembros';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-input', 'iswc-person', 'iswc-tag', 'iswc-button', 'iswc-callout', 'iswc-empty-state', 'iswc-dialog', 'iswc-spinner'];

  #miembros: Miembro[] = [];
  #ficha: FichaMiembro | null = null;
  #abriendo = '';

  protected override inicial(): VistaProps {
    return { pestana: '' };
  }

  async #abrir(ref: string): Promise<void> {
    this.#abriendo = ref;
    this.#ficha = null;
    this.props = {};
    try {
      this.#ficha = await api<FichaMiembro>('GET', `miembros/${encodeURIComponent(ref)}`);
    } catch (e) {
      this.#abriendo = '';
      this.#ficha = null;
      this.shadow?.querySelector('[data-error]')?.replaceChildren(textoError(e));
    }
    this.props = {};
  }

  #lista(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    const lista = document.createElement('ul');
    lista.className = 'lista';
    const pintar = (filtro = '') => {
      const f = filtro.trim().toLowerCase();
      const ms = this.#miembros.filter((m) => !f || m.nombre.toLowerCase().includes(f) || (ROLES[m.rol] ?? '').toLowerCase().includes(f));
      lista.replaceChildren(...ms.map((m) => html`<li><button type="button" class="fila" onclick=${() => void this.#abrir(m.ref)}>
        <iswc-person nombre=${m.nombre} detalle=${`${ROLES[m.rol] ?? m.rol}${m.liderNombre ? ` · escuadra de ${m.liderNombre}` : ''}`}></iswc-person>
        <span class="lado">${m.activo ? null : html`<iswc-tag color="neutral" pill>inactivo</iswc-tag>`}<small>${m.registros} registro(s)</small></span>
      </button></li>`));
      if (!ms.length) lista.replaceChildren(html`<iswc-empty-state icono="mdi:account-search-outline" titulo="Sin resultados"></iswc-empty-state>`);
    };
    caja.append(html`
      <iswc-input label="Buscar miembro" placeholder="Nombre o rol" clearable oniswc-input=${(e: Event) => pintar(String((e.currentTarget as HTMLElement & { value?: string }).value ?? ''))}><iswc-icon slot="prefix" icon="mdi:magnify"></iswc-icon></iswc-input>
      <p class="nota" data-error></p>
      ${lista}
    `);
    lista.append(html`<iswc-empty-state estado="cargando"></iswc-empty-state>`);
    void api<Miembro[]>('GET', 'miembros').then((ms) => {
      this.#miembros = ms;
      pintar();
    }).catch((e) => lista.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
    return caja;
  }

  #fichaPestana(m: FichaMiembro, t: string): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    if (t === 'votacion') {
      caja.append(tarjetaPuesto({ estado: m.puestoEstado as 'verificado', puesto: m.puesto, mesa: m.mesa, desdeCache: false, aviso: m.puesto ? null : 'Su puesto aún no se ha verificado.', captcha: null }));
      if (m.ubicacion) {
        caja.append(html`<dl class="datos"><dt>Ubicación</dt><dd>${m.ubicacion.lat.toFixed(5)}, ${m.ubicacion.lon.toFixed(5)}</dd><dt>Municipio</dt><dd>${m.ubicacion.municipio}</dd></dl>
          <a class="mapa" href=${`https://www.openstreetmap.org/?mlat=${m.ubicacion.lat}&mlon=${m.ubicacion.lon}#map=17/${m.ubicacion.lat}/${m.ubicacion.lon}`} target="_blank" rel="noopener noreferrer"><iswc-icon icon="mdi:map-outline"></iswc-icon> Ver en el mapa</a>`);
      }
      return caja;
    }
    if (t === 'actividad') {
      caja.append(m.actividad.length
        ? html`<ol class="linea">${m.actividad.map((a) => html`<li><strong>${a.texto}</strong><span>${fecha(a.creado)} · ${dispositivo(a.agente)}${a.ip ? ` · ${a.ip}` : ''}</span></li>`)}</ol>`
        : html`<iswc-empty-state icono="mdi:timeline-clock-outline" titulo="Sin actividad todavía"></iswc-empty-state>`);
      return caja;
    }
    if (t === 'equipo') {
      caja.append(html`
        ${m.liderNombre ? html`<p>Escuadra de <strong>${m.liderNombre}</strong>.</p>` : null}
        ${m.equipo.length
          ? html`<ul class="lista">${m.equipo.map((e) => html`<li><button type="button" class="fila" onclick=${() => void this.#abrir(e.ref)}><iswc-person nombre=${e.nombre} detalle=${ROLES[e.rol] ?? e.rol}></iswc-person><small>${e.registros} registro(s)</small></button></li>`)}</ul>`
          : html`<iswc-empty-state icono="mdi:account-group-outline" titulo="Sin equipo asignado"></iswc-empty-state>`}`);
      return caja;
    }
    caja.append(html`
      <dl class="datos">
        <dt>Nombre</dt><dd>${m.nombre}</dd>
        <dt>Rol</dt><dd>${ROLES[m.rol] ?? m.rol}${m.activo ? '' : ' (inactivo)'}</dd>
        <dt>Cédula</dt><dd>${m.cedula ?? html`${m.cedula_visible} <span class="oculto">(completa oculta)</span>`}</dd>
        <dt>WhatsApp</dt><dd>${oculto(m.whatsapp)}</dd>
        <dt>Registros</dt><dd>${m.registros}</dd>
        <dt>Miembro desde</dt><dd>${fecha(m.creado, false)}</dd>
        <dt>Último ingreso</dt><dd>${fecha(m.ultimo_ingreso)}</dd>
      </dl>
      ${m.cedula ? null : html`<p class="nota">Los datos de contacto y la cédula completa solo se ven con permiso.</p>`}`);
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    root.append(grupoPestanas('miembros', props.pestana, () => this.#lista()));
    if (!this.#abriendo) return;
    const m = this.#ficha;
    root.append(html`
      <iswc-dialog open class="ficha" label=${m ? m.nombre : 'Ficha del miembro'} oniswc-after-hide=${() => { this.#abriendo = ''; this.#ficha = null; }}>
        ${m
          ? html`<div class="cabeza"><iswc-tag color="brand" pill>${ROLES[m.rol] ?? m.rol}</iswc-tag>${m.puesto ? estadoPuesto(m.puestoEstado) : null}<span>${m.puesto?.nombre ?? ''}</span></div>
            ${grupoPestanas('miembro', 'datos', (t) => this.#fichaPestana(m, t))}`
          : html`<div class="cargando"><iswc-spinner></iswc-spinner></div>`}
      </iswc-dialog>`);
  }
}

define(PeonMiembros);
