# Módulo de Diagnóstico — Língua Materna (Português) — Especificação (v1)

> Extensão do diagnóstico adaptativo ao domínio **Português**. Reaproveita o motor,
> a avaliação dinâmica, o relatório, o player e o pré/pós do módulo de Matemática
> (ver `diagnostico-espec.md`). Estado: **proposta para revisão**. Data: 2026-10-02.

## 0. Ressalva de validação (importante)
O Tiago é professor de Matemática/CN, não de Português. A rede e o banco de língua
**assentam na ciência da leitura e nas Aprendizagens Essenciais (AE) de Português**, não
na autoridade de domínio do autor. Recomenda-se revisão por um docente de Português antes
de uso real. Isto **não é diagnóstico clínico** (dislexia, perturbações da linguagem) — é
rastreio e perfil pedagógico para o professor e para fundamentar encaminhamento ao SPO.

## 1. Objetivo
Localizar, em Português, onde está a fronteira real do aluno na **interpretação** (compreensão
leitora + léxico) e distinguir **défice estrutural** de **subestimulação funcional** — a mesma
pergunta do caso Santiago, agora na linguagem.

## 2. Decisões fixadas (2026-10-02)
| Decisão | Escolha |
|---|---|
| Âmbito v1 | **Leitura: compreensão (literal→inferencial→crítica) + léxico**, com avaliação dinâmica |
| Oralidade | **Gravar o aluno a ler** (fluência oral), além da leitura silenciosa |
| Arquitetura | **Mesmo motor, novo domínio** — generalizar para `domain` (matematica \| portugues) |
| Fora da v1 | Maze/fluência silenciosa, expressão escrita, compreensão oral por *playback*, morfossintaxe aprofundada |

## 3. Base científica — a Visão Simples da Leitura
**Compreensão Leitora = Descodificação × Compreensão da Linguagem** (Gough & Tunmer). Dois
fatores independentes que localizam o problema:
- **Descodificação fraca + linguagem boa** → mecânica da leitura (perfil tipo dislexia ou
  instrução em falta); a memória de trabalho esgota-se a decifrar (carga cognitiva).
- **Descodificação boa + compreensão fraca** → léxico, conhecimento, inferência; ligado a
  pouca exposição → **subestimulação** (recuperável).
- **Ambas fracas** → misto; intervenção + reavaliação antes de concluir.

Cruzado com **avaliação dinâmica** (ajudas graduadas → índice de potencial):
- Léxico/compreensão que recupera com pouca mediação → **subestimulação**.
- Descodificação que não consolida mesmo com mediação → reforça **hipótese estrutural** → SPO.

**Limite v1:** a descodificação (D) mede-se pela gravação de leitura oral; a compreensão da
linguagem (LC) mede-se pela compreensão leitora (texto), válida quando D é adequada. Para
descodificadores fracos, a compreensão leitora confunde D e LC — a **compreensão oral por
playback** (v2) isolaria LC. O relatório assinala isto.

## 4. A rede de Português (camadas — proposta, ancorada nas AE)
Domínios das AE: Oralidade, Leitura, Educação Literária, Escrita, Gramática. Camadas
diagnósticas da v1 (nós com prefixo `PT.`):

- `PT.FLUENCIA_LEITORA` — descodificação/fluência (medida pela leitura oral gravada).
- `PT.LEXICO` — vocabulário (significado, sinónimos, do contexto). Marcador de exposição.
- `PT.COMP_LITERAL` — localizar informação explícita num texto.
- `PT.COMP_INFERENCIAL` — inferir o implícito (relações, causas, intenções).
- `PT.COMP_CRITICA` — avaliar, julgar, relacionar com conhecimento/experiência.

Arcos (pré-requisito → dependente), menos rígidos que na Matemática:
```
FLUENCIA_LEITORA → COMP_LITERAL
LEXICO → COMP_LITERAL → COMP_INFERENCIAL → COMP_CRITICA
LEXICO → COMP_INFERENCIAL
```
A fronteira, aqui, é sobretudo a **profundidade de compreensão** onde o aluno falha, lida
com o nível de léxico e com a fluência. **A validar por docente de Português.**

Concepções/erros-tipo (catálogo inicial, a expandir): confundir o explícito com o inferido;
ficar-se pela informação de superfície; ignorar conectores; inferência não sustentada no
texto; léxico adivinhado por semelhança gráfica.

## 5. Tipos de resposta (novos, além dos de Matemática)
- **`mcq`** — compreensão e léxico (reaproveitado).
- **`open_text`** — resposta curta de compreensão (inferencial/crítica); correção por chave
  de palavras-âncora + revisão humana (sem IA em tempo real no núcleo).
- **`audio_reading`** — o aluno lê um texto em voz alta; a app grava (MediaRecorder). Produz
  um ficheiro de áudio associado à sessão. Análise: (a) determinística/assistida — palavras
  por minuto estimadas, duração; (b) **revisão humana** do professor (erros, hesitações),
  à semelhança do fluxo foto+OCR já existente. Nunca pontuação automática cega.

Cada item de compreensão pertence a um **texto** (passagem). Um texto tem vários itens
(literal, inferencial, crítico) — estrutura nova: `diag_texts` (passagem) + itens que a
referenciam.

## 6. Arquitetura — generalização para domínios
O motor (`engine.ts`) já é agnóstico: opera sobre uma rede + um banco. Generaliza-se por
**domínio**, sem quebrar a Matemática:
- `src/lib/diagnostic/graph.ts` passa a `graphs/matematica.ts` + `graphs/portugues.ts`,
  com um índice por domínio; o motor recebe o grafo do domínio.
- `diag_assessments` ganha `domain` (default 'matematica'); `diag_items` ganha `domain`;
  `start`/`report` escolhem o grafo e o banco pelo domínio da avaliação.
- Novos: `diag_texts` (passagens de leitura), coluna `text_id` em `diag_items`, e
  armazenamento de áudio para `audio_reading` (Supabase Storage, bucket privado).
- O launcher ganha a escolha do domínio ao criar.
Migração aditiva nova; o módulo de Matemática fica intacto.

## 7. Sinais e relatório (língua)
Mesmos quatro sinais + o 5.º (processo). O relatório acrescenta:
- **Perfil da Visão Simples**: Descodificação (da leitura oral) vs Compreensão (do texto),
  com a leitura das quatro combinações.
- **Nível de léxico** e **profundidade de compreensão** atingida (fronteira).
- Potencial de aprendizagem (avaliação dinâmica) → subestimulação vs estrutural.
- Plano de intervenção por camada; comparação pré/pós (RTI) como na Matemática.

## 8. Fases
1. **Generalizar para domínios** (Opus): `domain` no motor/assessment/item; migração; sem
   mexer no comportamento da Matemática.
2. **Rede + textos + banco Português** (`/polvo` + revisão humana obrigatória; ancorar nas AE):
   textos de leitura por ano, itens de compreensão (3 níveis) e de léxico.
3. **Tipo `open_text`** (correção por palavras-âncora + revisão) e **`audio_reading`**
   (gravação no browser + armazenamento + revisão do professor).
4. **Relatório da língua** (Visão Simples + camadas) e **launcher com domínio**.

Ver `diagnostico-progress.md` para o estado.
