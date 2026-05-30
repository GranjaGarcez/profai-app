# Spec: markScheme detalhado e disciplina-específico

## Objectivo
Melhorar os critérios de correcção (`markScheme`) em dois ficheiros para que a correcção por IA seja
precisa, justa e específica por disciplina e tipo de questão.

---

## Ficheiro 1: `src/app/api/ai/generate/route.ts`

### Mudança 1 — Adicionar função `autoMarkScheme()`

Inserir ANTES da função `generateWithFallback` (linha ~134), depois de `getSubjectProfile`:

```typescript
function autoMarkScheme(type: string, pts: number, subject: string): string {
  const s = subject.toLowerCase()
  const p = (frac: number) => Math.max(1, Math.round(pts * frac))

  if (type === 'multiple_choice') {
    return `Resposta correcta (${pts} pt). Critério: correspondência exacta com a opção correcta — sem cotação parcial. Qualquer outra opção = 0 pontos.`
  }
  if (type === 'true_false') {
    return `Resposta correcta (${pts} pt). Critério: classificação exacta como Verdadeiro ou Falso — sem cotação parcial. Resposta errada = 0 pontos.`
  }

  // Questões abertas — específico por disciplina
  const isLong = type === 'long_answer'

  if (s.includes('matemát') || s.includes('físic') || s.includes('fisic') || s.includes('quím') || s.includes('quim')) {
    return `Identificação dos dados relevantes (${p(0.2)}pt) + fórmula/método correcto (${p(0.3)}pt) + desenvolvimento do cálculo sem erro (${p(0.3)}pt) + resposta com unidade correcta e conclusão (${p(0.2)}pt).`
  }

  if (s.includes('português') || s.includes('portugues') || s.includes('língua')) {
    if (isLong) {
      return `Conteúdo e pertinência (${p(0.4)}pt) + organização e coesão textual, incluindo introdução/desenvolvimento/conclusão (${p(0.3)}pt) + correcção linguística, ortográfica e pontuação (${p(0.3)}pt).`
    }
    return `Identificação correcta do elemento pedido (${p(0.4)}pt) + justificação ou exemplificação adequada com recurso ao texto (${p(0.4)}pt) + correcção linguística (${p(0.2)}pt).`
  }

  if (s.includes('história') || s.includes('historia') || s.includes('geografia') || s.includes('geograf') || s.includes('hgp')) {
    if (isLong) {
      return `Conteúdo histórico/geográfico correcto e pertinente, com factos e datas relevantes (${p(0.5)}pt) + organização do discurso com tese, argumentação e conclusão (${p(0.3)}pt) + correcção linguística e vocabulário histórico/geográfico específico (${p(0.2)}pt).`
    }
    return `Identificação correcta do conceito/facto histórico ou geográfico (${p(0.5)}pt) + contextualização e justificação adequada (${p(0.5)}pt).`
  }

  if (s.includes('ciência') || s.includes('ciencia') || s.includes('natural') || s.includes('biolog')) {
    if (isLong) {
      return `Identificação correcta do fenómeno ou conceito científico (${p(0.25)}pt) + explicação científica correcta e fundamentada (${p(0.4)}pt) + terminologia científica adequada (${p(0.2)}pt) + conclusão pertinente (${p(0.15)}pt).`
    }
    return `Resposta científica correcta (${p(0.6)}pt) + justificação com terminologia científica adequada (${p(0.4)}pt).`
  }

  // Genérico
  return isLong
    ? `Conteúdo correcto e completo (${p(0.5)}pt) + organização e coesão (${p(0.3)}pt) + rigor e clareza da expressão (${p(0.2)}pt).`
    : `Resposta correcta e completa (${p(0.6)}pt) + clareza e rigor (${p(0.4)}pt).`
}
```

### Mudança 2 — Actualizar `validateAndRepair()` para usar `autoMarkScheme()` em TODOS os tipos

Localizar (dentro do bloco `if (tool === 'test')`, na secção de normalização):

```typescript
          // 3. Garantir markScheme em questões abertas
          if ((q.type === 'short_answer' || q.type === 'long_answer') && !q.markScheme) {
            const pts = Number(q.points) || 0
            q.markScheme = `Conteúdo correcto e completo (${Math.ceil(pts * 0.6)}pt) + clareza e organização (${Math.floor(pts * 0.4)}pt).`
          }
```

