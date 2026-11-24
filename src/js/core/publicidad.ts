// @contexto HANDOFF.md §2b punto 3 (publicidad descargable)
/**
 * publicidad.ts — piezas de campaña descargables, dibujadas en el navegador con <canvas> (sin servidor, sin
 * dependencias): pieza cuadrada para redes y WhatsApp (1080×1080), historia vertical (1080×1920) y banner (1500×500).
 *
 * Colores: los de la marca leídos de las semillas de la paleta (`--peon-morado-h/s` = brand, `--peon-verde-h/s`,
 * `--iswc-contrast-*`).
 * Imagen: cuadrada e historia llevan la foto COMPLETA (`CAMPANA.fotoCompleta`: ya trae el logotipo con el nombre y
 * el lema, así que no se repiten en texto); el banner, el retrato (`CAMPANA.foto`) con nombre y lema al lado.
 * Estilo del afiche: fondo morado con luz, tablero morado/blanco abajo y la cinta de la bandera.
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
  const mh = semilla('--peon-morado-h', '267');
  const ms = semilla('--peon-morado-s', '68%');
  const vh = semilla('--peon-verde-h', '140');
  const vs = semilla('--peon-verde-s', '78%');
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

  // Tablero de ajedrez morado/blanco a lo ancho, encima de la cinta (pie del afiche).
  const casilla = Math.round(base * 0.032);
  const yTablero = f.alto - cinta - casilla * 2;
  for (let fila = 0; fila < 2; fila++) {
    for (let col = 0; col * casilla < f.ancho; col++) {
      c.fillStyle = (col + fila) % 2 ? '#ffffff' : k.moradoHondo;
      c.fillRect(col * casilla, yTablero + fila * casilla, casilla, casilla);
    }
  }

  c.textAlign = 'center';
  c.fillStyle = '#ffffff';

  if (f.id === 'banner') {
    const img = (CAMPANA.foto ? await cargarImagen(CAMPANA.foto) : null) ?? (await cargarImagen('./assets/logo-512.webp'));
    const alto = yTablero - f.alto * 0.04;
    const ancho = img ? alto * (img.width / img.height) : 0;
    if (img) c.drawImage(img, f.alto * 0.1, yTablero - alto, ancho, alto);
    c.textAlign = 'left';
    const x = f.alto * 0.1 + ancho + f.alto * 0.1;
    const max = f.ancho - x - f.alto * 0.1;
    c.font = fuente(700, f.alto * 0.065);
    c.globalAlpha = 0.9;
    c.fillText(CAMPANA.movimiento.toUpperCase(), x, f.alto * 0.24, max);
    c.globalAlpha = 1;
    c.font = fuente(800, f.alto * 0.16);
    c.fillText(CAMPANA.candidato.toUpperCase(), x, f.alto * 0.45, max);
    // Lema en cinta amarilla con texto morado (como en el afiche).
    c.font = `italic ${fuente(700, f.alto * 0.062)}`;
    const lema = CAMPANA.lema;
    const w = Math.min(c.measureText(lema).width + f.alto * 0.08, max);
    c.fillStyle = k.amarillo;
    c.fillRect(x, f.alto * 0.53, w, f.alto * 0.11);
    c.fillStyle = k.moradoHondo;
    c.fillText(lema, x + f.alto * 0.04, f.alto * 0.605, max - f.alto * 0.08);
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.85;
    c.font = fuente(500, f.alto * 0.055);
    c.fillText(CAMPANA.lugar, x, f.alto * 0.76, max);
    c.globalAlpha = 1;
    return lienzo;
  }

  const margen = f.ancho * 0.08;
  const yTitulo = f.alto * (f.id === 'historia' ? 0.07 : 0.075);
  c.font = fuente(800, base * 0.042);
  c.fillText(CAMPANA.movimiento.toUpperCase(), f.ancho / 2, yTitulo, f.ancho - margen * 2);

  const completa = CAMPANA.fotoCompleta ? await cargarImagen(CAMPANA.fotoCompleta) : null;
  const img = completa ?? (await cargarImagen('./assets/logo-512.webp'));
  // Espacio para la foto: del título al tablero (en la historia queda aire abajo para el lugar).
  const arriba = yTitulo + base * 0.035;
  const abajo = yTablero - base * (f.id === 'historia' ? 0.16 : 0.05);
  if (img) {
    const escala = Math.min((abajo - arriba) / img.height, (f.ancho - margen) / img.width);
    const ancho = img.width * escala;
    const alto = img.height * escala;
    c.drawImage(img, (f.ancho - ancho) / 2, abajo - alto, ancho, alto);
  }
  if (!completa) {
    c.font = fuente(800, base * 0.08);
    textoEnLineas(c, CAMPANA.candidato, f.ancho / 2, abajo - base * 0.2, f.ancho - margen * 2, base * 0.09);
  }
  if (f.id === 'historia') {
    c.font = `italic ${fuente(800, base * 0.05)}`;
    c.fillStyle = k.amarillo;
    c.fillText('Solo necesitamos seguir avanzando', f.ancho / 2, abajo + base * 0.08, f.ancho - margen * 2);
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.85;
    c.font = fuente(600, base * 0.04);
    c.fillText(CAMPANA.lugar, f.ancho / 2, abajo + base * 0.14, f.ancho - margen * 2);
    c.globalAlpha = 1;
  }
  return lienzo;
}

/** PNG de la pieza como archivo (para descargar o compartir). */
export async function archivoPieza(f: Formato): Promise<File> {
  const lienzo = await dibujarPieza(f);
  const blob = await new Promise<Blob>((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/png'));
  return new File([blob], `peon-en-marcha-${f.id}.png`, { type: 'image/png' });
}
