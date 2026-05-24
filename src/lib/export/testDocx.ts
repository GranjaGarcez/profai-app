import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, HeadingLevel, WidthType, ShadingType,
  convertInchesToTwip, PageBreak,
} from 'docx'
import { saveAs } from 'file-saver'

interface Question {
  index: number
  type: string
  text: string
  options?: string[]
  correctAnswer: string
  points: number
  markScheme?: string
}

interface TestGroup {
  label: string
  description: string
  totalPoints?: number
  questions: Question[]
}

interface TestContent {
  title: string
  subject: string
  yearLevel: number
  topic: string
  difficulty: string
  totalPoints: number
  duration?: number
  instructions?: string
  groups?: TestGroup[]
  questions?: Question[]
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Fácil', medium: 'Média', hard: 'Difícil',
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Escolha múltipla',
  true_false: 'Verdadeiro / Falso',
  short_answer: 'Resposta curta',
  long_answer: 'Resposta longa',
  fill_blank: 'Completar espaços',
}

function emptyLine(size = 240): Paragraph {
  return new Paragraph({ spacing: { before: size, after: 0 } })
}

function answerLine(): Paragraph {
  return new Paragraph({
    border: { bottom: { color: '888888', size: 6, style: BorderStyle.SINGLE, space: 1 } },
    spacing: { before: 240, after: 120 },
  })
}

function getGroups(test: TestContent): TestGroup[] {
  if (test.groups && test.groups.length > 0) return test.groups
  return [{ label: '', description: '', questions: test.questions ?? [] }]
}

export async function generateTestDocx(test: TestContent) {
  const groups = getGroups(test)
  const questions: Question[] = groups.flatMap(g => g.questions)
  const difficulty = DIFFICULTY_LABEL[test.difficulty] ?? test.difficulty

  const children: Paragraph[] = []

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Agrupamento de Escolas  ___________________________', size: 20, color: '555555' })],
    }),
    emptyLine(120),
    new Paragraph({
      children: [
        new TextRun({ text: test.title, bold: true, size: 32, font: 'Georgia', color: '0D1B2A' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${test.subject}  ·  ${test.yearLevel}.º ano  ·  Ano lectivo 2025/2026`, size: 20, color: '555555' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  )

  // Dados do aluno
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Nome: ___________________________________________________   N.º: ______   Turma: ______', size: 22 }),
      ],
      spacing: { before: 160, after: 160 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Data: _____ / _____ / _______   ', size: 22 }),
        new TextRun({ text: 'Classificação: |_____________|', size: 22 }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Instruções: ${test.instructions ?? `Lê atentamente todas as questões. A prova vale ${test.totalPoints} pontos. Não é permitido o uso de corretor. Dificuldade: ${difficulty}.`}`,
          size: 18, italics: true, color: '555555',
        }),
      ],
      spacing: { before: 160, after: 320 },
    }),
  )

  // Linha separadora
  children.push(
    new Paragraph({
      border: { bottom: { color: '0D1B2A', size: 12, style: BorderStyle.SINGLE, space: 1 } },
      spacing: { after: 320 },
    }),
  )

  // ── Grupos e perguntas ─────────────────────────────────────────────────────
  let globalIndex = 0
  groups.forEach(group => {
    // Cabeçalho do grupo
    if (group.label) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: group.label, bold: true, size: 26, font: 'Georgia', color: '0D1B2A' }),
            group.description ? new TextRun({ text: `  —  ${group.description}`, size: 20, color: '555555' }) : new TextRun({ text: '' }),
          ],
          border: { bottom: { color: '0D1B2A', size: 6, style: BorderStyle.SINGLE, space: 1 } },
          spacing: { before: 400, after: 240 },
        }),
      )
    }

    group.questions.forEach((q) => {
    globalIndex++
    const i = globalIndex - 1
    const typeLabel = TYPE_LABEL[q.type] ?? q.type

    // Enunciado
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${globalIndex}. `, bold: true, size: 24, color: '0D1B2A' }),
          new TextRun({ text: `[${typeLabel} — ${q.points} pontos]  `, size: 18, color: '888888', italics: true }),
          new TextRun({ text: q.text, size: 22, color: '0D1B2A' }),
        ],
        spacing: { before: 320, after: 160 },
      }),
    )

    // Opções
    if (q.options && q.options.length > 0) {
      q.options.forEach(opt => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `○  ${opt}`, size: 22 })],
            indent: { left: convertInchesToTwip(0.4) },
            spacing: { before: 80, after: 80 },
          }),
        )
      })
      children.push(emptyLine(80))
    } else {
      // Linhas de resposta
      const numLines = q.type === 'long_answer' ? 6 : q.type === 'short_answer' ? 3 : 2
      for (let l = 0; l < numLines; l++) {
        children.push(answerLine())
      }
    }

    // Corrigenda — incluída em secção separada abaixo
    void i
  }) // fim group.questions.forEach
  }) // fim groups.forEach

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      border: { top: { color: 'CCCCCC', size: 6, style: BorderStyle.SINGLE, space: 1 } },
      spacing: { before: 400, after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `PROF.IA  ·  Gerado por IA — rever antes de distribuir  ·  Total: ${test.totalPoints} pontos  ·  ${questions.length} questões`, size: 16, color: '999999', italics: true }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  )

  // ── Corrigenda (página separada) ───────────────────────────────────────────
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      children: [new TextRun({ text: 'CORRIGENDA', bold: true, size: 28, color: '0D1B2A', font: 'Georgia' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: test.title, size: 20, color: '555555', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  )

  questions.forEach((q, i) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 22, color: '0D1B2A' }),
          new TextRun({ text: q.text.substring(0, 90) + (q.text.length > 90 ? '...' : ''), size: 20, color: '555555' }),
        ],
        spacing: { before: 240, after: 60 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '✓  Resposta: ', bold: true, size: 20, color: '065f46' }),
          new TextRun({ text: q.correctAnswer, size: 20, color: '065f46' }),
        ],
        indent: { left: convertInchesToTwip(0.3) },
        spacing: { after: 60 },
      }),
    )
    if (q.markScheme) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Critérios: ', bold: true, size: 18, color: '374151' }),
            new TextRun({ text: q.markScheme, size: 18, color: '374151' }),
          ],
          indent: { left: convertInchesToTwip(0.3) },
          spacing: { after: 80 },
        }),
      )
    }
  })

  // ── Gerar ficheiro ─────────────────────────────────────────────────────────
  const doc = new Document({
    creator: 'PROF.IA',
    title: test.title,
    description: `Teste de ${test.subject} — ${test.topic}`,
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1.2),
          },
        },
      },
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${test.title.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim()}.docx`
  saveAs(blob, filename)
}
