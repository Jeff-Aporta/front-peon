// @contexto DISENO-ASISTENTE.md §1 · api-peon/src/rutas/contenido.ts
/**
 * pagina.ts — pinta una página guardada en la DB como fragmentos con índice aplanado («1», «1.1», «2.3.1»).
 * Cada fragmento es md (atajos de documento) o html (componentes iswc-*, clases): los dos pasan por el md-lite del
 * kit, que acepta HTML y componentes. Cada bloque queda marcado con `data-pagina` y `data-indice`: el FAB del asistente
 * se los manda como «elementos visibles» y así el asistente sabe exactamente qué fragmento editar.
 * Se repinta solo cuando llega `cambio` { entidad: "fragmento", pagina } (lo emite la API al editar).
 */
import { api } from './api.js';
import { pintarMd } from './md.js';

type Fragmento = { indice: string; formato: 'md' | 'html'; contenido: string };

export function paginaEditable(slug: string): HTMLElement {
  const caja = document.createElement('section');
  caja.className = 'pagina-editable md';
  caja.dataset.pagina = slug;
  const pintar = async () => {
    try {
      const r = await api<{ fragmentos: Fragmento[] }>('GET', `paginas/${encodeURIComponent(slug)}`);
      caja.replaceChildren(...r.fragmentos.map((f) => {
        const b = document.createElement('div');
        b.className = 'fragmento';
        b.dataset.pagina = slug;
        b.dataset.indice = f.indice;
        b.dataset.nivel = String(f.indice.split('.').length);
        pintarMd(b, f.contenido);
        return b;
      }));
      caja.hidden = !r.fragmentos.length;
    } catch {
      caja.hidden = true;
    }
  };
  const alCambiar = (e: Event) => {
    if (!caja.isConnected) return window.removeEventListener('peon:datos', alCambiar);
    const d = (e as CustomEvent<{ entidad?: string; pagina?: string }>).detail;
    if (d?.entidad === 'fragmento' && (!d.pagina || d.pagina === slug)) void pintar();
  };
  window.addEventListener('peon:datos', alCambiar);
  caja.hidden = true;
  void pintar();
  return caja;
}
