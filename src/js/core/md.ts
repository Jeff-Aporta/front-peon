// @contexto HANDOFF.md §2b punto 4 · kit: helpers/md-lite + helpers/md-hydrate
/**
 * md.ts — pinta Markdown que acepta HTML y componentes `iswc-*` (noticias, páginas, respuestas del VPS) con las
 * piezas del kit: `mdToHtml` (md-lite: avisos `> [!TIP]`, tablas, código, HTML crudo) y `hydrateMdEmbeds` (carga
 * perezosa de los `iswc-*` que aparezcan). No se reimplementa ninguna de las dos.
 *
 * Lo único propio es el SANEADO: md-lite conserva el HTML crudo, así que antes de montarlo se quitan `<script>`,
 * `<iframe>`, `<object>`, `<embed>`, `<style>`, `<link>`, `<meta>`, los manejadores `on*=` y las URL `javascript:`.
 * Escriben noticias solo quienes tienen `publicar_noticias` (y el VPS), pero el saneado no depende de eso.
 */
import { mdToHtml } from '@jeff-aporta/iswc-base/helpers/md-lite.min.mjs';
import { hydrateMdEmbeds } from '@jeff-aporta/iswc-base/helpers/md-hydrate.min.mjs';

type Hidratacion = { cancelar(): void };
const aHtml = mdToHtml as (src: string, o?: { tags?: Set<string>; componentes?: boolean }) => string;
const hidratar = hydrateMdEmbeds as (root: ParentNode, tags: Set<string>) => Hidratacion;

const PROHIBIDOS = 'script,iframe,object,embed,style,link,meta,base,form';

/** Quita lo peligroso de un árbol ya parseado (inerte, en un <template>). */
function sanear(raiz: DocumentFragment): void {
  for (const n of [...raiz.querySelectorAll(PROHIBIDOS)]) {
    // Los diagramas del kit traen su JSON en <script type="application/json">: ese sí se conserva.
    if (n.localName === 'script' && (n as HTMLScriptElement).type === 'application/json' && n.parentElement?.localName.startsWith('iswc-')) continue;
    n.remove();
  }
  for (const el of [...raiz.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) {
      const v = a.value.trim().toLowerCase().replace(/\s+/g, '');
      if (a.name.startsWith('on') || ((a.name === 'href' || a.name === 'src' || a.name === 'xlink:href' || a.name === 'action' || a.name === 'formaction') && (v.startsWith('javascript:') || v.startsWith('vbscript:') || (v.startsWith('data:') && !v.startsWith('data:image/'))))) el.removeAttribute(a.name);
    }
    if (el.localName === 'a') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }
}

/** Markdown → nodos saneados y con sus `iswc-*` hidratados. Devuelve `cancelar()` para cuando se repinte. */
export function pintarMd(destino: HTMLElement, md: string): Hidratacion {
  const tags = new Set<string>();
  const t = document.createElement('template');
  t.innerHTML = aHtml(md ?? '', { tags });
  sanear(t.content);
  destino.replaceChildren(t.content);
  // Los iswc-* escritos a mano en el HTML también cuentan (md-lite solo anota los suyos).
  for (const el of destino.querySelectorAll('*')) if (el.localName.startsWith('iswc-')) tags.add(el.localName);
  return hidratar(destino, tags);
}

/** Texto plano de un Markdown (para títulos y adelantos). */
export const textoPlano = (md: string): string => md.replace(/\[![A-Z]+\]/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/[#*_>`[\]|]/g, '').replace(/\s+/g, ' ').trim();

/** Primer encabezado `# …` de un Markdown, o la primera línea. */
export function tituloDe(md: string): string {
  const h = md.match(/^#{1,3}\s+(.+)$/m)?.[1];
  return textoPlano(h ?? md.split('\n').find((l) => l.trim()) ?? '').slice(0, 150);
}
