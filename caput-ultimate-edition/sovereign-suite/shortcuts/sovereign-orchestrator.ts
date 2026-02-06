// sovereign-suite/shortcuts/sovereign-orchestrator.ts
//
// Sovereign Suite — Document Automation Orchestrator
//
// TypeScript implementation of the 8 Shortcuts automation recipes:
//   1. "Finish the Job"    — Master pipeline orchestrator
//   2. "Intake - Collect"  — Gather + rename + stage files
//   3. "Classifier - Route (Pro)" — OCR → Rules → Keywords → AI → Route
//   4. "Binder - Legal Pack"      — Assemble legal case binder
//   5. "Finance Pack"             — Archive bank/invoice docs
//   6. "ATO Pack"                 — Archive tax office docs
//   7. "Trust Pack"               — Archive trust docs
//   8. "Health Pack"              — Archive health docs
//
// All personal identifiers are parameterised via environment or config.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, writeFileSync, statSync } from "fs";
import { join, basename, extname } from "path";
import { execSync } from "child_process";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

interface KeywordCategory {
  priority: number;
  keywords: string[];
}

interface KeywordsConfig {
  version: string;
  categories: Record<string, KeywordCategory>;
}

interface RouteRule {
  id: string;
  description: string;
  match: { type: string; patterns: string[] };
  destination: string;
  preserveOriginalFilename?: boolean;
  priority: number;
}

interface RoutesConfig {
  version: string;
  vaultRoot: string;
  rules: RouteRule[];
  folderStructure: Record<string, string[]>;
}

interface SuiteConfig {
  vaultRoot: string;
  configDir: string;
  boosterPath: string;
  keywords: KeywordsConfig;
  routes: RoutesConfig;
  caseNumber: string;
  businessName: string;
  trustName: string;
}

interface ClassificationResult {
  category: string;
  confidence: number;
  method: "rule" | "keyword" | "ai" | "unsorted";
  destination: string;
  preserveOriginalFilename: boolean;
}

interface LogEntry {
  timestamp: string;
  filename: string;
  category: string;
  method: string;
  destination: string;
  sha256: string;
}

// ---------------------------------------------------------------------------
// Load config
// ---------------------------------------------------------------------------

