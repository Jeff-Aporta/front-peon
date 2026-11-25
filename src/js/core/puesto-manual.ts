// @contexto api-peon/src/procuraduria/manual.ts · HANDOFF.md «Prueba de fuentes oficiales»
/**
 * puesto-manual.ts — consulta ASISTIDA del puesto de votación (decisión del autor, 23-nov-2026).
 *
 * La página oficial (Registraduría) bloquea a los robots, así que el servidor no la consulta. Quien registra tiene
 * DOS caminos (puede usar los dos, en cualquier orden):
 *   1. ELEGIR DEL CATÁLOGO OFICIAL: primero el municipio (autocompletado sobre `GET /api/puestos/municipios`), luego
 *      el puesto (autocompletado sobre `GET /api/puestos?q=…&municipio=…`). Al elegir uno quedan memorizados su
 *      `codigo` (viaja como `puestoCodigo`: la API lo toma del catálogo y queda VERIFICADO) y sus datos.
 *   2. TRAER EL RESULTADO A MANO: «Pegar texto» (portapapeles), «Leer de una imagen» (captura → OCR en el navegador con
 *      Tesseract.js) o «Dictar» (Web Speech API, es-CO). `leerTexto()` / `leerEnLinea()` llenan los campos solos y lo
 *      leído se EMPAREJA con el catálogo oficial: si hay un puesto que calza, se propone («¿Quisiste decir X?»).
 * La mesa sigue siendo un número que escribe la persona. La API deja el puesto verificado (`fuente:
 * registraduria-manual`) y en la caché por hash: cada cédula se resuelve una vez.
 */
import { avisar, html } from '../base/componente.js';
import { URL_MARCADOR } from './config.js';
import { buscarMunicipios, buscarPuestos, emparejarPuesto, etiquetaPuesto } from './puestos.js';
import { copiar, valor } from './ui.js';
import { Dictado, errorVoz } from './voz.js';
import type { Reconocimiento } from './voz.js';
import type { PuestoCatalogo, PuestoMunicipio } from '../consts/schemas/api.schemas.js';
import type { PuestoManual } from '../consts/schemas/api.schemas.js';

export type { PuestoManual };

/**
 * Página oficial de consulta del lugar de votación.
 *
 * La del handoff (`https://wsp.registraduria.gov.co/censo/consultar/`) **ya no existe** (404, comprobado el
 * 25-nov-2026). La vigente, enlazada desde la Registraduría, es `https://consultacenso.registraduria.gov.co/`.
 */
export const URL_REGISTRADURIA = 'https://consultacenso.registraduria.gov.co/';

/** El bloque de consulta asistida: lo que devuelve (el puesto escrito y el código del catálogo). */
export type BloquePuestoManual = {
  /** El nodo del bloque (va dentro del shadow del componente que lo usa). */
  nodo: HTMLElement;
  /** El puesto escrito (o `null` si no hay nada escrito). */
  leer(): PuestoManual | null;
  /** El código del puesto elegido en el catálogo oficial (o `null` si no se eligió ninguno). */
  leerCodigo(): string | null;
  /** Limpia lo escrito y lo elegido (se llama tras guardar). */
  limpiar(): void;
};

/** El autocompletado del kit (`iswc-combobox`): un input con lista. */
type Combo = HTMLElement & { value: string; open: boolean };

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

/* El reconocimiento de voz (es-CO) es compartido con las notas de voz del chat: core/voz.ts. */

/**
 * Bloque de consulta asistida. `cedula()` da la cédula a copiar. `leer()` devuelve el puesto escrito (o `null` si
 * está vacío) y `leerCodigo()` el código del puesto elegido en el catálogo (o `null`): ambos viajan a
 * `POST personas` y `POST personas/{ref}/puesto`.
 */
