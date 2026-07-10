#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const commands = {
  "--gen": "generate",
  "--generate": "generate",
  "-g": "generate",
  "--migrate": "migrate",
  "-m": "migrate",
  "--push": "push",
  "-p": "push",
  "--studio": "studio",
  "-s": "studio",
};

const flag = process.argv[2];
const here = dirname(fileURLToPath(import.meta.url));

if (flag === "--seed") {
  const result = spawnSync(process.execPath, [join(here, "seed-categories.mjs")], {
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

const command = flag ? commands[flag] : undefined;

if (!command) {
  console.error(`Usage: pnpm db <flag>

  --gen, --generate, -g   Generate migrations from schema
  --migrate, -m           Apply migrations
  --push, -p              Push schema to the database
  --studio, -s            Open Drizzle Studio
  --seed                  Seed reference data (categories)`);
  process.exit(1);
}

const result = spawnSync("drizzle-kit", [command], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
