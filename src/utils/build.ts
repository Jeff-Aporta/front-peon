// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * build.ts — `deno task build` (después de `build:scss`): el conversor del kit `construirApp`, al MISMO SHA que el pin
 * (`deno task pin` mueve esta URL con el resto). `src/js/**` y `view/**` → `dist/cdn/*.min.mjs` con splitting, `boot.ts`
 * en IIFE, `?v=`, `deps.json`, registrador `peonLoader.min.mjs` y bloque `iswc:precarga` de cada HTML.
 * Guía: skills/iswc-foundation/references/02-deno-y-build.md del kit.
 */
import { join } from 'node:path';
import { stop } from 'esbuild';
import { construirApp, vigilarApp } from 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@92208c8e9e9bca9e0fa6fa944b5ee2ee98f08a0c/dist/cdn/build/construir-app.ts';
import { KIT_TAGS, mapaRutas, PREFIJO, SHELL_CRITICO, tagsArranque } from '../js/kit-tags.ts';

const fuente = (rel: string) => (rel.startsWith('js/') ? `src/${rel}` : rel).replace(/\.js$/, '.ts');
const opts = {
  raiz: join(import.meta.dirname!, '..', '..'),
  prefijo: PREFIJO,
  planos: ['src/js/boot.ts'],
  tags: Object.fromEntries(Object.entries(mapaRutas()).map(([t, r]) => [t, fuente(r)])),
  html: [{ archivo: 'index.html', kit: [...SHELL_CRITICO], app: tagsArranque() }, { archivo: 'view/demo/index.html', kit: [...KIT_TAGS], app: ['view/demo/components/peon-galeria.ts'] }],
};
await construirApp(opts);
if (Deno.args.includes('--watch')) await vigilarApp(opts, () => new Deno.Command(Deno.execPath(), { args: ['task', 'build:scss'], cwd: opts.raiz }).output());
else await stop();
