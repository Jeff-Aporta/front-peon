// @contexto api-peon/src/procuraduria/manual.ts · HANDOFF.md «Prueba de fuentes oficiales»
/**
 * puesto-manual.ts — consulta MANUAL ASISTIDA del puesto de votación (decisión del autor, 23-nov-2026).
 *
 * La página oficial (Registraduría) bloquea a los robots, así que el servidor no la consulta. Quien registra:
 *   1. toca «Copiar cédula y abrir Registraduría» (copia la cédula y abre la página oficial en su navegador),
 *   2. trae el resultado: «Pegar texto» (portapapeles), «Leer de una imagen» (captura → OCR en el navegador con
 *      Tesseract.js) o «Dictar» (Web Speech API, es-CO). `leerTexto()` / `leerEnLinea()` llenan los campos solos,
 *   3. revisa o corrige (puesto, dirección, municipio, departamento, mesa) y guarda.
 * La API lo deja verificado (`fuente: registraduria-manual`) y en la caché por hash: cada cédula se resuelve una vez.
 */
import { avisar, html } from '../base/componente.js';
import { copiar, valor } from './ui.js';

export const URL_REGISTRADURIA = 'https://wsp.registraduria.gov.co/censo/consultar/';

export type PuestoManual = { nombre: string; direccion: string; municipio: string; departamento: string; mesa: string };

const ETIQUETAS: [keyof PuestoManual, RegExp][] = [
  ['departamento', /^departamento$/],
  ['municipio', /^(municipio|ciudad)$/],
  ['direccion', /^direcci[oó]n( del)?( puesto)?$/],
  ['nombre', /^(nombre del )?(puesto|lugar)( de votaci[oó]n)?$/],
  ['mesa', /^(n[uú]mero de )?mesa$/],
];

const etiqueta = (t: string): keyof PuestoManual | null => {
  const limpio = t.toLowerCase().replace(/[:.]/g, '').replace(/\s+/g, ' ').trim();
  return ETIQUETAS.find(([, re]) => re.test(limpio))?.[0] ?? null;
};

/** «INSTITUCION EDUCATIVA CASD» → «Institucion Educativa Casd» (la mesa y siglas cortas quedan igual). */
const titulo = (t: string): string => t.trim().toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

/**
 * Lee el texto copiado del resultado oficial. Entiende tres formas: «ETIQUETA: valor» por línea, una fila de
 * encabezados seguida de una fila de valores (separados por tabulador o 2+ espacios), y etiqueta en una línea con el
 * valor en la siguiente. Devuelve solo lo que encontró.
 */
export function leerTexto(texto: string): Partial<PuestoManual> {
  const datos: Partial<PuestoManual> = {};
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const poner = (k: keyof PuestoManual, v: string) => {
    const limpio = v.trim();
    if (limpio && !datos[k]) datos[k] = k === 'mesa' ? limpio.replace(/\D/g, '') || limpio : titulo(limpio);
  };
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]!;
    const par = linea.match(/^([^:]{3,40}):\s*(.+)$/);
    if (par) {
      const k = etiqueta(par[1]!);
      if (k) {
        poner(k, par[2]!);
        continue;
      }
    }
    const celdas = linea.split(/\t|\s{2,}/).map((x) => x.trim()).filter(Boolean);
    const claves = celdas.map(etiqueta);
    if (celdas.length >= 2 && claves.filter(Boolean).length >= 2 && lineas[i + 1]) {
      const valores = lineas[i + 1]!.split(/\t|\s{2,}/).map((x) => x.trim()).filter(Boolean);
      if (valores.length === celdas.length) {
        claves.forEach((k, j) => k && poner(k, valores[j]!));
        i++;
        continue;
      }
    }
    const sola = etiqueta(linea);
    if (sola && lineas[i + 1] && !etiqueta(lineas[i + 1]!)) {
      poner(sola, lineas[i + 1]!);
      i++;
    }
  }
  if (Object.keys(datos).length < 2) Object.assign(datos, { ...leerEnLinea(texto), ...datos });
  return datos;
}

const NUMEROS: Record<string, number> = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintidós: 22, veintitres: 23, veintitrés: 23, veinticuatro: 24, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50 };

/** «doce» → «12», «treinta y dos» → «32»; si ya trae dígitos, los dígitos. */
function numeroHablado(t: string): string {
  const d = t.match(/\d+/);
  if (d) return d[0];
  let total = 0;
  for (const w of t.toLowerCase().split(/\s+|\by\b/)) total += NUMEROS[w] ?? 0;
  return total ? String(total) : t.trim();
}

