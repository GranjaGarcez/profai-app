# Secundario (10/11/12): substitui resumos por descritores oficiais AE.
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
        if not descs:  # ignora domínios sem descritores (evita arrays inválidos)
            continue
        ds=",\n".join(f"{ind}    {json.dumps(x,ensure_ascii=False)}" for x in descs)
        o.append(f"{ind}{{\n{ind}  name: {json.dumps(d['nome'],ensure_ascii=False)},\n{ind}  topics: [],\n{ind}  descriptors: [\n{ds},\n{ind}  ],\n{ind}}},")
    return "\n".join(o)
def block(year,k,url,ct,cnt):
    d=load(k)
    return (f"  {year}: {{\n    source: {json.dumps(url,ensure_ascii=False)},\n    domains: [\n{dts(d['dominios'])}\n    ],\n"
            f"    perfilAreas: {PERFIL},\n    canTest: {json.dumps(ct,ensure_ascii=False)},\n    cannotTest: {json.dumps(cnt,ensure_ascii=False)},\n  }},\n")
src=open(IDX,encoding="utf-8").read()
def splice(text,const,year,nxt,new):
    ci=text.index(f"const {const}: SubjectCurriculum = {{"); a=text.index(f"\n  {year}: {{",ci); b=text.index(f"\n  {nxt}: {{",a)
    return text[:a]+"\n"+new.rstrip("\n")+text[b:]
def splice_last(text,const,year,new):
    ci=text.index(f"const {const}: SubjectCurriculum = {{"); a=text.index(f"\n  {year}: {{",ci); b=text.index("\n}",a)
    return text[:a]+"\n"+new.rstrip("\n")+text[b:]
B="https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais"

def gen(dom_names_by_year, disc):
    return {y:(f"Descritores oficiais das AE de {disc} do {y}.º ano — domínios: {dom_names_by_year[y]}.",
               f"Conteúdos de outros anos do secundário fora dos domínios do {y}.º ano.") for y in dom_names_by_year}

# Portugues 10/11/12 (12 e o ultimo)
PT={10:"Oralidade, Leitura, Educação Literária, Escrita, Gramática",11:"Oralidade, Leitura, Educação Literária, Escrita, Gramática",12:"Oralidade, Leitura, Educação Literária, Escrita, Gramática"}
ctPT=gen(PT,"Português")
src=splice(src,"portugues",10,11,block(10,"port10",f"{B}/10_portugues.pdf",*ctPT[10]))
src=splice(src,"portugues",11,12,block(11,"port11",f"{B}/11_portugues.pdf",*ctPT[11]))
src=splice_last(src,"portugues",12,block(12,"port12",f"{B}/12_portugues.pdf",*ctPT[12]))

# Ingles 10/11 (11 ultimo)
ING={10:"Compreensão/Interação/Produção oral e escrita (nível B1/B2), Competência Intercultural, Competência Estratégica",11:"Compreensão/Interação/Produção oral e escrita (nível B2), Competência Intercultural, Competência Estratégica"}
ctING=gen(ING,"Inglês")
src=splice(src,"ingles",10,11,block(10,"ing10",f"{B}/10_ingles_f_geral_cont.pdf",*ctING[10]))
src=splice_last(src,"ingles",11,block(11,"ing11",f"{B}/11_ingles_f_geral_cont.pdf",*ctING[11]))

# Historia A 10/11/12 (12 ultimo) — const historia
HA={10:"módulos de História A do 10.º ano",11:"módulos de História A do 11.º ano",12:"módulos de História A do 12.º ano"}
ctHA=gen(HA,"História A")
src=splice(src,"historia",10,11,block(10,"hista10",f"{B}/10_historia_a.pdf",*ctHA[10]))
src=splice(src,"historia",11,12,block(11,"hista11",f"{B}/11_historia_a.pdf",*ctHA[11]))
src=splice_last(src,"historia",12,block(12,"hista12",f"{B}/12_historia_a.pdf",*ctHA[12]))

# Biologia e Geologia 10/11 (11 ultimo)
BG={10:"Geologia e Biologia (10.º)",11:"Geologia e Biologia (11.º)"}
ctBG=gen(BG,"Biologia e Geologia")
src=splice(src,"biologiaGeologia",10,11,block(10,"biog10",f"{B}/10_biologia_e_geologia.pdf",*ctBG[10]))
src=splice_last(src,"biologiaGeologia",11,block(11,"biog11",f"{B}/11_biologia_e_geologia.pdf",*ctBG[11]))

# Filosofia 10/11 (11 ultimo)
FI={10:"módulos de Filosofia do 10.º ano",11:"módulos de Filosofia do 11.º ano"}
ctFI=gen(FI,"Filosofia")
src=splice(src,"filosofia",10,11,block(10,"filo10",f"{B}/10_filosofia.pdf",*ctFI[10]))
src=splice_last(src,"filosofia",11,block(11,"filo11",f"{B}/11_filosofia.pdf",*ctFI[11]))

# Matematica A 10/11/12 (const matematica; 12 ultimo)
MA={10:"Lógica e conjuntos, Álgebra, Geometria analítica, Funções reais, Estatística",11:"Trigonometria e funções, Geometria analítica, Sucessões, Funções, Estatística/Probabilidades",12:"Cálculo combinatório, Probabilidades, Funções (limites/derivadas), Exponenciais e logaritmos, Números complexos"}
ctMA=gen(MA,"Matemática A")
src=splice(src,"matematica",10,11,block(10,"mata10",f"{B}/10_matematica_a.pdf",*ctMA[10]))
src=splice(src,"matematica",11,12,block(11,"mata11",f"{B}/11_matematica_a.pdf",*ctMA[11]))
src=splice_last(src,"matematica",12,block(12,"mata12",f"{B}/12_matematica_a.pdf",*ctMA[12]))

# Fisica e Quimica A 10/11 (11 ultimo)
FQ={10:"Química (elementos, propriedades e transformações) e Física (energia) — 10.º",11:"Física (mecânica, ondas, eletromagnetismo) e Química (equilíbrio, reações em solução) — 11.º"}
ctFQ=gen(FQ,"Física e Química A")
src=splice(src,"fisicaQuimicaA",10,11,block(10,"fqa10",f"{B}/10_fq_a.pdf",*ctFQ[10]))
src=splice_last(src,"fisicaQuimicaA",11,block(11,"fqa11",f"{B}/11_fq_a.pdf",*ctFQ[11]))

open(IDX,"w",encoding="utf-8").write(src)
print("Secundario codificado. Tamanho:",len(src))
