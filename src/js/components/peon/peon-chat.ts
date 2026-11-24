// @contexto HANDOFF.md §2b punto 5 · PROMPT-CLAUDE.md §4 (vista 9) · PLAN Fase 5b
/**
 * <peon-chat> — chat con el VPS REUTILIZABLE (transversal): lo usa la vista «Chat con el VPS», el cajón que se abre
 * desde cualquier pantalla (`abrirChat()` en core/ui.ts) y quien lo quiera embebido.
 *
 *   props.contexto  qué se cita: { tipo: 'noticia', id, titulo, fragmento } (desde el menú contextual de una noticia)
 *                   o { tipo: 'pantalla', pantalla }. Se ve como una ficha sobre el campo y viaja al VPS aparte.
 *   props.compacto  versión de cajón: herramientas en una fila desplazable, sin recomendaciones grandes.
 *   borrador(t)     deja un texto listo en el campo (Inicio y las herramientas lo usan).
 *
 *   Herramientas (estilo NotebookLM), adjuntos (máx. 4 × 8 MB, clip o arrastrar), y VOZ:
 *     · Nota de voz: `<iswc-media-recorder source="mic">` del kit graba (audio/webm → adjunto) y, si el navegador
 *       trae la Web Speech API, se transcribe a la vez (es-CO): archivo + voz + transcripción viajan al VPS.
 *   Diseño de WhatsApp: clip (archivo) a la izquierda · campo con cámara (imagen o foto) · botón redondo que es
 *   micrófono con el campo vacío y enviar cuando hay algo. Arrastrar archivos al chat los adjunta. Sin rótulos:
 *   solo `title`/`aria-label`.
 *   Respuestas del VPS en Markdown (md-lite + md-hydrate del kit, saneado). Con `publicar_noticias`: «Guardar como
 *   noticia» y, si se citó una noticia, «Aplicar a la noticia» (reemplaza el fragmento citado). En vivo por SSE `chat`.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../base/componente.js';
import type { PeonChatProps } from '../../consts/schemas/componentes.schemas.js';
import type { ContextoChat, Noticia } from '../../consts/schemas/api.schemas.js';
import { api, baseApi, escuchar, puede, sesion } from '../../core/api.js';
import { HERRAMIENTAS_CHAT, fecha } from '../../core/catalogos.js';
import { pintarMd, tituloDe } from '../../core/md.js';
import { abrirNoticia, textoError } from '../../core/ui.js';
import { Dictado, escucharVoz } from '../../core/voz.js';

type Adjunto = { id: string; nombre: string; tipo: string; tamano: number };
/** Widget de grilling del asistente (DISENO-ASISTENTE §4). */
type Widget = { tipo: 'opciones'; pregunta: string; opciones: string[]; multiple?: boolean } | { tipo: 'texto'; pregunta: string; placeholder?: string } | { tipo: 'feedback'; pregunta: string };
type Linea = { id: number; autor: 'usuario' | 'vps'; texto: string; creado: string; hilo?: string; widget?: Widget | null; adjuntos?: Adjunto[] };
type Hilo = { id: number; clave: string; titulo: string; ultimo: string | null; mensajes: number; actualizado: string };

