// @contexto PROMPT-CLAUDE.md §4 (vista 7 · Perfiles) · §6.3 (perfiles y permisos) · §6.6 (captcha)
/**
 * <peon-perfiles> — solo administración.
 *   Perfiles:       lista; por perfil: rol, activo, líder y los INTERRUPTORES de permisos. Un admin solo puede
 *                   poner o quitar los que él mismo tiene (los demás salen deshabilitados; el backend lo exige).
 *   Crear perfil:   cédula, nombre, WhatsApp, rol → la clave temporal se ve UNA vez, con el mensaje listo para
 *                   copiar o abrir en WhatsApp (envío manual por ahora; el bot lo tomará del mismo endpoint).
 *   Mensajes:       bandeja de credenciales pendientes/enviadas.
 *   Verificaciones: captchas de la fuente oficial; el admin escribe lo que ve y el VPS reanuda la consulta.
 *   Bitácora:       auditoría completa.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import type { PerfilAdmin } from '../../../src/js/consts/schemas/api.schemas.js';
import { api, puede, sesion } from '../../../src/js/core/api.js';
import { PERMISOS_TEXTO, ROLES, fecha } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { copiar, textoError, valor } from '../../../src/js/core/ui.js';

type Creado = { cedula: string; claveTemporal: string; mensaje: string; whatsappUrl: string };
type Mensaje = { id: number; destino: string; whatsapp: string; estado: string; creado: string; enviado: string | null };
type Captcha = { id: string; imagen: string; creado: string; cedula: string };
type Evento = { id: number; actorNombre: string; texto: string; objeto: string | null; ip: string | null; creado: string };

const cargando = () => html`<iswc-empty-state estado="cargando"></iswc-empty-state>`;
const fallo = (e: unknown) => html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`;

class PeonPerfiles extends Componente<VistaProps> {
  static tag = 'peon-perfiles';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-input', 'iswc-masked-input', 'iswc-select', 'iswc-switch', 'iswc-button', 'iswc-callout', 'iswc-card', 'iswc-person', 'iswc-tag', 'iswc-empty-state', 'iswc-data-grid'];

  protected override inicial(): VistaProps {
    return { pestana: '' };
  }

  #rolesPermitidos(): string[] {
    return Object.keys(ROLES).filter((r) => (r === 'ADMIN' ? puede('agregar_admins') : puede('crear_perfiles')));
  }

  /* ── Perfiles ── */

  #perfiles(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    const lista = document.createElement('div');
    lista.className = 'tarjetas';
    lista.append(cargando());
    caja.append(html`<p class="nota">Solo puedes encender o apagar permisos que tú tienes. Los cambios se guardan al instante.</p>`, lista);
    const cargar = () => void api<PerfilAdmin[]>('GET', 'perfiles').then((ps) => {
      const lideres = ps.filter((p) => p.rol === 'LIDER' || p.rol === 'ADMIN');
      lista.replaceChildren(...ps.map((p) => this.#tarjetaPerfil(p, lideres, cargar)));
    }).catch((e) => lista.replaceChildren(fallo(e)));
    cargar();
    return caja;
  }

  #tarjetaPerfil(p: PerfilAdmin, lideres: PerfilAdmin[], recargar: () => void): Node {
    const yo = p.cedula === sesion.usuario?.cedula;
    const puedeEditar = !yo && (p.rol !== 'ADMIN' ? puede('editar_admins') || puede('crear_perfiles') : puede('editar_admins'));
    const cambiar = async (cambio: Record<string, unknown>) => {
      try {
        await api('PUT', `perfiles/${p.cedula}`, cambio);
        avisar('Perfil actualizado.', 'success');
      } catch (e) {
        avisar(textoError(e), 'danger');
      }
      recargar();
    };
    const reenviar = async () => {
      try {
        const r = await api<{ mensaje: string; whatsappUrl: string }>('POST', 'mensajes/credencial', { cedula: p.cedula });
        const ok = await copiar(r.mensaje);
        avisar(ok ? 'Mensaje copiado. Ábrelo en WhatsApp para enviarlo.' : 'Mensaje listo.', 'success');
        window.open(r.whatsappUrl, '_blank', 'noopener');
      } catch (e) {
        avisar(textoError(e), 'danger');
      }
    };
    return html`
      <article class="perfil" ?data-inactivo=${!p.activo}>
        <header>
          <iswc-person nombre=${p.nombre} detalle=${`${p.cedula ?? p.cedula_visible} · ${p.whatsapp ?? ''}`}></iswc-person>
          <span class="etiquetas">
            ${yo ? html`<iswc-tag color="brand" pill>tú</iswc-tag>` : null}
            ${p.clave_temporal ? html`<iswc-tag color="warning" pill>clave temporal</iswc-tag>` : null}
          </span>
        </header>
        <div class="controles">
          <iswc-select label="Rol" full-width value=${p.rol} ?disabled=${!puedeEditar} oniswc-change=${(e: Event) => void cambiar({ rol: (e.currentTarget as HTMLElement & { value: string }).value })}>
            ${Object.entries(ROLES).map(([k, v]) => html`<iswc-option value=${k} ?disabled=${k === 'ADMIN' && !puede('agregar_admins') && p.rol !== 'ADMIN'}>${v}</iswc-option>`)}
          </iswc-select>
          <iswc-select label="Escuadra (líder)" full-width value=${p.lider ?? ''} placeholder="Sin líder" clearable ?disabled=${!puedeEditar} oniswc-change=${(e: Event) => void cambiar({ lider: (e.currentTarget as HTMLElement & { value: string }).value || null })}>
            ${lideres.filter((l) => l.cedula !== p.cedula).map((l) => html`<iswc-option value=${l.cedula ?? ''}>${l.nombre}</iswc-option>`)}
          </iswc-select>
          <iswc-switch ?checked=${p.activo} ?disabled=${!puedeEditar} oniswc-change=${(e: Event) => void cambiar({ activo: (e.currentTarget as HTMLElement & { checked: boolean }).checked })}>Activo</iswc-switch>
        </div>
        ${p.rol === 'ADMIN'
          ? html`<div class="permisos">${Object.entries(PERMISOS_TEXTO).map(([k, texto]) => html`
              <iswc-switch size="small" ?checked=${p.permisos[k] === true} ?disabled=${!puedeEditar || !puede(k)} title=${puede(k) ? '' : 'No tienes este permiso: no puedes darlo ni quitarlo'} oniswc-change=${(e: Event) => void cambiar({ permisos: { [k]: (e.currentTarget as HTMLElement & { checked: boolean }).checked } })}>${texto}</iswc-switch>`)}</div>`
          : html`<p class="nota">Usuario común: registra, lista y ve lo suyo según su rol.${p.permisos.ver_miembros ? ' Ve Miembros.' : ''}</p>`}
        ${p.mensajeDisponible ? html`<iswc-button size="small" variant="outlined" onclick=${() => void reenviar()}><iswc-icon slot="start" icon="mdi:whatsapp"></iswc-icon>Reenviar credencial</iswc-button>` : null}
      </article>`;
  }

  /* ── Crear perfil ── */

  #crear(): Node {
    const caja = document.createElement('form');
    caja.className = 'caja crear';
    caja.addEventListener('submit', (e) => e.preventDefault());
    const resultado = document.createElement('div');
    const roles = this.#rolesPermitidos();
    const enviar = async (boton: HTMLElement) => {
      const datos = { cedula: valor(caja, 'cedula').replace(/\D/g, ''), nombre: valor(caja, 'nombre'), whatsapp: valor(caja, 'whatsapp').replace(/[^\d+]/g, ''), rol: valor(caja, 'rol') || 'REGISTRADOR' };
      boton.setAttribute('loading', '');
      try {
        const r = await api<Creado>('POST', 'perfiles', datos);
        resultado.replaceChildren(this.#credencial(r));
        for (const c of caja.querySelectorAll<HTMLElement & { value: string }>('[data-campo]')) if (c.dataset.campo !== 'rol') c.value = '';
      } catch (e) {
        resultado.replaceChildren(fallo(e));
      } finally {
        boton.removeAttribute('loading');
      }
    };
    caja.append(html`
      <p class="nota">La app genera una clave temporal aleatoria. La verás <strong>una sola vez</strong>; la persona la cambia en su primer ingreso.</p>
      <div class="rejilla">
        <iswc-masked-input data-campo="cedula" label="Cédula (será su usuario)" pattern="000000999999" inputmode="numeric" required></iswc-masked-input>
        <iswc-input data-campo="nombre" label="Nombre completo" required></iswc-input>
        <iswc-input data-campo="whatsapp" label="WhatsApp" type="tel" placeholder="3001234567" required></iswc-input>
        <iswc-select data-campo="rol" label="Rol" value=${roles.includes('REGISTRADOR') ? 'REGISTRADOR' : roles[0] ?? ''}>${roles.map((r) => html`<iswc-option value=${r}>${ROLES[r]}</iswc-option>`)}</iswc-select>
      </div>
      <div class="acciones"><iswc-button color="brand" onclick=${(e: Event) => void enviar(e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:account-plus"></iswc-icon>Crear perfil</iswc-button></div>
      ${resultado}
    `);
    return caja;
  }

  #credencial(r: Creado): Node {
    return html`
      <iswc-card class="credencial">
        <h2><iswc-icon icon="mdi:key-variant"></iswc-icon> Perfil creado</h2>
        <dl class="datos"><dt>Usuario</dt><dd>${r.cedula}</dd><dt>Clave temporal</dt><dd><code class="clave">${r.claveTemporal}</code></dd></dl>
        <iswc-callout color="warning" icon="mdi:eye-outline">Esta clave no se volverá a mostrar aquí. Envíala ahora.</iswc-callout>
        <p class="mensaje">${r.mensaje}</p>
        <div class="acciones">
          <iswc-button variant="outlined" onclick=${async () => avisar((await copiar(r.mensaje)) ? 'Mensaje copiado.' : 'No se pudo copiar.', 'success')}><iswc-icon slot="start" icon="mdi:content-copy"></iswc-icon>Copiar mensaje</iswc-button>
          <iswc-button color="brand" href=${r.whatsappUrl} target="_blank"><iswc-icon slot="start" icon="mdi:whatsapp"></iswc-icon>Abrir en WhatsApp</iswc-button>
        </div>
      </iswc-card>`;
  }

  /* ── Mensajes ── */

  #mensajes(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    caja.append(cargando());
    const cargar = () => void api<Mensaje[]>('GET', 'mensajes').then((ms) => {
      caja.replaceChildren(ms.length
        ? html`<ul class="lista">${ms.map((m) => html`<li class="fila estatica"><span class="quien"><strong>Credencial · …${m.destino.slice(-4)}</strong><small>${m.whatsapp} · ${fecha(m.creado)}${m.enviado ? ` · enviado ${fecha(m.enviado)}` : ''}</small></span>
            ${m.estado === 'enviado' ? html`<iswc-tag color="success" pill>enviado</iswc-tag>` : html`<iswc-button size="small" variant="outlined" onclick=${async () => { await api('PUT', `mensajes/${m.id}`).catch((e) => avisar(textoError(e), 'danger')); cargar(); }}>Marcar enviado</iswc-button>`}</li>`)}</ul>`
        : html`<iswc-empty-state icono="mdi:whatsapp" titulo="Sin mensajes"></iswc-empty-state>`);
    }).catch((e) => caja.replaceChildren(fallo(e)));
    cargar();
    return caja;
  }

  /* ── Verificaciones (captcha) ── */

  #captchas(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    caja.append(cargando());
    const cargar = () => void api<Captcha[]>('GET', 'captchas').then((cs) => {
      caja.replaceChildren(html`<p class="nota">Cuando la fuente oficial pide verificación, aparece aquí. Escribe lo que muestra la imagen: el servidor reanuda la consulta solo.</p>`,
        cs.length
          ? html`<div class="tarjetas">${cs.map((c) => {
              const responder = async (boton: HTMLElement, campo: HTMLElement & { value?: string }) => {
                boton.setAttribute('loading', '');
                try {
                  const r = await api<{ estado: string }>('POST', `captchas/${c.id}`, { respuesta: String(campo.value ?? '') });
                  avisar(r.estado === 'verificado' ? 'Listo: puesto verificado.' : 'La fuente no aceptó la respuesta; quedó pendiente.', r.estado === 'verificado' ? 'success' : 'warning');
                } catch (e) {
                  avisar(textoError(e), 'danger');
                }
                cargar();
              };
              const campo = document.createElement('iswc-input') as HTMLElement & { value?: string };
              campo.setAttribute('label', 'Lo que dice la imagen');
              return html`<article class="perfil captcha"><img src=${c.imagen} alt="Verificación de la fuente oficial"><small>Cédula ${c.cedula} · ${fecha(c.creado)}</small>${campo}<iswc-button color="brand" onclick=${(e: Event) => void responder(e.currentTarget as HTMLElement, campo)}>Enviar</iswc-button></article>`;
            })}</div>`
          : html`<iswc-empty-state icono="mdi:shield-check-outline" titulo="Nada por verificar"></iswc-empty-state>`);
    }).catch((e) => caja.replaceChildren(fallo(e)));
    cargar();
    return caja;
  }

  /* ── Bitácora ── */

  #bitacora(): Node {
    const caja = document.createElement('div');
    caja.className = 'caja';
    const grid = document.createElement('iswc-data-grid') as HTMLElement & { columns: unknown[]; rows: unknown[] };
    grid.setAttribute('density', 'compact');
    grid.setAttribute('pagination', '');
    grid.setAttribute('page-size', '25');
    grid.setAttribute('auto-height', '');
    grid.setAttribute('quick-filter', '');
    grid.setAttribute('show-toolbar', '');
    grid.columns = [
      { field: 'fecha', headerName: 'Fecha', width: 170 },
      { field: 'actor', headerName: 'Quién', width: 180 },
      { field: 'texto', headerName: 'Qué', flex: 1, minWidth: 200 },
      { field: 'objeto', headerName: 'Sobre', width: 140 },
      { field: 'ip', headerName: 'Desde', width: 140 },
    ];
    caja.append(grid);
    void api<Evento[]>('GET', 'bitacora?limite=500').then((ev) => {
      grid.rows = ev.map((e) => ({ id: e.id, fecha: fecha(e.creado), actor: e.actorNombre, texto: e.texto, objeto: e.objeto ?? '', ip: e.ip ?? '' }));
    }).catch((e) => caja.replaceChildren(fallo(e)));
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    const visibles = (id: string) => (id === 'crear' ? this.#rolesPermitidos().length > 0 : true);
    root.append(grupoPestanas('perfiles', props.pestana, (p) => {
      if (p === 'crear') return this.#crear();
      if (p === 'mensajes') return this.#mensajes();
      if (p === 'captchas') return this.#captchas();
      if (p === 'bitacora') return this.#bitacora();
      return this.#perfiles();
    }, visibles));
  }
}

define(PeonPerfiles);
