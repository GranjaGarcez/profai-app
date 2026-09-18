# Geografia + Ingles (3.º ciclo, 7/8/9)
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
def splice_last(text,const,year,new):
    ci=text.index(f"const {const}: SubjectCurriculum = {{"); a=text.index(f"\n  {year}: {{",ci); b=text.index("\n}",a)
    return text[:a]+"\n"+new.rstrip("\n")+text[b:]
B3="https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo"

GEO={7:("Descritores AE de Geografia do 7.º ano — A Terra: estudos e representações (localização, mapas, coordenadas geográficas); o meio natural (relevo, clima, rios, litoral).","População e atividades económicas (8.º); contrastes de desenvolvimento e ambiente (9.º); Geografia A (secundário)."),
     8:("Descritores AE de Geografia do 8.º ano — população e povoamento; atividades económicas (agricultura, pesca, indústria, serviços, turismo, transportes e comunicações).","Meio natural e representações (7.º); contrastes de desenvolvimento (9.º); secundário."),
     9:("Descritores AE de Geografia do 9.º ano — contrastes de desenvolvimento; ambiente e sociedade (recursos naturais, riscos, sustentabilidade).","Conteúdos do 7.º/8.º ano; Geografia A do secundário.")}
src=splice(src,"geografia",7,8,block(7,"geo7",f"{B3}/7_geografia.pdf",*GEO[7]))
src=splice(src,"geografia",8,9,block(8,"geo8",f"{B3}/8_geografia.pdf",*GEO[8]))
src=splice_last(src,"geografia",9,block(9,"geo9",f"{B3}/9_geografia.pdf",*GEO[9]))

ING={7:("Compreensão oral e escrita, interação e produção oral e escrita ao nível A2.1/A2.2 (QECR); domínio intercultural; competência estratégica. Vocabulário e funções do programa do 7.º ano.","Níveis B1+ e conteúdos do 8.º/9.º ano; secundário."),
     8:("Compreensão oral e escrita, interação e produção oral e escrita ao nível B1 (QECR); domínio intercultural; competência estratégica. Vocabulário e funções do programa do 8.º ano.","Níveis do 7.º e do 9.º ano fora do programa do 8.º; secundário."),
     9:("Compreensão oral e escrita, interação e produção oral e escrita ao nível B1/B1.1 (QECR); domínio intercultural; competência estratégica. Vocabulário e funções do programa do 9.º ano.","Conteúdos do secundário (B2+).")}
src=splice(src,"ingles",7,8,block(7,"ing7",f"{B3}/ingles_3c_7a_ff.pdf",*ING[7]))
src=splice(src,"ingles",8,9,block(8,"ing8",f"{B3}/ingles_3c_8a_ff.pdf",*ING[8]))
src=splice(src,"ingles",9,10,block(9,"ing9",f"{B3}/ingles_3c_9a_ff.pdf",*ING[9]))

open(IDX,"w",encoding="utf-8").write(src)
print("Geografia + Ingles (3.º ciclo) codificados. Tamanho:",len(src))
