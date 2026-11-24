// @contexto PROMPT-CLAUDE.md §4 (vista 10 · Ajustes)
/**
 * <peon-ajustes> — Mi perfil (lo que el sistema sabe de mí y mis permisos) · Cambiar clave (cuando quiera,
 * mínimo 4) · Sesión (a qué servidor está conectada la app y cerrar sesión).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import { cambiarClave, elegirServidor, salir, servidor, sesion } from '../../../src/js/core/api.js';
import { PERMISOS_TEXTO } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { textoError, valor } from '../../../src/js/core/ui.js';

class PeonAjustes extends Componente<VistaProps> {
  static tag = 'peon-ajustes';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-input', 'iswc-button', 'iswc-callout', 'iswc-person', 'iswc-tag'];

  protected override inicial(): VistaProps {
    return { pestana: '' };
  }

  #perfil(): Node {
    const u = sesion.usuario!;
    return html`
      <div class="caja">
        <iswc-person nombre=${u.nombre} detalle=${u.rolNombre}></iswc-person>
        <dl class="datos">
          <dt>Cédula (usuario)</dt><dd>${u.cedula}</dd>
          <dt>WhatsApp</dt><dd>${u.whatsapp}</dd>
          <dt>Rol</dt><dd>${u.rolNombre}</dd>
          <dt>Alcance</dt><dd>${u.alcance === 'todo' ? 'Todos los registros' : u.alcance === 'escuadra' ? 'Mi escuadra' : 'Lo que yo registro'}${u.escribe ? '' : ' (solo lectura)'}</dd>
        </dl>
        <h2>Mis permisos</h2>
        <div class="permisos">${Object.entries(PERMISOS_TEXTO).map(([k, t]) => html`<iswc-tag color=${u.permisos[k] ? 'success' : 'neutral'} pill><iswc-icon icon=${u.permisos[k] ? 'mdi:check' : 'mdi:close'}></iswc-icon> ${t}</iswc-tag>`)}</div>
        <p class="nota">Los permisos los administra la administración. Si te falta alguno, pídeselo.</p>
      </div>`;
  }

  #clave(): Node {
    const caja = document.createElement('form');
    caja.className = 'caja angosta';
    caja.addEventListener('submit', (e) => e.preventDefault());
    const enviar = async (boton: HTMLElement) => {
      const nueva = valor(caja, 'nueva');
      if (nueva.length < 4) return avisar('La clave nueva debe tener al menos 4 caracteres', 'warning');
      if (nueva !== valor(caja, 'repetir')) return avisar('Las dos claves nuevas no coinciden', 'warning');
      boton.setAttribute('loading', '');
      try {
        await cambiarClave(valor(caja, 'actual'), nueva);
        avisar('Tu clave quedó cambiada.', 'success');
        for (const c of caja.querySelectorAll<HTMLElement & { value: string }>('[data-campo]')) c.value = '';
      } catch (e) {
        avisar(textoError(e), 'danger');
      } finally {
        boton.removeAttribute('loading');
      }
    };
    caja.append(html`
      <iswc-input data-campo="actual" label="Clave actual" type="password" password-toggle autocomplete="current-password"></iswc-input>
      <iswc-input data-campo="nueva" label="Clave nueva" type="password" password-toggle autocomplete="new-password" hint="Mínimo 4 caracteres."></iswc-input>
      <iswc-input data-campo="repetir" label="Repite la clave nueva" type="password" password-toggle autocomplete="new-password"></iswc-input>
      <div class="acciones"><iswc-button color="brand" onclick=${(e: Event) => void enviar(e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:lock-reset"></iswc-icon>Cambiar clave</iswc-button></div>
    `);
    return caja;
  }

  /** Servidor conectado: local (pruebas en este equipo) o en línea; «Reintentar conexión» vuelve a elegir. */
  #sesion(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja angosta';
    const estado = document.createElement('dl');
    estado.className = 'datos';
    const pintarEstado = () => {
      const s = servidor();
      estado.replaceChildren(html`
        <dt>Conectado a</dt>
        <dd><iswc-tag color=${s.tipo === 'local' ? 'warning' : s.tipo ? 'success' : 'danger'}>${s.nombre}</iswc-tag></dd>
        ${s.base ? html`<dt>Dirección</dt><dd><code>${s.base}</code></dd>` : ''}`);
    };
    const reintentar = async (boton: HTMLElement) => {
      boton.setAttribute('loading', '');
      try {
        const base = await elegirServidor(true);
        pintarEstado();
        avisar(base ? `Conectado: ${servidor().nombre}.` : 'No pudimos conectar con el servidor local ni con el en línea.', base ? 'success' : 'danger');
      } finally {
        boton.removeAttribute('loading');
      }
    };
    pintarEstado();
    this.#pintarEstado = pintarEstado;
    caja.append(html`
      ${estado}
      <div class="acciones">
        <iswc-button variant="outlined" onclick=${(e: Event) => void reintentar(e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:refresh"></iswc-icon>Reintentar conexión</iswc-button>
        <iswc-button variant="outlined" color="danger" onclick=${() => void salir()}><iswc-icon slot="start" icon="mdi:logout"></iswc-icon>Cerrar sesión</iswc-button>
      </div>`);
    return caja;
  }

  override onConnected(): void {
    super.onConnected();
    window.addEventListener('peon:servidor', this.#alCambiarServidor);
  }

  override onDisconnected(): void {
    window.removeEventListener('peon:servidor', this.#alCambiarServidor);
  }

  #alCambiarServidor = (): void => this.#pintarEstado?.();
  #pintarEstado: (() => void) | null = null;

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    root.append(grupoPestanas('ajustes', props.pestana, (p) => (p === 'clave' ? this.#clave() : p === 'sesion' ? this.#sesion() : this.#perfil())));
  }
}

define(PeonAjustes);
