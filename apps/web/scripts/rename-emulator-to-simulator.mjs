#!/usr/bin/env node
/**
 * Phase 1: rename identifiers + prose (keep @/lib/emulator and @/components/emulator paths).
 * Phase 2: rewrite import paths + git mv lib/emulator and components/emulator → simulator.
 *
 * Usage: node scripts/rename-emulator-to-simulator.mjs --phase=1|2
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "../..");

const phase = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1];
if (phase !== "1" && phase !== "2") {
  console.error("Usage: node scripts/rename-emulator-to-simulator.mjs --phase=1|2");
  process.exit(1);
}

const EXT = new Set([".ts", ".tsx", ".md", ".mjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "public/scramjet", "public/controller"]);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (EXT.has(path.extname(name))) files.push(full);
  }
  return files;
}

// longest-first identifier renames (phase 1)
const PHASE1_REPLACEMENTS = [
  ["EMULATOR_TAGLINE", "SIMULATOR_TAGLINE"],
  ["EMULATOR_SUMMARY", "SIMULATOR_SUMMARY"],
  ["EMULATOR_TITLE", "SIMULATOR_TITLE"],
  ["EMULATOR_SHARE_PATH", "SIMULATOR_SHARE_PATH"],
  ["EmulatorContextValue", "SimulatorContextValue"],
  ["EmulatorContext", "SimulatorContext"],
  ["loadEmulatorSearchParams", "loadSimulatorSearchParams"],
  ["buildEmulatorShareUrl", "buildSimulatorShareUrl"],
  ["createEmulatorStore", "createSimulatorStore"],
  ["useEmulatorState", "useSimulatorState"],
  ["emulatorParsers", "simulatorParsers"],
  ["EmulatorState", "SimulatorState"],
  ["EmulatorStore", "SimulatorStore"],
  ["useEmulator", "useSimulator"],
  ["export default function Emulator", "export default function Simulator"],
  ["function Emulator(", "function Simulator("],
  ["<Emulator ", "<Simulator "],
  ["<Emulator>", "<Simulator>"],
  ["</Emulator>", "</Simulator>"],
  ["within <Emulator>", "within <Simulator>"],
  ["import Emulator from", "import Simulator from"],
  ["Emulates the", "Simulates the"],
  ["hud.xyz emulator feedback", "hud.xyz simulator feedback"],
  ["MRBD emulator", "MRBD simulator"],
  ["emulator viewport", "simulator viewport"],
  ["emulator chrome", "simulator chrome"],
  ["emulator iframe", "simulator iframe"],
  ["emulator route", "simulator route"],
  ["emulator pages", "simulator pages"],
  ["emulator toolbar", "simulator toolbar"],
  ["headless emulator", "headless simulator"],
  ["emulator core", "simulator core"],
  ["The emulator", "The simulator"],
  ["the emulator", "the simulator"],
  ["an emulator", "a simulator"],
  ["Emulator broken", "Simulator broken"],
  ["Load a public URL in the emulator", "Load a public URL in the simulator"],
  ["in the emulator", "in the simulator"],
  ["routes to the emulator", "routes to the simulator"],
  ["emulator for the", "simulator for the"],
  ["emulator loads", "simulator loads"],
  ["emulator reproduces", "simulator reproduces"],
  ["## The emulator", "## The simulator"],
  ["`Emulator`", "`Simulator`"],
  ["`useEmulator`", "`useSimulator`"],
  ["`useEmulatorState`", "`useSimulatorState`"],
  ["`emulator/`", "`simulator/`"], // AGENTS.md path refs — phase 1 doc only; dirs renamed in phase 2
  ["`lib/emulator/", "`lib/simulator/"],
  ["components/emulator/`", "components/simulator/`"],
  ["emulator/page.tsx", "simulator/page.tsx"], // doc: route is now page.tsx at root
  ["`/emulator`", "`/`"],
  ["308-redirects to `/emulator`", "308-redirects to `/`"],
  ["redirects `/browser` → `/emulator`", "redirects `/emulator` → `/`"],
  ["sets COOP/COEP on `/emulator`", "sets COOP/COEP on `/`"],
  ["hud.xyz/emulator", "hud.xyz (/) "],
  ["emulator.tsx", "simulator.tsx"],
];

const PHASE2_REPLACEMENTS = [
  ["@/lib/emulator/", "@/lib/simulator/"],
  ["@/lib/emulator", "@/lib/simulator"],
  ["@/components/emulator/", "@/components/simulator/"],
  ["@/components/emulator", "@/components/simulator"],
];

function applyReplacements(content, pairs) {
  let next = content;
  for (const [from, to] of pairs) {
    next = next.split(from).join(to);
  }
  return next;
}

function collectFiles() {
  const roots = [webRoot, path.join(repoRoot, "AGENTS.md"), path.join(repoRoot, "deploy")];
  const files = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    if (fs.statSync(root).isFile()) files.push(root);
    else walk(root, files);
  }
  return [...new Set(files)];
}

function phase1() {
  const files = collectFiles();
  let changed = 0;
  for (const file of files) {
    if (file.endsWith("rename-emulator-to-simulator.mjs")) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = applyReplacements(before, PHASE1_REPLACEMENTS);
    if (after !== before) {
      fs.writeFileSync(file, after);
      console.log("updated:", path.relative(repoRoot, file));
      changed++;
    }
  }
  console.log(`\nphase 1: ${changed} file(s) updated`);
}

function phase2() {
  const libFrom = path.join(webRoot, "lib/emulator");
  const libTo = path.join(webRoot, "lib/simulator");
  const compFrom = path.join(webRoot, "components/emulator");
  const compTo = path.join(webRoot, "components/simulator");

  if (!fs.existsSync(libFrom) || !fs.existsSync(compFrom)) {
    console.error("expected lib/emulator and components/emulator to exist");
    process.exit(1);
  }

  const files = collectFiles();
  let changed = 0;
  for (const file of files) {
    if (file.endsWith("rename-emulator-to-simulator.mjs")) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = applyReplacements(before, PHASE2_REPLACEMENTS);
    if (after !== before) {
      fs.writeFileSync(file, after);
      console.log("updated paths:", path.relative(repoRoot, file));
      changed++;
    }
  }

  execSync(`git mv "${libFrom}" "${libTo}"`, { cwd: repoRoot, stdio: "inherit" });
  execSync(`git mv "${compFrom}" "${compTo}"`, { cwd: repoRoot, stdio: "inherit" });

  console.log(`\nphase 2: ${changed} file(s) updated, directories renamed`);
}

if (phase === "1") phase1();
else phase2();
