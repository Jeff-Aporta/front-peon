// @contexto HANDOFF.md §2b punto 3 (publicidad descargable)
/**
 * publicidad.ts — piezas de campaña descargables, dibujadas en el navegador con <canvas> (sin servidor, sin
 * dependencias): pieza cuadrada para redes y WhatsApp (1080×1080), historia vertical (1080×1920) y banner (1500×500).
 *
 * Colores: los de la marca leídos de las semillas de la paleta (`--peon-morado-h/s`, `--iswc-brand-h/s`,
 * `--iswc-contrast-*`), siempre en su versión CLARA (la pieza no depende del tema de quien la baja).
 * Imagen: la foto del candidato (`CAMPANA.foto`, cuando lleguen los insumos) o, mientras tanto, el logo.
 */
import { CAMPANA } from './config.js';

export type Formato = { id: string; titulo: string; ancho: number; alto: number; ayuda: string };

export const FORMATOS: Formato[] = [
  { id: 'cuadrada', titulo: 'Pieza cuadrada', ancho: 1080, alto: 1080, ayuda: 'Para publicaciones y estados de WhatsApp' },
  { id: 'historia', titulo: 'Historia vertical', ancho: 1080, alto: 1920, ayuda: 'Para historias de Instagram, Facebook y WhatsApp' },
  { id: 'banner', titulo: 'Banner', ancho: 1500, alto: 500, ayuda: 'Para portadas de perfil y grupos' },
];

const semilla = (nombre: string, def: string): string => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || def;

function colores() {
  const mh = semilla('--peon-morado-h', '275');
  const ms = semilla('--peon-morado-s', '70%');
  const vh = semilla('--iswc-brand-h', '140');
  const vs = semilla('--iswc-brand-s', '78%');
  const ah = semilla('--iswc-contrast-h', '45');
  const as = semilla('--iswc-contrast-s', '100%');
  return {
    morado: `hsl(${mh} ${ms} 38%)`,
    moradoHondo: `hsl(${mh} ${ms} 20%)`,
    moradoClaro: `hsl(${mh} ${ms} 62%)`,
    verde: `hsl(${vh} ${vs} 30%)`,
    amarillo: `hsl(${ah} ${as} 50%)`,
  };
}

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

/** Texto centrado que se parte en líneas para no pasar de `max` de ancho. */
function textoEnLineas(c: CanvasRenderingContext2D, texto: string, x: number, y: number, max: number, alto: number): number {
  const palabras = texto.split(/\s+/);
  let linea = '';
  let yy = y;
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (c.measureText(prueba).width > max && linea) {
      c.fillText(linea, x, yy);
      linea = p;
      yy += alto;
    } else linea = prueba;
  }
  if (linea) c.fillText(linea, x, yy);
  return yy + alto;
}

/** Dibuja la pieza en un canvas nuevo. */
export async function dibujarPieza(f: Formato): Promise<HTMLCanvasElement> {
  const lienzo = document.createElement('canvas');
  lienzo.width = f.ancho;
  lienzo.height = f.alto;
  const c = lienzo.getContext('2d')!;
  const k = colores();
  const base = Math.min(f.ancho, f.alto);
  const fuente = (peso: number, tam: number) => `${peso} ${Math.round(tam)}px "Plus Jakarta Sans", "Inter", system-ui, sans-serif`;

  // Fondo: degradado morado (el color del candidato) con un halo claro.
  const g = c.createLinearGradient(0, 0, f.ancho, f.alto);
  g.addColorStop(0, k.moradoHondo);
  g.addColorStop(0.55, k.morado);
  g.addColorStop(1, k.moradoHondo);
  c.fillStyle = g;
  c.fillRect(0, 0, f.ancho, f.alto);
  const halo = c.createRadialGradient(f.ancho * 0.5, f.alto * 0.38, base * 0.05, f.ancho * 0.5, f.alto * 0.38, base * 0.65);
  halo.addColorStop(0, 'rgba(255,255,255,0.22)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = halo;
  c.fillRect(0, 0, f.ancho, f.alto);

  // Cinta de la bandera (verde · blanco · amarillo) abajo.
  const cinta = Math.round(base * 0.035);
  const tercio = f.ancho / 3;
  for (const [i, color] of [k.verde, '#ffffff', k.amarillo].entries()) {
    c.fillStyle = color;
    c.fillRect(i * tercio, f.alto - cinta, tercio + 1, cinta);
  }

  const foto = CAMPANA.foto ? await cargarImagen(CAMPANA.foto) : null;
  const logo = await cargarImagen('./assets/logo-512.webp');
  c.textAlign = 'center';
  c.fillStyle = '#ffffff';

  if (f.id === 'banner') {
    const img = foto ?? logo;
    const lado = f.alto * 0.78;
    if (img) c.drawImage(img, f.alto * 0.12, (f.alto - lado) / 2 - cinta / 2, lado, lado * (img.height / img.width));
    c.textAlign = 'left';
    const x = f.alto * 0.12 + lado + f.alto * 0.12;
    const max = f.ancho - x - f.alto * 0.12;
    c.font = fuente(600, f.alto * 0.08);
    c.globalAlpha = 0.85;
    c.fillText(CAMPANA.movimiento.toUpperCase(), x, f.alto * 0.3, max);
    c.globalAlpha = 1;
    c.font = fuente(800, f.alto * 0.17);
    c.fillText(CAMPANA.candidato, x, f.alto * 0.52, max);
    c.font = fuente(500, f.alto * 0.075);
    c.fillStyle = k.amarillo;
    c.fillText(`«${CAMPANA.lema}»`, x, f.alto * 0.68, max);
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.8;
    c.font = fuente(500, f.alto * 0.06);
    c.fillText(CAMPANA.lugar, x, f.alto * 0.82, max);
    c.globalAlpha = 1;
    return lienzo;
  }

  const margen = f.ancho * 0.08;
  let y = f.alto * (f.id === 'historia' ? 0.1 : 0.09);
  c.font = fuente(700, base * 0.04);
  c.globalAlpha = 0.85;
  c.fillText(CAMPANA.movimiento.toUpperCase(), f.ancho / 2, y, f.ancho - margen * 2);
  c.globalAlpha = 1;

  const img = foto ?? logo;
  if (img) {
    const lado = base * (foto ? 0.62 : 0.46);
    const alto = lado * (img.height / img.width);
    y += base * 0.05;
    c.drawImage(img, (f.ancho - lado) / 2, y, lado, alto);
    y += alto + base * 0.08;
  }
  c.font = fuente(800, base * 0.095);
  y = textoEnLineas(c, CAMPANA.candidato, f.ancho / 2, y, f.ancho - margen * 2, base * 0.1);
  c.font = fuente(600, base * 0.048);
  c.fillStyle = k.amarillo;
  y = textoEnLineas(c, `«${CAMPANA.lema}»`, f.ancho / 2, y + base * 0.01, f.ancho - margen * 2, base * 0.06);
  c.fillStyle = '#ffffff';
  c.globalAlpha = 0.85;
  c.font = fuente(500, base * 0.038);
  c.fillText(CAMPANA.lugar, f.ancho / 2, Math.min(y + base * 0.04, f.alto - cinta - base * 0.05));
  c.globalAlpha = 1;
  return lienzo;
}

/** PNG de la pieza como archivo (para descargar o compartir). */
export async function archivoPieza(f: Formato): Promise<File> {
  const lienzo = await dibujarPieza(f);
  const blob = await new Promise<Blob>((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/png'));
  return new File([blob], `peon-en-marcha-${f.id}.png`, { type: 'image/png' });
}
