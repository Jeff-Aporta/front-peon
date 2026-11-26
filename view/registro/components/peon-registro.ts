// @contexto PROMPT-CLAUDE.md §4 (vista 3 · Registro) · §6.6 (puesto de votación)
/**
 * <peon-registro> — una sola pantalla: cédula (máscara de dígitos) → el puesto se consulta SOLO al terminar de
 * escribirla → datos básicos → guardar. Si la fuente no responde, se guarda igual con «pendiente» (lo verificamos
 * después). Si la fuente no lo resuelve (con la fuente `manual`, nunca), aparece la CONSULTA ASISTIDA: copiar cédula y
 * abrir la Registraduría, pegar el resultado (se lee solo) y guardar con el registro. Pestañas: Nueva persona · Consultar puesto.
 */
import { define } from "@jeff-aporta/iswc-base/core/iswc-element.min.mjs";
import css from "iswc:css";
import { avisar, Componente, html } from "../../../src/js/base/componente.js";
import type { VistaProps } from "../../../src/js/consts/schemas/componentes.schemas.js";
import type { ResultadoPuesto } from "../../../src/js/consts/schemas/api.schemas.js";
import { api } from "../../../src/js/core/api.js";
import { grupoPestanas } from "../../../src/js/core/pestanas.js";
import {
  bloquePuestoManual,
  URL_REGISTRADURIA,
} from "../../../src/js/core/puesto-manual.js";
import {
  abrirFicha,
  marcado,
  tarjetaPuesto,
  textoError,
  valor,
} from "../../../src/js/core/ui.js";
import { coincideConOficial } from "../../../src/js/core/puestos.js";

class PeonRegistro extends Componente<VistaProps> {
  static tag = "peon-registro";
  static css = css;
  static deps = [
    "iswc-tab-group",
    "iswc-masked-input",
    "iswc-input",
    "iswc-textarea",
    "iswc-checkbox",
    "iswc-button",
    "iswc-callout",
    "iswc-spinner",
    "iswc-tag",
    "iswc-icon",
    "iswc-combobox",
    "iswc-option",
  ];

  #ultima = "";
  #resultado: ResultadoPuesto | null = null;
  #alResultado: ((r: ResultadoPuesto | null) => void) | null = null;

  protected override inicial(): VistaProps {
    return { pestana: "" };
  }

