# PROF.IA — Instruções para Agentes de IA

## O que é este projecto
PROF.IA é uma plataforma SaaS para professores (Portugal primeiro, depois universal) que unifica:
- Criação de testes, planificações, rubricas e materiais com IA
- Entrega de exames online com código de acesso de 8 caracteres
- Monitorização em tempo real com anti-batota (JavaScript)
- Correcção automática com IA (Gemini)
- Gestão de turmas e integração com Google Classroom

## Stack (NÃO ALTERAR)
- Next.js 15, App Router, TypeScript estrito
- Tailwind CSS + shadcn/ui
- Supabase: PostgreSQL + Auth + Realtime
- @google/generative-ai: geração de conteúdo IA
- groq-sdk: revisor IA secundário
- Zustand: estado cliente
- TanStack React Query: estado servidor

## Cores
- #0D1B2A navy escuro (fundo/primary)
- #F7F3EE chalk white (fundo claro)
- #00B4D8 electric blue (accent/CTA)
- #C8A84B gold (premium)

## Regras obrigatórias
1. TypeScript estrito — sem "any"
2. Componentes em src/components/
3. Páginas em src/app/
4. Keys SEMPRE de process.env — nunca hardcoded
5. Cada componente: estado loading + erro + vazio
6. Interface em Português de Portugal
7. Mobile-first para alunos; desktop-first para professores

## Próxima tarefa
Criar src/lib/supabase/client.ts e src/lib/supabase/server.ts