/**
 * Lector EN LÍNEA para texto dictado o leído de una imagen sin estructura: busca las palabras clave
 * (departamento, municipio, puesto, dirección, mesa) y toma lo que sigue hasta la siguiente palabra clave.
 */
export function leerEnLinea(texto: string): Partial<PuestoManual> {
  const plano = texto.replace(/\s+/g, ' ').trim();
  const re = /\b(departamento|municipio|ciudad|direcci[oó]n(?: del puesto)?|(?:nombre del )?puesto(?: de votaci[oó]n)?|lugar de votaci[oó]n|mesa(?: n[uú]mero)?)\b\s*(?:es|:|-)?\s*/gi;
  const marcas = [...plano.matchAll(re)];
  const datos: Partial<PuestoManual> = {};
  marcas.forEach((m, i) => {
    const k = etiqueta(m[1]!.replace(/ n[uú]mero$/i, '').replace(/^lugar de votaci[oó]n$/i, 'puesto'));
    const fin = marcas[i + 1]?.index ?? plano.length;
    const valor = plano.slice(m.index! + m[0].length, fin).replace(/[,.;]+$/, '').trim();
    if (!k || !valor || datos[k]) return;
    datos[k] = k === 'mesa' ? numeroHablado(valor) : titulo(valor);
  });
  return datos;
}

/** OCR en el navegador (Tesseract.js por CDN, español): la imagen nunca sale del equipo. */
async function textoDeImagen(archivo: File): Promise<string> {
  const url = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js';
  const mod = (await import(/* @vite-ignore */ url)) as { default?: { recognize: Reconocer }; recognize?: Reconocer };
  const reconocer = mod.recognize ?? mod.default?.recognize;
  if (!reconocer) throw new Error('No se pudo cargar el lector de imágenes');
  const r = await reconocer(archivo, 'spa');
  return r.data.text;
}
type Reconocer = (img: File, idioma: string) => Promise<{ data: { text: string } }>;

type Reconocimiento = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
const Dictado = (globalThis as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento }).SpeechRecognition ??
  (globalThis as { webkitSpeechRecognition?: new () => Reconocimiento }).webkitSpeechRecognition;

/**
 * Bloque de consulta asistida. `cedula()` da la cédula a copiar. `leer()` devuelve el puesto escrito (o `null` si
 * está vacío) para mandarlo como `puestoManual` o a `POST personas/{ref}/puesto`.
 */
