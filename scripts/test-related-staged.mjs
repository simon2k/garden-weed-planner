/* global process, console */
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";

const diff = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
  encoding: "utf8",
});

if (diff.status !== 0) {
  process.stderr.write(diff.stderr);
  process.exit(diff.status ?? 1);
}

const stagedSourceFiles = diff.stdout.split("\n").filter((file) => /^src\/.*\.(ts|tsx)$/.test(file));

if (stagedSourceFiles.length === 0) {
  console.log("No staged source TypeScript files; skipping related tests.");
  process.exit(0);
}

const vitest = spawnSync("npx", ["vitest", "related", ...stagedSourceFiles, "--run"], {
  stdio: "inherit",
});

process.exit(vitest.status ?? 1);
