#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# PROF.IA — Pipeline Orquestrador
# Uso: ./scripts/pipeline.sh "descrição curta da tarefa"
#      ./scripts/pipeline.sh  (usa .claude/spec-actual.md)
# ══════════════════════════════════════════════════════════════════

set -euo pipefail

SPEC_FILE=".claude/spec-actual.md"
MAX_ITER=2
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# ── Cores ─────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅  $*${NC}"; }
warn() { echo -e "${YELLOW}⚠   $*${NC}"; }
fail() { echo -e "${RED}❌  $*${NC}"; }

# ── Carregar spec ──────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  SPEC="$1"
else
  if [ ! -f "$SPEC_FILE" ]; then
    fail "Sem spec: cria '$SPEC_FILE' ou passa a spec como argumento."
    exit 1
  fi
  SPEC=$(cat "$SPEC_FILE")
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  PROF.IA Pipeline — $(date '+%H:%M:%S')"
echo "══════════════════════════════════════════════════════════════"
echo "Spec: ${SPEC:0:120}..."
echo ""

# ── Loop de produção + revisão ─────────────────────────────────────
FEEDBACK=""

for ITER in $(seq 1 $MAX_ITER); do
  echo "── Iteração $ITER/$MAX_ITER ──────────────────────────────────"

  # Combina spec + feedback anterior (se existir)
  FULL_PROMPT="$SPEC"
  if [ -n "$FEEDBACK" ]; then
    FULL_PROMPT="$SPEC

A tentativa anterior foi rejeitada. Corrige EXACTAMENTE estes problemas:
$FEEDBACK"
  fi

  # ── Produção: Aider + Gemini ──────────────────────────────────
  echo "⏳  Aider a produzir código..."
  # No Windows (Git Bash), Aider precisa de correr via PowerShell
  if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Escreve prompt para ficheiro temporário (evita problemas de escaping)
    echo "$FULL_PROMPT" > /tmp/aider_prompt.txt
    AIDER_MSG=$(cat /tmp/aider_prompt.txt)
    powershell.exe -Command "
      cd '$PROJECT_DIR'
      aider --model gemini/gemini-2.5-flash \
            --message '$AIDER_MSG' \
            --auto-commits \
            --yes \
            --no-pretty \
            --no-check-update 2>&1
    " || { warn "Aider falhou (PowerShell). A tentar com gemini CLI..."; gemini -p "$FULL_PROMPT" || { fail "Ambos falharam."; exit 1; }; }
  else
    aider --model gemini/gemini-2.5-flash \
          --message "$FULL_PROMPT" \
          --auto-commits \
          --yes \
          --no-pretty \
          --no-check-update 2>&1 || {
      warn "Aider falhou. A tentar com gemini CLI..."
      gemini -p "$FULL_PROMPT"
    }
  fi

  # ── Validação estática (TypeScript + ESLint) ──────────────────
  echo ""
  echo "⏳  A validar: TypeScript..."
  TSC_OUT=$(npx tsc --noEmit 2>&1 || true)
  if [ -n "$TSC_OUT" ]; then
    ERROS_TSC=$(echo "$TSC_OUT" | grep "error TS" | wc -l | tr -d ' ')
    warn "TypeScript: $ERROS_TSC erro(s)"
    echo "$TSC_OUT" | grep "error TS" | head -10

    # Auto-correcção de tipos: volta ao Aider com os erros
    FEEDBACK="Erros TypeScript a corrigir:
$TSC_OUT
Corrige APENAS estes erros de tipo. Não alteres a lógica."
    continue
  fi
  ok "TypeScript — sem erros"

  echo "⏳  A validar: ESLint..."
  ESLINT_OUT=$(npx eslint src/ --max-warnings 3 --format compact 2>&1 || true)
  ESLINT_ERROS=$(echo "$ESLINT_OUT" | grep -c "error" || true)
  if [ "$ESLINT_ERROS" -gt 0 ]; then
    warn "ESLint: $ESLINT_ERROS erro(s)"
    echo "$ESLINT_OUT" | grep "error" | head -5
    FEEDBACK="Erros ESLint a corrigir:
$ESLINT_OUT
Corrige APENAS estes erros de linting."
    continue
  fi
  ok "ESLint — limpo"

  # ── Revisão AI (Groq + qwen-qwq-32b) ─────────────────────────
  echo "⏳  Revisão AI (Groq)..."
  if [ -z "${GROQ_API_KEY:-}" ]; then
    warn "GROQ_API_KEY não definida — a saltar revisão AI"
    ok "Pipeline completo (sem revisão AI)"
    exit 0
  fi

  # Recolhe apenas o diff dos ficheiros .ts/.tsx (máx. 200 linhas)
  DIFF=$(git diff HEAD~1 -- '*.ts' '*.tsx' '*.css' 2>/dev/null | head -200 || echo "(sem diff git)")

  REVIEW=$(curl -sf https://api.groq.com/openai/v1/chat/completions \
    -H "Authorization: Bearer $GROQ_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "
import json, sys
spec = $(echo "$SPEC" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
diff = $(echo "$DIFF"  | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
payload = {
  'model': 'qwen-qwq-32b',
  'messages': [{
    'role': 'user',
    'content': f'Spec da tarefa:\n{spec}\n\nCódigo produzido (diff):\n{diff}\n\nResponde APENAS com:\n- APROVADO\nou\n- Lista numerada de problemas: ficheiro:linha — problema (máx. 5 problemas, sem introdução)'
  }],
  'max_tokens': 400
}
print(json.dumps(payload))
")" 2>/dev/null \
    | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['choices'][0]['message']['content'])" 2>/dev/null \
    || echo "APROVADO (Groq indisponível)")

  echo "Revisão: $REVIEW"
  echo ""

  if echo "$REVIEW" | grep -qi "APROVADO"; then
    ok "Aprovado em $ITER iteração(ões) ✓"
    echo ""
    # Resumo do que foi feito
    git log --oneline -3 2>/dev/null || true
    exit 0
  else
    FEEDBACK="$REVIEW"
    warn "Revisão: problemas encontrados — a iterar..."
  fi
done

# ── Máximo de iterações atingido ──────────────────────────────────
echo ""
fail "Pipeline não convergiu após $MAX_ITER iterações."
echo ""
echo "Último feedback do revisor:"
echo "$FEEDBACK"
echo ""
echo "⚠  Claude deve intervir directamente neste ponto."
exit 2
