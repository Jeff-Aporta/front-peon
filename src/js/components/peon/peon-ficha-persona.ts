// @contexto PROMPT-CLAUDE.md §4 (vista 5 · Ficha de la persona)
/**
 * <peon-ficha-persona> — ficha en un cajón derecho (`iswc-drawer` end; los detalles van en cajones, no en paneles), por `ref` opaco (la cédula nunca va en la URL).
 * Pestañas: Datos (editar) · Votación (puesto, mesa, ubicación, re-verificar) · Bitácora (quién hizo qué y cuándo).
 * Lo que el backend recortó (contacto, cédula completa) se muestra como «oculto»: la vista no inventa nada.
 * Eliminar pide confirmación (`iswc-confirm-delete`); la API archiva (nada se borra) y lo deja en la bitácora.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../base/componente.js';
import type { PeonFichaPersonaProps } from '../../consts/schemas/componentes.schemas.js';
import type { PersonaFila, ResultadoPuesto } from '../../consts/schemas/api.schemas.js';
import { api, sesion } from '../../core/api.js';
import { fecha } from '../../core/catalogos.js';
import { grupoPestanas } from '../../core/pestanas.js';
import { bloquePuestoManual } from '../../core/puesto-manual.js';
import { estadoPuesto, tarjetaPuesto, textoError, valor } from '../../core/ui.js';

type Evento = { id: number; accion: string; actor: string; detalle: unknown; creado: string };

const ACCIONES: Record<string, string> = {
  'persona.registrada': 'Registró a la persona',
  'persona.editada': 'Editó los datos',
  'persona.verificada': 'Verificó el puesto',
  'persona.archivada': 'Eliminó el registro',
  'captcha.resuelto': 'Resolvió la verificación de la fuente',
};

const oculto = (v: string | null) => (v ? v : html`<span class="oculto">oculto</span>`);

class PeonFichaPersona extends Componente<PeonFichaPersonaProps> {
  static tag = 'peon-ficha-persona';
  static css = css;
  static deps = ['iswc-drawer', 'iswc-tab-group', 'iswc-input', 'iswc-textarea', 'iswc-button', 'iswc-callout', 'iswc-confirm-delete', 'iswc-empty-state', 'iswc-tag', 'iswc-spinner', 'iswc-combobox', 'iswc-option'];

  #persona: PersonaFila | null = null;
  #cargando = '';

  protected override inicial(): PeonFichaPersonaProps {
    return { ref: '', abierta: false, embebida: false };
  }

  override onConnected(): void {
    super.onConnected();
    window.addEventListener('peon:datos', this.#alCambiar);
  }

  override onDisconnected(): void {
    window.removeEventListener('peon:datos', this.#alCambiar);
  }

  #alCambiar = (): void => {
    if ((this.props.abierta || this.props.embebida) && this.props.ref && !this.#cargando) void this.#cargar(this.props.ref);
  };

  async #cargar(ref: string): Promise<void> {
    this.#cargando = ref;
    try {
      this.#persona = await api<PersonaFila>('GET', `personas/${encodeURIComponent(ref)}`);
    } catch (e) {
      avisar(textoError(e), 'danger');
      this.props = { abierta: false };
    }
    this.#cargando = '';
    this.props = {};
  }

  #cerrar = (): void => {
    if (this.props.abierta) this.props = { abierta: false };
    window.dispatchEvent(new CustomEvent('peon:datos'));
  };

  async #guardar(caja: HTMLElement, p: PersonaFila): Promise<void> {
    const cambios: Record<string, string> = {};
    for (const c of ['nombres', 'apellidos', 'municipio', 'barrio', ...(p.completo ? ['celular', 'email', 'direccion'] : [])]) cambios[c] = valor(caja, c);
    try {
      await api('PUT', `personas/${p.ref}`, cambios);
      avisar('Cambios guardados.', 'success');
      await this.#cargar(p.ref);
    } catch (e) {
      avisar(textoError(e), 'danger');
    }
  }

  #datos(p: PersonaFila): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    const puedeEditar = sesion.usuario?.escribe === true;
    const campo = (c: keyof PersonaFila, rotulo: string, tipo = 'text') =>
      html`<iswc-input data-campo=${c} label=${rotulo} type=${tipo} value=${String(p[c] ?? '')} ?readonly=${!puedeEditar}></iswc-input>`;
    caja.append(html`
      <dl class="datos">
        <dt>Cédula</dt><dd>${p.cedula_visible}${p.completo ? null : html` <span class="oculto">(completa oculta)</span>`}</dd>
        <dt>Registró</dt><dd>${p.registrado_por_nombre} · ${fecha(p.creado)}</dd>
        ${p.actualizado ? html`<dt>Actualizado</dt><dd>${fecha(p.actualizado)}</dd>` : null}
        <dt>Autorización de datos</dt><dd>${p.consentimiento ? 'Sí' : 'No consta'}</dd>
      </dl>
      <div class="rejilla">
        ${campo('nombres', 'Nombres')}${campo('apellidos', 'Apellidos')}${campo('municipio', 'Municipio')}${campo('barrio', 'Barrio')}
        ${p.completo
          ? html`${campo('celular', 'Celular', 'tel')}${campo('email', 'Correo', 'email')}${campo('direccion', 'Dirección')}`
          : html`<iswc-callout color="neutral" icon="mdi:eye-off-outline">El contacto (celular, correo y dirección) está oculto: solo lo ve quien registró a la persona o quien tiene permiso.</iswc-callout>`}
      </div>
      ${puedeEditar
        ? html`<div class="acciones">
            <iswc-button color="brand" onclick=${() => void this.#guardar(caja, p)}><iswc-icon slot="start" icon="mdi:content-save-outline"></iswc-icon>Guardar cambios</iswc-button>
            <iswc-button variant="outlined" color="danger" data-eliminar onclick=${() => this.#confirmarEliminar(caja)}><iswc-icon slot="start" icon="mdi:delete-outline"></iswc-icon>Eliminar</iswc-button>
          </div>`
        : null}
      <iswc-confirm-delete data-confirmar entity="registro" heading="Eliminar registro" message=${`Se eliminará el registro de ${p.nombres} ${p.apellidos}. Queda archivado en la bitácora.`} confirm-value="ELIMINAR" confirm-label="Escribe ELIMINAR para confirmar" delete-label="Eliminar" cancel-label="Cancelar" oniswc-confirm-delete=${() => void this.#eliminar(p)}></iswc-confirm-delete>
    `);
    return caja;
  }

  #confirmarEliminar(caja: HTMLElement): void {
    const c = caja.querySelector('[data-confirmar]') as (HTMLElement & { open?: boolean }) | null;
    if (c) c.open = true;
  }

  async #eliminar(p: PersonaFila): Promise<void> {
    try {
      await api('DELETE', `personas/${p.ref}`);
      avisar('Registro eliminado (archivado).', 'success');
      this.#cerrar();
    } catch (e) {
      avisar(textoError(e), 'danger');
    }
  }

  #votacion(p: PersonaFila): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    const tarjeta = document.createElement('div');
    const r: ResultadoPuesto = { estado: p.puesto_estado, puesto: p.puestoDetalle ?? null, mesa: p.mesa, desdeCache: false, aviso: p.puesto_estado === 'pendiente' ? 'Pendiente de verificar en la fuente oficial.' : null, captcha: null };
    tarjeta.append(tarjetaPuesto(r));
    const lugar = p.puestoDetalle;
    // Consulta asistida: sin puesto verificado (o para corregirlo) se trae de la Registraduría a mano.
    // Si la persona ya tiene un puesto del catálogo, se memoriza su código (vuelve a viajan como `puestoCodigo`).
    const manual = bloquePuestoManual(() => p.cedula ?? '', { nombre: lugar?.nombre ?? '', direccion: lugar?.direccion ?? '', mesa: p.mesa ?? '', codigo: p.puesto_codigo ?? '' });
    manual.nodo.hidden = p.puesto_estado === 'verificado';
    const puedeEscribir = sesion.usuario?.escribe === true;
    const guardarManual = async (b: HTMLElement) => {
      const d = manual.leer();
      const codigo = manual.leerCodigo();
      if (!d && !codigo) return avisar('Escribe al menos el puesto y el municipio', 'warning');
      b.setAttribute('loading', '');
      try {
        // El API acepta las dos formas: si llega `puestoCodigo`, el puesto se toma del catálogo (queda verificado).
        const n = await api<ResultadoPuesto>('POST', `personas/${p.ref}/puesto`, { puestoManual: d, puestoCodigo: codigo });
        tarjeta.replaceChildren(tarjetaPuesto(n));
        manual.nodo.hidden = true;
        avisar('Puesto guardado y verificado.', 'success');
      } catch (err) {
        avisar(textoError(err), 'danger');
      } finally {
        b.removeAttribute('loading');
      }
    };
    if (puedeEscribir && p.cedula) manual.nodo.append(html`<div class="acciones"><iswc-button size="small" color="brand" data-guardar-puesto onclick=${(e: Event) => void guardarManual(e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:content-save-outline"></iswc-icon>Guardar puesto</iswc-button></div>`);
    caja.append(html`
      ${tarjeta}
      ${puedeEscribir && p.cedula ? html`<button type="button" class="enlace" onclick=${() => { manual.nodo.hidden = !manual.nodo.hidden; }}><iswc-icon icon="mdi:pencil-outline"></iswc-icon> Buscar el puesto en el catálogo o escribirlo a mano</button>${manual.nodo}` : null}
      ${lugar && lugar.lat != null
        ? html`<dl class="datos"><dt>Ubicación</dt><dd>${lugar.lat.toFixed(5)}, ${lugar.lon?.toFixed(5)} · ${lugar.municipio}</dd><dt>Fuente</dt><dd>${lugar.fuente === 'ejemplo' ? 'Dato de ejemplo (pendiente la lista oficial)' : lugar.fuente}</dd></dl>
          <a class="mapa" href=${`https://www.openstreetmap.org/?mlat=${lugar.lat}&mlon=${lugar.lon}#map=17/${lugar.lat}/${lugar.lon}`} target="_blank" rel="noopener noreferrer"><iswc-icon icon="mdi:map-outline"></iswc-icon> Ver en el mapa</a>`
        : null}
      <div class="acciones">
        <iswc-button variant="outlined" data-actualizar onclick=${async (e: Event) => {
          const b = e.currentTarget as HTMLElement;
          b.setAttribute('loading', '');
          try {
            // Actualiza **este** registro y solo este: va a la página oficial ahora mismo (sin caché) y guarda
            // lo que la página diga. Si la página no dice nada, no se inventa nada y no se borra lo que había.
            const n = await api<ResultadoPuesto>('POST', `personas/${p.ref}/puesto/actualizar`);
            tarjeta.replaceChildren(tarjetaPuesto(n));
            if (n.estado === 'verificado') {
              // Se actualiza **en el sitio** (sin recargar la ficha entera, para no perder la pestaña).
              this.#persona = {
                ...p,
                puesto: n.puesto?.nombre ?? p.puesto,
                puesto_codigo: n.puesto?.codigo ?? p.puesto_codigo,
                mesa: n.mesa,
                puesto_estado: 'verificado',
                puestoDetalle: n.puesto ?? p.puestoDetalle,
              };
              this.props = {};
              avisar('Puesto actualizado con el dato de la Registraduría.', 'success');
              // Si hay algo escrito a mano que NO es el puesto oficial, se avisa y se ofrece «Reemplazar».
              manual.compararConOficial(n.puesto, n.mesa);
            } else {
              avisar(n.aviso ?? 'La página oficial no devolvió un puesto; se dejó lo que había.', 'warning');
            }
          } catch (err) {
            avisar(textoError(err), 'danger');
          } finally {
            b.removeAttribute('loading');
          }
        }}><iswc-icon slot="start" icon="mdi:refresh"></iswc-icon>Actualizar desde la Registraduría</iswc-button>
      </div>
    `);
    return caja;
  }

  #bitacora(p: PersonaFila): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    caja.append(html`<iswc-empty-state estado="cargando"></iswc-empty-state>`);
    void api<Evento[]>('GET', `personas/${p.ref}/bitacora`).then((ev) => {
      caja.replaceChildren(ev.length
        ? html`<ol class="linea">${ev.map((e) => html`<li><strong>${ACCIONES[e.accion] ?? e.accion}</strong><span>${e.actor} · ${fecha(e.creado)}</span></li>`)}</ol>`
        : html`<iswc-empty-state icono="mdi:clipboard-text-outline" titulo="Sin movimientos"></iswc-empty-state>`);
    }).catch((e) => caja.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
    return caja;
  }

  /** Embebida (split panel de Registros): la misma ficha sin diálogo, con su propio scroll. */
  #pintarEmbebida(root: ShadowRoot, props: PeonFichaPersonaProps): void {
    if (!props.ref) {
      root.append(html`<iswc-empty-state class="elige" icono="mdi:card-account-details-outline" titulo="Elige un registro" texto="Toca una fila de la lista para ver aquí su ficha."></iswc-empty-state>`);
      return;
    }
    const p = this.#persona;
    if (!p || p.ref !== props.ref) {
      if (this.#cargando !== props.ref) void this.#cargar(props.ref);
      root.append(html`<div class="cargando"><iswc-spinner></iswc-spinner></div>`);
      return;
    }
    root.append(html`
      <section class="ficha embebida" aria-label=${`Ficha de ${p.nombres} ${p.apellidos}`}>
        <h2 class="nombre">${p.nombres} ${p.apellidos}</h2>
        <div class="cabeza">${estadoPuesto(p.puesto_estado)}<span>${p.puesto ?? 'Puesto sin verificar'}</span></div>
        ${grupoPestanas('ficha', 'datos', (t) => (t === 'votacion' ? this.#votacion(p) : t === 'bitacora' ? this.#bitacora(p) : this.#datos(p)))}
      </section>`);
  }

  protected override pintar(root: ShadowRoot, props: PeonFichaPersonaProps): void {
    if (props.embebida) return this.#pintarEmbebida(root, props);
    if (!props.abierta || !props.ref) return;
    const p = this.#persona;
    if (!p || p.ref !== props.ref) {
      if (this.#cargando !== props.ref) void this.#cargar(props.ref);
      root.append(html`<iswc-drawer class="ficha" placement="end" light-dismiss open label="Ficha de la persona" oniswc-after-hide=${this.#cerrar}><div class="cargando"><iswc-spinner></iswc-spinner></div></iswc-drawer>`);
      return;
    }
    root.append(html`
      <iswc-drawer open class="ficha" placement="end" light-dismiss label=${`${p.nombres} ${p.apellidos}`} oniswc-after-hide=${this.#cerrar}>
        <div class="cabeza">${estadoPuesto(p.puesto_estado)}<span>${p.puesto ?? 'Puesto sin verificar'}</span></div>
        ${grupoPestanas('ficha', 'datos', (t) => (t === 'votacion' ? this.#votacion(p) : t === 'bitacora' ? this.#bitacora(p) : this.#datos(p)))}
      </iswc-drawer>`);
  }
}

define(PeonFichaPersona);