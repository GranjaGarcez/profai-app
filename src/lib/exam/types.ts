// ── Tipos partilhados do sistema de exames ────────────────────────────────────

export interface CalcEntry {
  expr: string    // expressão calculada, ex: "sin(30)", "3.14 × 4²"
  result: string  // resultado, ex: "0.5", "50.24"
}

export interface Question {
  index: number
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'long_answer' | 'fill_blank'
  text: string
  figure?: unknown
  options?: string[]
  correctAnswer: string
  points: number
  markScheme?: string
  bloomLevel?: string
  allowCalculator?: boolean   // IA define; professor pode sobrepor
  illustration?: string       // imagem/ilustração (data URL base64 ou URL) — Estúdio de Imagens / upload
  illustrationCredit?: string // atribuição (quando vem de pesquisa, ex.: Wikimedia)
  // Histórico de critérios editados num exame já lançado (aditivo, reversível).
  // Cada entrada guarda a corrigenda ANTERIOR à edição — nunca se perde o original.
  _criteriaHistory?: Array<{ at: string; correctAnswer: string; markScheme?: string; bloomLevel?: string }>
}

export interface TestGroup {
  label: string
  description: string
  totalPoints?: number
  questions: Question[]
}

export interface TestSnapshot {
  title: string
  subject: string
  yearLevel: number
  topic: string
  totalPoints: number
  duration?: number
  instructions?: string
  groups?: TestGroup[]
  questions?: Question[]
  // Tradução para alunos LPNM (Fase 1 — só visualização; controlada pelo professor).
  _allowTranslation?: boolean
  // Ajudas de voz (ouvir a pergunta, responder por voz) — desligadas por defeito; o
  // professor liga-as por exame. O tamanho da letra e a legibilidade estão sempre.
  _allowAids?: boolean
  // Cache de traduções por língua → índice da questão → enunciado/opções traduzidos.
  // NÃO é enviado ao aluno no fetch público (só via /api/exam/translate).
  _translations?: Record<string, Record<string, { text: string; options?: string[] }>>
}

export interface ExamSession {
  id: string
  teacher_id: string
  content_item_id: string | null
  access_code: string
  title: string
  status: 'active' | 'closed'
  duration_minutes: number | null
  test_snapshot: TestSnapshot
  created_at: string
  closed_at: string | null
}

export interface RubricCriterion {
  criterion: string
  score: number
  max: number
}

export interface GradingDetail {
  score: number
  max: number
  feedback: string
  auto: boolean          // true = automático (MCQ/TF) ou IA; false = NÃO automático
  manual?: boolean       // true = cotação definida à mão pelo prof (≠ falha da IA, que também põe auto:false)
  rev?: number           // nº de revisões manuais desta pergunta (cada gravação à mão incrementa)
  overrodeManual?: boolean // true = esta correcção da IA SUBSTITUIU uma revisão manual (a pedido do prof)
  prevManual?: { score: number; feedback?: string } // cópia da revisão manual substituída — nada se perde (reversível)
  teacherComment?: string            // comentário do professor a esta resposta (visível ao aluno); não mexe na nota
  highlight?: 'exemplar' | 'falha'   // destaque: resposta exemplar, ou falha reveladora (pedagógico)
  ai_confidence?: number // 0-1, só para open answers
  rubric?: RubricCriterion[] // só em long_answer — decomposição por critério
}

export interface ExamSubmission {
  id: string
  session_id: string
  student_name: string
  student_number: string | null
  student_class: string | null
  student_year?: number | null
  answers: Record<string, string>         // { "1": "A", "2": "texto..." }
  total_score: number | null
  max_score: number | null
  status: 'submitted' | 'grading' | 'graded' | 'reviewed' | 'por_corrigir'
  grading_details: Record<string, GradingDetail> | null
  teacher_notes: string | null
  submitted_at: string
  graded_at: string | null
  // ── Correção de provas em papel (aditivo) ──
  source?: 'digital' | 'paper'
  ocr_details?: Record<string, { text: string; confidence: number; illegible: boolean; notes?: string }> | null
  writing_analysis?: {
    errors: Array<{ questionIndex: number; wrong: string; correct: string; type: string }>
    counts: Record<string, number>
    total: number
    summary: string
  } | null
}

/** Extrai todas as questões de um TestSnapshot (suporta groups[] e questions[]) */
export function getAllQuestions(snapshot: TestSnapshot): Question[] {
  if (snapshot.groups && snapshot.groups.length > 0) {
    return snapshot.groups.flatMap(g => g.questions)
  }
  return snapshot.questions ?? []
}
