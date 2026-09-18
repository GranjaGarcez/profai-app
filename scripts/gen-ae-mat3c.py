# Matematica 3.º ciclo (7/8/9, AE 2021) — substitui resumos por Objetivos de Aprendizagem oficiais.
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
        ds=",\n".join(f"{ind}    {json.dumps(x,ensure_ascii=False)}" for x in d["descritores"])
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
B3="https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo"
CT={7:("Objetivos de Aprendizagem (AE 2021) de Matemática do 7.º ano — temas Números, Álgebra, Dados e Probabilidades, Geometria e Medida, e Capacidades Matemáticas transversais.","Conteúdos do 8.º/9.º ano ou do secundário fora dos objetivos do 7.º."),
    8:("Objetivos de Aprendizagem (AE 2021) de Matemática do 8.º ano — temas Números, Álgebra, Dados e Probabilidades, Geometria e Medida, e Capacidades Matemáticas transversais.","Conteúdos do 7.º/9.º ano ou do secundário fora dos objetivos do 8.º."),
    9:("Objetivos de Aprendizagem (AE 2021) de Matemática do 9.º ano — temas Números, Álgebra, Funções, Dados e Probabilidades, Geometria e Medida, e Capacidades Matemáticas transversais.","Conteúdos do 7.º/8.º ano ou de Matemática A do secundário fora dos objetivos do 9.º.")}
src=splice(src,"matematica",7,8,block(7,"mat7",f"{B3}/ae_mat_7.o_ano.pdf",*CT[7]))
src=splice(src,"matematica",8,9,block(8,"mat8",f"{B3}/ae_mat_8.o_ano.pdf",*CT[8]))
src=splice(src,"matematica",9,10,block(9,"mat9",f"{B3}/ae_mat_9.o_ano.pdf",*CT[9]))
open(IDX,"w",encoding="utf-8").write(src)
print("Matemática 3.º ciclo codificada. Tamanho:",len(src))
