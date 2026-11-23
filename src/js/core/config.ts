// @contexto HANDOFF.md §3 (despliegue)
/**
 * config.ts — dónde vive la API cuando el front se sirve desde GitHub Pages (front público, API privada).
 *
 *   localhost con puerto → http://localhost:8098/api   (desarrollo)
 *   *.github.io          → API_PUBLICA                 (cuando la API esté publicada con dominio y TLS válido)
 *   cualquier otro host  → ./api relativo               (nginx del VPS sirve /peon/ y /peon/api/)
 *
 * `localStorage['peon:api']` la fuerza en cualquier caso (pruebas). Mientras API_PUBLICA esté vacía, la app
 * publicada muestra el acceso y avisa que el servidor aún no está publicado.
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
