/**
 * PROF.IA — Seed do banco de itens de DIAGNÓSTICO
 *
 * Lê ficheiros JSON de itens (scripts/diagnostic-items/*.json), valida cada item
 * contra o contrato (docs/diagnostico-itens-formato.md), a rede (graph.ts) e o
 * catálogo de concepções (misconceptions.ts), e carrega os válidos em `diag_items`
 * com reviewed_by_human=false. Itens inválidos são RECUSADOS com o motivo.
 *
 * Uso:
 *   npx tsx scripts/seedDiagnosticBank.ts --dry-run        → valida, não carrega (sem rede)
 *   npx tsx scripts/seedDiagnosticBank.ts                  → valida e carrega os novos
 *   npx tsx scripts/seedDiagnosticBank.ts --node TABUADA   → só esse nó
 *
 * Item novo → inserido com reviewed_by_human=false; item existente (mesmo
 * node_code + stem) → conteúdo actualizado, aprovação preservada.
 *
 * Requisitos (exceto --dry-run): .env.local com NEXT_PUBLIC_SUPABASE_URL e
 * SUPABASE_SERVICE_ROLE_KEY (o service role ignora RLS, como no seedQuestionBank).
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { createClient } from "@supabase/supabase-js";
import { DOMAINS } from "../src/lib/diagnostic/domains";
import { MISCONCEPTION_CODES } from "../src/lib/diagnostic/misconceptions";

// ── .env.local (mesmo carregador do seedQuestionBank) ───────────────────────
function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  } catch {
    /* usa env do sistema */
  }
}
loadEnvLocal();

// ── Args ────────────────────────────────────────────────────────────────────
const isDryRun = process.argv.includes("--dry-run");
const nodeIdx = process.argv.indexOf("--node");
const filterNode = nodeIdx !== -1 ? process.argv[nodeIdx + 1] : null;

const ITEMS_DIR = resolve(process.cwd(), "scripts/diagnostic-items");
const TEXTS_DIR = resolve(process.cwd(), "scripts/diagnostic-texts");
const CODES = new Set<string>(Object.values(DOMAINS).flatMap((g) => g.ALL_CODES));
const MISC = new Set<string>(MISCONCEPTION_CODES);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

// ── Tipo do item em ficheiro ─────────────────────────────────────────────────
interface RawItem {
  node_code?: string;
  stem?: string;
  figure?: unknown;
  response_type?: string; // 'mcq' (default) | 'open_numeric' | 'open_fraction'
  // MCQ:
  options?: unknown[];
  correct_index?: number;
  option_misconceptions?: Record<string, string>;
  // Abertos:
  answer?: string;
  wrong_answers?: Record<string, string>;
  anchors?: { groups?: string[][]; min?: number }; // open_text
  allow_calculator?: boolean;
  // Comuns:
  hints?: unknown[];
  difficulty?: string;
  is_fluency?: boolean;
  target_latency_ms?: number | null;
  text_id?: string | null; // preenchido ao carregar itens de um texto
}

interface RawText {
  title: string;
  body: string;
  year_level?: number;
  genre?: string;
  source?: string;
  items: RawItem[];
}

const RESPONSE_TYPES = new Set(["mcq", "open_numeric", "open_fraction", "open_text", "audio_reading"]);

