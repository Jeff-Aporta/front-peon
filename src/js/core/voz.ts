// @contexto HANDOFF.md §2b punto 5 · core/puesto-manual.ts (dictado)
/**
 * voz.ts — reconocimiento de voz del navegador (Web Speech API, es-CO), compartido por el dictado del puesto y por
 * las notas de voz del chat. Si el navegador no lo trae (`Dictado` = undefined), quien lo usa lo avisa o lo oculta.
 * Las notas de voz se graban con `<iswc-media-recorder source="mic">` del kit; esto solo transcribe.
 */
export type Reconocimiento = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { resultIndex?: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export const Dictado = (globalThis as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento }).SpeechRecognition ??
  (globalThis as { webkitSpeechRecognition?: new () => Reconocimiento }).webkitSpeechRecognition;

/** Mensaje legible de un error del reconocimiento. */
export const errorVoz = (e: string): string => (e === 'not-allowed' || e === 'service-not-allowed' ? 'permite el micrófono' : e === 'no-speech' ? 'no se oyó nada' : e === 'network' ? 'sin conexión con el servicio de voz' : e);

/**
 * Escucha en continuo y va entregando lo dicho (`alOir` con el texto acumulado, parcial incluido).
 * Devuelve `parar()` y `fin` (ambos resuelven con el texto final; `fin` también si el navegador corta solo).
 * `null` si el navegador no transcribe.
 */
export function escucharVoz(alOir: (texto: string) => void = () => {}, alError: (msg: string) => void = () => {}): { parar(): Promise<string>; fin: Promise<string> } | null {
  if (!Dictado) return null;
  const rec = new Dictado();
  rec.lang = 'es-CO';
  rec.interimResults = true;
  rec.continuous = true;
  let texto = '';
  let fin: (t: string) => void = () => {};
  const terminado = new Promise<string>((ok) => (fin = ok));
  rec.onresult = (e) => {
    texto = Array.from(e.results).map((r) => r[0]?.transcript ?? '').join(' ').replace(/\s+/g, ' ').trim();
    alOir(texto);
  };
  rec.onerror = (e) => alError(errorVoz(e.error));
  rec.onend = () => fin(texto);
  try {
    rec.start();
  } catch {
    return null;
  }
  return {
    fin: terminado,
    parar() {
      try {
        rec.stop();
      } catch { /* ya terminó */ }
      return terminado;
    },
  };
}
