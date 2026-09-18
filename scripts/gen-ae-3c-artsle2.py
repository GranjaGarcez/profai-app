# 3.º ciclo: adiciona anos 7/8/9 a EV/ET/EM/Ed.Fisica; cria Espanhol/Frances.
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
B3="https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo"

def add_years_before_close(text, const, blocks):
    ci=text.index(f"const {const}: SubjectCurriculum = {{")
    close=text.index("\n}", ci)  # fecho do objeto
    return text[:close]+"\n"+ "".join(blocks).rstrip("\n") + text[close:]

# --- EV / ET / EM (ciclo doc -> mesmos descritores 7/8/9) ---
EV_CT=("Componente teórica/reflexiva escrita: elementos da comunicação visual; análise e interpretação de imagens e objetos artísticos; tipologia/função de arte, design, arquitetura; estilos e movimentos; vocabulário específico; processo artístico.","Execução prática/plástica (desenhar, pintar, construir) — não avaliável em prova escrita.")
ET_CT=("Componente teórica escrita: processos e projeto tecnológico; propriedades dos materiais; operadores e mecanismos; energia; técnicas de transformação; higiene e segurança; tecnologia, sociedade e ambiente.","Execução prática/manual — não avaliável por escrito.")
EM_CT=("Componente teórica/auditiva escrita: elementos da música; vocabulário e simbologia; estilos, géneros e épocas; enquadramento sociocultural; audição crítica.","Execução prática (cantar, tocar, compor, dançar) — não avaliável em prova escrita.")
EF_CT=("Componente teórica escrita (Área dos Conhecimentos): capacidades físicas; adaptações do organismo à atividade física; aptidão física e saúde; regras e princípios das modalidades.","Execução motora — não avaliável em prova escrita.")

for const, key, url, ct in [
    ("educacaoVisual","ev3c",f"{B3}/educacao_visual_3c_ff.pdf",EV_CT),
    ("educacaoTecnologica","et3c",f"{B3}/3c_educacao_tecnologica.pdf",ET_CT),
    ("educacaoMusical","em3c",f"{B3}/3c_educacao_musical.pdf",EM_CT),
]:
    blocks=[block(y,key,url,*ct) for y in (7,8,9)]
    src=add_years_before_close(src, const, blocks)

# Ed. Fisica: per-year
efblocks=[block(7,"ef7",f"{B3}/educacao_fisica_3c_7a_ff.pdf",*EF_CT),
          block(8,"ef8_3c",f"{B3}/educacao_fisica_3c_8a_ff.pdf",*EF_CT),
          block(9,"ef9",f"{B3}/educacao_fisica_3c_9a_ff.pdf",*EF_CT)]
src=add_years_before_close(src,"educacaoFisica",efblocks)

# --- Espanhol / Frances: consts novos, registados no DB (substituem placeholders {}) ---
LE_CT=lambda ln,y:(f"Compreensão oral e escrita, interação e produção oral e escrita ({ln}, LE, níveis iniciais QECR); domínio intercultural; competência estratégica. Vocabulário e funções do programa do {y}.º ano.",
                   "Níveis superiores ou conteúdos de outros anos fora do programa do "+str(y)+".º.")
def le_const(name, disc_pt, prefix):
    body="".join(block(y, f"{prefix}{y}", f"{B3}/{prefix2(prefix)}_3c_{y}a_ff.pdf", *LE_CT(disc_pt,y)) for y in (7,8,9))
    return f"const {name}: SubjectCurriculum = {{\n{body}}}\n"
def prefix2(p): return {"esp":"espanhol","fr":"frances"}[p]
esp_const=le_const("espanhol","Espanhol","esp")
fr_const=le_const("frances","Francês","fr")
marker="// ─────────────────────────────────────────────────────────────────────────────\n// BASE DE DADOS PRINCIPAL"
src=src.replace(marker, esp_const+"\n"+fr_const+"\n"+marker, 1)
src=src.replace("  'Espanhol':                           {}, // placeholder — estrutura idêntica ao Inglês com QECR\n",
                "  'Espanhol':                           espanhol,\n",1)
src=src.replace("  'Francês':                            {}, // placeholder\n",
                "  'Francês':                            frances,\n",1)

open(IDX,"w",encoding="utf-8").write(src)
print("EV/ET/EM/EF (7/8/9) + Espanhol/Frances codificados. Tamanho:",len(src))