// ── Validação (o coração do contrato) ────────────────────────────────────────
function validate(item: RawItem, where: string): string[] {
  const e: string[] = [];
  const rt = item.response_type ?? "mcq";
  if (!RESPONSE_TYPES.has(rt))
    e.push(`response_type inválido: ${JSON.stringify(item.response_type)}`);
  if (!item.node_code || !CODES.has(item.node_code))
    e.push(`node_code inválido: ${JSON.stringify(item.node_code)}`);
  if (!item.stem || typeof item.stem !== "string" || item.stem.trim().length < 3)
    e.push("stem em falta ou demasiado curto");

  // Leitura em voz alta: sem opções/resposta/ajudas (classificada pelo professor, não auto).
  // Deve pertencer a um texto (o text_id é atribuído ao carregar) e não medir latência.
  if (rt === "audio_reading") {
    if (item.is_fluency) e.push("audio_reading: is_fluency deve ser false (sem medição de latência)");
    if (item.allow_calculator) e.push("audio_reading: não faz sentido allow_calculator");
    return e.map((msg) => `  ✗ [${where}] ${msg}`);
  }

  if (rt === "open_text") {
    const anc = item.anchors;
    if (!anc || !Array.isArray(anc.groups) || anc.groups.length < 1) {
      e.push("open_text exige anchors.groups (≥1 grupo de palavras-âncora)");
    } else {
      anc.groups.forEach((g, gi) => {
        if (!Array.isArray(g) || g.length < 1 || g.some((t) => typeof t !== "string" || !t.trim()))
          e.push(`anchors.groups[${gi}] deve ser um array de termos (string não vazia)`);
      });
      if (anc.min != null && (!Number.isInteger(anc.min) || anc.min < 1 || anc.min > anc.groups.length))
        e.push(`anchors.min fora do intervalo (1..${anc.groups.length})`);
    }
  } else if (rt === "mcq") {
    const opts = item.options;
    if (!Array.isArray(opts) || opts.length < 3 || opts.length > 5)
      e.push(`options tem de ter 3 a 5 entradas (tem ${Array.isArray(opts) ? opts.length : "—"})`);
    if (
      typeof item.correct_index !== "number" ||
      !Array.isArray(opts) ||
      item.correct_index < 0 ||
      item.correct_index >= opts.length
    )
      e.push(`correct_index fora do intervalo: ${item.correct_index}`);
    const om = item.option_misconceptions ?? {};
    for (const [k, code] of Object.entries(om)) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || !Array.isArray(opts) || idx < 0 || idx >= opts.length)
        e.push(`option_misconceptions: índice inválido "${k}"`);
      if (idx === item.correct_index)
        e.push(`option_misconceptions: não etiquetar a opção correcta (índice ${k})`);
      if (!MISC.has(code))
        e.push(`option_misconceptions: código desconhecido "${code}" (índice ${k})`);
    }
  } else {
    // open_numeric | open_fraction
    if (!item.answer || typeof item.answer !== "string" || !item.answer.trim())
      e.push("resposta aberta exige 'answer' (string não vazia)");
    if (rt === "open_fraction" && item.answer && !/^-?\d+\s*\/\s*\d+$/.test(item.answer.trim()))
      e.push(`open_fraction: answer deve ter a forma "a/b" (tem "${item.answer}")`);
    const wa = item.wrong_answers ?? {};
    for (const [val, code] of Object.entries(wa)) {
      if (!val.trim()) e.push("wrong_answers: chave (resposta errada) vazia");
      if (val.trim() === (item.answer ?? "").trim())
        e.push(`wrong_answers: não etiquetar a resposta correcta ("${val}")`);
      if (!MISC.has(code))
        e.push(`wrong_answers: código desconhecido "${code}" (resposta "${val}")`);
    }
  }

  if (!Array.isArray(item.hints) || item.hints.length < 2)
    e.push("hints tem de ter ≥2 ajudas graduadas (pista → exemplo)");
  else if (item.hints.some((h) => typeof h !== "string" || !h.trim()))
    e.push("hints: todas têm de ser texto não vazio");
  if (!item.difficulty || !DIFFICULTIES.has(item.difficulty))
    e.push(`difficulty inválida: ${JSON.stringify(item.difficulty)}`);
  if (item.is_fluency && !(typeof item.target_latency_ms === "number" && item.target_latency_ms > 0))
    e.push("is_fluency=true exige target_latency_ms > 0");
  if (item.is_fluency && item.allow_calculator)
    e.push("is_fluency=true não pode ter allow_calculator=true (destrói a medição)");
  return e.map((msg) => `  ✗ [${where}] ${msg}`);
}

// ── Carregar ficheiros ────────────────────────────────────────────────────────
function loadFiles(): { file: string; items: RawItem[] }[] {
  if (!existsSync(ITEMS_DIR)) {
    console.log(`⚠  pasta não encontrada: ${ITEMS_DIR}`);
    return [];
  }
  const files = readdirSync(ITEMS_DIR).filter((f) => f.endsWith(".json"));
  const out: { file: string; items: RawItem[] }[] = [];
  for (const f of files) {
    try {
      const parsed = JSON.parse(readFileSync(join(ITEMS_DIR, f), "utf-8"));
      if (!Array.isArray(parsed)) {
        console.log(`  ✗ [${f}] o ficheiro tem de ser um array de itens`);
        continue;
      }
      out.push({ file: f, items: parsed as RawItem[] });
    } catch (err) {
      console.log(`  ✗ [${f}] JSON inválido: ${(err as Error).message}`);
    }
  }
  return out;
}

