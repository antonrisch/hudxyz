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

const command = flag ? commands[flag] : undefined;

if (!command) {
  console.error(`Usage: pnpm db <flag>

  --gen, --generate, -g   Generate migrations from schema
  --migrate, -m           Apply migrations
  --push, -p              Push schema to the database
  --studio, -s            Open Drizzle Studio`);
  process.exit(1);
}

const webRoot = join(here, "..");
const drizzleConfig = join(webRoot, "drizzle.config.ts");

const result = spawnSync("drizzle-kit", [command, "--config", drizzleConfig], {
  stdio: "inherit",
  shell: true,
  cwd: webRoot,
});

process.exit(result.status ?? 1);
