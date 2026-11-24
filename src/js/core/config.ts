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
  /** Foto del candidato con el fondo quitado (`assets/candidato-*.webp`); vacía hasta que lleguen los insumos. */
  foto: '',
  redes: [
    { red: 'Facebook', icono: 'mdi:facebook', url: '' },
    { red: 'Instagram', icono: 'mdi:instagram', url: '' },
    { red: 'TikTok', icono: 'mdi:music-note', url: '' },
    { red: 'WhatsApp', icono: 'mdi:whatsapp', url: '' },
    { red: 'YouTube', icono: 'mdi:youtube', url: '' },
  ],
  aviso: 'Plataforma tecnológica privada de organización, gestión y trazabilidad operativa de la campaña. No es una aplicación oficial del Gobierno y no representa a ninguna entidad pública.',
} as const;
