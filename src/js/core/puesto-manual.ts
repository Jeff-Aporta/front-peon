// @contexto api-peon/src/procuraduria/manual.ts · HANDOFF.md «Prueba de fuentes oficiales»
/**
 * puesto-manual.ts — el PUESTO escrito a mano: los campos, el catálogo oficial y el aviso de discrepancia.
 *
 * La página oficial (Registraduría) bloquea a los robots, así que el servidor no la consulta. Este bloque deja:
 *   · los CAMPOS del puesto (nombre, dirección, municipio, departamento, mesa): lo escribe la persona;
 *   · el CATÁLOGO OFICIAL (opcional, `opciones.catalogo`): primero el municipio (autocompletado sobre
 *     `GET /api/puestos/municipios`), luego el puesto (autocompletado sobre `GET /api/puestos?q=…&municipio=…`). Al
 *     elegir uno quedan memorizados su `codigo` (viaja como `puestoCodigo`: la API lo toma del catálogo y queda
 *     VERIFICADO) y sus datos;
 *   · el AVISO DE DISCREPANCIA: si lo escrito no coincide con lo que dice la fuente oficial, se avisa y se ofrece
 *     «Reemplazar» con el dato oficial.
 *
 * La CAPTURA ASISTIDA (pegar el texto, leer una imagen, dictar) ya NO vive aquí: vive únicamente en el ASISTENTE
 * (el chat del botón flotante), que es quien lee el resultado de la Registraduría — ver `core/puesto-texto.ts`.
 * La mesa sigue siendo un número que escribe la persona. La API deja el puesto verificado (`fuente:
 * registraduria-manual`) y en la caché por hash: cada cédula se resuelve una vez.
 */
import { avisar, html } from "../base/componente.js";
import {
  buscarMunicipios,
  buscarPuestos,
  coincideConOficial,
  etiquetaPuesto,
} from "./puestos.js";
import type { PuestoOficial } from "./puestos.js";
import { valor } from "./ui.js";
import type {
  PuestoCatalogo,
  PuestoMunicipio,
} from "../consts/schemas/api.schemas.js";
import type { PuestoManual } from "../consts/schemas/api.schemas.js";

export type { PuestoManual };

/** El bloque del puesto escrito a mano: lo que devuelve (el puesto escrito y el código del catálogo). */
export type BloquePuestoManual = {
  /** El nodo del bloque (va dentro del shadow del componente que lo usa). */
  nodo: HTMLElement;
  /** El puesto escrito (o `null` si no hay nada escrito). */
  leer(): PuestoManual | null;
  /** El código del puesto elegido en el catálogo oficial (o `null` si no se eligió ninguno). */
  leerCodigo(): string | null;
  /** Limpia lo escrito y lo elegido (se llama tras guardar). */
  limpiar(): void;
  /**
   * Compara lo que hay escrito con el puesto que dice la fuente oficial. Si **no** coincide, deja un aviso con la
   * ubicación que encontró la Registraduría y un botón «Reemplazar» para dejar el dato oficial.
   */
  compararConOficial(oficial: PuestoOficial | null, mesa: string | null): void;
  /** Escribe el puesto oficial en los campos (reemplaza lo que había) y lo deja elegido del catálogo. */
  reemplazarPorOficial(oficial: PuestoOficial, mesa: string | null): void;
};

/** El autocompletado del kit (`iswc-combobox`): un input con lista. */
type Combo = HTMLElement & { value: string; open: boolean };

/**
 * El bloque del puesto escrito a mano. `leer()` devuelve el puesto escrito (o `null` si está vacío) y
 * `leerCodigo()` el código del puesto elegido en el catálogo (o `null`): ambos viajan a `POST personas` y
 * `POST personas/{ref}/puesto`.
 *
 * `opciones.catalogo` (por defecto `true`) enciende el buscador del catálogo oficial; en `false` el bloque son
 * solo los campos (lo usa el registro, donde la captura asistida vive en el asistente).
 */
