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
  const exitStartRef = useRef<number | null>(null)   // página em 2.º plano (hidden)
  const blurStartRef = useRef<number | null>(null)   // visível mas sem foco (janela por cima/ecrã dividido)

  useEffect(() => {
    if (!active) return

    // Página para 2.º plano / de volta (trocar de app/aba, minimizar, bloquear).
    const onVis = () => {
      if (document.hidden) {
        exitStartRef.current = Date.now()
        blurStartRef.current = null   // um background não conta também como blur
      } else if (exitStartRef.current != null) {
        const durMs = Date.now() - exitStartRef.current
        exitStartRef.current = null
        if (durMs < T.minExitMs) return   // ignora saídas instantâneas (toque acidental)
        eventsRef.current.push({ t: Date.now(), kind: 'exit', durMs })
      }
    }

    // Perda de foco SEM ir a 2.º plano (outra janela por cima, ecrã dividido, pop-up).
    const onBlur = () => { if (!document.hidden) blurStartRef.current = Date.now() }
    const onFocus = () => {
      if (blurStartRef.current == null) return
      const durMs = Date.now() - blurStartRef.current
      blurStartRef.current = null
      if (durMs < T.minExitMs) return
      eventsRef.current.push({ t: Date.now(), kind: 'blur', durMs })
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
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('paste', onPaste)
    document.addEventListener('copy', onCopy)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
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
