// @contexto HANDOFF.md (décima tanda) · src/styles/_carrusel.scss
/**
 * carrusel.ts — carrusel de secciones (en lugar de pestañas): tarjetas de color que se deslizan a lo ancho, sin barra
 * de desplazamiento, con flechas izquierda/derecha que solo aparecen si hay a dónde ir. La activa queda marcada;
 * elegir una llama `alElegir(id)` (la vista pinta esa sección debajo). Estilos en `_carrusel.scss`.
 */
import { html } from '../base/componente.js';

export type Seccion = { id: string; titulo: string; icono: string; texto?: string };

export function carruselSecciones(secciones: Seccion[], activa: string, alElegir: (id: string) => void): HTMLElement {
  const marco = document.createElement('div');
  marco.className = 'cs-marco';
  const carril = document.createElement('nav');
  carril.className = 'cs';
  carril.setAttribute('aria-label', 'Secciones');
  const marcar = (id: string) => carril.querySelectorAll<HTMLElement>('.cs-item').forEach((b) => {
    const si = b.dataset.seccion === id;
    b.toggleAttribute('data-activa', si);
    b.setAttribute('aria-current', si ? 'page' : 'false');
  });
  carril.append(html`${secciones.map((s, i) => html`<button type="button" class="cs-item" data-seccion=${s.id} style=${`--i:${i}`} onclick=${() => { marcar(s.id); alElegir(s.id); }}><iswc-icon icon=${s.icono}></iswc-icon><span><strong>${s.titulo}</strong>${s.texto ? html`<small>${s.texto}</small>` : null}</span></button>`)}`);
  const mover = (dir: number) => carril.scrollBy({ left: dir * carril.clientWidth * 0.8, behavior: 'smooth' });
  const flechas = () => {
    const max = carril.scrollWidth - carril.clientWidth - 12;
    marco.querySelector('.izq')?.toggleAttribute('hidden', carril.scrollLeft <= 12);
    marco.querySelector('.der')?.toggleAttribute('hidden', carril.scrollLeft >= max);
  };
  carril.addEventListener('scroll', flechas, { passive: true });
  carril.addEventListener('scrollend', flechas);
  new ResizeObserver(flechas).observe(carril);
  marco.append(carril, html`
    <button type="button" class="cs-flecha izq" title="Anteriores" aria-label="Ver secciones anteriores" hidden onclick=${() => mover(-1)}><iswc-icon icon="mdi:chevron-left"></iswc-icon></button>
    <button type="button" class="cs-flecha der" title="Siguientes" aria-label="Ver más secciones" onclick=${() => mover(1)}><iswc-icon icon="mdi:chevron-right"></iswc-icon></button>`);
  marcar(activa);
  // La activa a la vista (si quedó fuera, al abrir con un atajo como «Privacidad»).
  requestAnimationFrame(() => carril.querySelector<HTMLElement>('[data-activa]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  return marco;
}
