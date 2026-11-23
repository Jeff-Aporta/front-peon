// @contexto PROMPT-CLAUDE.md §4 (vista 9 · Chat con el VPS) · PLAN Fase 5b
/**
 * <peon-chat-vps> — conversación con el VPS dentro de la app (permiso `chat_con_vps`, nace apagado).
 *
 *   Barra de herramientas (estilo NotebookLM): instrucciones predefinidas de un toque (`HERRAMIENTAS_CHAT`).
 *   Recomendaciones: con la conversación vacía, tarjetas de lo que se puede pedir.
 *   Adjuntos: hasta 4 archivos de 8 MB por mensaje (se guardan en el VPS, fuera de git); se descargan con la sesión.
 *   En vivo: la API reenvía cada línea al canal del Worker (`CANAL_URL`); la respuesta del bot llega por el evento
 *   `chat` (SSE) sin recargar. Inicio puede dejar un borrador en `sessionStorage['peon:chat-borrador']`.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import { api, baseApi, escuchar, sesion } from '../../../src/js/core/api.js';
import { HERRAMIENTAS_CHAT, fecha } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { textoError } from '../../../src/js/core/ui.js';

type Adjunto = { id: string; nombre: string; tipo: string; tamano: number };
type Linea = { id: number; autor: 'usuario' | 'vps'; texto: string; creado: string; adjuntos?: Adjunto[] };
type Pendiente = { nombre: string; tipo: string; tamano: number; datos: string };

const MAX_ADJUNTOS = 4;
const MAX_BYTES = 8 * 1024 * 1024;

const peso = (n: number): string => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function leerArchivo(f: File): Promise<Pendiente> {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok({ nombre: f.name, tipo: f.type || 'application/octet-stream', tamano: f.size, datos: String(r.result) });
    r.onerror = () => mal(new Error(`No se pudo leer «${f.name}»`));
    r.readAsDataURL(f);
  });
}

/** Descarga un adjunto con la sesión (cabecera Bearer, nunca el token en la URL). */
async function abrirAdjunto(a: Adjunto): Promise<void> {
  try {
    const r = await fetch(`${baseApi()}/chat/adjuntos/${a.id}`, { headers: { authorization: `Bearer ${sesion.token ?? ''}` } });
    if (!r.ok) throw new Error('No se pudo abrir el archivo');
    const url = URL.createObjectURL(await r.blob());
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = a.nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (e) {
    avisar(textoError(e), 'danger');
  }
}

class PeonChatVps extends Componente<VistaProps> {
  static tag = 'peon-chat-vps';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-textarea', 'iswc-button', 'iswc-callout', 'iswc-empty-state', 'iswc-icon'];

  #lineas: Linea[] = [];
  #pendientes: Pendiente[] = [];
  #soltar: (() => void) | null = null;
  #lista: HTMLElement | null = null;
  #chips: HTMLElement | null = null;
  #campo: (HTMLElement & { value?: string }) | null = null;

  protected override inicial(): VistaProps {
    return { pestana: '' };
  }

  override onConnected(): void {
    super.onConnected();
    this.#soltar = escuchar('chat', (d) => {
      this.#lineas.push(d as Linea);
      this.#pintarLineas();
    });
  }

  override onDisconnected(): void {
    this.#soltar?.();
  }

  /** Deja una instrucción en el campo (y el foco), lista para enviar o ajustar. */
  #usar(texto: string): void {
    if (!this.#campo) return;
    this.#campo.value = texto;
    this.#campo.focus();
  }

  #pintarLineas(): void {
    const l = this.#lista;
    if (!l) return;
    if (!this.#lineas.length) {
      l.replaceChildren(html`
        <div class="recomendaciones">
          <p class="nota"><iswc-icon icon="mdi:robot-happy-outline"></iswc-icon> Pídele al VPS lo que necesites. Por ejemplo:</p>
          <div class="tarjetas">${HERRAMIENTAS_CHAT.map((h) => html`<button type="button" class="tarjeta" onclick=${() => this.#usar(h.texto)}><iswc-icon icon=${h.icono}></iswc-icon><strong>${h.titulo}</strong><small>${h.ayuda}</small></button>`)}</div>
        </div>`);
      return;
    }
    l.replaceChildren(html`${this.#lineas.map((x) => html`
      <div class="burbuja" data-autor=${x.autor}>
        <p>${x.texto}</p>
        ${x.adjuntos?.length ? html`<div class="adjuntos">${x.adjuntos.map((a) => html`<button type="button" class="adjunto" title="Descargar" onclick=${() => void abrirAdjunto(a)}><iswc-icon icon="mdi:paperclip"></iswc-icon><span>${a.nombre}</span><small>${peso(a.tamano)}</small></button>`)}</div>` : null}
        <small>${x.autor === 'vps' ? 'VPS' : 'Tú'} · ${fecha(x.creado)}</small>
      </div>`)}`);
    l.scrollTop = l.scrollHeight;
  }

  #pintarChips(): void {
    this.#chips?.replaceChildren(...this.#pendientes.map((p, i) => html`<span class="chip"><iswc-icon icon="mdi:paperclip"></iswc-icon><span>${p.nombre}</span><small>${peso(p.tamano)}</small><button type="button" title="Quitar" onclick=${() => { this.#pendientes.splice(i, 1); this.#pintarChips(); }}><iswc-icon icon="mdi:close"></iswc-icon></button></span>`));
  }

  async #adjuntar(archivos: FileList | null): Promise<void> {
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
        this.#pendientes.push(await leerArchivo(f));
      } catch (e) {
        avisar(textoError(e), 'danger');
      }
    }
    this.#pintarChips();
  }

  async #enviar(boton: HTMLElement): Promise<void> {
    const campo = this.#campo;
    const texto = String(campo?.value ?? '').trim();
    if (!texto && !this.#pendientes.length) return;
    boton.setAttribute('loading', '');
    try {
      const r = await api<{ enviado: boolean; lineas: Linea[] }>('POST', 'chat', { texto, adjuntos: this.#pendientes });
      this.#lineas.push(...r.lineas);
      if (campo) campo.value = '';
      this.#pendientes = [];
      this.#pintarChips();
      this.#pintarLineas();
    } catch (e) {
      avisar(textoError(e), 'danger');
    } finally {
      boton.removeAttribute('loading');
    }
  }

  #chat(): Node {
    const caja = document.createElement('div');
    caja.className = 'chat';
    this.#lista = document.createElement('div');
    this.#lista.className = 'lineas';
    this.#lista.setAttribute('role', 'log');
    this.#lista.setAttribute('aria-live', 'polite');
    this.#lista.append(html`<iswc-empty-state estado="cargando"></iswc-empty-state>`);
    this.#chips = document.createElement('div');
    this.#chips.className = 'chips';
    const campo = document.createElement('iswc-textarea') as HTMLElement & { value?: string };
    campo.setAttribute('placeholder', 'Escribe tu mensaje… (Enter envía, Mayús+Enter salta de línea)');
    campo.setAttribute('rows', '2');
    campo.setAttribute('autosize', '');
    campo.setAttribute('max-rows', '6');
    this.#campo = campo;
    const archivo = document.createElement('input');
    archivo.type = 'file';
    archivo.multiple = true;
    archivo.hidden = true;
    archivo.addEventListener('change', () => {
      void this.#adjuntar(archivo.files);
      archivo.value = '';
    });
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void this.#enviar(caja.querySelector('[data-enviar]') as HTMLElement);
      }
    });
    // Arrastrar y soltar archivos sobre el chat
    caja.addEventListener('dragover', (e) => e.preventDefault());
    caja.addEventListener('drop', (e) => {
      e.preventDefault();
      void this.#adjuntar(e.dataTransfer?.files ?? null);
    });
    const aviso = document.createElement('div');
    caja.append(html`
      <div class="herramientas" role="toolbar" aria-label="Herramientas">${HERRAMIENTAS_CHAT.map((h) => html`<button type="button" class="herramienta" title=${h.ayuda} onclick=${() => this.#usar(h.texto)}><iswc-icon icon=${h.icono}></iswc-icon>${h.titulo}</button>`)}</div>
      ${aviso}
      ${this.#lista}
      <div class="escribir">
        ${this.#chips}
        <div class="fila-escribir">
          <button type="button" class="clip" title="Adjuntar archivos (máx. 4 de 8 MB)" data-adjuntar onclick=${() => archivo.click()}><iswc-icon icon="mdi:paperclip"></iswc-icon></button>
          ${archivo}
          ${campo}
          <iswc-button data-enviar color="brand" onclick=${(e: Event) => void this.#enviar(e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:send"></iswc-icon>Enviar</iswc-button>
        </div>
      </div>
    `);
    void api<{ canal: boolean; lineas: Linea[] }>('GET', 'chat').then((r) => {
      this.#lineas = r.lineas;
      if (!r.canal) aviso.replaceChildren(html`<p class="aviso" data-tipo="warning"><iswc-icon icon="mdi:lan-disconnect"></iswc-icon><span class="texto">El canal con el VPS aún no está configurado; los mensajes quedan guardados.</span></p>`);
      this.#pintarLineas();
      let borrador = '';
      try {
        borrador = sessionStorage.getItem('peon:chat-borrador') ?? '';
        sessionStorage.removeItem('peon:chat-borrador');
      } catch { /* sin almacenamiento */ }
      if (borrador) this.#usar(borrador);
    }).catch((e) => this.#lista?.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    root.append(grupoPestanas('chat', props.pestana, () => this.#chat()));
  }
}

define(PeonChatVps);