export function bloquePuestoManual(cedula: () => string, inicial: Partial<PuestoManual> & { codigo?: string } = {}): BloquePuestoManual {
  const caja = document.createElement('section');
  caja.className = 'manual';

  /** El código del puesto elegido en el catálogo (viaja como `puestoCodigo`). */
  let codigo = inicial.codigo ?? '';
  /** Los puestos que se están mostrando en el autocompletado (para resolver el código elegido). */
  let mostrados = new Map<string, PuestoCatalogo>();
  /** Los municipios ya cargados (o `null` si aún no se han cargado). */
  let municipios: PuestoMunicipio[] | null = null;
  let cargandoMunicipios = false;

  const fijar = (d: Partial<PuestoManual>) => {
    for (const [k, v] of Object.entries(d)) {
      const campo = caja.querySelector(`[data-campo="pm-${k}"]`) as (HTMLElement & { value?: string }) | null;
      if (campo && v) campo.value = v;
    }
  };

  const opcion = (valor: string, etiqueta: string): HTMLElement => {
    const o = document.createElement('iswc-option');
    o.setAttribute('value', valor);
    o.textContent = etiqueta;
    return o;
  };

  /* ── Camino 1: el catálogo oficial ───────────────────────────────────────────── */

  const comboMun = document.createElement('iswc-combobox') as Combo;
  comboMun.setAttribute('data-campo', 'pm-mun');
  comboMun.setAttribute('label', 'Municipio');
  comboMun.setAttribute('placeholder', 'Escribe el municipio');
  comboMun.setAttribute('no-results', 'Sin municipios');
  comboMun.setAttribute('clearable', '');

  const comboPuesto = document.createElement('iswc-combobox') as Combo;
  comboPuesto.setAttribute('data-campo', 'pm-puesto');
  comboPuesto.setAttribute('label', 'Puesto de votación');
  comboPuesto.setAttribute('placeholder', 'Nombre, dirección o barrio del puesto');
  comboPuesto.setAttribute('no-results', 'Sin puestos');
  comboPuesto.setAttribute('clearable', '');

  const conteo = document.createElement('small');
  conteo.className = 'nota';
  conteo.setAttribute('data-conteo', '');
  conteo.textContent = 'Elige el municipio y luego busca el puesto por nombre o dirección.';

  const cargarMunicipios = async (): Promise<void> => {
    if (municipios || cargandoMunicipios) return;
    cargandoMunicipios = true;
    try {
      municipios = await buscarMunicipios();
      comboMun.replaceChildren(...municipios.map((m) => opcion(m.municipio, [m.municipio, m.departamento].filter(Boolean).join(' · '))));
    } catch {
      avisar('No se pudo cargar el catálogo de municipios: revisa la conexión.', 'warning');
    } finally {
      cargandoMunicipios = false;
    }
  };

  const buscar = async (texto: string): Promise<void> => {
    try {
      const res = await buscarPuestos(texto, String(comboMun.value ?? '').trim(), 20);
      mostrados = new Map(res.map((p) => [p.codigo, p]));
      comboPuesto.replaceChildren(...res.map((p) => opcion(p.codigo, etiquetaPuesto(p))));
      conteo.textContent = res.length
        ? `${res.length} puesto(s) del catálogo oficial.`
        : 'Sin puestos en el catálogo oficial con esa búsqueda.';
    } catch {
      conteo.textContent = 'No se pudo consultar el catálogo oficial.';
    }
  };

  const tomarPuesto = (p: PuestoCatalogo): void => {
    fijar({ nombre: p.nombre, direccion: p.direccion ?? '', municipio: p.municipio, departamento: p.departamento ?? '' });
    codigo = p.codigo;
    ocultarPropuesta();
    avisar(`Puesto del catálogo oficial: ${p.nombre}.`, 'success');
  };

  /* ── La propuesta: lo que la persona trajo, emparejado con el catálogo ───────── */

  const panelPropuesta = document.createElement('div');
  panelPropuesta.className = 'propuesta';
  panelPropuesta.setAttribute('data-propuesta', '');
  panelPropuesta.hidden = true;

  const ocultarPropuesta = (): void => {
    panelPropuesta.hidden = true;
    panelPropuesta.replaceChildren();
  };

  const mostrarPropuesta = (p: PuestoCatalogo): void => {
    panelPropuesta.hidden = false;
    panelPropuesta.replaceChildren(html`
      <iswc-icon icon="mdi:magnify"></iswc-icon>
      <span>¿Quisiste decir <strong>${p.nombre}</strong>${p.direccion ? ` (${p.direccion})` : ''}?</span>
      <iswc-button size="small" color="brand" data-tomar onclick=${() => tomarPuesto(p)}><iswc-icon slot="start" icon="mdi:check"></iswc-icon>Tomar este puesto</iswc-button>
      <iswc-button size="small" variant="text" data-ignorar onclick=${() => ocultarPropuesta()}>No</iswc-button>`);
  };

  const proponer = async (d: Partial<PuestoManual>): Promise<void> => {
    const nombre = (d.nombre ?? '').trim();
    if (!nombre) return;
    const municipio = (d.municipio ?? '').trim();
    try {
      const res = await buscarPuestos(nombre, municipio, 10);
      const p = emparejarPuesto({ nombre, municipio }, res);
      if (!p) {
        avisar('Ese puesto no aparece en el catálogo oficial: revisa los datos o escríbelos a mano.', 'warning');
        return;
      }
      mostrarPropuesta(p);
    } catch {
      /* sin catálogo (o sin red): los datos quedan como los escribió la persona */
    }
  };

  /* ── Camino 2: traer el resultado a mano ─────────────────────────────────────── */

  const abrir = async () => {
    const c = cedula().replace(/\D/g, '');
    if (c.length >= 5 && (await copiar(c))) avisar('Cédula copiada: pégala en la página de la Registraduría.', 'brand');
    window.open(URL_REGISTRADURIA, '_blank', 'noopener');
  };

  const usarTexto = async (t: string, origen: string): Promise<void> => {
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
    await proponer(d);
  };

  const alPegar = (e: Event) => {
    const valor = (e as CustomEvent<{ value?: string }>).detail?.value ?? (e.currentTarget as (HTMLElement & { value?: string })).value ?? '';
    void usarTexto(String(valor), 'recuadro');
  };

  const pegar = async (): Promise<void> => {
    try {
      await usarTexto(await navigator.clipboard.readText(), 'lo copiado');
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
      await usarTexto(await textoDeImagen(f), 'la imagen');
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
    rec.onerror = (e) => avisar(`Dictado: ${errorVoz(e.error)}`, 'warning');
    rec.onend = () => {
      oyendo = null;
      boton?.removeAttribute('data-oyendo');
      if (dicho) void usarTexto(dicho, 'lo dictado');
    };
    oyendo = rec;
    boton?.setAttribute('data-oyendo', '');
    avisar('Te escucho: di «puesto…, dirección…, municipio…, mesa…» y toca de nuevo para terminar.', 'brand');
    rec.start();
  };

  /* ── El bloque ──────────────────────────────────────────────────────────────── */

  caja.append(html`
    <header class="manual-cabeza">
      <iswc-icon icon="mdi:card-search-outline"></iswc-icon>
      <div><strong>Consulta asistida del puesto</strong><small>Elige el puesto del catálogo oficial o trae el resultado de la Registraduría.</small></div>
    </header>
    <div class="caminos">
      <iswc-button size="small" color="brand" variant="filled" data-camino="catalogo" aria-pressed="true"><iswc-icon slot="start" icon="mdi:magnify"></iswc-icon>Buscar en el catálogo oficial</iswc-button>
      <iswc-button size="small" variant="outlined" data-camino="manual" aria-pressed="false"><iswc-icon slot="start" icon="mdi:clipboard-text-outline"></iswc-icon>Traer el resultado a mano</iswc-button>
    </div>
    <section class="camino" data-panel="catalogo">
      <ol class="pasos">
        <li>${comboMun}</li>
        <li>${comboPuesto}${conteo}</li>
      </ol>
    </section>
    <section class="camino" data-panel="manual" hidden>
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
      </ol>
    </section>
    ${panelPropuesta}
    <div class="campos-puesto">
      <iswc-input data-campo="pm-nombre" label="Puesto de votación"></iswc-input>
      <iswc-input data-campo="pm-direccion" label="Dirección del puesto"></iswc-input>
      <iswc-input data-campo="pm-municipio" label="Municipio" value="Armenia"></iswc-input>
      <iswc-input data-campo="pm-departamento" label="Departamento" value="Quindío"></iswc-input>
      <iswc-input data-campo="pm-mesa" label="Mesa" inputmode="numeric"></iswc-input>
    </div>
    <p class="nota">¿No quieres copiar nada? Usa la <a class="enlace" href=${URL_MARCADOR} target="_blank" rel="noopener noreferrer">captura asistida</a>: traes el resultado de la Registraduría con un marcador, sin copiar y pegar.</p>
  `);

  const { codigo: _codigoInicial, ...camposIniciales } = inicial;
  fijar(camposIniciales);
  // El municipio de partida también es el filtro del catálogo.
  comboMun.value = valor(caja, 'pm-municipio');

  /* Los dos caminos (los dos se pueden usar). */
  const cambiarCamino = (camino: string): void => {
    for (const panel of caja.querySelectorAll<HTMLElement>('[data-panel]')) panel.hidden = panel.getAttribute('data-panel') !== camino;
    for (const b of caja.querySelectorAll<HTMLElement>('[data-camino]')) b.setAttribute('aria-pressed', String(b.getAttribute('data-camino') === camino));
    if (camino === 'catalogo') void cargarMunicipios();
  };
  for (const b of caja.querySelectorAll('[data-camino]')) b.addEventListener('click', () => cambiarCamino(b.getAttribute('data-camino') ?? 'catalogo'));

  /* El autocompletado del municipio. */
  let esperaMun = 0;
  comboMun.addEventListener('iswc-show', () => void cargarMunicipios());
  comboMun.addEventListener('iswc-input', (e) => {
    const texto = String((e as CustomEvent<{ value?: string }>).detail?.value ?? '');
    if (texto === comboMun.value) return; // no es escritura: es «elegí una opción»
    clearTimeout(esperaMun);
    esperaMun = setTimeout(() => void cargarMunicipios(), 200);
  });
  comboMun.addEventListener('iswc-change', (e) => {
    const mun = String((e as CustomEvent<{ value?: string }>).detail?.value ?? '').trim();
    if (!mun) return;
    fijar({ municipio: mun });
    void buscar(''); // los puestos de ese municipio
  });

  /* El autocompletado del puesto. */
  let esperaPuesto = 0;
  comboPuesto.addEventListener('iswc-input', (e) => {
    const texto = String((e as CustomEvent<{ value?: string }>).detail?.value ?? '').trim();
    if (texto === comboPuesto.value) return; // no es escritura: es «elegí una opción»
    clearTimeout(esperaPuesto);
    esperaPuesto = setTimeout(() => void buscar(texto), 250);
  });
  comboPuesto.addEventListener('iswc-change', (e) => {
    const elegido = String((e as CustomEvent<{ value?: string }>).detail?.value ?? '').trim();
    if (!elegido) {
      codigo = '';
      return;
    }
    const p = mostrados.get(elegido);
    if (p) tomarPuesto(p);
  });

  return {
    nodo: caja,
    leer(): PuestoManual | null {
      const d: PuestoManual = { nombre: valor(caja, 'pm-nombre'), direccion: valor(caja, 'pm-direccion'), municipio: valor(caja, 'pm-municipio'), departamento: valor(caja, 'pm-departamento'), mesa: valor(caja, 'pm-mesa') };
      return d.nombre ? d : null;
    },
    leerCodigo(): string | null {
      return codigo ? codigo : null;
    },
    limpiar(): void {
      for (const k of ['texto', 'nombre', 'direccion', 'mesa']) {
        const campo = caja.querySelector(`[data-campo="pm-${k}"]`) as (HTMLElement & { value?: string }) | null;
        if (campo) campo.value = '';
      }
      comboMun.value = '';
      comboPuesto.value = '';
      comboPuesto.replaceChildren();
      mostrados = new Map();
      codigo = '';
      ocultarPropuesta();
    },
  };
}