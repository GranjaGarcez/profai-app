// Estrutura do currículo (domínios + descritores) de um ano — para o modo
// personalizado de escolha de AE. Servidor (mantém o currículo fora do cliente).
import { NextRequest, NextResponse } from 'next/server'
import { getCurriculumStructure } from '@/lib/curriculum'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject') ?? ''
  const year = Number(searchParams.get('year') ?? 0)
  if (!subject || !year) {
    return NextResponse.json({ error: 'Faltam disciplina/ano.' }, { status: 400 })
  }
  const structure = getCurriculumStructure(subject, year)
  if (!structure) {
    return NextResponse.json({ domains: [], available: false })
  }
  return NextResponse.json({ ...structure, available: true })
}