export function bloquePuestoManual(cedula: () => string, inicial: Partial<PuestoManual> = {}): { nodo: HTMLElement; leer(): PuestoManual | null; limpiar(): void } {
  const caja = document.createElement('section');
  caja.className = 'manual';
  const fijar = (d: Partial<PuestoManual>) => {
    for (const [k, v] of Object.entries(d)) {
      const campo = caja.querySelector(`[data-campo="pm-${k}"]`) as (HTMLElement & { value?: string }) | null;
      if (campo && v) campo.value = v;
    }
  };
  const abrir = async () => {
    const c = cedula().replace(/\D/g, '');
    if (c.length >= 5 && (await copiar(c))) avisar('Cédula copiada: pégala en la página de la Registraduría.', 'brand');
    window.open(URL_REGISTRADURIA, '_blank', 'noopener');
  };
  const usarTexto = (t: string, origen: string): void => {
    const area = caja.querySelector('[data-campo="pm-texto"]') as (HTMLElement & { value?: string }) | null;
    if (area && origen !== 'recuadro') area.value = t;
    const d = leerTexto(t);
    const n = Object.keys(d).length;
    if (!n) {
      if (origen !== 'recuadro') avisar(`No encontré datos del puesto en ${origen}. Escríbelos a mano.`, 'warning');
      return;
    }
    fijar(d);
    avisar(`Leí ${n} dato(s) ${origen === 'recuadro' ? 'del resultado' : `de ${origen}`}. Revísalos antes de guardar.`, 'success');
  };
  const alPegar = (e: Event) => usarTexto(String((e.currentTarget as HTMLElement & { value?: string }).value ?? ''), 'recuadro');
  const pegar = async (): Promise<void> => {
    try {
      usarTexto(await navigator.clipboard.readText(), 'lo copiado');
    } catch {
      avisar('El navegador no dejó leer el portapapeles: pega con Ctrl+V en el recuadro.', 'warning');
    }
  };
  const archivo = document.createElement('input');
  archivo.type = 'file';
  archivo.accept = 'image/*';
  archivo.hidden = true;
  archivo.addEventListener('change', async () => {
    const f = archivo.files?.[0];
    archivo.value = '';
    if (!f) return;
    const boton = caja.querySelector('[data-leer-imagen]');
    boton?.setAttribute('loading', '');
    try {
      avisar('Leyendo la imagen… (la primera vez tarda unos segundos)', 'brand');
      usarTexto(await textoDeImagen(f), 'la imagen');
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'No se pudo leer la imagen', 'danger');
    } finally {
      boton?.removeAttribute('loading');
    }
  });
  let oyendo: Reconocimiento | null = null;
  const dictar = (): void => {
    const boton = caja.querySelector('[data-dictar]');
    if (oyendo) return oyendo.stop();
    if (!Dictado) return avisar('Este navegador no permite dictado. Prueba con Chrome o Edge.', 'warning');
    const rec = new Dictado();
    rec.lang = 'es-CO';
    rec.interimResults = false;
    rec.continuous = true;
    let dicho = '';
    rec.onresult = (e) => {
      dicho = Array.from(e.results).map((r) => r[0]?.transcript ?? '').join(' ');
    };
    rec.onerror = (e) => avisar(`Dictado: ${e.error === 'not-allowed' ? 'permite el micrófono' : e.error}`, 'warning');
    rec.onend = () => {
      oyendo = null;
      boton?.removeAttribute('data-oyendo');
      if (dicho) usarTexto(dicho, 'lo dictado');
    };
    oyendo = rec;
    boton?.setAttribute('data-oyendo', '');
    avisar('Te escucho: di «puesto…, dirección…, municipio…, mesa…» y toca de nuevo para terminar.', 'brand');
    rec.start();
  };
  caja.append(html`
    <header class="manual-cabeza">
      <iswc-icon icon="mdi:card-search-outline"></iswc-icon>
      <div><strong>Consulta asistida del puesto</strong><small>La Registraduría no permite consultas automáticas: consúltala tú y trae el resultado.</small></div>
    </header>
    <ol class="pasos">
      <li><iswc-button size="small" variant="outlined" data-abrir-registraduria onclick=${() => void abrir()}><iswc-icon slot="start" icon="mdi:open-in-new"></iswc-icon>Copiar cédula y abrir Registraduría</iswc-button></li>
      <li class="extraer">
        <div class="acciones">
          <iswc-button size="small" variant="outlined" data-pegar onclick=${() => void pegar()}><iswc-icon slot="start" icon="mdi:clipboard-text-outline"></iswc-icon>Pegar texto</iswc-button>
          <iswc-button size="small" variant="outlined" data-leer-imagen onclick=${() => archivo.click()}><iswc-icon slot="start" icon="mdi:image-search-outline"></iswc-icon>Leer de una imagen</iswc-button>
          <iswc-button size="small" variant="outlined" data-dictar ?disabled=${!Dictado} title=${Dictado ? 'Narra el puesto, la dirección, el municipio y la mesa' : 'Este navegador no permite dictado'} onclick=${dictar}><iswc-icon slot="start" icon="mdi:microphone-outline"></iswc-icon>Dictar</iswc-button>
          ${archivo}
        </div>
        <iswc-textarea data-campo="pm-texto" rows="2" placeholder="…o pega aquí lo que muestra la Registraduría: los campos se llenan solos." oniswc-input=${alPegar}></iswc-textarea>
      </li>
      <li class="campos-puesto">
        <iswc-input data-campo="pm-nombre" label="Puesto de votación"></iswc-input>
        <iswc-input data-campo="pm-direccion" label="Dirección del puesto"></iswc-input>
        <iswc-input data-campo="pm-municipio" label="Municipio" value="Armenia"></iswc-input>
        <iswc-input data-campo="pm-departamento" label="Departamento" value="Quindío"></iswc-input>
        <iswc-input data-campo="pm-mesa" label="Mesa" inputmode="numeric"></iswc-input>
      </li>
    </ol>
  `);
  fijar(inicial);
  return {
    nodo: caja,
    leer(): PuestoManual | null {
      const d: PuestoManual = { nombre: valor(caja, 'pm-nombre'), direccion: valor(caja, 'pm-direccion'), municipio: valor(caja, 'pm-municipio'), departamento: valor(caja, 'pm-departamento'), mesa: valor(caja, 'pm-mesa') };
      return d.nombre ? d : null;
    },
    limpiar(): void {
      for (const k of ['texto', 'nombre', 'direccion', 'mesa']) {
        const campo = caja.querySelector(`[data-campo="pm-${k}"]`) as (HTMLElement & { value?: string }) | null;
        if (campo) campo.value = '';
      }
    },
  };
}