Substituir por:

```typescript
          // 3. Garantir markScheme em todos os tipos de questão
          const markSchemeMissing = !q.markScheme || String(q.markScheme).trim().length < 25
          if (markSchemeMissing) {
            const pts = Number(q.points) || 0
            const subj = String(
              (inputs as Record<string, unknown>)?.subject ?? ''
            )
            q.markScheme = autoMarkScheme(q.type ?? 'short_answer', pts, subj)
          }
```

### Mudança 3 — Melhorar regra #7 no prompt principal

Localizar:
```
7. CRITÉRIOS: markScheme detalhado com critérios parciais quando aplicável (ex: "2pt identificação de dados + 3pt método + 3pt cálculo + 2pt resposta com unidade")
```

Substituir por:
```
7. CRITÉRIOS DE CORRECÇÃO — markScheme OBRIGATÓRIO e ESPECÍFICO em CADA questão, com pontos parciais que somam exactamente o valor da questão:
   • Escolha múltipla: "Resposta: [letra] (${pts}pt). A opção [X] induz o erro de [...]; A opção [Y] confunde [...]. Resposta errada = 0pt."
   • Verdadeiro/Falso: "Verdadeiro/Falso — [razão científica/histórica/linguística concreta]. (${pts}pt). Resposta errada = 0pt."
   • Matemática/FQ (resposta curta ou longa): "dados (Xpt) + fórmula/método (Xpt) + cálculo sem erro (Xpt) + resposta com unidade correcta (Xpt)"
   • Português (resposta curta): "identificação (Xpt) + justificação com referência ao texto (Xpt) + correcção linguística (Xpt)"
   • Português (expressão escrita): "conteúdo e pertinência (Xpt) + organização e coesão (Xpt) + correcção linguística e ortográfica (Xpt)"
   • CN (resposta aberta): "identificação do fenómeno (Xpt) + explicação científica (Xpt) + terminologia (Xpt) + conclusão (Xpt)"
   • HGP/História/Geografia (desenvolvimento): "conteúdo histórico/geográfico com factos (Xpt) + organização do discurso (Xpt) + vocabulário específico (Xpt)"
   REGRA ABSOLUTA: A soma dos pontos parciais no markScheme = "points" da questão.
```

### Mudança 4 — Melhorar system prompt do Groq (fallback)

Localizar o system prompt do Groq (mensagem com `role: 'system'` no `generateWithFallback`).

Substituir a regra 5:
```
5. Cada questão DEVE ter "markScheme" detalhado com critérios parciais.
```
Por:
```
5. Cada questão DEVE ter "markScheme" com critérios parciais que somam exactamente "points":
   - multiple_choice: "Resposta: [letra] (Xpt). A opção Y induz erro de [...]; Z confunde [...]. Errada = 0pt."
   - true_false: "[Verdadeiro/Falso] — [razão concreta]. (Xpt). Errada = 0pt."
   - short_answer (Matemática): "dados (Xpt) + fórmula (Xpt) + cálculo (Xpt) + resposta com unidade (Xpt)"
   - short_answer (outras): "identificação (Xpt) + justificação/explicação (Xpt) + rigor da expressão (Xpt)"
   - long_answer: critérios progressivos por etapas — conteúdo + organização + expressão/unidades
```

---

## Ficheiro 2: `scripts/seedQuestionBank.ts`

### Mudança 5 — Adicionar `autoMarkSchemeSeeder()` inline e usar no `parseJsonArray()`

Adicionar função ANTES de `parseJsonArray` (linha ~335):

