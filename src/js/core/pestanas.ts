// @contexto PROMPT-CLAUDE.md §4 (pestañas por vista)
/**
 * pestanas.ts — arma el `<iswc-tab-group>` de una vista a partir del catálogo (dato declarativo).
 * El panel activo se construye al pintar; los demás, la primera vez que se muestran (cada uno carga sus datos).
 * La pestaña activa queda en la URL (`url-key` = id de la vista) para recargar sin perderla.
 */
import { html } from '../base/componente.js';
import { usuarioActivo } from './api.js';
import { vista } from './catalogos.js';

export type Fabrica = (pestana: string) => Node;

export function grupoPestanas(idVista: string, activa: string, fabricar: Fabrica, visibles?: (id: string) => boolean): DocumentFragment {
  const v = vista(idVista);
  // App abierta: sin sesión solo las pestañas públicas.
  const lista = v.pestanas.filter((p) => (usuarioActivo() || p.publica) && (!visibles || visibles(p.id)));
  const actual = lista.some((p) => p.id === activa) ? activa : lista[0]?.id ?? '';
  const paneles = new Map<string, HTMLElement>();
  const llenar = (id: string) => {
    const panel = paneles.get(id);
    if (!panel || panel.dataset.lleno) return;
    panel.dataset.lleno = '1';
    panel.append(fabricar(id));
  };
  const frag = html`
    <iswc-tab-group class="pestanas" active=${actual} url-key=${idVista} oniswc-tab-show=${(e: Event) => {
      const d = (e as CustomEvent<{ name?: string }>).detail;
      if (d?.name) llenar(d.name);
    }}>
      ${lista.map((p) => html`<iswc-tab slot="nav" panel=${p.id}><iswc-icon icon=${p.icono}></iswc-icon><span>${p.titulo}</span></iswc-tab>`)}
      ${lista.map((p) => {
        const panel = document.createElement('iswc-tab-panel');
        panel.setAttribute('name', p.id);
        paneles.set(p.id, panel);
        return panel;
      })}
    </iswc-tab-group>`;
  llenar(actual);
  // con url-key el kit puede activar otra pestaña al conectar: se llena cuando emita iswc-tab-show
  return frag;
}
