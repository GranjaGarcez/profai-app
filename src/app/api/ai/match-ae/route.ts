// Emparelhamento por IA: dado disciplina+ano+tópico do professor, seleciona,
// entre os descritores OFICIAIS já existentes, os que caem dentro do tema.
// Não inventa — só escolhe de uma lista fechada. Usado pelo modo personalizado.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurriculumStructure } from '@/lib/curriculum'
import { geminiProviders, callOpenAICompat, parseJsonObject } from '@/lib/ai/cascade'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { subject, yearLevel, topic } = await request.json() as { subject?: string; yearLevel?: number; topic?: string }
  if (!subject || !yearLevel || !topic?.trim()) {
    return NextResponse.json({ error: 'Faltam disciplina, ano ou tópico.' }, { status: 400 })
  }
  const structure = getCurriculumStructure(subject, yearLevel)
  if (!structure) return NextResponse.json({ matched: [], available: false })

  // Lista plana e numerada de todos os descritores do ano.
  const flat: Array<{ id: number; domain: string; text: string }> = []
  structure.domains.forEach(d => d.descriptors.forEach(t => flat.push({ id: flat.length, domain: d.name, text: t })))
  if (!flat.length) return NextResponse.json({ matched: [], available: false })

  const list = flat.map(f => `${f.id}. [${f.domain}] ${f.text}`).join('\n')
  const prompt = `És um especialista em ${subject} do ${yearLevel}.º ano (Aprendizagens Essenciais, DGE). O professor quer um teste sobre o tópico: "${topic}".

Abaixo está a lista NUMERADA de descritores oficiais das AE deste ano. Seleciona APENAS os que fazem parte, direta e pedagogicamente, do tópico pedido — nem mais (não incluas descritores só vagamente relacionados), nem menos (não deixes de fora nenhum que pertença ao tópico). Não inventes descritores; escolhe só desta lista.

DESCRITORES:
${list}

Responde APENAS com JSON válido: {"matched":[<números dos descritores do tópico>],"nota":"<1 frase PT-PT, opcional>"}`

  for (const p of geminiProviders()) {
    const text = await callOpenAICompat(
      p.url, p.key, p.model, prompt, 20_000, `MatchAE:${p.label}`, p.headers ?? {},
      'Selecionas descritores de uma lista fechada. Só JSON válido.', 800, p.extraBody,
    )
    const parsed = text ? parseJsonObject(text) as { matched?: unknown; nota?: unknown } | null : null
    if (!parsed || !Array.isArray(parsed.matched)) continue
    const ids = parsed.matched.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < flat.length)
    const matched = [...new Set(ids)].map(id => ({ domain: flat[id].domain, text: flat[id].text }))
    return NextResponse.json({ matched, nota: typeof parsed.nota === 'string' ? parsed.nota : '', available: true })
  }
  return NextResponse.json({ error: 'Não foi possível emparelhar agora. Tenta novamente.' }, { status: 502 })
}
