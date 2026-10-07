/**
 * PROF.IA — Aprovar itens de diagnóstico revistos (reviewed_by_human = true)
 *
 * Passa a `true` o campo reviewed_by_human dos itens presentes nos ficheiros
 * de scripts/diagnostic-items/ (o conjunto que o Tiago reviu). Só depois disto
 * é que um item fica disponível para o motor de diagnóstico.
 *
 * Uso:
 *   npx tsx scripts/approveDiagnosticItems.ts                 → aprova todos os dos ficheiros
 *   npx tsx scripts/approveDiagnosticItems.ts --node TABUADA  → só esse nó
 *   npx tsx scripts/approveDiagnosticItems.ts --dry-run       → mostra o que faria
 *
 * Rejeitar um item = removê-lo do ficheiro (e da BD) antes de correr isto.
 * Requisitos: .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { createClient } from "@supabase/supabase-js";

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
    /* env do sistema */
  }
}
loadEnvLocal();

const isDryRun = process.argv.includes("--dry-run");
const nodeIdx = process.argv.indexOf("--node");
const filterNode = nodeIdx !== -1 ? process.argv[nodeIdx + 1] : null;

const ITEMS_DIR = resolve(process.cwd(), "scripts/diagnostic-items");
const TEXTS_DIR = resolve(process.cwd(), "scripts/diagnostic-texts");

interface RawItem {
  node_code?: string;
  stem?: string;
}

function addStems(byNode: Record<string, string[]>, items: RawItem[]) {
  for (const it of items) {
    if (!it.node_code || !it.stem) continue;
    if (filterNode && it.node_code !== filterNode) continue;
    (byNode[it.node_code] ??= []).push(it.stem);
  }
}

function collectStemsByNode(): Record<string, string[]> {
  const byNode: Record<string, string[]> = {};
  // Itens avulsos (scripts/diagnostic-items/*.json → array de itens).
  if (existsSync(ITEMS_DIR)) {
    for (const f of readdirSync(ITEMS_DIR).filter((x) => x.endsWith(".json"))) {
      try {
        addStems(byNode, JSON.parse(readFileSync(join(ITEMS_DIR, f), "utf-8")) as RawItem[]);
      } catch {
        /* ignora ficheiro inválido */
      }
    }
  }
  // Itens dentro de textos (scripts/diagnostic-texts/*.json → { items: [...] }).
  if (existsSync(TEXTS_DIR)) {
    for (const f of readdirSync(TEXTS_DIR).filter((x) => x.endsWith(".json"))) {
      try {
        const t = JSON.parse(readFileSync(join(TEXTS_DIR, f), "utf-8"));
        if (Array.isArray(t.items)) addStems(byNode, t.items as RawItem[]);
      } catch {
        /* ignora ficheiro inválido */
      }
    }
  }
  return byNode;
}

async function main() {
  const byNode = collectStemsByNode();
  const nodes = Object.keys(byNode).sort();
  const total = nodes.reduce((n, k) => n + byNode[k].length, 0);
  console.log(`\n✅ Aprovar itens revistos ${isDryRun ? "(dry-run)" : ""}\n`);
  for (const n of nodes) console.log(`  ${n.padEnd(24)} ${byNode[n].length}`);
  console.log(`\nTotal a aprovar: ${total}`);

  if (isDryRun) {
    console.log("\n(dry-run — nada alterado)");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("✗ Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  let updated = 0;
  for (const n of nodes) {
    const { data, error } = await sb
      .from("diag_items")
      .update({ reviewed_by_human: true })
      .eq("node_code", n)
      .in("stem", byNode[n])
      .select("id");
    if (error) {
      console.error(`✗ Erro em ${n}:`, error.message);
      process.exit(1);
    }
    updated += data?.length ?? 0;
  }
  console.log(`\n✓ ${updated} itens marcados reviewed_by_human=true.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