export function bloquePuestoManual(
  inicial: Partial<PuestoManual> & { codigo?: string } = {},
  opciones: { catalogo?: boolean } = {},
): BloquePuestoManual {
  const conCatalogo = opciones.catalogo !== false;
  const caja = document.createElement("section");
  caja.className = "manual";

  /** El código del puesto elegido en el catálogo (viaja como `puestoCodigo`). */
  let codigo = inicial.codigo ?? "";
  /** Los puestos que se están mostrando en el autocompletado (para resolver el código elegido). */
  let mostrados = new Map<string, PuestoCatalogo>();
  /** Los municipios ya cargados (o `null` si aún no se han cargado). */
  let municipios: PuestoMunicipio[] | null = null;
  let cargandoMunicipios = false;

  /** El puesto oficial con el que se compara lo que se escribe (null si todavía no se sabe). */
  let oficialGuardado: PuestoOficial | null = null;
  /** La mesa que dijo la fuente oficial (para el aviso y para el reemplazo). */
  let mesaOficial: string | null = null;
  /** Escribe los campos sin que la comparación se dispare (el reemplazo no es una discrepancia). */
  let escribiendo = false;

  /**
   * Compara lo escrito con lo que dice la fuente oficial. Si no coincide, deja el aviso con la ubicación
   * encontrada y el botón «Reemplazar» (que deja el dato oficial).
   */
  const compararConOficial = (
    oficial: PuestoOficial | null,
    mesa: string | null,
  ): void => {
    oficialGuardado = oficial;
    mesaOficial = mesa;
    panelAviso.hidden = true;
    panelAviso.replaceChildren();
    if (!oficial) return;
    const escrito = {
      nombre: valor(caja, "pm-nombre"),
      municipio: valor(caja, "pm-municipio"),
    };
    if (!escrito.nombre.trim()) return; // no hay nada escrito: no hay nada que advertir
    if (coincideConOficial(escrito, oficial)) {
      avisar(
        "Los datos escritos coinciden con la ubicación oficial.",
        "success",
      );
      return;
    }
    panelAviso.hidden = false;
    panelAviso.replaceChildren(html`
      <iswc-icon icon="mdi:alert-outline"></iswc-icon>
      <span>
        These are not the official data. The Registraduría says: <strong>${oficial
          .nombre}</strong>
        ${oficial.direccion
          ? html`
            — ${oficial.direccion}
          `
          : null}${oficial.municipio
          ? html`
            · ${oficial.municipio}
          `
          : null}${mesa
          ? html`
            · Mesa ${mesa}
          `
          : null}.
      </span>
      <iswc-button size="small" color="brand" data-reemplazar onclick=${() =>
        reemplazarPorOficial(oficial, mesa)}>
        <iswc-icon slot="start" icon="mdi:swap-horizontal"></iswc-icon>Reemplazar
      </iswc-button>
    `);
  };

  /** Escribe el puesto oficial en los campos y lo deja elegido (con su código, para que quede verificado). */
  const reemplazarPorOficial = (
    oficial: PuestoOficial,
    mesa: string | null,
  ): void => {
    fijar({
      nombre: oficial.nombre,
      direccion: oficial.direccion ?? "",
      municipio: oficial.municipio,
      departamento: oficial.departamento ?? "",
      mesa: mesa ?? "",
    });
    codigo = oficial.codigo;
    if (conCatalogo) comboMun.value = oficial.municipio;
    panelAviso.hidden = true;
    panelAviso.replaceChildren();
    avisar(`Puesto oficial: ${oficial.nombre}.`, "success");
  };
  const fijar = (d: Partial<PuestoManual>) => {
    escribiendo = true;
    for (const [k, v] of Object.entries(d)) {
      const campo = caja.querySelector(`[data-campo="pm-${k}"]`) as
        | (HTMLElement & { value?: string })
        | null;
      if (campo && v) campo.value = v;
    }
    escribiendo = false;
  };

  const opcion = (valor: string, etiqueta: string): HTMLElement => {
    const o = document.createElement("iswc-option");
    o.setAttribute("value", valor);
    o.textContent = etiqueta;
    return o;
  };

  /* ── Camino 1: el catálogo oficial ───────────────────────────────────────────── */

  const comboMun = document.createElement("iswc-combobox") as Combo;
  comboMun.setAttribute("data-campo", "pm-mun");
  comboMun.setAttribute("label", "Municipio");
  comboMun.setAttribute("placeholder", "Escribe el municipio");
  comboMun.setAttribute("no-results", "Sin municipios");
  comboMun.setAttribute("clearable", "");

  const comboPuesto = document.createElement("iswc-combobox") as Combo;
  comboPuesto.setAttribute("data-campo", "pm-puesto");
  comboPuesto.setAttribute("label", "Puesto de votación");
  comboPuesto.setAttribute(
    "placeholder",
    "Nombre, dirección o barrio del puesto",
  );
  comboPuesto.setAttribute("no-results", "Sin puestos");
  comboPuesto.setAttribute("clearable", "");

  const conteo = document.createElement("small");
  conteo.className = "nota";
  conteo.setAttribute("data-conteo", "");
  conteo.textContent =
    "Elige el municipio y luego busca el puesto por nombre o dirección.";

  const cargarMunicipios = async (): Promise<void> => {
    if (municipios || cargandoMunicipios) return;
    cargandoMunicipios = true;
    try {
      municipios = await buscarMunicipios();
      comboMun.replaceChildren(
        ...municipios.map((m) =>
          opcion(
            m.municipio,
            [m.municipio, m.departamento].filter(Boolean).join(" · "),
          )
        ),
      );
    } catch {
      avisar(
        "No se pudo cargar el catálogo de municipios: revisa la conexión.",
        "warning",
      );
    } finally {
      cargandoMunicipios = false;
    }
  };

  const buscar = async (texto: string): Promise<void> => {
    try {
      const res = await buscarPuestos(
        texto,
        String(comboMun.value ?? "").trim(),
        20,
      );
      mostrados = new Map(res.map((p) => [p.codigo, p]));
      comboPuesto.replaceChildren(
        ...res.map((p) => opcion(p.codigo, etiquetaPuesto(p))),
      );
      conteo.textContent = res.length
        ? `${res.length} puesto(s) del catálogo oficial.`
        : "Sin puestos en el catálogo oficial con esa búsqueda.";
    } catch {
      conteo.textContent = "No se pudo consultar el catálogo oficial.";
    }
  };

  const tomarPuesto = (p: PuestoCatalogo): void => {
    fijar({
      nombre: p.nombre,
      direccion: p.direccion ?? "",
      municipio: p.municipio,
      departamento: p.departamento ?? "",
    });
    codigo = p.codigo;
    avisar(`Puesto del catálogo oficial: ${p.nombre}.`, "success");
  };

  /** El aviso de discrepancia: la ubicación que encontró la Registraduría y el botón «Reemplazar». */
  const panelAviso = document.createElement("div");
  panelAviso.className = "propuesta aviso";
  panelAviso.setAttribute("data-aviso-oficial", "");
  panelAviso.hidden = true;

  /* ── El bloque ──────────────────────────────────────────────────────────────── */

  caja.append(html`
    ${conCatalogo
      ? html`
        <header class="manual-cabeza">
          <iswc-icon icon="mdi:card-search-outline"></iswc-icon>
          <div><strong>Puesto de votación</strong><small>Elige el puesto del catálogo oficial.</small></div>
        </header>
        <section class="camino" data-panel="catalogo">
          <ol class="pasos">
            <li>${comboMun}</li>
            <li>${comboPuesto}${conteo}</li>
          </ol>
        </section>`
      : null}
    ${panelAviso}
    <div class="campos-puesto">
      <iswc-input data-campo="pm-nombre" label="Puesto de votación"></iswc-input>
      <iswc-input data-campo="pm-direccion"
        label="Dirección del puesto"></iswc-input>
      <iswc-input data-campo="pm-municipio" label="Municipio"
        value="Armenia"></iswc-input>
      <iswc-input data-campo="pm-departamento" label="Departamento"
        value="Quindío"></iswc-input>
      <iswc-input data-campo="pm-mesa" label="Mesa"
        inputmode="numeric"></iswc-input>
    </div>
  `);

  const { codigo: _codigoInicial, ...camposIniciales } = inicial;
  fijar(camposIniciales);
  // El municipio de partida también es el filtro del catálogo.
  if (conCatalogo) comboMun.value = valor(caja, "pm-municipio");

  /* El autocompletado del municipio. */
  let esperaMun = 0;
  comboMun.addEventListener("iswc-show", () => void cargarMunicipios());
  comboMun.addEventListener("iswc-input", (e) => {
    const texto = String(
      (e as CustomEvent<{ value?: string }>).detail?.value ?? "",
    );
    if (texto === comboMun.value) return; // no es escritura: es «elegí una opción»
    clearTimeout(esperaMun);
    esperaMun = setTimeout(() => void cargarMunicipios(), 200);
  });
  comboMun.addEventListener("iswc-change", (e) => {
    const mun = String(
      (e as CustomEvent<{ value?: string }>).detail?.value ?? "",
    ).trim();
    if (!mun) return;
    fijar({ municipio: mun });
    void buscar(""); // los puestos de ese municipio
  });

  /* El autocompletado del puesto. */
  let esperaPuesto = 0;
  comboPuesto.addEventListener("iswc-input", (e) => {
    const texto = String(
      (e as CustomEvent<{ value?: string }>).detail?.value ?? "",
    ).trim();
    if (texto === comboPuesto.value) return; // no es escritura: es «elegí una opción»
    clearTimeout(esperaPuesto);
    esperaPuesto = setTimeout(() => void buscar(texto), 250);
  });
  comboPuesto.addEventListener("iswc-change", (e) => {
    const elegido = String(
      (e as CustomEvent<{ value?: string }>).detail?.value ?? "",
    ).trim();
    if (!elegido) {
      codigo = "";
      return;
    }
    const p = mostrados.get(elegido);
    if (p) tomarPuesto(p);
  });

  /* Si la persona edita lo escrito y hay un puesto oficial conocido, se comprueba si sigue cuadrando: si no,
     se avisa con la ubicación que encontró la Registraduría y se ofrece «Reemplazar». */
  const alEditar = (): void => {
    if (escribiendo || !oficialGuardado) return;
    compararConOficial(oficialGuardado, mesaOficial);
  };
  for (const k of ["nombre", "direccion", "municipio", "mesa"]) {
    const campo = caja.querySelector(`[data-campo="pm-${k}"]`);
    campo?.addEventListener("iswc-input", alEditar);
    campo?.addEventListener("iswc-change", alEditar);
  }

  return {
    nodo: caja,
    leer(): PuestoManual | null {
      const d: PuestoManual = {
        nombre: valor(caja, "pm-nombre"),
        direccion: valor(caja, "pm-direccion"),
        municipio: valor(caja, "pm-municipio"),
        departamento: valor(caja, "pm-departamento"),
        mesa: valor(caja, "pm-mesa"),
      };
      return d.nombre ? d : null;
    },
    leerCodigo(): string | null {
      return codigo ? codigo : null;
    },
    compararConOficial,
    reemplazarPorOficial,
    limpiar(): void {
      for (const k of ["nombre", "direccion", "mesa"]) {
        const campo = caja.querySelector(`[data-campo="pm-${k}"]`) as
          | (HTMLElement & { value?: string })
          | null;
        if (campo) campo.value = "";
      }
      if (conCatalogo) {
        comboMun.value = "";
        comboPuesto.value = "";
        comboPuesto.replaceChildren();
      }
      mostrados = new Map();
      codigo = "";
      panelAviso.hidden = true;
      panelAviso.replaceChildren();
    },
  };
}
