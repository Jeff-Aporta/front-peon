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
