// @contexto PROMPT-CLAUDE.md §4 (vista 9 · Chat con el VPS) · PLAN Fase 5b
/**
 * <peon-chat-vps> — conversación con el VPS dentro de la app (permiso `chat_con_vps`, nace apagado).
 * Se apoya en el canal del Worker y el bot del VPS: la API reenvía cada línea (`CANAL_URL`) y el bot responde a
 * `POST /api/chat/respuesta`; la respuesta llega EN VIVO por el evento `chat` (SSE) sin recargar.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, avisar, html } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import { api, escuchar } from '../../../src/js/core/api.js';
import { fecha } from '../../../src/js/core/catalogos.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';
import { textoError } from '../../../src/js/core/ui.js';

type Linea = { id: number; autor: 'usuario' | 'vps'; texto: string; creado: string };

class PeonChatVps extends Componente<VistaProps> {
  static tag = 'peon-chat-vps';
  static css = css;
  static deps = ['iswc-tab-group', 'iswc-textarea', 'iswc-button', 'iswc-callout', 'iswc-empty-state', 'iswc-icon'];

  #lineas: Linea[] = [];
  #canal = false;
  #soltar: (() => void) | null = null;
  #lista: HTMLElement | null = null;

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

  #pintarLineas(): void {
    const l = this.#lista;
    if (!l) return;
    l.replaceChildren(this.#lineas.length
      ? html`${this.#lineas.map((x) => html`<div class="burbuja" data-autor=${x.autor}><p>${x.texto}</p><small>${x.autor === 'vps' ? 'VPS' : 'Tú'} · ${fecha(x.creado)}</small></div>`)}`
      : html`<iswc-empty-state icono="mdi:robot-outline" titulo="Escríbele al VPS" texto="Pregunta por el estado de la app, los registros o el servidor."></iswc-empty-state>`);
    l.scrollTop = l.scrollHeight;
  }

  async #enviar(campo: HTMLElement & { value?: string }, boton: HTMLElement): Promise<void> {
    const texto = String(campo.value ?? '').trim();
    if (!texto) return;
    boton.setAttribute('loading', '');
    try {
      const r = await api<{ enviado: boolean; lineas: Linea[] }>('POST', 'chat', { texto });
      this.#lineas.push(...r.lineas);
      campo.value = '';
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
    const campo = document.createElement('iswc-textarea') as HTMLElement & { value?: string };
    campo.setAttribute('placeholder', 'Escribe tu mensaje…');
    campo.setAttribute('rows', '2');
    campo.setAttribute('autosize', '');
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void this.#enviar(campo, caja.querySelector('[data-enviar]') as HTMLElement);
      }
    });
    const aviso = document.createElement('div');
    caja.append(html`${aviso}${this.#lista}<div class="escribir">${campo}<iswc-button data-enviar color="brand" onclick=${(e: Event) => void this.#enviar(campo, e.currentTarget as HTMLElement)}><iswc-icon slot="start" icon="mdi:send"></iswc-icon>Enviar</iswc-button></div>`);
    void api<{ canal: boolean; lineas: Linea[] }>('GET', 'chat').then((r) => {
      this.#canal = r.canal;
      this.#lineas = r.lineas;
      if (!this.#canal) aviso.replaceChildren(html`<iswc-callout color="warning" icon="mdi:lan-disconnect">El canal con el VPS aún no está configurado en el servidor. Los mensajes quedan guardados.</iswc-callout>`);
      this.#pintarLineas();
    }).catch((e) => this.#lista?.replaceChildren(html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`));
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    root.append(grupoPestanas('chat', props.pestana, () => this.#chat()));
  }
}

define(PeonChatVps);
