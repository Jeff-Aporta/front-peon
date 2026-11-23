// @contexto HANDOFF.md §3 (gate del front) · PROMPT-CLAUDE.md §4 (vista 1 · Acceso)
/**
 * Acceso sin sesión (no necesita la API: sin token no se consulta nada). Afirma lo que ve quien abre la app:
 * logo, nombre, lema, cédula y clave, botón de entrar, y que la paleta de la campaña (con el morado) está aplicada.
 */
import { definirPruebas } from '../../src/vendor/iswc-base/tools/pruebas.ts';
import { abrir, enSombra, esperar } from '../../scripts/gate/e2e/harness.ts';

let s: Awaited<ReturnType<typeof abrir>>;

export default definirPruebas([
  {
    nombre: 'acceso W-CAT-01 sin sesión se ve el acceso por cédula',
    categoria: 'what',
    async correr({ expect }) {
      await s.page.evaluate(() => localStorage.removeItem('peon:token'), null);
      await s.page.goto(new URL('index.html', Deno.env.get('E2E_BASE_URL') ?? 'http://127.0.0.1:8851/').href, { waitUntil: 'load' });
      await esperar(s.page, () => !!document.querySelector('peon-app')?.shadowRoot?.querySelector('peon-acceso')?.shadowRoot?.querySelector('form'));
      expect('título', (await enSombra(s.page, ['peon-app', 'peon-acceso', '.titulo'], 'text')) === 'Peón en Marcha');
      expect('lema', String(await enSombra(s.page, ['peon-app', 'peon-acceso', '.lema'], 'text')).includes('servir, no figurar'));
      expect('campo de cédula', (await enSombra(s.page, ['peon-app', 'peon-acceso', 'iswc-masked-input'])) === true);
      expect('logo', (await enSombra(s.page, ['peon-app', 'peon-acceso', 'img.logo'])) === true);
    },
  },
  {
    nombre: 'identidad W-CAT-02 paleta peon con el morado de campaña',
    categoria: 'what',
    async correr({ expect }) {
      const p = await s.page.evaluate(() => ({ paleta: document.documentElement.dataset.palette, morado: getComputedStyle(document.documentElement).getPropertyValue('--peon-morado-h').trim(), cinta: getComputedStyle(document.documentElement).getPropertyValue('--peon-cinta').trim() }), null);
      expect('paleta', p.paleta === 'peon', String(p.paleta));
      expect('morado h275', p.morado === '275', p.morado);
      expect('cinta de la bandera', p.cinta.includes('linear-gradient'), p.cinta);
    },
  },
  {
    nombre: 'layout W-CAT-03 sin scroll en html/body',
    categoria: 'what',
    async correr({ expect }) {
      const r = await s.page.evaluate(() => ({ html: getComputedStyle(document.documentElement).overflow, body: getComputedStyle(document.body).overflow, sobra: document.scrollingElement!.scrollHeight - innerHeight }), null);
      expect('html sin scroll', r.html === 'hidden', r.html);
      expect('body sin scroll', r.body === 'hidden', r.body);
      expect('el documento mide la ventana', r.sobra <= 0, String(r.sobra));
    },
  },
], { antes: async () => { s = await abrir('index.html'); }, despues: async () => { await s?.cerrar(); } });
