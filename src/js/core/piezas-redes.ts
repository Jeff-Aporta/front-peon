// @contexto HANDOFF.md (décima tanda) · IDENTIDAD-VISUAL.md §6
/**
 * piezas-redes.ts — creador de piezas para redes a partir de una noticia. Las plantillas son SVG DETERMINISTAS
 * (mismos datos → misma pieza): la identidad visual no depende de un modelo de imágenes. Luego se pasan a PNG con un
 * <canvas> para descargar o compartir.
 *
 *   Plantillas: «titular» (imagen arriba, titular grande) y «cita» (frase en cinta amarilla sobre morado).
 *   Formatos:   cuadrada 1080×1080 (publicaciones) · historia 1080×1920 (estados e historias).
 *   Temática:   bandera de Colombia (amarillo, azul, rojo) y cinta de Armenia (verde, blanco, amarillo), tablero
 *               morado/blanco, logo y hashtag de la campaña.
 * La IA ayuda con el TEXTO (el VPS propone un titular corto para redes); el diseño no cambia.
 * Las imágenes se incrustan como data URL (un SVG pasado a imagen no carga recursos externos); si una imagen de otro
 * medio no deja leerse (CORS), la pieza usa la foto oficial del candidato.
 */
import { avisar, html } from '../base/componente.js';
import type { NoticiaFila } from '../consts/schemas/api.schemas.js';
import { api, puede } from './api.js';
import { CAMPANA } from './config.js';
import { fuenteDe } from './noticias.js';
import { abrirChat, textoError } from './ui.js';

type Formato = 'cuadrada' | 'historia';
type Plantilla = 'titular' | 'cita';
const MEDIDAS: Record<Formato, [number, number]> = { cuadrada: [1080, 1080], historia: [1080, 1920] };

const C = {
  morado: '#5B1FA6',
  hondo: '#2E0B5E',
  violeta: '#8A3FD1',
  amarillo: '#F2C200',
  verde: '#0F7A38',
  azul: '#003893',
  rojo: '#CE1126',
};

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Parte un texto en líneas de como mucho `max` caracteres (sin cortar palabras). */
function lineas(texto: string, max: number, tope: number): string[] {
  const out: string[] = [];
  let l = '';
  for (const p of texto.split(/\s+/)) {
    if ((l + ' ' + p).trim().length > max && l) {
      out.push(l);
      l = p;
    } else l = (l + ' ' + p).trim();
  }
  if (l) out.push(l);
  if (out.length > tope) {
    out.length = tope;
    out[tope - 1] = out[tope - 1]!.replace(/\s*\S*$/, '') + '…';
  }
  return out;
}

