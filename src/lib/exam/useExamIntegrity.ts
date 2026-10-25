'use client'

// Sinais ao vivo de integridade, captados NO DISPOSITIVO do aluno durante a prova.
// Só regista o que o browser consegue mesmo ver dentro da sua própria página:
//   • saídas do ecrã do teste (trocar de aba/app, minimizar) — com duração;
//   • colagens de texto com substância numa resposta (indício de cópia da net);
//   • cópias de texto do teste.
// NÃO vê (nem pode): SMS, histórico do telemóvel, outras apps, um 2.º aparelho.
//
// Por decisão pedagógica: NÃO bloqueia nem suspende o aluno, NÃO o avisa a meio.
// Apenas regista em silêncio e anexa à entrega — o professor vê e DECIDE (a
// anulação é sempre humana). O aluno é avisado à partida de que isto é registado.
import { useCallback, useEffect, useRef } from 'react'
import { INTEGRITY_THRESHOLDS as T, type IntegrityEvent, type IntegrityRecord } from './integrity'

export function useExamIntegrity(active: boolean) {
  const eventsRef = useRef<IntegrityEvent[]>([])
  const exitStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return

    const onVis = () => {
      if (document.hidden) {
        exitStartRef.current = Date.now()
      } else if (exitStartRef.current != null) {
        const durMs = Date.now() - exitStartRef.current
        exitStartRef.current = null
        if (durMs < T.minExitMs) return   // ignora saídas instantâneas (toque acidental)
        eventsRef.current.push({ t: Date.now(), kind: 'exit', durMs })
      }
    }

    const onPaste = (ev: ClipboardEvent) => {
      const text = ev.clipboardData?.getData('text') ?? ''
      if (text.trim().length < T.substantialPasteLen) return
      const el = ev.target as HTMLElement | null
      const qKey = el?.getAttribute?.('data-qkey') ?? undefined
      eventsRef.current.push({ t: Date.now(), kind: 'paste', qKey, info: text.trim().slice(0, 80) })
    }

    const onCopy = () => { eventsRef.current.push({ t: Date.now(), kind: 'copy' }) }

    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('paste', onPaste)
    document.addEventListener('copy', onCopy)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('copy', onCopy)
    }
  }, [active])

  // Registo para anexar à submissão. null quando não há nada a registar (aluno
  // honesto) — para não encher a base de dados de registos vazios.
  const payload = useCallback((): IntegrityRecord | null => {
    if (eventsRef.current.length === 0) return null
    return { v: 1, events: eventsRef.current.slice() }
  }, [])

  return { payload }
}
