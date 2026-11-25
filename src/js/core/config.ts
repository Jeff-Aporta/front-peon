// @contexto HANDOFF.md §3 (despliegue)
/**
 * config.ts — dónde vive la API en línea (front público en GitHub Pages, API privada en el VPS).
 *
 * Cambio automático de contexto (core/api.ts, `elegirServidor`): se prueba `GET {base}/info` (1,5 s) en este orden
 * y se usa la primera que responda; si una llamada falla por red, se vuelve a elegir.
 *   localhost / 127.0.0.1  → http://localhost:8098/api (local) → la en línea
 *   *.github.io u otro host → la en línea → ./api relativa (nginx del VPS sirve /peon/ y /peon/api/)
 *
 * La en línea es `localStorage['peon:api']` (pruebas) o API_PUBLICA. API_PUBLICA sigue VACÍA hasta que la API tenga
 * dominio con TLS válido (GitHub Pages es https y no puede llamar a http ni a un certificado autofirmado): al
 * publicarla, poner aquí la URL completa terminada en `/api` y nada más cambia.
 */
export const API_PUBLICA = '';

/**
 * Base pública de la app: la MISMA que `iswc.host` de deno.json (GitHub Pages). Las páginas estáticas de la
 * captura asistida (el marcador y su ventana emergente) se publican con esta base; las pruebas vigilan que no se
 * desincronicen.
 */
export const WEB_PUBLICA = 'https://jeff-aporta.github.io/front-peon/';

/** Página del marcador (bookmarklet): se copia el código y se usa en la página de la Registraduría. */
export const URL_MARCADOR = `${WEB_PUBLICA}assets/marcador.html`;

/** Ventana emergente que recibe el texto de la página oficial y lo asigna a una persona. */
export const URL_CAPTURA = `${WEB_PUBLICA}captura.html`;

/** Versión del front (se muestra en Inicio junto a la de la API). */
export const VERSION_FRONT = '0.2.0';

/**
 * Datos públicos de la campaña para la portada (Inicio). Las redes van vacías hasta que el autor dé las direcciones
 * oficiales: una red sin `url` no se pinta (nada de enlaces muertos ni cuentas supuestas).
 */
export const CAMPANA = {
  candidato: 'Fredisney García',
  movimiento: 'La Fuerza del Peón en Marcha',
  lugar: 'Armenia · Quindío',
  lema: 'Nuestra misión es servir, no figurar',
  /**
   * Foto oficial con el fondo quitado (original en `insumos/`; se regenera con `scripts/assets/recorte-candidato.py`).
   * `foto`: retrato sin el logotipo (portada y biografía) · `fotoCompleta`: con el logotipo «Fredisney García» y el
   * lema (piezas descargables). `fotoChica`: retrato liviano (360 px de alto) para pantallas angostas.
   */
  foto: './assets/candidato-retrato.webp',
  fotoChica: './assets/candidato-retrato-360.webp',
  fotoCompleta: './assets/candidato-completo.webp',
  /** Busto (más estrecho, centrado en la cara): el héroe del Inicio, que lo estira a todo su alto. */
  fotoBusto: './assets/candidato-busto.webp',
  fotoBustoChica: './assets/candidato-busto-420.webp',
  redes: [
    { red: 'Facebook', icono: 'mdi:facebook', url: '' },
    { red: 'Instagram', icono: 'mdi:instagram', url: '' },
    { red: 'TikTok', icono: 'mdi:music-note', url: '' },
    { red: 'WhatsApp', icono: 'mdi:whatsapp', url: '' },
    { red: 'YouTube', icono: 'mdi:youtube', url: '' },
  ],
  aviso: 'Plataforma tecnológica privada de organización, gestión y trazabilidad operativa de la campaña. No es una aplicación oficial del Gobierno y no representa a ninguna entidad pública.',
} as const;
