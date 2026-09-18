# Codifica AE oficiais do 3.º ciclo a partir dos JSON validados.
# - Substitui blocos de ano em consts existentes (portugues, cienciasNaturais, ...).
# - Cria consts novos (tic) e regista no CURRICULUM_DB.
import json, re, sys

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

def domains_ts(doms, ind="      "):
    out=[]
    for d in doms:
        descs=",\n".join(f"{ind}    {json.dumps(x,ensure_ascii=False)}" for x in d["descritores"])
        out.append(f"{ind}{{\n{ind}  name: {json.dumps(d['nome'],ensure_ascii=False)},\n{ind}  topics: [],\n{ind}  descriptors: [\n{descs},\n{ind}  ],\n{ind}}},")
    return "\n".join(out)

def block(year, k, src_url, canTest, cannotTest):
    d=load(k)
    doms=" | ".join(x["nome"] for x in d["dominios"])
    ct = canTest or f"Descritores oficiais das Aprendizagens Essenciais dos domínios: {doms}. Avaliar ao nível do {year}.º ano."
    cnt = cannotTest or f"Conteúdos de outros anos ou ciclos fora dos domínios/descritores acima."
    return (f"  {year}: {{\n"
            f"    source: {json.dumps(src_url,ensure_ascii=False)},\n"
            f"    domains: [\n{domains_ts(d['dominios'])}\n    ],\n"
            f"    perfilAreas: {PERFIL},\n"
            f"    canTest: {json.dumps(ct,ensure_ascii=False)},\n"
            f"    cannotTest: {json.dumps(cnt,ensure_ascii=False)},\n"
            f"  }},\n")

src = open(IDX, encoding="utf-8").read()

def splice_year(text, const_name, year, next_year, new):
    ci = text.index(f"const {const_name}: SubjectCurriculum = {{")
    a = text.index(f"\n  {year}: {{", ci)
    b = text.index(f"\n  {next_year}: {{", a)
    return text[:a] + "\n" + new.rstrip("\n") + text[b:]

B3 = "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo"

# ---- Português 7/8/9 (const portugues; anos seguem 9->10) ----
CT_PORT = {
 7:("Descritores AE dos domínios Oralidade (Compreensão e Expressão), Leitura, Educação Literária, Escrita e Gramática do 7.º ano.",
    "Conteúdos do 8.º/9.º ano ou do secundário; obras do cânone de outros anos."),
 8:("Descritores AE dos domínios Oralidade, Leitura, Educação Literária, Escrita e Gramática do 8.º ano.",
    "Conteúdos do 7.º/9.º ano ou do secundário; obras do cânone de outros anos."),
 9:("Descritores AE dos domínios Oralidade, Leitura, Educação Literária, Escrita e Gramática do 9.º ano.",
    "Conteúdos do 7.º/8.º ano ou do secundário; obras do cânone de outros anos."),
}
for y,nx in [(7,8),(8,9),(9,10)]:
    src = splice_year(src, "portugues", y, nx, block(y, f"port{y}", f"{B3}/portugues_3c_{y}a_ff.pdf", *CT_PORT[y]))

# ---- Ciências Naturais 7/8/9 (const cienciasNaturais; 9 é o último -> usa marcador '}') ----
CT_CN = {
 7:("Descritores AE de CN do 7.º ano (Terra em transformação — dinâmica externa e interna, rochas, minerais, atividade geológica).", "Conteúdos de CN do 8.º/9.º ano; Físico-Química."),
 8:("Descritores AE de CN do 8.º ano (Terra, um planeta com vida; Sustentabilidade na Terra — ecossistemas, gestão de recursos).", "Conteúdos de CN do 7.º/9.º ano; Físico-Química."),
 9:("Descritores AE de CN do 9.º ano (Viver melhor na Terra — organismo humano em equilíbrio, saúde individual e comunitária).", "Conteúdos de CN do 7.º/8.º ano; Biologia e Geologia do secundário."),
}
# 7->8, 8->9 têm ano seguinte; 9 é o último do objeto -> fecha com '\n}'
src = splice_year(src, "cienciasNaturais", 7, 8, block(7, "cn7", f"{B3}/ciencias_naturais_3c_7a_ff.pdf", *CT_CN[7]))
src = splice_year(src, "cienciasNaturais", 8, 9, block(8, "cn8", f"{B3}/ciencias_naturais_3c_8a_ff.pdf", *CT_CN[8]))
# ano 9 (último): substitui de "\n  9: {" ate ao "\n}" que fecha o const
ci = src.index("const cienciasNaturais: SubjectCurriculum = {")
a = src.index("\n  9: {", ci); b = src.index("\n}", a)
src = src[:a] + "\n" + block(9, "cn9", f"{B3}/ciencias_naturais_3c_9a_ff.pdf", *CT_CN[9]).rstrip("\n") + src[b:]

# ---- TIC (const novo 7/8/9) ----
def tic_entry(y):
    d=load(f"tic{y}")
    ct=("Descritores AE de TIC do "+str(y)+".º ano (Segurança, responsabilidade e respeito em ambientes digitais; "
        "Investigar e pesquisar; Colaborar e comunicar; Criar e inovar — pensamento computacional). Componente escrita/teórica.")
    cnt="Execução prática em computador real; conteúdos de outros anos."
    return block(y, f"tic{y}", f"{B3}/tic_3c_{y}a_ff.pdf", ct, cnt)
tic_const = ("const tic: SubjectCurriculum = {\n"
             + tic_entry(7) + tic_entry(8) + tic_entry(9) + "}\n")
marker = "// ─────────────────────────────────────────────────────────────────────────────\n// BASE DE DADOS PRINCIPAL"
src = src.replace(marker, tic_const + "\n" + marker, 1)
src = src.replace("  'Educação Física':                    educacaoFisica,\n",
                  "  'Educação Física':                    educacaoFisica,\n  'TIC':                                tic,\n", 1)

open(IDX,"w",encoding="utf-8").write(src)
print("Português + CN + TIC (3.º ciclo) codificados. Tamanho:", len(src))
