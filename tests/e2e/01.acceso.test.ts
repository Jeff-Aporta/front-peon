// @contexto HANDOFF.md §3 (gate del front) · PROMPT-CLAUDE.md §4 (vista 1 · Acceso)
/**
 * App ABIERTA sin sesión (no necesita la API: lo público que falle no rompe el shell). Afirma lo que ve quien abre la
 * app: el shell con el Inicio público, solo las vistas públicas en el menú, el desplegable «Entrar» del kit
 * (`iswc-session-menu`, sin pantalla de acceso), la paleta de la campaña y que siempre es modo claro.
 */
import { definirPruebas } from '../../src/vendor/iswc-base/tools/pruebas.ts';
import { abrir, enSombra, esperar } from '../../scripts/gate/e2e/harness.ts';

let s: Awaited<ReturnType<typeof abrir>>;

export default definirPruebas([
  {
    nombre: 'acceso W-CAT-01 sin sesión se ve el Inicio público y el desplegable Entrar',
    categoria: 'what',
    async correr({ expect }) {
      await s.page.evaluate(() => {
        localStorage.removeItem('peon:token');
        localStorage.setItem('peon:vista', 'inicio');
        localStorage.setItem('iswc:app-cfg', JSON.stringify({ theme: 'dark' }));
      }, null);
      await s.page.goto(new URL('index.html', Deno.env.get('E2E_BASE_URL') ?? 'http://127.0.0.1:8851/').href, { waitUntil: 'load' });
      await esperar(s.page, () => !!document.querySelector('peon-app')?.shadowRoot?.querySelector('peon-inicio'));
      const r = await s.page.evaluate(() => {
        const raiz = document.querySelector('peon-app')!.shadowRoot!;
        const menu = raiz.querySelector('iswc-session-menu');
        return {
          nav: [...raiz.querySelectorAll('.nav .item')].map((b) => b.textContent!.trim()),
          menu: !!menu,
          logged: !!menu?.hasAttribute('logged'),
          acceso: !!raiz.querySelector('peon-acceso'),
        };
      }, null);
      expect('menú público', r.nav.join('|') === 'Inicio|Noticias|Cómo votar|Privacidad', r.nav.join('|'));
      expect('desplegable de sesión sin sesión', r.menu && !r.logged);
      expect('sin pantalla de acceso completa', !r.acceso);
      expect('Inicio con la portada del candidato', (await enSombra(s.page, ['peon-app', 'peon-inicio', '.nombre'])) === true);
    },
  },
  {
    nombre: 'tema W-CAT-04 siempre modo claro (aunque se pida oscuro)',
    categoria: 'what',
    async correr({ expect }) {
      const t = await s.page.evaluate(() => ({ tema: document.documentElement.dataset.theme, esquema: document.querySelector('meta[name="color-scheme"]')?.getAttribute('content'), toggles: document.querySelector('peon-app')!.shadowRoot!.querySelectorAll('iswc-theme-toggle').length }), null);
      expect('data-theme light', t.tema === 'light', String(t.tema));
      expect('color-scheme light', t.esquema === 'light', String(t.esquema));
      expect('sin selector de tema', t.toggles === 0, String(t.toggles));
    },
  },
  {
    nombre: 'identidad W-CAT-02 paleta peon con el morado como color principal',
    categoria: 'what',
    async correr({ expect }) {
      const p = await s.page.evaluate(() => ({ paleta: document.documentElement.dataset.palette, morado: getComputedStyle(document.documentElement).getPropertyValue('--peon-morado-h').trim(), brand: getComputedStyle(document.documentElement).getPropertyValue('--iswc-brand-h').trim(), cinta: getComputedStyle(document.documentElement).getPropertyValue('--peon-cinta').trim() }), null);
      expect('paleta', p.paleta === 'peon', String(p.paleta));
      expect('morado principal h267 (= brand)', p.morado === '267' && p.brand === '267', `${p.morado} · ${p.brand}`);
      expect('cinta de la bandera', p.cinta.includes('linear-gradient'), p.cinta);
    },
  },
  {
    nombre: 'layout W-CAT-03 sin scroll en html/body',
    categoria: 'what',
    async correr({ expect }) {
      const r = await s.page.evaluate(() => ({ html: getComputedStyle(document.documentElement).overflow, body: getComputedStyle(document.body).overflow, sobra: document.scrollingElement!.scrollHeight - innerHeight }), null);
      expect('html sin scroll', ['hidden', 'clip'].includes(r.html), r.html);
      expect('body sin scroll', ['hidden', 'clip'].includes(r.body), r.body);
      expect('el documento mide la ventana', r.sobra <= 0, String(r.sobra));
    },
  },
], { antes: async () => { s = await abrir('index.html'); }, despues: async () => { await s?.cerrar(); } });
