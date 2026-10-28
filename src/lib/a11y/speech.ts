// Leitura por voz (text-to-speech) — usa a API nativa do browser (speechSynthesis).
// Gratuita, sem servidor, offline. A voz pt-PT depende das vozes instaladas no
// dispositivo; se não houver, usa a predefinida com lang="pt-PT". Medida de inclusão.

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeaking(): void {
  try { window.speechSynthesis?.cancel() } catch { /* noop */ }
}

// Lê o texto em voz alta. Devolve false se o browser não suportar.
export function speak(text: string, lang = 'pt-PT'): boolean {
  try {
    const synth = window.speechSynthesis
    if (!synth || !text.trim()) return false
    synth.cancel()   // não sobrepor leituras
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.95
    const voices = synth.getVoices?.() ?? []
    const pt = voices.find(v => v.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()))
    if (pt) u.voice = pt
    synth.speak(u)
    return true
  } catch { return false }
}

// ── Ditado por voz (speech-to-text) — API nativa do browser, gratuita ──────────
// A fiabilidade em pt-PT varia por dispositivo; o aluno deve rever a transcrição.
interface MinRecognition {
  lang: string; interimResults: boolean; continuous: boolean
  start(): void; stop(): void
  onresult: ((e: unknown) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

export function dictationAvailable(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as Record<string, unknown>
  return 'SpeechRecognition' in w || 'webkitSpeechRecognition' in w
}

// Inicia o ditado. Chama onText com cada troço reconhecido e onEnd no fim.
// Devolve uma função para parar, ou null se não houver suporte.
export function startDictation(onText: (t: string) => void, onEnd: () => void, lang = 'pt-PT'): (() => void) | null {
  try {
    const w = window as unknown as { SpeechRecognition?: new () => MinRecognition; webkitSpeechRecognition?: new () => MinRecognition }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return null
    const rec = new Ctor()
    rec.lang = lang; rec.interimResults = false; rec.continuous = false
    rec.onresult = (e: unknown) => {
      const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> }
      let t = ''
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0]?.transcript ?? ''
      if (t.trim()) onText(t.trim())
    }
    rec.onerror = () => { /* silencioso */ }
    rec.onend = () => onEnd()
    rec.start()
    return () => { try { rec.stop() } catch { /* noop */ } }
  } catch { return null }
}
