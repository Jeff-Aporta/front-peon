// @contexto api-peon/docs/PUESTOS.md · api-peon/src/procuraduria/catalogo.ts
// puestos.test.ts — el emparejamiento con el catálogo oficial: funciones puras, sin red.
//
//   W-PUE-01  el nombre se normaliza (tildes, mayúsculas, signos)
//   W-PUE-02  nombres iguales puntúan 1; distintos, por debajo del umbral
//   W-PUE-03  empareja el puesto que corresponde (mismo municipio)
//   W-PUE-04  con dos candidatos igual de buenos NO hay candidato claro (no se propone a ciegas)
//   W-PUE-05  un puesto de otro municipio no se propone
import { definirPruebas } from "../../src/vendor/iswc-base/tools/pruebas.ts";

// `core/api.ts` (del que cuelga el módulo) se suscribe a `window` al cargarse: en Deno no existe, así que se
// pone un mínimo antes de importarlo.
(globalThis as Record<string, unknown>).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

const {
  coincideConOficial,
  emparejarPuesto,
  normalizar,
  puntajePuesto,
  UMBRAL_EMPAREJE,
} = await import("../../src/js/core/puestos.ts");
type PuestoCatalogo = {
  codigo: string;
  nombre: string;
  municipio: string;
  departamento: string | null;
  direccion: string | null;
  lat: number | null;
  lon: number | null;
  fuente: string;
};

const CATALOGO: PuestoCatalogo[] = [
  {
    codigo: "DIV-63001-1",
    nombre: "IE LAURA VICUÑA",
    municipio: "Armenia",
    departamento: "Quindío",
    direccion: "BARRIO BOSQUES DE PINARES MZ11A NO 1",
    lat: 4.51,
    lon: -75.69,
    fuente: "oficial",
  },
  {
    codigo: "DIV-63001-2",
    nombre: "IE TERESITA MONTES SD LUIS C. GALAN S.",
    municipio: "Armenia",
    departamento: "Quindío",
    direccion: "BARRIO LA ISABELA MZ 8",
    lat: 4.51,
    lon: -75.69,
    fuente: "oficial",
  },
  {
    codigo: "DIV-63130-3",
    nombre: "COLEGIO SAN JOSE",
    municipio: "Calarcá",
    departamento: "Quindío",
    direccion: "CL 5 # 3-10",
    lat: 4.52,
    lon: -75.64,
    fuente: "oficial",
  },
];

export default definirPruebas([
  {
    nombre: "W-PUE-01 el nombre se normaliza",
    categoria: "what",
    correr({ eq }) {
      eq(
        "tildes y mayúsculas",
        normalizar("Institución Educativa CASD"),
        "institucion educativa casd",
      );
      eq(
        "signos y espacios",
        normalizar("  ¡KR 29 # 102-20!  "),
        "kr 29 102 20",
      );
    },
  },
  {
    nombre:
      "W-PUE-02 nombres iguales puntúan 1; distintos, por debajo del umbral",
    categoria: "what",
    correr({ eq, expect }) {
      eq(
        "el mismo puesto",
        puntajePuesto("IE LAURA VICUÑA", "ie laura vicuña"),
        1,
      );
      expect(
        "puestos que no se parecen",
        puntajePuesto("COLEGIO SAN JOSE", "IE TERESITA MONTES") <
          UMBRAL_EMPAREJE,
        true,
      );
    },
  },
  {
    nombre: "W-PUE-03 empareja el puesto que corresponde",
    categoria: "what",
    correr({ eq, expect }) {
      const p = emparejarPuesto({
        nombre: "ie laura vicuña",
        municipio: "Armenia",
      }, CATALOGO);
      expect("encuentra el puesto", !!p, true);
      eq("y es el correcto", p?.codigo, "DIV-63001-1");
    },
  },
  {
    nombre:
      "W-PUE-04 con dos candidatos igual de buenos no hay candidato claro",
    categoria: "what",
    correr({ eq }) {
      const dos = [
        { ...CATALOGO[0]!, codigo: "A", nombre: "COLEGIO SAN JOSE" },
        { ...CATALOGO[0]!, codigo: "B", nombre: "COLEGIO SAN JOSE" },
      ];
      eq(
        "no se propone a ciegas",
        emparejarPuesto(
          { nombre: "colegio san jose", municipio: "Armenia" },
          dos,
        ),
        null,
      );
    },
  },
  {
    nombre: "W-PUE-06 lo escrito coincide con el puesto oficial (y si no, no)",
    categoria: "what",
    correr({ eq }) {
      const oficial = {
        codigo: "9253",
        nombre: "IE CAMARA JUNIOR SEDE LA PAVON",
        municipio: "ARMENIA",
        direccion: "MZ P No 24 BARRIO LA PAVONA",
      };
      eq(
        "el mismo puesto (con mayusculas distintas)",
        coincideConOficial({
          nombre: "ie camara junior sede la pavon",
          municipio: "Armenia",
        }, oficial),
        true,
      );
      eq(
        "con el municipio vacio tambien",
        coincideConOficial(
          { nombre: "IE CAMARA JUNIOR SEDE LA PAVON" },
          oficial,
        ),
        true,
      );
      eq(
        "un puesto distinto NO coincide",
        coincideConOficial(
          { nombre: "IE LAURA VICUÑA", municipio: "Armenia" },
          oficial,
        ),
        false,
      );
      eq(
        "otro municipio NO coincide",
        coincideConOficial({
          nombre: "IE CAMARA JUNIOR SEDE LA PAVON",
          municipio: "Calarcá",
        }, oficial),
        false,
      );
      eq(
        "sin puesto oficial no hay coincidencia",
        coincideConOficial({ nombre: "IE CAMARA JUNIOR SEDE LA PAVON" }, null),
        false,
      );
    },
  },
  {
    nombre: "W-PUE-05 un puesto de otro municipio no se propone",
    categoria: "what",
    correr({ eq, expect }) {
      eq(
        "otro municipio",
        emparejarPuesto(
          { nombre: "colegio san jose", municipio: "Armenia" },
          CATALOGO,
        ),
        null,
      );
      expect(
        "el municipio correcto",
        !!emparejarPuesto(
          { nombre: "colegio san jose", municipio: "Calarcá" },
          CATALOGO,
        ),
        true,
      );
    },
  },
]);
