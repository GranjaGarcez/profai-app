// ── Tipos partilhados do sistema de exames ────────────────────────────────────

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

export interface GradingDetail {
  score: number
  max: number
  feedback: string
  auto: boolean          // true = automático (MCQ/TF) ou IA; false = manual do prof
  ai_confidence?: number // 0-1, só para open answers
}

export interface ExamSubmission {
  id: string
  session_id: string
  student_name: string
  student_number: string | null
  student_class: string | null
  answers: Record<string, string>         // { "1": "A", "2": "texto..." }
  total_score: number | null
  max_score: number | null
  status: 'submitted' | 'grading' | 'graded' | 'reviewed'
  grading_details: Record<string, GradingDetail> | null
  teacher_notes: string | null
  submitted_at: string
  graded_at: string | null
}

/** Extrai todas as questões de um TestSnapshot (suporta groups[] e questions[]) */
export function getAllQuestions(snapshot: TestSnapshot): Question[] {
  if (snapshot.groups && snapshot.groups.length > 0) {
    return snapshot.groups.flatMap(g => g.questions)
  }
  return snapshot.questions ?? []
}
