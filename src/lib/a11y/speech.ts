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
