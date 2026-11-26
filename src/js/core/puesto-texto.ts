// @contexto HANDOFF.md «Prueba de fuentes oficiales» · core/puesto-manual.ts (la parte de texto)
/**
 * puesto-texto.ts — LECTURA del resultado oficial de la Registraduría: texto pegado, texto dictado o texto leído
 * de una imagen (OCR en el navegador con Tesseract.js; la imagen nunca sale del equipo).
 *
 * Aquí no hay DOM ni estado: son funciones puras que devuelven los campos del puesto. Las usa el ASISTENTE (el
 * chat del botón flotante): la persona pega, dicta o saca una foto de lo que muestra la página oficial y el chat
 * lo procesa y lo lleva al VPS. La pantalla de registro ya NO tiene esta captura: la asistencia por IA vive
 * únicamente en el asistente.
 */
import type { PuestoManual } from "../consts/schemas/api.schemas.js";

export type { PuestoManual };

/** Las etiquetas que se entienden del resultado oficial (en cualquier orden y con mayúsculas). */
const ETIQUETAS: [keyof PuestoManual, RegExp][] = [
  ["departamento", /^departamento$/],
  ["municipio", /^(municipio|ciudad)$/],
  ["direccion", /^direcci[oó]n( del)?( puesto)?$/],
  ["nombre", /^(nombre del )?(puesto|lugar)( de votaci[oó]n)?$/],
  ["mesa", /^(n[uú]mero de )?mesa$/],
];

const etiqueta = (t: string): keyof PuestoManual | null => {
  const limpio = t.toLowerCase().replace(/[:.]/g, "").replace(/\s+/g, " ")
    .trim();
  return ETIQUETAS.find(([, re]) => re.test(limpio))?.[0] ?? null;
};

/** «INSTITUCION EDUCATIVA CASD» → «Institucion Educativa Casd» (la mesa y siglas cortas quedan igual). */
const titulo = (t: string): string =>
  t.trim().toLowerCase().replace(
    /(^|[\s(/-])(\p{L})/gu,
    (_, a: string, b: string) => a + b.toUpperCase(),
  );

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
    if (limpio && !datos[k]) {
      datos[k] = k === "mesa"
        ? limpio.replace(/\D/g, "") || limpio
        : titulo(limpio);
    }
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
    const celdas = linea.split(/\t|\s{2,}/).map((x) => x.trim()).filter(
      Boolean,
    );
    const claves = celdas.map(etiqueta);
    if (
      celdas.length >= 2 && claves.filter(Boolean).length >= 2 && lineas[i + 1]
    ) {
      const valores = lineas[i + 1]!.split(/\t|\s{2,}/).map((x) => x.trim())
        .filter(Boolean);
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
  if (Object.keys(datos).length < 2) {
    Object.assign(datos, { ...leerEnLinea(texto), ...datos });
  }
  return datos;
}

const NUMEROS: Record<string, number> = {
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintidós: 22,
  veintitres: 23,
  veintitrés: 23,
  veinticuatro: 24,
  veinticinco: 25,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
};

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
  const plano = texto.replace(/\s+/g, " ").trim();
  const re =
    /\b(departamento|municipio|ciudad|direcci[oó]n(?: del puesto)?|(?:nombre del )?puesto(?: de votaci[oó]n)?|lugar de votaci[oó]n|mesa(?: n[uú]mero)?)\b\s*(?:es|:|-)?\s*/gi;
  const marcas = [...plano.matchAll(re)];
  const datos: Partial<PuestoManual> = {};
  marcas.forEach((m, i) => {
    const k = etiqueta(
      m[1]!.replace(/ n[uú]mero$/i, "").replace(
        /^lugar de votaci[oó]n$/i,
        "puesto",
      ),
    );
    const fin = marcas[i + 1]?.index ?? plano.length;
    const valor = plano.slice(m.index! + m[0].length, fin).replace(
      /[,.;]+$/,
      "",
    ).trim();
    if (!k || !valor || datos[k]) return;
    datos[k] = k === "mesa" ? numeroHablado(valor) : titulo(valor);
  });
  return datos;
}

/** OCR en el navegador (Tesseract.js por CDN, español): la imagen nunca sale del equipo. */
export async function textoDeImagen(archivo: File): Promise<string> {
  const url =
    "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js";
  const mod = (await import(/* @vite-ignore */ url)) as {
    default?: { recognize: Reconocer };
    recognize?: Reconocer;
  };
  const reconocer = mod.recognize ?? mod.default?.recognize;
  if (!reconocer) throw new Error("No se pudo cargar el lector de imágenes");
  const r = await reconocer(archivo, "spa");
  return r.data.text;
}
type Reconocer = (
  img: File,
  idioma: string,
) => Promise<{ data: { text: string } }>;

/** El texto tal cual (para la foto o el dictado) y los campos que se entendieron de él. */
export function leerPuesto(texto: string): {
  datos: Partial<PuestoManual>;
  resumen: string;
} {
  const datos = leerTexto(texto);
  const partes: string[] = [];
  if (datos.nombre) partes.push(`puesto: ${datos.nombre}`);
  if (datos.direccion) partes.push(`dirección: ${datos.direccion}`);
  if (datos.municipio) partes.push(`municipio: ${datos.municipio}`);
  if (datos.departamento) partes.push(`departamento: ${datos.departamento}`);
  if (datos.mesa) partes.push(`mesa: ${datos.mesa}`);
  return { datos, resumen: partes.join(" · ") };
}