```typescript
function autoMarkSchemeSeeder(type: string, pts: number, subject: string, correctAnswer: unknown): string {
  const s = subject.toLowerCase()
  const p = (frac: number) => Math.max(1, Math.round(pts * frac))
  const ans = String(correctAnswer ?? '')

  if (type === 'multiple_choice') {
    return `Resposta correcta: ${ans} (${pts}pt). Correspondência exacta — sem cotação parcial.`
  }
  if (type === 'true_false') {
    return `Resposta correcta: ${ans} (${pts}pt). Classificação exacta — sem cotação parcial.`
  }

  if (s.includes('matemát') || s.includes('físic') || s.includes('quím')) {
    return `Identificação dos dados (${p(0.2)}pt) + fórmula/método correcto (${p(0.3)}pt) + cálculo sem erro (${p(0.3)}pt) + resposta com unidade (${p(0.2)}pt). Resposta: ${ans}`
  }
  if (s.includes('português') || s.includes('língua')) {
    return `Conteúdo correcto (${p(0.4)}pt) + justificação adequada (${p(0.4)}pt) + correcção linguística (${p(0.2)}pt). Resposta esperada: ${ans}`
  }
  if (s.includes('história') || s.includes('geografia') || s.includes('hgp')) {
    return `Conteúdo histórico/geográfico correcto (${p(0.5)}pt) + contextualização e vocabulário específico (${p(0.5)}pt). Resposta esperada: ${ans}`
  }
  if (s.includes('ciência') || s.includes('natural') || s.includes('biolog')) {
    return `Resposta científica correcta (${p(0.6)}pt) + terminologia científica adequada (${p(0.4)}pt). Resposta esperada: ${ans}`
  }
  return `Resposta correcta e completa (${p(0.6)}pt) + clareza e rigor (${p(0.4)}pt). Resposta esperada: ${ans}`
}
```

Localizar em `parseJsonArray()`:
```typescript
    if (!norm.markScheme && norm.correctAnswer) {
      norm.markScheme = `Resposta correcta: ${norm.correctAnswer}`
    }
```

Substituir por:
```typescript
    if (!norm.markScheme || String(norm.markScheme ?? '').trim().length < 25) {
      const pts = Number(norm.points) || 5
      norm.markScheme = autoMarkSchemeSeeder(
        String(norm.type ?? 'short_answer'), pts, subject, norm.correctAnswer
      )
    }
```

**ATENÇÃO**: `parseJsonArray` precisa de receber `subject` como parâmetro extra.
- Assinatura actual: `function parseJsonArray(raw: string): Array<...>`
- Nova assinatura: `function parseJsonArray(raw: string, subject: string): Array<...>`
- Actualizar TODAS as chamadas a `parseJsonArray` passando `subject` (ou `''` se não disponível)

### Mudança 6 — Melhorar exemplos de markScheme no prompt do seeder

Localizar no prompt do seeder (dentro de `generateQuestionsForTopic`):
```
  "markScheme": "A resposta correcta é A porque...",
```
Substituir por:
```
  "markScheme": "Resposta correcta: A (5pt). A opção B induz o erro de confundir X com Y; a opção C aplica incorrectamente o conceito Z. Resposta errada = 0pt.",
```

Localizar:
```
  "markScheme": "Critério: ... (2 pts) ... (3 pts)",
```
Substituir por (para Matemática/CN — adaptar se o seeder for genérico):
```
  "markScheme": "Identificação dos dados (1pt) + método/fórmula correcta (2pt) + cálculo sem erro (1pt) + resposta com unidade (1pt).",
```

Localizar a regra 8 no prompt do seeder:
```
8. O markScheme deve ser específico e detalhado (critérios parciais quando aplicável)
```
Substituir por:
```
8. O markScheme DEVE ser específico, com pontuação parcial cuja SOMA = points da questão:
   - MCQ: "Resposta: [letra] (Xpt). Opção Y induz erro de [...]. Errada = 0pt."
   - V/F: "[Verdadeiro/Falso] — [razão concreta]. Errada = 0pt."
   - Resposta curta/problema (Matemática): "dados (Xpt) + método (Xpt) + cálculo (Xpt) + unidade (Xpt)"
   - Resposta curta (outras disciplinas): "identificação (Xpt) + explicação/justificação (Xpt) + vocabulário específico (Xpt)"
```

---

## Validação após implementação

```bash
cd C:\Users\elefa\profai-app
npx tsc --noEmit
npx eslint src/app/api/ai/generate/route.ts scripts/seedQuestionBank.ts --max-warnings 0
```

Só aprovar se ambos passarem sem erros.
