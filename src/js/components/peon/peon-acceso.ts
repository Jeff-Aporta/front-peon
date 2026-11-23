// @contexto PROMPT-CLAUDE.md §4 (vista Acceso) · §6.3 (primer ingreso)
/**
 * <peon-acceso> — vista de acceso a pantalla completa.
 *   modo `entrar`:  cédula (máscara de dígitos) + clave (mínimo 4). No hay registro abierto: el perfil lo crea un admin.
 *   modo `cambiar`: primer ingreso con clave temporal → cambio obligatorio antes de cualquier vista.
 * La clave nunca se guarda ni se escribe en ningún registro. La sesión avisa a la app (`peon:sesion`).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../base/componente.js';
import type { PeonAccesoProps } from '../../consts/schemas/componentes.schemas.js';
import { cambiarClave, entrar, salir, sesion } from '../../core/api.js';
import { textoError, valor } from '../../core/ui.js';

class PeonAcceso extends Componente<PeonAccesoProps> {
  static tag = 'peon-acceso';
  static css = css;
  static deps = ['iswc-input', 'iswc-masked-input', 'iswc-button', 'iswc-callout', 'iswc-card', 'iswc-theme-toggle'];

  #ocupado = false;

  protected override inicial(): PeonAccesoProps {
    return { modo: 'entrar' };
  }

  #error(texto: string): void {
    const aviso = this.shadow?.querySelector('[data-error]');
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.toggleAttribute('hidden', !texto);
  }

  async #enviar(): Promise<void> {
    if (this.#ocupado) return;
    const raiz = this.shadow;
    this.#error('');
    const boton = raiz?.querySelector('[data-enviar]');
    try {
      this.#ocupado = true;
      boton?.setAttribute('loading', '');
      if (this.props.modo === 'cambiar') {
        const actual = valor(raiz, 'actual');
        const nueva = valor(raiz, 'nueva');
        if (nueva.length < 4) throw new Error('La clave nueva debe tener al menos 4 caracteres');
        if (nueva !== valor(raiz, 'repetir')) throw new Error('Las dos claves nuevas no coinciden');
        await cambiarClave(actual, nueva);
        avisar('Listo: tu clave quedó cambiada.', 'success');
      } else {
        const cedula = valor(raiz, 'cedula').replace(/\D/g, '');
        const clave = valor(raiz, 'clave');
        if (cedula.length < 5) throw new Error('Escribe tu número de cédula');
        if (clave.length < 4) throw new Error('La clave tiene al menos 4 caracteres');
        const u = await entrar(cedula, clave);
        if (u && !u.claveTemporal) avisar(`Bienvenido, ${u.nombre.split(' ')[0]}.`, 'success');
      }
    } catch (e) {
      this.#error(textoError(e));
    } finally {
      this.#ocupado = false;
      boton?.removeAttribute('loading');
    }
  }

  protected override pintar(root: ShadowRoot, props: PeonAccesoProps): void {
    const cambiar = props.modo === 'cambiar';
    const enviar = () => void this.#enviar();
    root.append(html`
      <div class="pantalla">
        <section class="tarjeta" part="tarjeta">
          <img class="logo" src="./assets/logo-160.webp" alt="La Fuerza del Peón en Marcha · Armenia - Quindío" width="132" height="132">
          <h1 class="titulo"><span class="peon">Peón</span> en Marcha</h1>
          <p class="lema">Nuestra misión es servir, no figurar.</p>
          <form class="campos" onsubmit=${(e: Event) => { e.preventDefault(); enviar(); }}>
            ${cambiar
              ? html`
                <p class="explica">Hola, <strong>${sesion.usuario?.nombre ?? ''}</strong>. Entraste con una clave temporal: cámbiala para continuar.</p>
                <iswc-input data-campo="actual" label="Clave temporal" type="password" password-toggle autocomplete="current-password" required full-width></iswc-input>
                <iswc-input data-campo="nueva" label="Clave nueva" type="password" password-toggle autocomplete="new-password" hint="Mínimo 4 caracteres." required full-width></iswc-input>
                <iswc-input data-campo="repetir" label="Repite la clave nueva" type="password" password-toggle autocomplete="new-password" required full-width oniswc-enter=${enviar}></iswc-input>`
              : html`
                <iswc-masked-input data-campo="cedula" label="Cédula" pattern="000000000999" placeholder="Número de cédula" autocomplete="username" inputmode="numeric" required full-width></iswc-masked-input>
                <iswc-input data-campo="clave" label="Clave" type="password" password-toggle autocomplete="current-password" required full-width oniswc-enter=${enviar}></iswc-input>`}
            <iswc-callout data-error color="danger" hidden></iswc-callout>
            <iswc-button data-enviar color="brand" type="submit" onclick=${enviar}>${cambiar ? 'Cambiar clave y entrar' : 'Entrar'}</iswc-button>
            ${cambiar
              ? html`<iswc-button variant="text" onclick=${() => void salir()}>Salir</iswc-button>`
              : html`<p class="ayuda">¿No tienes perfil? Pídeselo a la administración de tu escuadra.</p>`}
          </form>
        </section>
        <iswc-theme-toggle class="tema" scope="root"></iswc-theme-toggle>
      </div>
    `);
  }
}

define(PeonAcceso);
