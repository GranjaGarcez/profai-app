// Disciplinas disponíveis por ciclo/ano de escolaridade.
// O menu adapta-se ao ano escolhido (ex.: 1.º ciclo mostra Estudo do Meio,
// não Ciências Naturais). Cidadania e Desenvolvimento é transversal a todos.

const CIDADANIA = 'Cidadania e Desenvolvimento'

const PRIMEIRO = [ // 1.º–4.º
  'Português', 'Matemática', 'Estudo do Meio', 'Inglês', 'Educação Física', CIDADANIA,
]
const SEGUNDO = [ // 5.º–6.º
  'Português', 'Matemática', 'Ciências Naturais', 'História e Geografia de Portugal',
  'Inglês', 'Educação Visual', 'Educação Tecnológica', 'Educação Musical', 'Educação Física', CIDADANIA,
]
const TERCEIRO = [ // 7.º–9.º
  'Português', 'Matemática', 'Ciências Naturais', 'Físico-Química', 'História', 'Geografia',
  'Inglês', 'Espanhol', 'Francês', 'Educação Visual', 'Educação Tecnológica', 'Educação Musical',
  'Educação Física', 'TIC', CIDADANIA,
]
const SECUNDARIO = [ // 10.º–12.º
  'Português', 'Matemática A', 'Inglês', 'História A', 'Geografia', 'Biologia e Geologia',
  'Física e Química A', 'Filosofia', 'Espanhol', 'Francês', CIDADANIA,
]

export function subjectsForYear(year: number): string[] {
  if (year <= 4) return PRIMEIRO
  if (year <= 6) return SEGUNDO
  if (year <= 9) return TERCEIRO
  return SECUNDARIO
}

// Nota: Inglês no 1.º ciclo só existe no 3.º/4.º ano; a app aceita, mas o
// currículo só terá AE para 3.º/4.º.
