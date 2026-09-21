'use client'
// Folha de respostas otimizada para OCR (aditivo). Gera, em janela própria, uma
// folha impressa com cabeçalho (nome/nº/turma + código da sessão) e zonas de
// resposta estruturadas: bolhas para objetivas, caixas com linhas para escritas.
// Não altera o print existente do teste.
import { getAllQuestions, type TestSnapshot, type Question } from '@/lib/exam/types'
import { useSchoolProfile } from '@/lib/hooks/useSchoolProfile'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function optionLetters(q: Question): string[] {
  if (q.type === 'true_false') return ['V', 'F']
  const n = q.options?.length || 4
  return ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, Math.min(n, 6))
}

function answerZone(q: Question): string {
  if (q.type === 'multiple_choice' || q.type === 'true_false') {
    const bubbles = optionLetters(q).map(l => `<span class="bubble"><span class="o"></span>${l}</span>`).join('')
    return `<div class="bubbles">${bubbles}</div>`
  }
  if (q.type === 'fill_blank') return `<div class="lines">${'<div class="ln"></div>'.repeat(2)}</div>`
  const rows = q.type === 'long_answer' ? 8 : 3
  return `<div class="lines">${'<div class="ln"></div>'.repeat(rows)}</div>`
}

export default function PrintAnswerSheet({
  title, accessCode, snapshot,
}: { title: string; accessCode: string; snapshot: TestSnapshot }) {
  const { profile } = useSchoolProfile()
  function print() {
    const headerImg = profile.headerDataUrl
      ? `<img class="schoolhead" src="${profile.headerDataUrl}" alt="Cabeçalho da escola">`
      : ''
    const qs = getAllQuestions(snapshot)
    const body = qs.map(q => {
      const opts = (q.options?.length && q.type === 'multiple_choice')
        ? `<div class="opts">${q.options.map(o => esc(o)).join(' &nbsp; ')}</div>` : ''
      return `<div class="q">
        <div class="qh"><b>${q.index}.</b> <span class="pts">(${q.points} pt)</span> ${esc(q.text)}</div>
        ${opts}
        ${answerZone(q)}
      </div>`
    }).join('')

    const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
<title>Folha de respostas — ${esc(title)}</title>
<style>
  /* Rodapé de página idêntico em TODAS as páginas: código da prova + numeração.
     Margem inferior maior reservada ao rodapé fixo. */
  @page { size: A4; margin: 14mm 14mm 20mm;
    @bottom-left  { content: "Prova ${esc(accessCode)}"; font: 8pt 'Courier New', monospace; color: #555; }
    @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 8pt Arial, sans-serif; color: #555; }
  }
  * { box-sizing: border-box; }
  body { font: 11pt/1.4 Georgia, 'Times New Roman', serif; color: #111; margin: 0; }
  /* Reforço para navegadores que ignoram as margin-boxes do @page (ex.: Chrome):
     rodapé fixo repetido em cada página impressa. */
  .pagefoot { position: fixed; bottom: 4mm; left: 0; right: 0; display: flex;
    justify-content: space-between; font-size: 8pt; color: #555; padding: 0 2mm; }
  .pagefoot .c { font-family: 'Courier New', monospace; }
  @media screen { .pagefoot { display: none; } }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 6px; }
  .head h1 { font-size: 13pt; margin: 0 0 2px; }
  .head .sub { font-size: 9pt; color: #555; }
  .code { text-align: right; font-family: 'Courier New', monospace; }
  .code .lbl { font-size: 7pt; color: #777; letter-spacing: .5px; }
  .code .val { font-size: 15pt; font-weight: 700; letter-spacing: 2px; border: 2px solid #111; padding: 2px 8px; display: inline-block; }
  .idrow { display: flex; gap: 14px; font-size: 10pt; margin: 8px 0 12px; }
  .idrow .f { flex: 1; border-bottom: 1px solid #111; padding-bottom: 2px; }
  .idrow .f small { color: #777; font-size: 8pt; }
  .q { margin: 0 0 11px; page-break-inside: avoid; }
  .qh { font-size: 10.5pt; }
  .qh .pts { color: #777; font-size: 8.5pt; }
  .opts { font-size: 9.5pt; color: #333; margin: 2px 0 3px 16px; }
  .bubbles { margin: 3px 0 0 16px; display: flex; gap: 16px; }
  .bubble { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; font-size: 10pt; }
  .bubble .o { width: 15px; height: 15px; border: 1.5px solid #111; border-radius: 50%; display: inline-block; }
  .lines { margin: 5px 0 0; }
  .ln { border-bottom: 1px solid #999; height: 18px; }
  .foot { margin-top: 10px; font-size: 7.5pt; color: #999; text-align: center; }
  .schoolhead { display: block; width: 100%; max-height: 40mm; object-fit: contain; margin-bottom: 8px; }
</style></head><body>
  ${headerImg}
  <div class="head">
    <div><h1>${esc(title)}</h1><div class="sub">${esc(snapshot.subject)} · ${snapshot.yearLevel}.º ano · ${snapshot.totalPoints} pontos${snapshot.duration ? ` · ${snapshot.duration} min` : ''}</div></div>
    <div class="code"><div class="lbl">CÓDIGO DA PROVA</div><div class="val">${esc(accessCode)}</div></div>
  </div>
  <div class="idrow">
    <div class="f"><small>Nome</small></div>
    <div class="f" style="max-width:90px"><small>N.º</small></div>
    <div class="f" style="max-width:90px"><small>Turma</small></div>
  </div>
  ${body}
  <div class="foot">Escreve dentro das zonas indicadas e preenche a bolha correta a caneta escura. Não escrevas fora das margens. Entrega TODAS as páginas.</div>
  <div class="pagefoot"><span class="c">Prova ${esc(accessCode)}</span><span>Folha de respostas</span></div>
</body></html>`

    const w = window.open('', '_blank', 'width=800,height=1000')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 350)
  }

  return (
    <button onClick={print}
      className="w-full rounded-2xl border p-3 text-sm font-medium transition-colors"
      style={{ borderColor: '#0D1B2A20', color: '#0D1B2A', background: 'white' }}>
      🖨️ Imprimir folha de respostas (otimizada para OCR)
    </button>
  )
}
