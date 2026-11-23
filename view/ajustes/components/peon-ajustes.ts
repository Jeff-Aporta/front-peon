// @contexto PROMPT-CLAUDE.md §4 (vista 10 · Ajustes)
/**
 * <peon-ajustes> — Mi perfil (lo que el sistema sabe de mí y mis permisos) · Cambiar clave (cuando quiera,
 * mínimo 4) · Sesión y apariencia (tema claro/oscuro y cerrar sesión).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import { baseApi, cambiarClave, salir, sesion } from '../../../src/js/core/api.js';
import { PERMISOS_TEXTO } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { textoError, valor } from '../../../src/js/core/ui.js';

class PeonAjustes extends Componente<VistaProps> {
  static tag = 'peon-ajustes';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-input', 'iswc-button', 'iswc-callout', 'iswc-person', 'iswc-tag', 'iswc-theme-toggle'];

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

  #sesion(): Node {
    return html`
      <div class="caja angosta">
        <div class="fila-tema"><span>Tema claro u oscuro</span><iswc-theme-toggle scope="root"></iswc-theme-toggle></div>
        <dl class="datos"><dt>Servidor</dt><dd><code>${baseApi()}</code></dd></dl>
        <div class="acciones"><iswc-button variant="outlined" color="danger" onclick=${() => void salir()}><iswc-icon slot="start" icon="mdi:logout"></iswc-icon>Cerrar sesión</iswc-button></div>
      </div>`;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    root.append(grupoPestanas('ajustes', props.pestana, (p) => (p === 'clave' ? this.#clave() : p === 'sesion' ? this.#sesion() : this.#perfil())));
  }
}

define(PeonAjustes);
