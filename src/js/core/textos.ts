// @contexto DISENO-ASISTENTE.md §1 (fase 2) · api-peon/src/rutas/contenido.ts
/**
 * textos.ts — textos fijos de la app EDITABLES por el asistente: cada texto es un fragmento de una página de la DB
 * (`GET /api/paginas/{slug}`), con un valor por defecto mientras ese fragmento no exista. Así el asistente cambia un
 * texto con `PUT paginas/{slug}/fragmentos/{indice}` y se ve al instante, sin desplegar nada.
 *
 *   texto('inicio-textos', '2', 'Una campaña que')  → <span data-pagina data-indice>…</span>
 * Cada <span> lleva `data-pagina`/`data-indice`: el FAB los manda como «elementos visibles» y el asistente sabe qué
 * índice editar. Al llegar `cambio` { entidad: 'fragmento', pagina } se recargan y se actualizan EN SU SITIO.
 * Mapa de índices de cada página: api-peon/docs/SKILL-ASISTENTE.md («Textos de la app»).
 */
import { api } from './api.js';

const cache = new Map<string, Map<string, string>>();
const pendientes = new Map<string, Promise<void>>();
const vivos = new Set<WeakRef<HTMLElement>>();
let escuchando = false;

function actualizar(slug: string): void {
  const m = cache.get(slug);
  for (const ref of vivos) {
    const el = ref.deref();
    if (!el || !el.isConnected) {
      vivos.delete(ref);
      continue;
    }
    if (el.dataset.pagina !== slug) continue;
    const v = m?.get(el.dataset.indice ?? '');
    el.textContent = v ?? el.dataset.defecto ?? '';
  }
}

/** Carga (una vez, o de nuevo con `otraVez`) los textos de una página. Nunca falla: sin servidor quedan los de defecto. */
export function cargarTextos(slug: string, otraVez = false): Promise<void> {
  if (!otraVez && cache.has(slug)) return Promise.resolve();
  if (!otraVez && pendientes.has(slug)) return pendientes.get(slug)!;
  if (!escuchando) {
    escuchando = true;
    window.addEventListener('peon:datos', (e) => {
      const d = (e as CustomEvent<{ entidad?: string; pagina?: string }>).detail;
      if (d?.entidad === 'fragmento' && d.pagina && cache.has(d.pagina)) void cargarTextos(d.pagina, true);
    });
  }
  const p = api<{ fragmentos: { indice: string; contenido: string }[] }>('GET', `paginas/${encodeURIComponent(slug)}`)
    .then((r) => {
      cache.set(slug, new Map(r.fragmentos.map((f) => [f.indice, f.contenido.trim()])));
      actualizar(slug);
    })
    .catch(() => {
      if (!cache.has(slug)) cache.set(slug, new Map());
    })
    .finally(() => pendientes.delete(slug));
  pendientes.set(slug, p);
  return p;
}

/** Un texto editable: el de la DB si existe, si no `defecto`. Se actualiza solo cuando el asistente lo cambia. */
export function texto(slug: string, indice: string, defecto: string): HTMLElement {
  const s = document.createElement('span');
  s.className = 'texto-editable';
  s.dataset.pagina = slug;
  s.dataset.indice = indice;
  s.dataset.defecto = defecto;
  s.textContent = cache.get(slug)?.get(indice) ?? defecto;
  vivos.add(new WeakRef(s));
  void cargarTextos(slug);
  return s;
}