/** Hilo de un contexto: noticia → «noticia:<id>», pantalla → «pagina:<slug>», sin contexto → «general». */
export function hiloDe(c: ContextoChat | null): { clave: string; titulo: string } {
  if (c?.tipo === 'noticia' && c.id) return { clave: `noticia:${c.id}`, titulo: c.titulo ? `Noticia: ${c.titulo}` : `Noticia ${c.id}` };
  if (c?.pantalla) return { clave: `pagina:${c.pantalla.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, titulo: c.pantalla };
  return { clave: 'general', titulo: 'Asistente' };
}
type Pendiente = { nombre: string; tipo: string; tamano: number; datos: string; voz?: boolean };
type Grabadora = HTMLElement & { start(): Promise<void>; stop(): void };

const MAX_ADJUNTOS = 4;
const MAX_BYTES = 8 * 1024 * 1024;
const PUEDE_GRABAR = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

const peso = (n: number): string => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const reloj = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function aDataUrl(b: Blob): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => mal(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(b);
  });
}

/** Baja un adjunto con la sesión (cabecera Bearer, nunca el token en la URL). */
async function blobAdjunto(a: Adjunto): Promise<Blob> {
  const r = await fetch(`${baseApi()}/chat/adjuntos/${a.id}`, { headers: { authorization: `Bearer ${sesion.token ?? ''}` } });
  if (!r.ok) throw new Error('No se pudo abrir el archivo');
  return await r.blob();
}

async function descargar(a: Adjunto): Promise<void> {
  try {
    const url = URL.createObjectURL(await blobAdjunto(a));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = a.nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (e) {
    avisar(textoError(e), 'danger');
  }
}

class PeonChat extends Componente<PeonChatProps> {
  static tag = 'peon-chat';
  static css = css;
  static deps = ['iswc-textarea', 'iswc-button', 'iswc-callout', 'iswc-empty-state', 'iswc-icon', 'iswc-media-recorder', 'iswc-spinner'];

  #lineas: Linea[] = [];
  #pendientes: Pendiente[] = [];
  #transcripcion = '';
  #soltar: (() => void) | null = null;
  #lista: HTMLElement | null = null;
  #chips: HTMLElement | null = null;
  #cita: HTMLElement | null = null;
  #estadoVoz: HTMLElement | null = null;
  #campo: (HTMLElement & { value?: string }) | null = null;
  #grabadora: Grabadora | null = null;
  #oyendo: { parar(): Promise<string> } | null = null;
  #inicioGrabacion = 0;
  #reloj: ReturnType<typeof setInterval> | undefined;
  #borradorPendiente = '';

  #hayMas = false;
  #busqueda = '';

  protected override inicial(): PeonChatProps {
    return { contexto: null, compacto: false, hilo: '', hiloTitulo: null };
  }

  /** El hilo en uso: el fijado por prop o el que se deduce del contexto. */
  get #hilo(): { clave: string; titulo: string } {
    const h = hiloDe(this.props.contexto);
    return this.props.hilo ? { clave: this.props.hilo, titulo: this.props.hiloTitulo ?? h.titulo } : h;
  }

  override onConnected(): void {
    super.onConnected();
    this.#soltar = escuchar('chat', (d) => {
      const l = d as Linea;
      if ((l.hilo ?? 'general') !== this.#hilo.clave || this.#busqueda) return;
      this.#lineas.push(l);
      this.#pintarLineas();
    });
  }

  /** Carga una página del historial del hilo (la más reciente, o la anterior a `antes`), con búsqueda opcional. */
  async #cargar(antes = 0): Promise<void> {
    const q = new URLSearchParams({ hilo: this.#hilo.clave, limite: '30' });
    if (antes) q.set('antes', String(antes));
    if (this.#busqueda) q.set('q', this.#busqueda);
    const r = await api<{ canal: boolean; hayMas: boolean; lineas: Linea[] }>('GET', `chat?${q}`);
    this.#hayMas = r.hayMas;
    const l = this.#lista;
    const alto = l ? l.scrollHeight - l.scrollTop : 0;
    this.#lineas = antes ? [...r.lineas, ...this.#lineas] : r.lineas;
    this.#pintarLineas(antes ? alto : null);
  }

  /** Lista de chats del usuario (hilos por contexto), con buscador; elegir uno lo abre aquí. */
  async #abrirHilos(panel: HTMLElement, q = ''): Promise<void> {
    try {
      const hilos = await api<Hilo[]>('GET', `chat/hilos${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      panel.querySelector('.hilos-lista')?.replaceChildren(...(hilos.length ? hilos.map((h) => html`<button type="button" class="hilo-item" ?data-actual=${h.clave === this.#hilo.clave} onclick=${() => { panel.hidden = true; this.props = { hilo: h.clave, hiloTitulo: h.titulo }; }}><strong>${h.titulo}</strong><small>${h.ultimo ?? ''}</small></button>`) : [html`<p class="nota">Sin chats todavía.</p>`]));
    } catch (e) {
      panel.querySelector('.hilos-lista')?.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`);
    }
  }

  /** Widget de grilling: la respuesta vuelve como mensaje normal del hilo. */
  /** Barra de arriba, solo íconos (title/aria-label): lista de chats (vista completa), título del hilo y buscador. */
  #cabeza(props: PeonChatProps): DocumentFragment {
    const panel = document.createElement('div');
    panel.className = 'hilos';
    panel.hidden = true;
    const buscarHilos = document.createElement('input');
    buscarHilos.className = 'buscar';
    buscarHilos.placeholder = 'Buscar chats';
    buscarHilos.addEventListener('input', () => void this.#abrirHilos(panel, buscarHilos.value.trim()));
    panel.append(buscarHilos, html`<div class="hilos-lista"></div>`);
    const buscar = document.createElement('input');
    buscar.className = 'buscar';
    buscar.type = 'search';
    buscar.placeholder = 'Buscar en este chat';
    buscar.hidden = true;
    let espera = 0;
    buscar.addEventListener('input', () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        this.#busqueda = buscar.value.trim();
        void this.#cargar();
      }, 300);
    });
    return html`
      <div class="cabeza-chat">
        ${props.compacto ? null : html`<button type="button" class="ic" title="Mis chats" aria-label="Mis chats" onclick=${() => { panel.hidden = !panel.hidden; if (!panel.hidden) void this.#abrirHilos(panel); }}><iswc-icon icon="mdi:forum-outline"></iswc-icon></button>`}
        <strong class="titulo-hilo" title=${this.#hilo.clave}>${this.#hilo.titulo}</strong>
        <button type="button" class="ic" title="Buscar en este chat" aria-label="Buscar en este chat" onclick=${() => { buscar.hidden = !buscar.hidden; if (buscar.hidden && this.#busqueda) { buscar.value = ''; this.#busqueda = ''; void this.#cargar(); } else buscar.focus(); }}><iswc-icon icon="mdi:magnify"></iswc-icon></button>
        ${props.hilo || this.props.contexto ? html`<button type="button" class="ic" title="Chat general" aria-label="Ir al chat general" onclick=${() => this.props = { hilo: 'general', hiloTitulo: 'Asistente', contexto: null }}><iswc-icon icon="mdi:home-outline"></iswc-icon></button>` : null}
      </div>
      ${buscar}
      ${panel}`;
  }

  #widget(w: Widget): DocumentFragment {
    const responder = (texto: string) => {
      if (!texto.trim()) return;
      if (this.#campo) this.#campo.value = texto;
      void this.#enviar(this.shadow?.querySelector('[data-accion]') as HTMLElement);
    };
    if (w.tipo === 'opciones') {
      const elegidas = new Set<string>();
      return html`<div class="widget" data-tipo="opciones"><p>${w.pregunta}</p><div class="opciones-w">${w.opciones.map((o) => html`<button type="button" class="op-w" onclick=${(e: Event) => {
        if (!w.multiple) return responder(o);
        const b = e.currentTarget as HTMLElement;
        if (elegidas.has(o)) elegidas.delete(o);
        else elegidas.add(o);
        b.toggleAttribute('data-elegida', elegidas.has(o));
      }}>${o}</button>`)}</div>${w.multiple ? html`<button type="button" class="enviar-w" onclick=${() => responder([...elegidas].join(', '))}>Responder</button>` : null}</div>`;
    }
    if (w.tipo === 'texto') {
      const campo = document.createElement('input');
      campo.className = 'texto-w';
      campo.placeholder = w.placeholder ?? 'Escribe tu respuesta';
      campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') responder(campo.value); });
      return html`<div class="widget" data-tipo="texto"><p>${w.pregunta}</p><div class="fila-w">${campo}<button type="button" class="enviar-w" title="Responder" aria-label="Responder" onclick=${() => responder(campo.value)}><iswc-icon icon="mdi:send"></iswc-icon></button></div></div>`;
    }
    return html`<div class="widget" data-tipo="feedback"><p>${w.pregunta}</p><div class="opciones-w"><button type="button" class="op-w" title="Sí, quedó bien" aria-label="Sí, quedó bien" onclick=${() => responder('👍 Quedó bien')}><iswc-icon icon="mdi:thumb-up-outline"></iswc-icon></button><button type="button" class="op-w" title="No, hay que ajustar" aria-label="No, hay que ajustar" onclick=${() => { if (this.#campo) { this.#campo.value = '👎 Ajusta esto: '; this.#campo.focus(); } }}><iswc-icon icon="mdi:thumb-down-outline"></iswc-icon></button></div></div>`;
  }

  override onDisconnected(): void {
    this.#soltar?.();
    this.#grabadora?.stop();
    void this.#oyendo?.parar();
    clearInterval(this.#reloj);
  }

  /** Cambiar solo el contexto no rehace la conversación: se actualiza la ficha de la cita. */
  protected override parcial(props: PeonChatProps, previos: PeonChatProps): boolean {
    if (props.compacto !== previos.compacto || !this.#cita) return false;
    // Otro hilo (otro contexto): se rehace la conversación con su historial.
    const hiloPrevio = previos.hilo || hiloDe(previos.contexto).clave;
    if ((props.hilo || hiloDe(props.contexto).clave) !== hiloPrevio) {
      this.#busqueda = '';
      return false;
    }
    this.#pintarCita();
    return true;
  }

  /** Deja una instrucción en el campo (y el foco), lista para enviar o ajustar. */
  borrador(texto: string): void {
    if (!this.#campo) {
      this.#borradorPendiente = texto;
      return;
    }
    this.#campo.value = texto;
    this.#campo.focus();
    this.#actualizarAccion();
  }

  #pintarCita(): void {
    const c = this.props.contexto;
    if (!this.#cita) return;
    if (!c) return void this.#cita.replaceChildren();
    const que = c.tipo === 'noticia' ? `«${c.titulo ?? 'noticia'}»` : c.pantalla ?? c.tipo;
    this.#cita.replaceChildren(html`
      <div class="cita" data-tipo=${c.tipo}>
        <iswc-icon icon=${c.tipo === 'noticia' ? 'mdi:newspaper-variant-outline' : 'mdi:monitor-cellphone'}></iswc-icon>
        <div class="cita-texto"><small>${c.fragmento ? `Fragmento de ${que}` : `Sobre ${que}`}</small>${c.fragmento ? html`<q>${c.fragmento}</q>` : null}</div>
        <button type="button" title="Quitar la cita" data-quitar-cita onclick=${() => { this.props = { contexto: null }; }}><iswc-icon icon="mdi:close"></iswc-icon></button>
      </div>`);
  }

  #burbuja(x: Linea): DocumentFragment {
    const cuerpo = document.createElement('div');
    cuerpo.className = 'md';
    pintarMd(cuerpo, x.texto);
    const editor = puede('publicar_noticias');
    const ctx = this.props.contexto;
    const acciones = x.autor === 'vps' && editor
      ? html`<div class="acciones-burbuja">
          <button type="button" data-guardar-noticia title="Crear un borrador de noticia con esta respuesta" onclick=${(e: Event) => void this.#guardarNoticia(x.texto, e.currentTarget as HTMLElement)}><iswc-icon icon="mdi:newspaper-plus"></iswc-icon>Guardar como noticia</button>
          ${ctx?.tipo === 'noticia' && ctx.id ? html`<button type="button" data-aplicar title="Reemplazar el fragmento citado por esta respuesta" onclick=${(e: Event) => void this.#aplicar(ctx, x.texto, e.currentTarget as HTMLElement)}><iswc-icon icon="mdi:file-replace-outline"></iswc-icon>Aplicar a la noticia</button>` : null}
        </div>`
      : null;
    return html`
      <div class="burbuja" data-autor=${x.autor}>
        ${cuerpo}
        ${x.adjuntos?.length ? html`<div class="adjuntos">${x.adjuntos.map((a) => this.#adjunto(a))}</div>` : null}
        ${x.autor === 'vps' && x.widget ? this.#widget(x.widget) : null}
        ${acciones}
        <small class="pie-burbuja">${x.autor === 'vps' ? 'VPS' : 'Tú'} · ${fecha(x.creado)}</small>
      </div>`;
  }

  /** Un audio se escucha ahí mismo (se baja al tocar); lo demás se descarga. */
  #adjunto(a: Adjunto): DocumentFragment {
    if (a.tipo.startsWith('audio/')) {
      return html`<button type="button" class="adjunto audio" title="Escuchar la nota de voz" onclick=${async (e: Event) => {
        const b = e.currentTarget as HTMLElement;
        try {
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = URL.createObjectURL(await blobAdjunto(a));
          b.replaceWith(audio);
          void audio.play().catch(() => {});
        } catch (err) {
          avisar(textoError(err), 'danger');
        }
      }}><iswc-icon icon="mdi:play-circle-outline"></iswc-icon><span>Nota de voz</span><small>${peso(a.tamano)}</small></button>`;
    }
    return html`<button type="button" class="adjunto" title="Descargar" onclick=${() => void descargar(a)}><iswc-icon icon="mdi:paperclip"></iswc-icon><span>${a.nombre}</span><small>${peso(a.tamano)}</small></button>`;
  }

  #pintarLineas(conservarAlto: number | null = null): void {
    const l = this.#lista;
    if (!l) return;
    if (!this.#lineas.length && this.#busqueda) {
      l.replaceChildren(html`<p class="nota"><iswc-icon icon="mdi:magnify-close"></iswc-icon> Nada coincide con «${this.#busqueda}» en este chat.</p>`);
      return;
    }
    if (!this.#lineas.length) {
      l.replaceChildren(html`
        <div class="recomendaciones">
          <p class="nota"><iswc-icon icon="mdi:robot-happy-outline"></iswc-icon> Pídele al VPS lo que necesites. Por ejemplo:</p>
          <div class="tarjetas">${HERRAMIENTAS_CHAT.map((h) => html`<button type="button" class="tarjeta" onclick=${() => this.borrador(h.texto)}><iswc-icon icon=${h.icono}></iswc-icon><strong>${h.titulo}</strong><small>${h.ayuda}</small></button>`)}</div>
        </div>`);
      return;
    }
    const anteriores = this.#hayMas ? html`<button type="button" class="anteriores" onclick=${(e: Event) => { (e.currentTarget as HTMLElement).setAttribute('disabled', ''); void this.#cargar(this.#lineas[0]?.id ?? 0); }}><iswc-icon icon="mdi:history"></iswc-icon>Cargar anteriores</button>` : null;
    l.replaceChildren(...(anteriores ? [anteriores] : []), ...this.#lineas.map((x) => this.#burbuja(x)));
    l.scrollTop = conservarAlto === null ? l.scrollHeight : l.scrollHeight - conservarAlto;
  }

  #pintarChips(): void {
    queueMicrotask(() => this.#actualizarAccion());
    this.#chips?.replaceChildren(...this.#pendientes.map((p, i) => html`<span class="chip" ?data-voz=${!!p.voz}><iswc-icon icon=${p.voz ? 'mdi:microphone' : 'mdi:paperclip'}></iswc-icon><span>${p.voz ? 'Nota de voz' : p.nombre}</span><small>${peso(p.tamano)}</small><button type="button" title="Quitar" onclick=${() => {
      if (p.voz) this.#transcripcion = '';
      this.#pendientes.splice(i, 1);
      this.#pintarChips();
      this.#pintarEstadoVoz('');
    }}><iswc-icon icon="mdi:close"></iswc-icon></button></span>`));
  }

  #pintarEstadoVoz(texto: string, grabando = false): void {
    if (!this.#estadoVoz) return;
    const t = texto || this.#transcripcion;
    this.#estadoVoz.toggleAttribute('hidden', !t && !grabando);
    this.#estadoVoz.replaceChildren(html`${grabando ? html`<span class="punto" aria-hidden="true"></span><strong data-reloj>${reloj((Date.now() - this.#inicioGrabacion) / 1000)}</strong>` : html`<iswc-icon icon="mdi:text-to-speech"></iswc-icon>`}<span class="transcrito">${t || (Dictado ? 'Te escucho…' : 'Grabando (este navegador no transcribe)')}</span>`);
  }

  async #adjuntar(archivos: FileList | File[] | null, voz = false): Promise<void> {
    for (const f of [...(archivos ?? [])]) {
      if (this.#pendientes.length >= MAX_ADJUNTOS) {
        avisar(`Máximo ${MAX_ADJUNTOS} archivos por mensaje`, 'warning');
        break;
      }
      if (f.size > MAX_BYTES) {
        avisar(`«${f.name}» pasa de 8 MB`, 'warning');
        continue;
      }
      try {
        this.#pendientes.push({ nombre: f.name, tipo: f.type || 'application/octet-stream', tamano: f.size, datos: await aDataUrl(f), ...(voz ? { voz: true } : {}) });
      } catch (e) {
        avisar(textoError(e), 'danger');
      }
    }
    this.#pintarChips();
  }

  /** Nota de voz: graba con el kit y transcribe a la vez si el navegador puede. Segundo toque = terminar. */
  async #voz(boton: HTMLElement): Promise<void> {
    const g = this.#grabadora;
    if (!g) return;
    if (boton.hasAttribute('data-grabando')) {
      g.stop();
      return;
    }
    if (this.#pendientes.some((p) => p.voz)) return avisar('Ya hay una nota de voz: envíala o quítala primero', 'warning');
    this.#transcripcion = '';
    const alParar = () => {
      boton.removeAttribute('data-grabando');
      this.#actualizarAccion();
      clearInterval(this.#reloj);
      const oyendo = this.#oyendo;
      this.#oyendo = null;
      void oyendo?.parar().then((t) => {
        this.#transcripcion = t;
        this.#pintarEstadoVoz(t);
        this.#actualizarAccion();
      });
    };
    g.addEventListener('iswc-stop', (e) => {
      alParar();
      const d = (e as CustomEvent<{ blob: Blob; type: string }>).detail;
      const tipo = (d.type || d.blob.type || 'audio/webm').split(';')[0]!;
      const hora = new Date().toTimeString().slice(0, 5).replace(':', '');
      void this.#adjuntar([new File([d.blob], `nota-de-voz-${hora}.${tipo.includes('ogg') ? 'ogg' : tipo.includes('mp4') ? 'm4a' : 'webm'}`, { type: tipo })], true);
    }, { once: true });
    g.addEventListener('iswc-error', (e) => {
      alParar();
      avisar(`Micrófono: ${(e as CustomEvent<{ message: string }>).detail.message}`, 'warning');
    }, { once: true });
    boton.setAttribute('data-grabando', '');
    this.#actualizarAccion();
    this.#inicioGrabacion = Date.now();
    this.#pintarEstadoVoz('', true);
    this.#reloj = setInterval(() => {
      const r = this.#estadoVoz?.querySelector('[data-reloj]');
      if (r) r.textContent = reloj((Date.now() - this.#inicioGrabacion) / 1000);
    }, 500);
    await g.start();
    this.#oyendo = escucharVoz((t) => this.#pintarEstadoVoz(t, true));
  }

  /** ¿Hay algo que enviar? (texto, adjuntos o transcripción). */
  #hayAlgo(): boolean {
    return !!String(this.#campo?.value ?? '').trim() || this.#pendientes.length > 0 || !!this.#transcripcion;
  }

  /** El botón de la derecha es micrófono (campo vacío y se puede grabar), enviar, o detener mientras graba. */
  #actualizarAccion(): void {
    const b = this.shadow?.querySelector('[data-accion]');
    if (!b) return;
    const grabando = b.hasAttribute('data-grabando');
    const modo = grabando ? 'detener' : !this.#hayAlgo() && this.#grabadora ? 'voz' : 'enviar';
    b.setAttribute('data-modo', modo);
    const t = modo === 'detener' ? 'Terminar la nota de voz' : modo === 'voz' ? (Dictado ? 'Nota de voz (se graba y se transcribe)' : 'Nota de voz') : 'Enviar';
    b.setAttribute('title', t);
    b.setAttribute('aria-label', t);
    b.querySelector('iswc-icon')?.setAttribute('icon', modo === 'detener' ? 'mdi:stop' : modo === 'voz' ? 'mdi:microphone' : 'mdi:send');
  }

  #alAccion(boton: HTMLElement): void {
    const modo = boton.getAttribute('data-modo') ?? 'enviar';
    if (modo === 'voz' || modo === 'detener') void this.#voz(boton);
    else void this.#enviar(boton);
  }

  async #enviar(boton: HTMLElement): Promise<void> {
    if (this.shadow?.querySelector('[data-grabando]')) return avisar('Termina la nota de voz antes de enviar', 'warning');
    const campo = this.#campo;
    const texto = String(campo?.value ?? '').trim();
    if (!texto && !this.#pendientes.length && !this.#transcripcion) return;
    boton.setAttribute('loading', '');
    try {
      const c = this.props.contexto;
      const h = this.#hilo;
      const r = await api<{ enviado: boolean; lineas: Linea[] }>('POST', 'chat', {
        hilo: h.clave,
        hiloTitulo: h.titulo,
        texto,
        adjuntos: this.#pendientes.map(({ voz: _v, ...p }) => p),
        ...(this.#transcripcion ? { transcripcion: this.#transcripcion } : {}),
        ...(c ? { contexto: c } : {}),
      });
      this.#lineas.push(...r.lineas);
      if (campo) campo.value = '';
      this.#pendientes = [];
      this.#transcripcion = '';
      this.#pintarChips();
      this.#pintarEstadoVoz('');
      this.#pintarLineas();
      this.#actualizarAccion();
    } catch (e) {
      avisar(textoError(e), 'danger');
    } finally {
      boton.removeAttribute('loading');
    }
  }

  /** Crea un borrador de noticia con una respuesta del VPS (el título sale de su primer encabezado). */
  async #guardarNoticia(md: string, boton: HTMLElement): Promise<void> {
    boton.setAttribute('disabled', '');
    try {
      const n = await api<Noticia>('POST', 'noticias', { titulo: tituloDe(md) || 'Noticia sin título', cuerpo_md: md, estado: 'borrador' });
      avisar('Borrador de noticia creado: revísalo y publícalo', 'success');
      abrirNoticia(n.id);
    } catch (e) {
      avisar(textoError(e), 'danger');
    } finally {
      boton.removeAttribute('disabled');
    }
  }

  /** Reemplaza en la noticia citada el fragmento por la respuesta (si el fragmento está tal cual en el Markdown). */
  async #aplicar(ctx: ContextoChat, md: string, boton: HTMLElement): Promise<void> {
    boton.setAttribute('disabled', '');
    try {
      const n = await api<Noticia>('GET', `noticias/${ctx.id}`);
      const frag = (ctx.fragmento ?? '').trim();
      let cuerpo = n.cuerpo_md;
      if (frag && cuerpo.includes(frag)) cuerpo = cuerpo.replace(frag, md.trim());
      else if (!frag) cuerpo = md;
      else {
        avisar('No encontré ese fragmento tal cual en la noticia: la abro para que lo pegues tú', 'warning');
        abrirNoticia(n.id);
        return;
      }
      await api('PUT', `noticias/${n.id}`, { cuerpo_md: cuerpo });
      avisar('Noticia actualizada', 'success');
      this.props = { contexto: { ...ctx, fragmento: md.trim().slice(0, 2000) } };
      abrirNoticia(n.id);
    } catch (e) {
      avisar(textoError(e), 'danger');
    } finally {
      boton.removeAttribute('disabled');
    }
  }

  protected override pintar(root: ShadowRoot, props: PeonChatProps): void {
    const caja = document.createElement('div');
    caja.className = 'chat';
    caja.toggleAttribute('data-compacto', props.compacto);
    this.#lista = document.createElement('div');
    this.#lista.className = 'lineas';
    this.#lista.setAttribute('role', 'log');
    this.#lista.setAttribute('aria-live', 'polite');
    this.#lista.append(html`<iswc-empty-state estado="cargando"></iswc-empty-state>`);
    this.#chips = document.createElement('div');
    this.#chips.className = 'chips';
    this.#cita = document.createElement('div');
    this.#cita.className = 'cita-caja';
    this.#estadoVoz = document.createElement('div');
    this.#estadoVoz.className = 'estado-voz';
    this.#estadoVoz.hidden = true;
    this.#estadoVoz.setAttribute('aria-live', 'polite');
    const campo = document.createElement('iswc-textarea') as HTMLElement & { value?: string };
    campo.className = 'campo';
    campo.setAttribute('placeholder', 'Mensaje');
    campo.setAttribute('aria-label', 'Mensaje (Enter envía, Mayús+Enter salta de línea)');
    campo.setAttribute('rows', '1');
    campo.setAttribute('autosize', '');
    campo.setAttribute('max-rows', '6');
    this.#campo = campo;
    const selector = (accept: string) => {
      const i = document.createElement('input');
      i.type = 'file';
      i.multiple = true;
      i.hidden = true;
      if (accept) i.accept = accept;
      i.addEventListener('change', () => {
        void this.#adjuntar(i.files);
        i.value = '';
      });
      return i;
    };
    const archivo = selector('');
    const imagen = selector('image/*');
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void this.#enviar(caja.querySelector('[data-accion]') as HTMLElement);
      }
    });
    campo.addEventListener('iswc-input', () => this.#actualizarAccion());
    campo.addEventListener('input', () => this.#actualizarAccion());
    // Arrastrar y soltar archivos en cualquier parte del chat: se adjuntan (como en WhatsApp Web).
    let arrastres = 0;
    caja.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      arrastres++;
      caja.setAttribute('data-soltar', '');
    });
    caja.addEventListener('dragleave', () => {
      if (--arrastres <= 0) {
        arrastres = 0;
        caja.removeAttribute('data-soltar');
      }
    });
    caja.addEventListener('dragover', (e) => e.preventDefault());
    caja.addEventListener('drop', (e) => {
      e.preventDefault();
      arrastres = 0;
      caja.removeAttribute('data-soltar');
      void this.#adjuntar(e.dataTransfer?.files ?? null);
    });
    const grabadora = document.createElement('iswc-media-recorder') as Grabadora;
    grabadora.setAttribute('source', 'mic');
    grabadora.className = 'grabadora';
    this.#grabadora = PUEDE_GRABAR ? grabadora : null;
    const aviso = document.createElement('div');
    caja.append(html`
      ${this.#cabeza(props)}
      <div class="herramientas" role="toolbar" aria-label="Herramientas">${HERRAMIENTAS_CHAT.map((h) => html`<button type="button" class="herramienta" title=${h.ayuda} onclick=${() => this.borrador(h.texto)}><iswc-icon icon=${h.icono}></iswc-icon>${h.titulo}</button>`)}</div>
      ${aviso}
      ${this.#lista}
      <div class="escribir">
        ${this.#cita}
        ${this.#estadoVoz}
        ${this.#chips}
        <div class="fila-escribir">
          <button type="button" class="redondo plano" title="Adjuntar archivo (máx. 4 de 8 MB)" aria-label="Adjuntar archivo" data-adjuntar onclick=${() => archivo.click()}><iswc-icon icon="mdi:paperclip"></iswc-icon></button>
          <div class="caja-campo">
            ${campo}
            <button type="button" class="en-campo" title="Adjuntar imagen o tomar foto" aria-label="Adjuntar imagen o tomar foto" data-imagen onclick=${() => imagen.click()}><iswc-icon icon="mdi:camera-outline"></iswc-icon></button>
          </div>
          <button type="button" class="redondo accion" data-accion title="Enviar" aria-label="Enviar" onclick=${(e: Event) => void this.#alAccion(e.currentTarget as HTMLElement)}><iswc-icon icon="mdi:send"></iswc-icon></button>
          ${archivo}${imagen}
        </div>
        <p class="soltar" aria-hidden="true"><iswc-icon icon="mdi:tray-arrow-down"></iswc-icon>Suelta para adjuntar</p>
        ${this.#grabadora}
      </div>
    `);
    root.append(caja);
    this.#pintarCita();
    this.#pintarChips();
    void api<{ canal: boolean; hayMas: boolean; lineas: Linea[] }>('GET', `chat?hilo=${encodeURIComponent(this.#hilo.clave)}&limite=30`).then((r) => {
      this.#lineas = r.lineas;
      this.#hayMas = r.hayMas;
      if (!r.canal) aviso.replaceChildren(html`<p class="aviso" data-tipo="warning"><iswc-icon icon="mdi:lan-disconnect"></iswc-icon><span class="texto">El canal con el VPS aún no está configurado; los mensajes quedan guardados.</span></p>`);
      this.#pintarLineas();
      let borrador = this.#borradorPendiente;
      this.#borradorPendiente = '';
      try {
        borrador ||= sessionStorage.getItem('peon:chat-borrador') ?? '';
        sessionStorage.removeItem('peon:chat-borrador');
      } catch { /* sin almacenamiento */ }
      if (borrador) this.borrador(borrador);
    }).catch((e) => this.#lista?.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
  }
}

define(PeonChat);
