import QuestionImporter from '@/components/teacher/QuestionImporter'

export default function ImportarPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}
        >
          Importar Questões Externas
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Cola questões de livros, exames IAVE, matematica.pt ou outras fontes.
          A IA estrutura automaticamente e guarda no banco com qualidade 0.95.
        </p>
      </div>

      <div
        className="rounded-xl p-4 text-sm flex gap-3 items-start"
        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}
      >
        <span className="text-lg shrink-0">💡</span>
        <div>
          <strong>Dica:</strong> Podes colar várias questões de uma vez.
          A IA detecta automaticamente o tipo (escolha múltipla, resposta curta, desenvolvimento),
          o nível de Bloom e gera o markScheme com critérios de correcção.
        </div>
      </div>

      <QuestionImporter />
    </div>
  )
}