function loadConfig(configDir: string): SuiteConfig {
  const kwPath = join(configDir, "keywords.json");
  const rtPath = join(configDir, "routes.json");

  const keywords: KeywordsConfig = existsSync(kwPath)
    ? JSON.parse(readFileSync(kwPath, "utf-8"))
    : { version: "0.0.0", categories: {} };

  const routes: RoutesConfig = existsSync(rtPath)
    ? JSON.parse(readFileSync(rtPath, "utf-8"))
    : { version: "0.0.0", vaultRoot: "./vault", rules: [], folderStructure: {} };

  const vaultRoot = process.env.VAULT_ROOT || routes.vaultRoot || "./vault";

  return {
    vaultRoot,
    configDir,
    boosterPath: join(configDir, "..", "bin", "booster.sh"),
    keywords,
    routes,
    caseNumber: process.env.GENESIS_CASE_NUMBER || "",
    businessName: process.env.GENESIS_BUSINESS_NAME || "",
    trustName: process.env.GENESIS_TRUST_NAME || "",
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function dateStamp(): string {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function appendLog(config: SuiteConfig, entry: LogEntry): void {
  const date = new Date().toISOString().slice(0, 10);
  const logDir = join(config.vaultRoot, "Logs");
  ensureDir(logDir);
  const logFile = join(logDir, `Classifier-${date}.log`);
  const line = JSON.stringify(entry) + "\n";
  writeFileSync(logFile, line, { flag: "a" });
}

function resolvePatterns(patterns: string[], config: SuiteConfig): string[] {
  return patterns.map((p) =>
    p
      .replace("${CASE_NUMBER}", config.caseNumber)
      .replace("${BUSINESS_NAME}", config.businessName)
      .replace("${TRUST_NAME}", config.trustName)
  ).filter((p) => p.length > 0);
}

// ---------------------------------------------------------------------------
// OCR stub — in production, use Tesseract or system OCR
// ---------------------------------------------------------------------------

function extractText(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".txt" || ext === ".md" || ext === ".csv") {
    return readFileSync(filePath, "utf-8");
  }
  // For PDFs/images: attempt pdftotext, fall back to empty
  if (ext === ".pdf") {
    try {
      return execSync(`pdftotext "${filePath}" -`, { encoding: "utf-8", timeout: 10000 });
    } catch {
      return "";
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Classification engine
// ---------------------------------------------------------------------------

function classifyByRules(text: string, config: SuiteConfig): ClassificationResult | null {
  const lower = text.toLowerCase();
  const sorted = [...config.routes.rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    const patterns = resolvePatterns(rule.match.patterns, config);
    const match = rule.match.type === "contains_any"
      ? patterns.some((p) => lower.includes(p.toLowerCase()))
      : patterns.every((p) => lower.includes(p.toLowerCase()));

    if (match) {
      return {
        category: rule.id,
        confidence: 1.0,
        method: "rule",
        destination: rule.destination,
        preserveOriginalFilename: rule.preserveOriginalFilename ?? false,
      };
    }
  }
  return null;
}

function classifyByKeywords(text: string, config: SuiteConfig): ClassificationResult | null {
  const lower = text.toLowerCase();
  let bestCategory: string | null = null;
  let bestPriority = Infinity;
  let bestMatchCount = 0;

  for (const [cat, def] of Object.entries(config.keywords.categories)) {
    const matchCount = def.keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
    if (matchCount > 0 && (def.priority < bestPriority || (def.priority === bestPriority && matchCount > bestMatchCount))) {
      bestCategory = cat;
      bestPriority = def.priority;
      bestMatchCount = matchCount;
    }
  }

  if (!bestCategory) return null;

  // Map category to destination folder
  const parts = bestCategory.split(".");
  const topFolder = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const subFolder = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "";
  const destination = subFolder ? `${topFolder}/${subFolder}` : topFolder;

  return {
    category: bestCategory,
    confidence: 0.8,
    method: "keyword",
    destination,
    preserveOriginalFilename: false,
  };
}

function classifyByAI(text: string, config: SuiteConfig): ClassificationResult | null {
  if (!existsSync(config.boosterPath)) return null;

  try {
    const result = execSync(`echo ${JSON.stringify(text.slice(0, 4000))} | bash "${config.boosterPath}"`, {
      encoding: "utf-8",
      timeout: 30000,
    }).trim();

    const parsed = JSON.parse(result);
    if (parsed.category && parsed.category !== "unknown") {
      const parts = parsed.category.split(".");
      const topFolder = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const subFolder = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "";

      return {
        category: parsed.category,
        confidence: parsed.confidence || 0.6,
        method: "ai",
        destination: subFolder ? `${topFolder}/${subFolder}` : topFolder,
        preserveOriginalFilename: false,
      };
    }
  } catch {
    // AI booster failed — fall through to unsorted
  }
  return null;
}

function classify(text: string, config: SuiteConfig): ClassificationResult {
  // Priority: rules > keywords > AI > unsorted
  return (
    classifyByRules(text, config) ||
    classifyByKeywords(text, config) ||
    classifyByAI(text, config) ||
    {
      category: "unsorted",
      confidence: 0,
      method: "unsorted" as const,
      destination: "Intake/Unsorted",
      preserveOriginalFilename: false,
    }
  );
}

// ---------------------------------------------------------------------------
// Shortcut 2: Intake - Collect
// ---------------------------------------------------------------------------

function intakeCollect(config: SuiteConfig, sourceDir: string): string[] {
  const intakeDir = join(config.vaultRoot, "Intake", "From-iPhone");
  ensureDir(intakeDir);

  if (!existsSync(sourceDir)) {
    console.log(`[intake] Source directory not found: ${sourceDir}`);
    return [];
  }

  const files = readdirSync(sourceDir).filter((f) => !f.startsWith("."));
  const collected: string[] = [];

  for (const file of files) {
    const src = join(sourceDir, file);
    if (!statSync(src).isFile()) continue;

    const ext = extname(file);
    const base = basename(file, ext);
    const stamped = `${dateStamp()}_${base}${ext}`;
    const dst = join(intakeDir, stamped);

    copyFileSync(src, dst);
    collected.push(dst);
    console.log(`  [+] ${file} → ${stamped}`);
  }

  console.log(`[intake] Collected ${collected.length} files`);
  return collected;
}

// ---------------------------------------------------------------------------
// Shortcut 3: Classifier - Route (Pro)
// ---------------------------------------------------------------------------

function classifierRoute(config: SuiteConfig, files: string[]): LogEntry[] {
  const entries: LogEntry[] = [];

  for (const filePath of files) {
    const text = extractText(filePath);
    const result = classify(text, config);
    const destDir = join(config.vaultRoot, result.destination);
    ensureDir(destDir);

    const filename = result.preserveOriginalFilename
      ? basename(filePath)
      : basename(filePath);

    const destPath = join(destDir, filename);
    copyFileSync(filePath, destPath);

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      filename: basename(filePath),
      category: result.category,
      method: result.method,
      destination: result.destination,
      sha256: sha256(filePath),
    };

    appendLog(config, entry);
    entries.push(entry);

    console.log(`  [${result.method}] ${basename(filePath)} → ${result.destination} (${result.category}, ${result.confidence})`);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Shortcut 4-8: Pack generators
// ---------------------------------------------------------------------------

interface PackResult {
  name: string;
  fileCount: number;
  files: string[];
  outputPath: string;
  generatedAt: string;
}

function collectFromFolders(vaultRoot: string, folders: string[], filterDays?: number): string[] {
  const files: string[] = [];
  const cutoff = filterDays
    ? new Date(Date.now() - filterDays * 86400000)
    : null;

  for (const folder of folders) {
    const dir = join(vaultRoot, folder);
    if (!existsSync(dir)) continue;

    for (const file of readdirSync(dir)) {
      const full = join(dir, file);
      if (!statSync(full).isFile()) continue;
      if (cutoff) {
        const mtime = statSync(full).mtime;
        if (mtime < cutoff) continue;
      }
      files.push(full);
    }
  }
  return files;
}

function generateTOC(files: string[]): string {
  const lines = ["# Table of Contents", "", `Generated: ${new Date().toISOString()}`, ""];
  files.forEach((f, i) => {
    lines.push(`${i + 1}. ${basename(f)}`);
  });
  return lines.join("\n");
}

function buildPack(config: SuiteConfig, name: string, folders: string[], filterDays?: number): PackResult {
  const files = collectFromFolders(config.vaultRoot, folders, filterDays);
  const outputDir = join(config.vaultRoot, "Packs");
  ensureDir(outputDir);

  const toc = generateTOC(files);
  const tocPath = join(outputDir, `${name}-TOC-${dateStamp()}.md`);
  writeFileSync(tocPath, toc);

  console.log(`[${name}] ${files.length} files collected, TOC at ${tocPath}`);

  return {
    name,
    fileCount: files.length,
    files: files.map(basename),
    outputPath: tocPath,
    generatedAt: new Date().toISOString(),
  };
}

function legalPack(config: SuiteConfig): PackResult {
  const caseFolder = process.env.GENESIS_CASE_FOLDER || "Family-Case";
  return buildPack(config, "Legal-Binder", [
    `Legal/${caseFolder}`,
    `Legal/${caseFolder}/Affidavits`,
    `Legal/${caseFolder}/Court-Orders`,
    `Legal/${caseFolder}/Financial-Statements`,
    `Legal/${caseFolder}/Correspondence`,
    `Legal/${caseFolder}/Subpoenas`,
    `Legal/${caseFolder}/Evidence`,
  ]);
}

function financePack(config: SuiteConfig): PackResult {
  return buildPack(config, "Finance-Pack", [
    "Finance/Bank-Statements",
    "Finance/Invoices",
  ], 90);
}

function atoPack(config: SuiteConfig): PackResult {
  return buildPack(config, "ATO-Pack", [
    "ATO/Notices",
    "ATO/BAS",
    "ATO/IAS",
  ]);
}

function trustPack(config: SuiteConfig): PackResult {
  return buildPack(config, "Trust-Pack", [
    "Trust/Deeds",
    "Trust/Distributions",
  ]);
}

function healthPack(config: SuiteConfig): PackResult {
  return buildPack(config, "Health-Pack", [
    "Health/Referrals",
    "Health/Results",
    "Health/Claims",
  ]);
}

// ---------------------------------------------------------------------------
// Shortcut 1: "Finish the Job" — Master orchestrator
// ---------------------------------------------------------------------------

async function finishTheJob(config: SuiteConfig, sourceDir: string): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   SOVEREIGN SUITE — FINISH THE JOB                   ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();

  // Step 1: Intake
  console.log("── INTAKE ────────────────────────────────────────────");
  const collected = intakeCollect(config, sourceDir);
  console.log();

  // Step 2: Classify + Route
  console.log("── CLASSIFY & ROUTE ──────────────────────────────────");
  const entries = classifierRoute(config, collected);
  console.log();

  // Step 3: Generate packs
  console.log("── GENERATE PACKS ────────────────────────────────────");
  const packs = [
    legalPack(config),
    financePack(config),
    atoPack(config),
    trustPack(config),
    healthPack(config),
  ];

  console.log();
  console.log("── SUMMARY ───────────────────────────────────────────");
  console.log(`  Files collected:  ${collected.length}`);
  console.log(`  Files classified: ${entries.length}`);
  console.log(`  Packs generated:  ${packs.length}`);
  for (const pack of packs) {
    console.log(`    ${pack.name}: ${pack.fileCount} files`);
  }
  console.log();
  console.log("  Done.");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HELP = `Sovereign Suite — Document Automation Orchestrator

Usage: npx ts-node sovereign-suite/shortcuts/sovereign-orchestrator.ts <command> [args]

Commands:
  run <source-dir>     Run full pipeline (Finish the Job)
  intake <source-dir>  Collect files from source directory
  classify <file...>   Classify and route specific files
  legal-pack           Generate legal case binder
  finance-pack         Generate finance archive (last 90 days)
  ato-pack             Generate ATO archive
  trust-pack           Generate trust archive
  health-pack          Generate health archive

Environment:
  VAULT_ROOT             Vault folder root (default: iCloud Drive path)
  GENESIS_CASE_NUMBER    Court case number (for rule matching)
  GENESIS_CASE_FOLDER    Legal case folder name (default: Family-Case)
  GENESIS_BUSINESS_NAME  Business name (for rule matching)
  GENESIS_TRUST_NAME     Trust name (for rule matching)
  ANTHROPIC_API_KEY      For AI classification booster
`;

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const configDir = join(__dirname, "..", "config");
  const config = loadConfig(configDir);

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(HELP);
    return;
  }

  switch (cmd) {
    case "run": {
      const sourceDir = process.argv[3];
      if (!sourceDir) { console.error("Usage: run <source-dir>"); process.exit(1); }
      await finishTheJob(config, sourceDir);
      break;
    }
    case "intake": {
      const sourceDir = process.argv[3];
      if (!sourceDir) { console.error("Usage: intake <source-dir>"); process.exit(1); }
      intakeCollect(config, sourceDir);
      break;
    }
    case "classify": {
      const files = process.argv.slice(3);
      if (files.length === 0) { console.error("Usage: classify <file...>"); process.exit(1); }
      classifierRoute(config, files);
      break;
    }
    case "legal-pack":
      legalPack(config);
      break;
    case "finance-pack":
      financePack(config);
      break;
    case "ato-pack":
      atoPack(config);
      break;
    case "trust-pack":
      trustPack(config);
      break;
    case "health-pack":
      healthPack(config);
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("[Sovereign Suite] Fatal:", err);
  process.exit(1);
});
