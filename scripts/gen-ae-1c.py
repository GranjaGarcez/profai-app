# 1.º ciclo: cria Estudo do Meio (1-4) e antepoe anos 1-4 (Portugues/Matematica)
# e 3-4 (Ingles) aos consts existentes. Aditivo.
import json, re
SP=r"C:/Users/elefa/AppData/Local/Temp/claude/C--Users-elefa-Claude-Experiments-Claude-code/b44c8b2f-7ba2-4202-86e1-44d26b7ca3ad/scratchpad/ae"
IDX=r"C:/Users/elefa/profai-app/src/lib/curriculum/index.ts"
def load(k):
    raw=open(f"{SP}/{k}.json",encoding="utf-8").read().strip()
    if raw.startswith("```"): raw=re.sub(r'^```\w*|```$','',raw,flags=re.M).strip()
    return json.loads(raw)
PERFIL=("['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', "
        "'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', "
        "'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', "
        "'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', "
        "'Consciência e domínio do corpo']")
def dts(doms,ind="      "):
    o=[]
    for d in doms:
        descs=[x for x in d.get("descritores",[]) if isinstance(x,str) and x.strip()]
        if not descs: continue
        ds=",\n".join(f"{ind}    {json.dumps(x,ensure_ascii=False)}" for x in descs)
        o.append(f"{ind}{{\n{ind}  name: {json.dumps(d['nome'],ensure_ascii=False)},\n{ind}  topics: [],\n{ind}  descriptors: [\n{ds},\n{ind}  ],\n{ind}}},")
    return "\n".join(o)
def block(year,k,url,ct,cnt):
    d=load(k)
    return (f"  {year}: {{\n    source: {json.dumps(url,ensure_ascii=False)},\n    domains: [\n{dts(d['dominios'])}\n    ],\n"
            f"    perfilAreas: {PERFIL},\n    canTest: {json.dumps(ct,ensure_ascii=False)},\n    cannotTest: {json.dumps(cnt,ensure_ascii=False)},\n  }},\n")
src=open(IDX,encoding="utf-8").read()
B="https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/1_ciclo"

def prepend_years(text, const, blocks):
    marker=f"const {const}: SubjectCurriculum = {{\n"
    i=text.index(marker)+len(marker)
    return text[:i] + "".join(blocks) + text[i:]

# Portugues 1-4
pt_urls={1:f"{B}/ae_1.o_ano_1o_ciclo_eb_portugues.pdf",2:f"{B}/portugues_1c_2a_ff.pdf",3:f"{B}/portugues_1c_3a_ff.pdf",4:f"{B}/portugues_1c_4a_ff.pdf"}
pblocks=[block(y,f"port1c{y}",pt_urls[y],
  f"Descritores AE de Português do {y}.º ano — Oralidade, Leitura e Escrita, Educação Literária, Gramática.",
  f"Conteúdos de outros anos do 1.º ciclo ou de ciclos seguintes fora do {y}.º ano.") for y in (1,2,3,4)]
src=prepend_years(src,"portugues",pblocks)

# Matematica 1-4 (AE 2021)
mt_urls={y:f"{B}/ae_mat_{y}.o_ano.pdf" for y in (1,2,3,4)}
mblocks=[block(y,f"mat1c{y}",mt_urls[y],
  f"Objetivos de Aprendizagem (AE 2021) de Matemática do {y}.º ano — Números e Operações, Geometria e Medida, Organização e Tratamento de Dados e Capacidades Matemáticas.",
  f"Conteúdos de outros anos fora do {y}.º ano.") for y in (1,2,3,4)]
src=prepend_years(src,"matematica",mblocks)

# Ingles 3-4
iblocks=[block(y,f"ing1c{y}",f"{B}/ingles_1c_{y}a_ff.pdf",
  f"Descritores AE de Inglês do {y}.º ano (1.º ciclo, nível A1) — compreensão/interação/produção oral e escrita, domínio intercultural, competência estratégica.",
  "Níveis superiores ou conteúdos de outros anos.") for y in (3,4)]
src=prepend_years(src,"ingles",iblocks)

# Estudo do Meio: const novo 1-4
def edm(y):
    return block(y,f"edm{y}",f"{B}/{y}_estudo_do_meio.pdf",
      f"Descritores AE de Estudo do Meio do {y}.º ano (blocos de aprendizagem: descoberta de si, dos outros e instituições, do ambiente natural, das inter-relações, dos materiais e objetos).",
      "Conteúdos de outros anos do 1.º ciclo; disciplinas próprias do 2.º ciclo (Ciências Naturais, HGP).")
edm_const="const estudoDoMeio: SubjectCurriculum = {\n"+ "".join(edm(y) for y in (1,2,3,4)) +"}\n"
marker="// ─────────────────────────────────────────────────────────────────────────────\n// CIDADANIA E DESENVOLVIMENTO"
src=src.replace(marker, edm_const+"\n"+marker, 1)
src=src.replace("  'Ciências Naturais':                  cienciasNaturais,\n",
                "  'Ciências Naturais':                  cienciasNaturais,\n  'Estudo do Meio':                     estudoDoMeio,\n", 1)

open(IDX,"w",encoding="utf-8").write(src)
print("1.º ciclo codificado. Tamanho:",len(src))
