#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "aggregate-ownership-gate";
const registryRelative = "tools/verification/aggregate-ownership.json";
const registryPath = path.join(repoRoot, registryRelative);
const violations = [];

function readRegistry() {
  if (!fs.existsSync(registryPath)) {
    violations.push(`${registryRelative}: missing`);
    return { aggregates: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (error) {
    violations.push(`${registryRelative}: invalid JSON (${error.message})`);
    return { aggregates: [] };
  }
}

function listSourceFiles(relativeRoot) {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if ([".git", "node_modules", "dist", "generated"].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (/\.(?:go|sql)$/i.test(entry.name) && !/_test\.go$/i.test(entry.name)) {
        const relative = path.relative(repoRoot, absolute).replaceAll("\\", "/");
        if (!/(?:^|\/)(?:tests?|seeds?)(?:\/|$)/i.test(relative)) files.push({ absolute, relative });
      }
    }
  };
  visit(absoluteRoot);
  return files;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)--[^\r\n]*/gm, "$1")
    .replace(/(^|\s)\/\/[^\r\n]*/gm, "$1");
}

const mutationPattern = /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE)\s+(?:ONLY\s+)?["`]?([a-z_][a-z0-9_]*)/gi;
const sourceFiles = [...listSourceFiles("core"), ...listSourceFiles("services")];
const registry = readRegistry();
const aggregates = Array.isArray(registry.aggregates) ? registry.aggregates : [];
const aggregateIds = new Set();

for (const aggregate of aggregates) {
  if (!aggregate?.id || aggregateIds.has(aggregate.id)) {
    violations.push(`${registryRelative}: duplicate or missing aggregate id '${aggregate?.id ?? ""}'`);
    continue;
  }
  aggregateIds.add(aggregate.id);
  if (!aggregate.ownerService || !Array.isArray(aggregate.tables) || aggregate.tables.length === 0 || !Array.isArray(aggregate.writerRoots) || aggregate.writerRoots.length === 0) {
    violations.push(`${registryRelative}: ${aggregate.id} must declare ownerService, tables, and writerRoots`);
    continue;
  }

  const tables = new Set(aggregate.tables.map((table) => String(table).toLowerCase()));
  const writerRoots = aggregate.writerRoots.map((root) => String(root).replaceAll("\\", "/"));
  const writerServices = new Set();
  let writeCount = 0;

  for (const file of sourceFiles) {
    const source = stripComments(fs.readFileSync(file.absolute, "utf8"));
    mutationPattern.lastIndex = 0;
    for (const match of source.matchAll(mutationPattern)) {
      const table = String(match[1]).toLowerCase();
      if (!tables.has(table)) continue;
      writeCount += 1;
      const isCanonicalWriter = writerRoots.some((root) => file.relative.startsWith(root));
      if (!isCanonicalWriter) {
        violations.push(`${aggregate.id}: mutable table '${table}' is written outside canonical writer roots: ${file.relative}`);
        continue;
      }
      writerServices.add(aggregate.ownerService);
    }
  }

  if (writeCount === 0) violations.push(`${aggregate.id}: no canonical mutable-table writer found`);
  if (writerServices.size !== 1) violations.push(`${aggregate.id}: expected exactly one canonical writer service, found ${[...writerServices].join(",") || "none"}`);
}

if (aggregates.length === 0) violations.push(`${registryRelative}: no aggregates declared`);
fail(guardId, violations);
