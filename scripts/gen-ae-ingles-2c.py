# Substitui os blocos 5: e 6: do const `ingles` pelos descritores oficiais AE
# (transcritos via polvo, verificados). Estrutura por sub-competências.
import json, re

SP = r"C:/Users/elefa/AppData/Local/Temp/claude/C--Users-elefa-Claude-Experiments-Claude-code/b44c8b2f-7ba2-4202-86e1-44d26b7ca3ad/scratchpad/ae"
IDX = r"C:/Users/elefa/profai-app/src/lib/curriculum/index.ts"

def load(k):
    raw = open(f"{SP}/{k}.json", encoding="utf-8").read().strip()
    if raw.startswith("```"): raw = re.sub(r'^```\w*|```$', '', raw, flags=re.M).strip()
    return json.loads(raw)

PERFIL = ("['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', "
          "'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', "
          "'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', "
          "'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', "
          "'Consciência e domínio do corpo']")

CT = {
 5: ("Compreensão oral e escrita, interação e produção oral e escrita ao nível A1.1/A1.2 (QECR); "
     "domínio intercultural; competência estratégica. Vocabulário e funções do programa do 5.º ano "
     "(apresentação, gostos/preferências, rotinas, descrição de pessoas/objetos/imagens); "
     "gramática elementar coerente com o nível A1.",
     "Níveis A2+ e conteúdos do 6.º ano ou do 3.º ciclo; ensaio argumentativo; tempos verbais além do programa do 5.º."),
 6: ("Compreensão oral e escrita, interação e produção oral e escrita ao nível A2 (QECR); "
     "domínio intercultural; competência estratégica. Vocabulário e funções do programa do 6.º ano; "
     "narração no passado, comparação e planos futuros coerentes com o nível A2.",
     "Níveis B1+ e conteúdos do 3.º ciclo; present perfect, reported speech, conditionals; ensaio argumentativo."),
}

def domains_ts(doms):
    out = []
    for d in doms:
        descs = ",\n".join(f"          {json.dumps(x, ensure_ascii=False)}" for x in d["descritores"])
        out.append(
            "        {\n"
            f"          name: {json.dumps(d['nome'], ensure_ascii=False)},\n"
            "          topics: [],\n"
            f"          descriptors: [\n{descs},\n          ],\n"
            "        },"
        )
    return "\n".join(out)

def block(year, k):
    d = load(k); ct, cnt = CT[year]
    src = f"https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/{year}_ingles.pdf"
    return (f"  {year}: {{\n"
            f"    source: {json.dumps(src, ensure_ascii=False)},\n"
            f"    domains: [\n{domains_ts(d['dominios'])}\n    ],\n"
            f"    perfilAreas: {PERFIL},\n"
            f"    canTest: {json.dumps(ct, ensure_ascii=False)},\n"
            f"    cannotTest: {json.dumps(cnt, ensure_ascii=False)},\n"
            f"  }},\n")

src = open(IDX, encoding="utf-8").read()
ci = src.index("const ingles: SubjectCurriculum = {")
# substitui bloco 5: (de "\n  5: {" ate antes de "\n  6: {") e 6: (ate "\n  7: {")
def splice(text, year_from, year_to, new):
    a = text.index(f"\n  {year_from}: {{", ci)
    b = text.index(f"\n  {year_to}: {{", a)
    return text[:a] + "\n" + new.rstrip("\n") + text[b:]

src = splice(src, 5, 6, block(5, "ingles5"))
src = splice(src, 6, 7, block(6, "ingles6"))
open(IDX, "w", encoding="utf-8").write(src)
print("Inglês 5/6 substituídos. Novo tamanho:", len(src))
