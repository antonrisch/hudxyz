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
  const categories = spawnSync(process.execPath, [join(here, "seed-categories.mjs")], {
    stdio: "inherit",
  });
  if ((categories.status ?? 1) !== 0) {
    process.exit(categories.status ?? 1);
  }
  const collections = spawnSync(process.execPath, [join(here, "seed-collections.mjs")], {
    stdio: "inherit",
  });
  process.exit(collections.status ?? 1);
}

if (flag === "--seed-collections") {
  const result = spawnSync(process.execPath, [join(here, "seed-collections.mjs")], {
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

if (flag === "--rebuild-search") {
  const result = spawnSync(process.execPath, [join(here, "rebuild-search-index.mjs")], {
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
  --seed                  Seed categories, then collections
  --seed-collections      Seed New / Popular / Featured collections only
  --rebuild-search        Clear and backfill the app_search FTS index`);
  process.exit(1);
}

const result = spawnSync("drizzle-kit", [command], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
