# Gera e insere os objectos SubjectCurriculum de EV/ET/EM/EF (2.º ciclo) no
# index.ts, a partir dos JSON validados. Escapa com json.dumps (strings TS válidas).
import json, io, sys, re

SP = r"C:/Users/elefa/AppData/Local/Temp/claude/C--Users-elefa-Claude-Experiments-Claude-code/b44c8b2f-7ba2-4202-86e1-44d26b7ca3ad/scratchpad/ae"
IDX = r"C:/Users/elefa/profai-app/src/lib/curriculum/index.ts"

def load(k):
    raw = open(f"{SP}/{k}.json", encoding="utf-8").read().strip()
    if raw.startswith("```"): raw = re.sub(r'^```\w*|```$', '', raw, flags=re.M).strip()
    return json.loads(raw)

def domains_ts(doms, indent="      "):
    out = []
    for d in doms:
        descs = ",\n".join(f"{indent}    {json.dumps(x, ensure_ascii=False)}" for x in d["descritores"])
        out.append(
            f"{indent}{{\n"
            f"{indent}  name: {json.dumps(d['nome'], ensure_ascii=False)},\n"
            f"{indent}  topics: [],\n"
            f"{indent}  descriptors: [\n{descs},\n{indent}  ],\n"
            f"{indent}}},"
        )
    return "\n".join(out)

PERFIL = ("['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', "
          "'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', "
          "'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', "
          "'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', "
          "'Consciência e domínio do corpo']")

base = "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo"

ev = load("ev2c"); et = load("et2c"); em = load("em2c"); ef5 = load("ef5"); ef6 = load("ef6")

CT = {
  "ev": ("Componente teórica/reflexiva escrita: elementos da comunicação visual (luz, cor, espaço, forma, movimento, ritmo, proporção); análise e interpretação de imagens e objetos artísticos; tipologia e função de arte, design, arquitetura e artesanato; estilos e movimentos artísticos; vocabulário específico das artes visuais; etapas do processo artístico (pesquisa, experimentação, reflexão).",
         "Execução prática/plástica (desenhar, pintar, construir, produzir trabalhos) — não avaliável em prova escrita."),
  "et": ("Componente teórica escrita: fases do projeto tecnológico (identificação, pesquisa, realização, avaliação); propriedades físicas e mecânicas dos materiais (madeiras, papéis, plásticos, fios têxteis, pastas); operadores tecnológicos e mecanismos; fontes de energia e sua transformação; técnicas de transformação de materiais (união, corte, assemblagem, conformação); higiene e segurança; evolução dos objetos técnicos; tecnologia, sociedade e ambiente.",
         "Execução prática/manual (produzir artefactos, manipular ferramentas e utensílios) — não avaliável por escrito."),
  "em": ("Componente teórica/auditiva escrita: elementos da música (timbre, altura, dinâmica, ritmo, forma, textura); vocabulário e simbologia musical; comparação de características de peças de diferentes épocas, estilos e géneros; enquadramentos socioculturais; audição e apreciação crítica.",
         "Execução prática (cantar, tocar, improvisar, compor, dançar, movimento corporal) — não avaliável em prova escrita."),
  "ef": ("Componente teórica escrita (Área dos Conhecimentos): capacidades físicas (resistência, força, velocidade, flexibilidade, agilidade, coordenação); adaptações do organismo à atividade física; aptidão física e Zona Saudável de Aptidão Física (Fitescola); regras, objetivos e princípios éticos das modalidades.",
         "Execução motora (jogos desportivos, ginástica, atletismo, natação, patinagem, dança, combate) — não avaliável em prova escrita."),
}

def entry(src, doms, ck):
    ct, cnt = CT[ck]
    return (f"    source: {json.dumps(src, ensure_ascii=False)},\n"
            f"    domains: [\n{domains_ts(doms)}\n    ],\n"
            f"    perfilAreas: {PERFIL},\n"
            f"    canTest: {json.dumps(ct, ensure_ascii=False)},\n"
            f"    cannotTest: {json.dumps(cnt, ensure_ascii=False)},\n")

block = f"""
// ─────────────────────────────────────────────────────────────────────────────
// EDUCAÇÃO VISUAL / TECNOLÓGICA / MUSICAL / FÍSICA  (2.º ciclo)
// AE oficiais (DGE). EV/ET/EM são documentos de ciclo (mesmos descritores em 5.º e 6.º).
// Descritores verbatim; canTest orienta a avaliação ESCRITA para a componente teórica.
// ─────────────────────────────────────────────────────────────────────────────
const educacaoVisual: SubjectCurriculum = {{
  5: {{
{entry(f"{base}/educacao_visual_2c_ff.pdf", ev["dominios"], "ev")}  }},
  6: {{
{entry(f"{base}/educacao_visual_2c_ff.pdf", ev["dominios"], "ev")}  }},
}}

const educacaoTecnologica: SubjectCurriculum = {{
  5: {{
{entry(f"{base}/2c_educacao_tecnologica.pdf", et["dominios"], "et")}  }},
  6: {{
{entry(f"{base}/2c_educacao_tecnologica.pdf", et["dominios"], "et")}  }},
}}

const educacaoMusical: SubjectCurriculum = {{
  5: {{
{entry(f"{base}/2c_educacao_musical.pdf", em["dominios"], "em")}  }},
  6: {{
{entry(f"{base}/2c_educacao_musical.pdf", em["dominios"], "em")}  }},
}}

const educacaoFisica: SubjectCurriculum = {{
  5: {{
{entry(f"{base}/5_educacao_fisica.pdf", ef5["dominios"], "ef")}  }},
  6: {{
{entry(f"{base}/6_educacao_fisica.pdf", ef6["dominios"], "ef")}  }},
}}
"""

src = open(IDX, encoding="utf-8").read()
marker = "// ─────────────────────────────────────────────────────────────────────────────\n// BASE DE DADOS PRINCIPAL"
assert marker in src, "marcador BASE DE DADOS não encontrado"
src = src.replace(marker, block.rstrip() + "\n\n" + marker, 1)

# Actualiza CURRICULUM_DB: acrescenta as 4 disciplinas antes do comentário do secundário.
anchor = "  // Ensino Secundário (disciplinas próprias)"
add = ("  'Educação Visual':                    educacaoVisual,\n"
       "  'Educação Tecnológica':               educacaoTecnologica,\n"
       "  'Educação Musical':                   educacaoMusical,\n"
       "  'Educação Física':                    educacaoFisica,\n")
assert anchor in src, "âncora CURRICULUM_DB não encontrada"
src = src.replace(anchor, add + anchor, 1)

open(IDX, "w", encoding="utf-8").write(src)
print("Inserido. Novo tamanho:", len(src), "car")
