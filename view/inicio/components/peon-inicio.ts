// @contexto PROMPT-CLAUDE.md §4 (vista 2 · Inicio)
/**
 * <peon-inicio> — portada de la campaña y resumen del usuario. Pestañas:
 *   Campaña       portada «wow» del candidato (foto, nombre, lema, cinta de la bandera, redes), accesos (inspirados en
 *                 las FUNCIONES de RedCivika: noticias diarias, registro de amigos, publicidad descargable, puesto de
 *                 votación, políticas de privacidad, versión) + biografía, trayectoria, cómo votar, últimas noticias y
 *                 el aviso «no es una aplicación oficial del Gobierno».
 *   Mi resumen    cuántos registros hizo, cuántos están pendientes de verificar y avisos (+ acceso al chat).
 *   Mis registros los últimos que hizo, con acceso a la ficha.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import type { NoticiaFila, PersonaFila } from '../../../src/js/consts/schemas/api.schemas.js';
import { api, puede, sesion, usuarioActivo } from '../../../src/js/core/api.js';
import { HERRAMIENTAS_CHAT, fecha } from '../../../src/js/core/catalogos.js';
import { CAMPANA } from '../../../src/js/core/config.js';
import { tarjetaNoticia } from '../../../src/js/core/noticias.js';
import { abrirChat, abrirFicha, estadoPuesto, ir, textoError } from '../../../src/js/core/ui.js';

type Resumen = { misRegistros: number; misRegistrosHoy: number; misPendientes: number; visibles: number; pendientes: number; verificados: number; avisos: { tipo: string; texto: string; ir?: string }[] };

class PeonInicio extends Componente<VistaProps> {
  static tag = 'peon-inicio';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-stat', 'iswc-callout', 'iswc-button', 'iswc-empty-state', 'iswc-tag', 'peon-ficha-persona'];

  #noticias: HTMLElement | null = null;

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

  /** En la portada solo se refrescan las últimas noticias (la portada no parpadea); el resto se repinta. */
  #alCambiar = (e: Event): void => {
    const d = (e as CustomEvent<{ entidad?: string }>).detail;
    if (this.#noticias?.isConnected && this.shadow?.querySelector('iswc-tab-group')?.getAttribute('active') === 'campana') {
      if (d?.entidad === 'noticia') void this.#cargarNoticias();
      return;
    }
    this.props = {};
  };

  /** Portada del candidato y accesos de la campaña. */
  #campana(): Node {
    // PÚBLICA (app abierta): sin sesión se ve igual, solo sin los accesos operativos.
    const u = usuarioActivo();
    const caja = document.createElement('div');
    caja.className = 'campana';
    const redes = CAMPANA.redes.filter((r) => r.url);
    const chat = puede('chat_con_vps');
    const accesos: { id: string; icono: string; titulo: string; texto: string; ir: () => void; si?: boolean }[] = [
      { id: 'noticias', icono: 'mdi:newspaper-variant-outline', titulo: 'Noticias diarias', texto: 'Lo último de la campaña', ir: () => ir('noticias', 'noticias') },
      { id: 'registrar', icono: 'mdi:account-plus-outline', titulo: 'Registra a tus amigos', texto: 'Suma gente a la marcha', ir: () => ir('registro', 'persona'), si: !!u?.escribe },
      { id: 'puesto', icono: 'mdi:map-marker-radius-outline', titulo: 'Puesto de votación', texto: u?.escribe ? 'Dónde y en qué mesa' : 'Cómo consultarlo, paso a paso', ir: () => (u?.escribe ? ir('registro', 'consulta') : ir('noticias', 'votar')) },
      { id: 'publicidad', icono: 'mdi:download-outline', titulo: 'Publicidad descargable', texto: 'Piezas para redes y WhatsApp', ir: () => ir('noticias', 'publicidad') },
      { id: 'biografia', icono: 'mdi:account-star-outline', titulo: 'Biografía', texto: `Quién es ${CAMPANA.candidato.split(' ')[0]}`, ir: () => ir('noticias', 'candidato') },
      { id: 'trayectoria', icono: 'mdi:timeline-text-outline', titulo: 'Trayectoria', texto: 'El camino recorrido', ir: () => ir('noticias', 'candidato') },
      { id: 'votar', icono: 'mdi:vote-outline', titulo: 'Cómo votar', texto: 'Paso a paso, sin errores', ir: () => ir('noticias', 'votar') },
      { id: 'chat', icono: 'mdi:robot-outline', titulo: 'Pregúntale al VPS', texto: 'Informes, ideas y noticias', ir: () => abrirChat({ tipo: 'pantalla', id: null, titulo: null, fragmento: null, pantalla: 'Inicio' }), si: chat },
      { id: 'privacidad', icono: 'mdi:shield-lock-outline', titulo: 'Privacidad', texto: 'Cómo cuidamos tus datos', ir: () => ir('noticias', 'privacidad') },
    ];
    this.#noticias = document.createElement('div');
    this.#noticias.className = 'nt-rejilla';
    const [nombre, ...resto] = CAMPANA.candidato.split(' ');
    const apellido = resto.join(' ');
    caja.append(html`
      <section class="portada" aria-label="El candidato">
        <div class="sombrilla" aria-hidden="true"></div>
        <div class="medio-tono" aria-hidden="true"></div>
        <div class="brillo" aria-hidden="true"></div>
        <figure class="foto">
          <picture>
            <source media="(max-width: 40em)" srcset=${CAMPANA.fotoBustoChica}>
            <img src=${CAMPANA.fotoBusto} alt=${`${CAMPANA.candidato}, candidato de ${CAMPANA.movimiento}`} width="714" height="760" fetchpriority="high">
          </picture>
        </figure>
        <div class="quien">
          <small class="movimiento">${CAMPANA.movimiento}</small>
          <p class="manuscrito">Pequeño en apariencia, grande en propósito</p>
          <h2 class="nombre"><span class="pincel">${nombre}<span class="clave"> ${apellido}</span></span></h2>
          <p class="lema"><span>${CAMPANA.lema}</span></p>
          <small class="lugar"><iswc-icon icon="mdi:map-marker-outline"></iswc-icon>${CAMPANA.lugar}</small>
          <small class="hashtag"><iswc-icon icon="mdi:chess-pawn"></iswc-icon>#LaFuerzaDelPeónEnMarcha</small>
          <div class="llamados">
            ${u?.escribe ? html`<button type="button" class="llamado principal" data-registrar onclick=${() => ir('registro', 'persona')}><iswc-icon icon="mdi:account-plus-outline"></iswc-icon>Registrar a un amigo</button>` : null}
            <button type="button" class="llamado" data-ver-noticias onclick=${() => ir('noticias', 'noticias')}><iswc-icon icon="mdi:newspaper-variant-outline"></iswc-icon>Noticias</button>
          </div>
          ${redes.length ? html`<nav class="redes" aria-label="Redes sociales">${redes.map((r) => html`<a href=${r.url} target="_blank" rel="noopener noreferrer" title=${r.red} aria-label=${r.red}><iswc-icon icon=${r.icono}></iswc-icon></a>`)}</nav>` : null}
        </div>
        <div class="pie-tablero" aria-hidden="true"></div>
        <div class="cinta" aria-hidden="true"></div>
      </section>
      <nav class="accesos" aria-label="Accesos de la campaña">
        ${accesos.filter((a) => a.si !== false).map((a, i) => html`<button type="button" class="acceso" data-acceso=${a.id} style=${`--i:${i}`} onclick=${a.ir}><iswc-icon icon=${a.icono}></iswc-icon><strong>${a.titulo}</strong><small>${a.texto}</small></button>`)}
      </nav>
      <section class="bloque-noticias">
        <header class="cabeza-bloque"><h3>Últimas noticias</h3><button type="button" class="ver-todo" onclick=${() => ir('noticias', 'noticias')}>Ver todas <iswc-icon icon="mdi:chevron-right"></iswc-icon></button></header>
        ${this.#noticias}
      </section>
    `);
    void this.#cargarNoticias();
    return caja;
  }

  async #cargarNoticias(): Promise<void> {
    const l = this.#noticias;
    if (!l) return;
    try {
      const filas = await api<NoticiaFila[]>('GET', 'noticias?categoria=noticia&limite=6');
      l.replaceChildren(filas.length
        ? html`${filas.map((n) => tarjetaNoticia(n))}`
        : html`<p class="vacio"><iswc-icon icon="mdi:newspaper-variant-outline"></iswc-icon>Muy pronto, las noticias de la campaña.</p>`);
    } catch (e) {
      l.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`);
    }
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
    // Inicio es UNA sola página (sin pestañas, pedido del autor): la campaña arriba y, con sesión, el resumen y los
    // registros propios como secciones de la misma página.
    void props;
    const pagina = document.createElement('div');
    pagina.className = 'pagina-inicio';
    pagina.append(this.#campana());
    if (usuarioActivo()) {
      pagina.append(html`
        <section class="seccion"><header class="cabeza-bloque"><h3>Mi resumen</h3></header>${this.#resumen()}</section>
        <section class="seccion"><header class="cabeza-bloque"><h3>Mis registros</h3><button type="button" class="ver-todo" onclick=${() => ir('listado')}>Ver todos <iswc-icon icon="mdi:chevron-right"></iswc-icon></button></header>${this.#recientes()}</section>`);
    }
    root.append(pagina);
  }
}

define(PeonInicio);
