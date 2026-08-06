// Fails when an exported Go HTTP handler (func Handle*/handle*) has no
// reference anywhere else in its service's backend tree. This is the
// structural fix for the X1/X2 remediation in this session: repeated
// "governed"/"sovereign"/"durable" handler generations were layered on top
// of earlier ones without ever removing the superseded handler, because
// nothing flagged the orphaned original. A handler with exactly one match
// for its own name (the func declaration itself) is unreferenced dead code.
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, isExcluded } from "./_guard-utils.mjs";

const guardId = "go-handler-generation-gate";
const violations = [];

const SERVICES = [
  { id: "dsh", root: "services/dsh/backend/internal" },
  { id: "wlt", root: "services/wlt/backend/internal" },
];

// func handleFoo(...            -- top-level function
// func (h *Handler) HandleFoo(  -- method on a receiver
const HANDLER_DECL_RE = /^func\s+(?:\([^)]*\)\s+)?((?:Handle|handle)[A-Za-z0-9_]*)\s*\(/;

function listGoFiles(dir, files = []) {
  const full = path.join(repoRoot, dir);
  if (!fs.existsSync(full)) return files;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (isExcluded(entryPath, entry.isDirectory(), entry.name)) continue;
    if (entry.isDirectory()) {
      listGoFiles(entryPath, files);
      continue;
    }
    if (entry.name.endsWith(".go")) files.push(entryPath);
  }
  return files;
}

for (const service of SERVICES) {
  const files = listGoFiles(service.root);
  if (files.length === 0) continue;

  const contents = new Map();
  for (const file of files) {
    contents.set(file, fs.readFileSync(path.join(repoRoot, file), "utf8"));
  }

  const handlers = [];
  for (const [file, content] of contents) {
    if (file.endsWith("_test.go")) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(HANDLER_DECL_RE);
      if (match) handlers.push({ name: match[1], file, line: i + 1 });
    }
  }

  const combined = [...contents.values()];
  for (const handler of handlers) {
    const nameRe = new RegExp(`\\b${handler.name}\\b`, "g");
    let totalMatches = 0;
    for (const content of combined) {
      totalMatches += (content.match(nameRe) || []).length;
    }
    if (totalMatches <= 1) {
      violations.push({
        file: handler.file,
        line: handler.line,
        message: `UNREFERENCED_HANDLER: ${handler.name} has no reference anywhere in ${service.id}'s backend tree outside its own declaration (route registration, caller, or test). Delete it or wire it up.`,
      });
    }
  }
}

fail(guardId, violations);
