// @contexto PROMPT-CLAUDE.md §4 (vista 9 · Chat con el VPS) · PLAN Fase 5b · HANDOFF §2b punto 5
/**
 * <peon-chat-vps> — la vista «Chat con el VPS» (permiso `chat_con_vps`, nace apagado). Solo arma la pestaña y
 * monta el chat transversal `<peon-chat>` (el mismo del cajón que se abre desde las noticias y desde Inicio).
 * Inicio puede dejar un borrador en `sessionStorage['peon:chat-borrador']`: lo recoge `<peon-chat>`.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente } from '../../../src/js/base/componente.js';
import type { VistaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import { grupoPestanas } from '../../../src/js/core/pestanas.js';

class PeonChatVps extends Componente<VistaProps> {
  static tag = 'peon-chat-vps';
  static css = css;
  static deps = ['iswc-tab-group', 'peon-chat'];

  protected override inicial(): VistaProps {
    return { pestana: '' };
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    root.append(grupoPestanas('chat', props.pestana, () => {
      const chat = document.createElement('peon-chat');
      chat.className = 'chat-vista';
      Object.assign(chat, { props: { contexto: null, compacto: false } });
      return chat;
    }));
    // Zonas propias: el chat mide el cuerpo de las pestañas y desplaza su lista por dentro.
    root.querySelector('.pestanas')?.classList.add('llena');
  }
}

define(PeonChatVps);
