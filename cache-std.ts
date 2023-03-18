#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

import * as fs from "https://deno.land/std@0.180.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.180.0/path/mod.ts";

// --- Configuration -----------------------------------------------------------

const REPO_URL = "https://github.com/denoland/deno_std";
const REPO_DIR = "./temp/deno_std";

const FILES_GLOB = "**/*/*.ts";
const EXCLUDE = [
  ".devcontainer/",
  ".git/",
  ".github/",
];

const DEPS_FILE = "./temp/imports.ts";
const DEPS_URL = "https://deno.land/std";

// --- Entry point -------------------------------------------------------------

if (import.meta.main) main();

function main() {
  info("Cloning Deno's standard library repository");
  gitClone(REPO_URL, REPO_DIR, ["--depth=1"]);

  info("Generating the imports file");
  const entries = findFiles(FILES_GLOB, REPO_DIR, EXCLUDE);
  const imports = generateImports(entries, DEPS_URL, REPO_DIR);
  writeLines(imports, DEPS_FILE);

  info("Caching the standard library");
  cacheDependencies(DEPS_FILE);

  info("--- DONE ---");
}

// --- Core --------------------------------------------------------------------

function* generateImports(
  entries: IterableIterator<fs.WalkEntry>,
  url: string,
  root: string,
) {
  const rootAbs = path.resolve(root);
  for (const entry of entries) {
    const fragment = entry.path.replace(`${rootAbs}${path.sep}`, "");
    yield `import "${url}/${fragment}";\n`;
  }
}

// --- Helpers -----------------------------------------------------------------

function info(message: string) {
  console.info(`[%cINFO%c] ${message}`, "color: #00A0F0;", "color: default;");
}

function gitClone(repo: string, dir?: string, args: string[] = []) {
  dir = dir ?? repo.substring(repo.lastIndexOf("/") + 1);
  return new Deno.Command("git", {
    args: ["clone", ...args, "--", repo, dir],
    stderr: "inherit",
    stdout: "inherit",
  }).outputSync();
}

function findFiles(glob: string, root: string, exclude: string[] = []) {
  return fs.expandGlobSync(glob, {
    root: root,
    exclude: exclude,
    includeDirs: false,
    followSymlinks: false,
    caseInsensitive: true,
    extended: true,
    globstar: true,
  });
}

function writeLines(lines: Generator<string> | string[], file: string) {
  fs.ensureFileSync(file);
  const fsfile = Deno.openSync(file, {
    create: true,
    truncate: true,
    write: true,
  });
  const encoder = new TextEncoder();
  for (const line of lines) {
    fsfile.write(encoder.encode(line));
  }
  fsfile.close();
}

function cacheDependencies(...files: string[]) {
  return new Deno.Command(Deno.execPath(), {
    args: ["cache", ...files],
    stderr: "inherit",
  }).outputSync();
}