  /**
   * La búsqueda automática: al terminar de escribir la cédula, se va a la página oficial AHORA (sin caché) y se
   * espera el puesto. Mientras dura, la tarjeta lo dice; cuando llega, el dato oficial **reemplaza** lo que había.
   */
  async #consultar(
    caja: HTMLElement,
    destino: HTMLElement,
    forzar = true,
  ): Promise<void> {
    const cedula = valor(caja, "cedula").replace(/\D/g, "");
    if (cedula.length < 6 || (cedula === this.#ultima && !forzar)) return;
    this.#ultima = cedula;
    destino.replaceChildren(tarjetaPuesto(null, true));
    try {
      this.#resultado = await api<ResultadoPuesto>("POST", "puesto/consulta", {
        cedula,
        forzar,
      });
      if (cedula === this.#ultima) {
        destino.replaceChildren(tarjetaPuesto(this.#resultado));
        this.#alResultado?.(this.#resultado);
      }
    } catch (e) {
      destino.replaceChildren(
        html`<iswc-callout color="danger">${textoError(e)}</iswc-callout>`,
      );
    }
  }

  async #guardar(
    caja: HTMLElement,
    boton: HTMLElement,
    destino: HTMLElement,
    manual: ReturnType<typeof bloquePuestoManual>,
  ): Promise<void> {
    const cedula = valor(caja, "cedula").replace(/\D/g, "");
    const datos = {
      cedula,
      nombres: valor(caja, "nombres"),
      apellidos: valor(caja, "apellidos"),
      celular: valor(caja, "celular").replace(/\D/g, ""),
      email: valor(caja, "email"),
      direccion: valor(caja, "direccion"),
      barrio: valor(caja, "barrio"),
      municipio: valor(caja, "municipio") || "Armenia",
      consentimiento: marcado(caja, "consentimiento"),
      puestoManual: manual.nodo.hidden ? null : manual.leer(),
      // El código del puesto elegido en el catálogo oficial: si llega, la API lo toma del catálogo (queda verificado).
      puestoCodigo: manual.leerCodigo(),
    };
    if (cedula.length < 5) return avisar("Escribe la cédula", "warning");
    if (!datos.nombres || !datos.apellidos) {
      return avisar("Nombres y apellidos son obligatorios", "warning");
    }
    if (!datos.consentimiento) {
      return avisar(
        "La persona debe autorizar el tratamiento de sus datos",
        "warning",
      );
    }
    boton.setAttribute("loading", "");
    try {
      const r = await api<
        {
          persona: { ref: string; puesto_estado: string };
          puesto: ResultadoPuesto;
        }
      >("POST", "personas", datos);
      avisar(
        r.persona.puesto_estado === "verificado"
          ? "Persona registrada con su puesto verificado."
          : "Persona registrada. El puesto lo verificamos después.",
        r.persona.puesto_estado === "verificado" ? "success" : "warning",
      );
      for (
        const campo of caja.querySelectorAll<HTMLElement & { value: string }>(
          "[data-campo]",
        )
      ) {
        if (
          campo.dataset.campo !== "municipio" &&
          !campo.dataset.campo?.startsWith("pm-")
        ) campo.value = "";
      }
      manual.limpiar();
      manual.nodo.hidden = true;
      const check = caja.querySelector<HTMLElement & { checked: boolean }>(
        '[data-campo="consentimiento"]',
      );
      if (check) check.checked = false;
      this.#ultima = "";
      destino.replaceChildren(tarjetaPuesto(null));
      const ultimo = caja.querySelector("[data-ultimo]");
      ultimo?.replaceChildren(html`
        <iswc-button variant="text"
          onclick=${() =>
            abrirFicha(
              r.persona.ref,
            )}><iswc-icon slot="start" icon="mdi:card-account-details-outline"></iswc-icon>Ver la ficha del último registro</iswc-button>
      `);
      caja.querySelector<HTMLElement>('[data-campo="cedula"]')?.focus();
    } catch (e) {
      avisar(textoError(e), "danger");
    } finally {
      boton.removeAttribute("loading");
    }
  }

  #formulario(): Node {
    const caja = document.createElement("form");
    caja.className = "formulario";
    caja.addEventListener("submit", (e) => e.preventDefault());
    const puesto = document.createElement("div");
    puesto.append(tarjetaPuesto(null));
    const manual = bloquePuestoManual(() => valor(caja, "cedula"));
    manual.nodo.hidden = true;
    // La búsqueda automática: si la fuente resuelve el puesto, **el dato oficial reemplaza** lo que hubiera escrito
    // la persona. Si no lo resuelve, se abre la consulta asistida para escribirlo a mano.
    this.#alResultado = (r) => {
      const oficial = r && r.estado === "verificado" && r.puesto
        ? r.puesto
        : null;
      if (r && oficial) {
        // Lo que había escrito la persona (si algo): si no es el puesto oficial, se dice que se reemplazó.
        const antes = manual.leer();
        const cambio = !!antes?.nombre.trim() &&
          !coincideConOficial(antes, oficial);
        manual.reemplazarPorOficial(oficial, r.mesa);
        avisar(
          cambio
            ? `Puesto de votación encontrado automáticamente: ${oficial.nombre} (se reemplazó lo que estaba escrito).`
            : `Puesto de votación encontrado automáticamente: ${oficial.nombre}.`,
          "success",
        );
        manual.nodo.hidden = true;
        return;
      }
      manual.nodo.hidden = !r || r.estado === "verificado";
    };
    // Se consulta al **terminar** de escribir la cédula (no mientras se teclea): la página oficial deja pasar ~1
    // consulta por minuto, así que consultar a cada tecla gastaría la cuota de la primera cifra.
    const alTerminar = () => void this.#consultar(caja, puesto);
    caja.append(html`
      <section class="bloque">
        <h2>1 · Cédula y puesto de votación</h2>
        <div class="fila-cedula">
          <iswc-masked-input data-campo="cedula" label="Cédula" pattern="000000999999" placeholder="Solo números" inputmode="numeric" required oniswc-enter=${alTerminar}></iswc-masked-input>
          ${puesto}
        </div>
        <p class="nota">Al terminar de escribir la cédula, el puesto se busca solo en la página de la Registraduría. Si no aparece, escríbelo a mano o búscalo en el catálogo oficial.</p>
        <button type="button" class="enlace" data-mostrar-manual onclick=${() => {
          manual.nodo.hidden = !manual.nodo.hidden;
        }}><iswc-icon icon="mdi:pencil-outline"></iswc-icon> Buscar el puesto en el catálogo o escribirlo a mano</button>
        ${manual.nodo}
      </section>
      <section class="bloque">
        <h2>2 · Datos básicos</h2>
        <div class="rejilla">
          <iswc-input data-campo="nombres" label="Nombres" required
            autocomplete="off"></iswc-input>
          <iswc-input data-campo="apellidos" label="Apellidos" required
            autocomplete="off"></iswc-input>
          <iswc-input data-campo="celular" label="Celular" type="tel" inputmode="tel"
            autocomplete="off"></iswc-input>
          <iswc-input data-campo="email" label="Correo" type="email"
            autocomplete="off"></iswc-input>
          <iswc-input data-campo="municipio" label="Municipio"
            value="Armenia"></iswc-input>
          <iswc-input data-campo="barrio" label="Barrio"></iswc-input>
          <iswc-input class="ancho" data-campo="direccion"
            label="Dirección"></iswc-input>
        </div>
        <iswc-checkbox
          data-campo="consentimiento">La persona autoriza el tratamiento de sus datos personales (Ley 1581 de 2012).</iswc-checkbox>
      </section>
      <div class="acciones">
        <iswc-button data-guardar color="brand"
          onclick=${(e: Event) =>
            void this.#guardar(
              caja,
              e.currentTarget as HTMLElement,
              puesto,
              manual,
            )}><iswc-icon slot="start" icon="mdi:content-save-outline"></iswc-icon>Guardar registro</iswc-button>
        <span data-ultimo></span>
      </div>
    `);
    // El listener va DESPUÉS de armar el formulario: antes, el campo todavía no estaba en el DOM y la consulta
    // automática nunca se disparaba.
    const campoCedula = caja.querySelector<HTMLElement>(
      '[data-campo="cedula"]',
    );
    // «focusout» (al salir del campo) y «iswc-change» (cuando la persona confirma): los dos caminos.
    campoCedula?.addEventListener("focusout", alTerminar);
    campoCedula?.addEventListener("iswc-change", alTerminar);
    return caja;
  }

  #consulta(): Node {
    const caja = document.createElement("div");
    caja.className = "caja";
    const puesto = document.createElement("div");
    puesto.append(tarjetaPuesto(null));
    caja.append(html`
      <p
        class="nota">Consulta el puesto de votación de una cédula sin registrarla. Cada cédula se consulta una vez y queda en caché 7 días. Si no aparece, búscala en la <a href=${URL_REGISTRADURIA} target="_blank" rel="noopener noreferrer">página de la Registraduría</a>.</p>
      <div class="fila-cedula">
        <iswc-masked-input data-campo="cedula" label="Cédula" pattern="000000999999"
          inputmode="numeric" oniswc-enter=${() =>
            void this.#consultar(caja, puesto, true)}></iswc-masked-input>
        <iswc-button color="brand"
          onclick=${() =>
            void this.#consultar(
              caja,
              puesto,
              true,
            )}><iswc-icon slot="start" icon="mdi:magnify"></iswc-icon>Consultar</iswc-button>
      </div>
      ${puesto}
    `);
    return caja;
  }

  protected override pintar(root: ShadowRoot, props: VistaProps): void {
    root.append(
      grupoPestanas(
        "registro",
        props.pestana,
        (p) => (p === "consulta" ? this.#consulta() : this.#formulario()),
      ),
    );
  }
}

define(PeonRegistro);