async function aDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise((ok) => {
      const f = new FileReader();
      f.onload = () => ok(String(f.result));
      f.onerror = () => ok(null);
      f.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

/** Banderas: Colombia (amarillo ½, azul ¼, rojo ¼) y la cinta de Armenia (verde, blanco, amarillo). */
function banderas(x: number, y: number, ancho: number, alto: number): string {
  const a = alto / 2;
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${ancho}" height="${a / 2}" fill="${C.amarillo}"/>
      <rect y="${a / 2}" width="${ancho}" height="${a / 4}" fill="${C.azul}"/>
      <rect y="${(a * 3) / 4}" width="${ancho}" height="${a / 4}" fill="${C.rojo}"/>
      <rect y="${a}" width="${ancho / 3}" height="${a}" fill="${C.verde}"/>
      <rect x="${ancho / 3}" y="${a}" width="${ancho / 3}" height="${a}" fill="#fff"/>
      <rect x="${(ancho * 2) / 3}" y="${a}" width="${ancho / 3}" height="${a}" fill="${C.amarillo}"/>
    </g>`;
}

function tablero(y: number, ancho: number, lado: number): string {
  let s = '';
  for (let f = 0; f < 2; f++) for (let c = 0; c * lado < ancho; c++) if ((c + f) % 2 === 0) s += `<rect x="${c * lado}" y="${y + f * lado}" width="${lado}" height="${lado}" fill="${C.hondo}"/>`;
  return `<rect y="${y}" width="${ancho}" height="${lado * 2}" fill="#fff"/>${s}`;
}

export type DatosPieza = { titular: string; fuente: string; imagen: string | null; logo: string | null; foto: string | null };

/** SVG de la pieza (determinista: solo depende de los datos). */
export function svgPieza(d: DatosPieza, formato: Formato, plantilla: Plantilla): string {
  const [W, H] = MEDIDAS[formato];
  const historia = formato === 'historia';
  const fam = `'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif`;
  const fondo = `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.hondo}"/><stop offset="0.55" stop-color="${C.morado}"/><stop offset="1" stop-color="${C.violeta}"/></linearGradient>
      <radialGradient id="luz" cx="0.8" cy="0.15" r="0.7"><stop offset="0" stop-color="${C.amarillo}" stop-opacity="0.45"/><stop offset="1" stop-color="${C.amarillo}" stop-opacity="0"/></radialGradient>
      <pattern id="puntos" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="3" fill="${C.amarillo}" fill-opacity="0.35"/></pattern>
      <clipPath id="foto"><rect x="60" y="${historia ? 300 : 210}" width="${W - 120}" height="${historia ? 760 : 470}" rx="40"/></clipPath>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect width="${W}" height="${H}" fill="url(#luz)"/>
    <rect x="${W * 0.55}" y="${H * 0.55}" width="${W * 0.45}" height="${H * 0.45}" fill="url(#puntos)"/>`;
  const cabecera = `
    ${d.logo ? `<image href="${d.logo}" x="60" y="60" width="96" height="96"/>` : ''}
    <text x="${d.logo ? 176 : 60}" y="100" font-family="${fam}" font-size="30" font-weight="800" fill="#fff" letter-spacing="2">LA FUERZA DEL PEÓN EN MARCHA</text>
    <text x="${d.logo ? 176 : 60}" y="142" font-family="${fam}" font-size="26" fill="${C.amarillo}">${esc(d.fuente)} · Armenia, Quindío</text>`;
  const pie = `
    ${tablero(H - 150, W, 28)}
    ${banderas(0, H - 94, W, 94)}
    <text x="${W / 2}" y="${H - 180}" text-anchor="middle" font-family="${fam}" font-size="30" font-weight="700" fill="#fff">♟ #LaFuerzaDelPeónEnMarcha</text>`;
  if (plantilla === 'cita') {
    const ls = lineas(d.titular, historia ? 18 : 20, historia ? 7 : 5);
    const alto = 96;
    const y0 = H / 2 - (ls.length * alto) / 2;
    const foto = d.foto ? `<image href="${d.foto}" x="${W - (historia ? 620 : 470)}" y="${H - (historia ? 900 : 640)}" width="${historia ? 620 : 470}" height="${historia ? 660 : 500}" preserveAspectRatio="xMidYMax meet"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fondo}${foto}${cabecera}
      ${ls.map((l, i) => `<g transform="translate(60 ${y0 + i * alto}) skewX(-8)"><rect x="-12" y="-70" width="${l.length * 41 + 40}" height="88" fill="${i % 2 ? C.amarillo : '#fff'}"/></g><text x="66" y="${y0 + i * alto}" font-family="${fam}" font-size="68" font-weight="800" fill="${C.hondo}">${esc(l)}</text>`).join('')}
      ${pie}</svg>`;
  }
  const yTit = historia ? 1140 : 760;
  const ls = lineas(d.titular.toUpperCase(), historia ? 19 : 24, historia ? 6 : 3);
  const imagen = d.imagen ?? d.foto;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fondo}${cabecera}
    <rect x="60" y="${historia ? 300 : 210}" width="${W - 120}" height="${historia ? 760 : 470}" rx="40" fill="#fff" fill-opacity="0.12"/>
    ${imagen ? `<image href="${imagen}" x="60" y="${historia ? 300 : 210}" width="${W - 120}" height="${historia ? 760 : 470}" preserveAspectRatio="xMidYMin slice" clip-path="url(#foto)"/>` : ''}
    ${ls.map((l, i) => `<g transform="translate(60 ${yTit + i * 82}) skewX(-8)"><rect x="-10" y="-62" width="${l.length * 39 + 36}" height="78" fill="${C.hondo}" fill-opacity="0.85"/></g><text x="66" y="${yTit + i * 82}" font-family="${fam}" font-size="64" font-weight="800" fill="${i === ls.length - 1 ? C.amarillo : '#fff'}">${esc(l)}</text>`).join('')}
    ${pie}</svg>`;
}

/** SVG → PNG (canvas). */
async function aPng(svg: string, formato: Formato): Promise<Blob> {
  const [W, H] = MEDIDAS[formato];
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    c.getContext('2d')!.drawImage(img, 0, 0, W, H);
    return await new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear el PNG'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bajar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** La sección «Para redes» de Noticias: elegir noticia, plantilla y formato; vista previa; PNG o SVG. */
export function creadorPiezas(filas: () => NoticiaFila[]): HTMLElement {
  const caja = document.createElement('div');
  caja.className = 'creador';
  const previa = document.createElement('div');
  previa.className = 'creador-previa';
  let lista: NoticiaFila[] = filas();
  let elegida: NoticiaFila | null = lista[0] ?? null;
  let formato: Formato = 'cuadrada';
  let plantilla: Plantilla = 'titular';
  let titular = elegida?.titulo ?? CAMPANA.lema;
  let svg = '';
  const recursos: { logo: string | null; foto: string | null; imagenes: Map<string, string | null> } = { logo: null, foto: null, imagenes: new Map() };
  const repintar = async () => {
    recursos.logo ??= await aDataUrl('./assets/logo-160.webp');
    recursos.foto ??= await aDataUrl(CAMPANA.fotoBusto);
    let imagen: string | null = null;
    if (elegida?.imagen) {
      if (!recursos.imagenes.has(elegida.imagen)) recursos.imagenes.set(elegida.imagen, await aDataUrl(elegida.imagen));
      imagen = recursos.imagenes.get(elegida.imagen) ?? null;
    }
    svg = svgPieza({ titular, fuente: elegida ? fuenteDe(elegida) : 'La Fuerza del Peón', imagen, logo: recursos.logo, foto: recursos.foto }, formato, plantilla);
    previa.innerHTML = svg;
    previa.dataset.formato = formato;
  };
  const selector = document.createElement('select');
  selector.className = 'creador-select';
  selector.setAttribute('aria-label', 'Noticia');
  const llenar = () => {
    selector.replaceChildren(...[...lista.map((n) => Object.assign(document.createElement('option'), { value: String(n.id), textContent: n.titulo })), Object.assign(document.createElement('option'), { value: '', textContent: '— Solo el lema de la campaña —' })]);
    selector.value = elegida ? String(elegida.id) : '';
  };
  selector.addEventListener('change', () => {
    elegida = lista.find((n) => String(n.id) === selector.value) ?? null;
    titular = elegida?.titulo ?? CAMPANA.lema;
    (caja.querySelector('[data-titular]') as HTMLTextAreaElement).value = titular;
    void repintar();
  });
  if (!lista.length) {
    void api<NoticiaFila[]>('GET', 'noticias?categoria=noticia&limite=30').then((f) => {
      lista = f;
      elegida = f[0] ?? null;
      titular = elegida?.titulo ?? CAMPANA.lema;
      llenar();
      (caja.querySelector('[data-titular]') as HTMLTextAreaElement).value = titular;
      void repintar();
    }).catch(() => {});
  }
  llenar();
  const boton = (grupo: string, valor: string, texto: string, activo: boolean, f: () => void) => html`<button type="button" class="opcion" data-grupo=${grupo} ?data-activa=${activo} onclick=${(e: Event) => { caja.querySelectorAll(`[data-grupo="${grupo}"]`).forEach((b) => b.removeAttribute('data-activa')); (e.currentTarget as HTMLElement).setAttribute('data-activa', ''); f(); void repintar(); }}>${texto}</button>`;
  caja.append(html`
    <div class="creador-panel">
      <label class="creador-campo"><span>Noticia</span>${selector}</label>
      <label class="creador-campo"><span>Titular de la pieza</span><textarea data-titular rows="3" maxlength="140" oninput=${(e: Event) => { titular = (e.currentTarget as HTMLTextAreaElement).value; void repintar(); }}>${titular}</textarea></label>
      <div class="creador-campo"><span>Plantilla</span><div class="opciones">${boton('plantilla', 'titular', 'Titular con imagen', true, () => (plantilla = 'titular'))}${boton('plantilla', 'cita', 'Frase en cinta', false, () => (plantilla = 'cita'))}</div></div>
      <div class="creador-campo"><span>Formato</span><div class="opciones">${boton('formato', 'cuadrada', 'Publicación 1080×1080', true, () => (formato = 'cuadrada'))}${boton('formato', 'historia', 'Historia 1080×1920', false, () => (formato = 'historia'))}</div></div>
      <div class="opciones acciones-creador">
        <button type="button" class="func-boton" onclick=${async () => { try { bajar(await aPng(svg, formato), `peon-${plantilla}-${formato}.png`); } catch (e) { avisar(textoError(e), 'danger'); } }}>Descargar PNG</button>
        <button type="button" class="opcion" onclick=${() => bajar(new Blob([svg], { type: 'image/svg+xml' }), `peon-${plantilla}-${formato}.svg`)}>SVG editable</button>
        ${puede('chat_con_vps') ? html`<button type="button" class="opcion" onclick=${() => abrirChat({ tipo: 'pantalla', id: null, titulo: null, fragmento: null, pantalla: 'Para redes' }, `Propón 3 titulares de máximo 9 palabras para redes sociales sobre esta noticia: «${elegida?.titulo ?? CAMPANA.lema}». Tono positivo, sin datos inventados.`)}>Proponer titulares</button>` : null}
      </div>
      <p class="creador-nota">El diseño sale siempre igual, con la identidad de la campaña; el asistente solo propone el texto.</p>
    </div>
    ${previa}`);
  void repintar();
  return caja;
}
