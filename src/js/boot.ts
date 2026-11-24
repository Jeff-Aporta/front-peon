// @contexto INDICE.md · skills/iswc-foundation/SKILL.md · ../IDENTIDAD-VISUAL.md (solo modo claro)
/**
 * boot.ts — tema y paleta ANTES del primer pintado. Script plano (IIFE), síncrono en <head>.
 *
 * Peón en Marcha es SIEMPRE modo claro (proyecto comercial y accesibilidad, decisión del autor): no se lee `?s=`,
 * ni la config persistente del kit, ni el tema del sistema. La paleta es siempre la de la marca (`peon`).
 */
(function () {
  const raiz = document.documentElement;
  raiz.dataset.theme = 'light';
  raiz.classList.remove('theme-dark');
  raiz.classList.add('theme-light');
  raiz.dataset.palette = 'peon';
})();
