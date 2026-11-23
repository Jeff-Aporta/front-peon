// @contexto api-peon/src/procuraduria/manual.ts · HANDOFF.md «Prueba de fuentes oficiales»
/**
 * puesto-manual.ts — consulta MANUAL ASISTIDA del puesto de votación (decisión del autor, 23-nov-2026).
 *
 * La página oficial (Registraduría) bloquea a los robots, así que el servidor no la consulta. Quien registra:
 *   1. toca «Copiar cédula y abrir Registraduría» (copia la cédula y abre la página oficial en su navegador),
 *   2. consulta allí, selecciona el resultado y lo pega en el recuadro: `leerTexto()` llena los campos solo,
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
  return datos;
}

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
  const alPegar = (e: Event) => {
    const t = String((e.currentTarget as HTMLElement & { value?: string }).value ?? '');
    const d = leerTexto(t);
    const n = Object.keys(d).length;
    if (!n) return;
    fijar(d);
    avisar(`Leí ${n} dato(s) del resultado. Revísalos antes de guardar.`, 'success');
  };
  caja.append(html`
    <header class="manual-cabeza">
      <iswc-icon icon="mdi:card-search-outline"></iswc-icon>
      <div><strong>Consulta asistida del puesto</strong><small>La Registraduría no permite consultas automáticas: consúltala tú y trae el resultado.</small></div>
    </header>
    <ol class="pasos">
      <li><iswc-button size="small" variant="outlined" data-abrir-registraduria onclick=${() => void abrir()}><iswc-icon slot="start" icon="mdi:open-in-new"></iswc-icon>Copiar cédula y abrir Registraduría</iswc-button></li>
      <li><iswc-textarea data-campo="pm-texto" rows="2" placeholder="Pega aquí lo que muestra la Registraduría (selecciona el resultado y cópialo): los campos se llenan solos." oniswc-input=${alPegar}></iswc-textarea></li>
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
