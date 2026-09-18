# FQ + Historia (3.º ciclo, 7/8/9) — substitui resumos por descritores oficiais.
import json, re
SP = r"C:/Users/elefa/AppData/Local/Temp/claude/C--Users-elefa-Claude-Experiments-Claude-code/b44c8b2f-7ba2-4202-86e1-44d26b7ca3ad/scratchpad/ae"
IDX = r"C:/Users/elefa/profai-app/src/lib/curriculum/index.ts"
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
    ci=text.index(f"const {const}: SubjectCurriculum = {{")
    a=text.index(f"\n  {year}: {{",ci); b=text.index(f"\n  {nxt}: {{",a)
    return text[:a]+"\n"+new.rstrip("\n")+text[b:]
def splice_last(text,const,year,new):
    ci=text.index(f"const {const}: SubjectCurriculum = {{")
    a=text.index(f"\n  {year}: {{",ci); b=text.index("\n}",a)
    return text[:a]+"\n"+new.rstrip("\n")+text[b:]
B3="https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo"

FQ={7:("Descritores AE de Físico-Química do 7.º ano — domínios Espaço (Universo, sistema solar, distâncias, Terra/Lua e forças gravíticas), Materiais e Energia.","Som, luz e reações químicas (8.º); movimentos e forças, eletricidade, classificação dos materiais (9.º); Física e Química A (secundário)."),
    8:("Descritores AE de Físico-Química do 8.º ano — Energia (fontes e transferências), Reações químicas, Som e Luz.","Espaço e materiais (7.º); movimentos e forças, eletricidade (9.º); secundário."),
    9:("Descritores AE de Físico-Química do 9.º ano — Movimentos e forças, Eletricidade, Classificação dos materiais (tabela periódica, ligação química).","Conteúdos do 7.º/8.º ano; Física e Química A do secundário.")}
src=splice(src,"fisicoQuimica",7,8,block(7,"fq7",f"{B3}/fisico-quimica_3c_7a_ff.pdf",*FQ[7]))
src=splice(src,"fisicoQuimica",8,9,block(8,"fq8",f"{B3}/fisico-quimica_3c_8a_ff.pdf",*FQ[8]))
src=splice_last(src,"fisicoQuimica",9,block(9,"fq9",f"{B3}/fisico-quimica_3c_9a.pdf",*FQ[9]))

HI={7:("Descritores AE de História do 7.º ano — das sociedades recoletoras às primeiras civilizações; contributos das primeiras civilizações; o Mediterrâneo antigo (Grécia e Roma); a Europa medieval.","Mundo moderno, Renascimento e revoluções (8.º); século XX (9.º); História A do secundário."),
    8:("Descritores AE de História do 8.º ano — o Mundo moderno; Renascimento e Reforma; expansão e comércio; Absolutismo e Iluminismo; a era das revoluções (americana, francesa, industrial).","Antiguidade e Idade Média (7.º); século XX (9.º); secundário."),
    9:("Descritores AE de História do 9.º ano — o século XX; guerras mundiais; regimes totalitários; Guerra Fria; descolonização; Portugal do Estado Novo à democracia; mundo atual.","Conteúdos do 7.º/8.º ano; História A do secundário.")}
src=splice(src,"historia",7,8,block(7,"hist7",f"{B3}/historia_3c_7a_ff.pdf",*HI[7]))
src=splice(src,"historia",8,9,block(8,"hist8",f"{B3}/historia_3c_8a_ff.pdf",*HI[8]))
src=splice(src,"historia",9,10,block(9,"hist9",f"{B3}/historia_3c_9a_ff.pdf",*HI[9]))

open(IDX,"w",encoding="utf-8").write(src)
print("FQ + Historia (3.º ciclo) codificados. Tamanho:",len(src))