// ── Carregar textos (Português) ─────────────────────────────────────────────────
function loadTexts(): { file: string; text: RawText }[] {
  if (!existsSync(TEXTS_DIR)) return [];
  const out: { file: string; text: RawText }[] = [];
  for (const f of readdirSync(TEXTS_DIR).filter((x) => x.endsWith(".json"))) {
    try {
      const t = JSON.parse(readFileSync(join(TEXTS_DIR, f), "utf-8"));
      if (!t.title || !t.body || !Array.isArray(t.items)) {
        console.log(`  ✗ [${f}] texto precisa de title, body e items[]`);
        continue;
      }
      out.push({ file: f, text: t as RawText });
    } catch (err) {
      console.log(`  ✗ [${f}] JSON inválido: ${(err as Error).message}`);
    }
  }
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🧭 Seed do diagnóstico ${isDryRun ? "(dry-run)" : ""}\n`);
  const groups = loadFiles();
  const texts = loadTexts();
  const valid: RawItem[] = [];
  const errors: string[] = [];

  for (const { file, items } of groups) {
    items.forEach((item, i) => {
      if (filterNode && item.node_code !== filterNode) return;
      const errs = validate(item, `${file}#${i}`);
      if (errs.length) errors.push(...errs);
      else valid.push(item);
    });
  }

  // Valida os itens de cada texto (o text_id é atribuído na BD, à frente).
  const validByText: { text: RawText; items: RawItem[] }[] = [];
  for (const { file, text } of texts) {
    const tv: RawItem[] = [];
    text.items.forEach((item, i) => {
      if (filterNode && item.node_code !== filterNode) return;
      const errs = validate(item, `${file}#${i}`);
      if (errs.length) errors.push(...errs);
      else tv.push(item);
    });
    validByText.push({ text, items: tv });
  }
  const textItemCount = validByText.reduce((n, t) => n + t.items.length, 0);

  const byNode: Record<string, number> = {};
  for (const it of valid) byNode[it.node_code!] = (byNode[it.node_code!] ?? 0) + 1;
  for (const { items } of validByText) for (const it of items) byNode[it.node_code!] = (byNode[it.node_code!] ?? 0) + 1;
  console.log("Itens válidos por nó:");
  for (const n of Object.keys(byNode).sort()) console.log(`  ${n.padEnd(24)} ${byNode[n]}`);
  console.log(`\nTotal válidos: ${valid.length + textItemCount} (itens ${valid.length} + textos ${textItemCount} em ${texts.length} texto(s)) | com erro: ${errors.length}`);
  if (errors.length) {
    console.log("\nErros (recusados):");
    console.log(errors.join("\n"));
  }

  if (isDryRun) {
    console.log("\n(dry-run — nada foi carregado)");
    return;
  }
  if (valid.length + textItemCount === 0) {
    console.log("\nNada válido para carregar.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("✗ Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Mapa dos itens já existentes (por node_code + stem) → id.
  const { data: existRows, error: exErr } = await sb
    .from("diag_items")
    .select("id, node_code, stem");
  if (exErr) {
    console.error("✗ Erro a ler diag_items:", exErr.message);
    process.exit(1);
  }
  const idByKey = new Map<string, string>();
  for (const r of existRows ?? []) idByKey.set(`${r.node_code}|||${r.stem}`, r.id);

  // Campos de conteúdo (NÃO inclui reviewed_by_human).
  const toRow = (it: RawItem) => ({
    node_code: it.node_code,
    stem: it.stem,
    figure: it.figure ?? null,
    response_type: it.response_type ?? "mcq",
    options: it.options ?? null,
    correct_index: it.correct_index ?? null,
    option_misconceptions: it.option_misconceptions ?? {},
    answer: it.answer ?? null,
    wrong_answers: it.wrong_answers ?? {},
    anchors: it.anchors ?? null,
    allow_calculator: !!it.allow_calculator,
    hints: it.hints ?? [],
    difficulty: it.difficulty ?? "medium",
    is_fluency: !!it.is_fluency,
    target_latency_ms: it.target_latency_ms ?? null,
    text_id: it.text_id ?? null,
    updated_at: new Date().toISOString(),
  });

  // Textos (Português): upsert por título → id; atribui text_id aos seus itens.
  const textItems: RawItem[] = [];
  for (const { text, items } of validByText) {
    const { data: ex } = await sb.from("diag_texts").select("id").eq("title", text.title).maybeSingle();
    let textId = (ex?.id as string | undefined) ?? undefined;
    if (!textId) {
      const { data: ins, error } = await sb
        .from("diag_texts")
        .insert({
          title: text.title,
          body: text.body,
          year_level: text.year_level ?? null,
          genre: text.genre ?? null,
          source: text.source ?? "original",
          word_count: text.body.split(/\s+/).filter(Boolean).length,
          reviewed_by_human: false,
        })
        .select("id")
        .single();
      if (error || !ins) {
        console.error("✗ Erro a inserir texto:", error?.message);
        process.exit(1);
      }
      textId = ins.id;
      console.log(`  + texto «${text.title}» inserido`);
    } else {
      await sb.from("diag_texts").update({ body: text.body, year_level: text.year_level ?? null, genre: text.genre ?? null }).eq("id", textId);
    }
    for (const it of items) textItems.push({ ...it, text_id: textId });
  }

  const toInsert: Record<string, unknown>[] = [];
  let updated = 0;
  for (const it of [...valid, ...textItems]) {
    const id = idByKey.get(`${it.node_code}|||${it.stem}`);
    if (id) {
      // Actualiza o conteúdo mas PRESERVA reviewed_by_human (não re-aprovar/des-aprovar).
      const { error } = await sb.from("diag_items").update(toRow(it)).eq("id", id);
      if (error) {
        console.error(`✗ Erro a actualizar ${it.node_code} / "${it.stem}":`, error.message);
        process.exit(1);
      }
      updated++;
    } else {
      toInsert.push({ ...toRow(it), reviewed_by_human: false });
    }
  }

  if (toInsert.length) {
    const { error } = await sb.from("diag_items").insert(toInsert);
    if (error) {
      console.error("✗ Erro a inserir:", error.message);
      process.exit(1);
    }
  }
  console.log(
    `\n✓ ${toInsert.length} inseridos (reviewed_by_human=false) · ${updated} actualizados (aprovação preservada).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
