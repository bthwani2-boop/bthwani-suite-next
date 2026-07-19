import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const workflowRoot = path.join(repoRoot, ".github/workflows");
const verify = process.argv.includes("--verify");
const mutable = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(full);
      continue;
    }
    if (!entry.name.endsWith(".yml") && !entry.name.endsWith(".yaml")) continue;
    const relative = path.relative(repoRoot, full).replaceAll(path.sep, "/");
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/);
      if (!match) return;
      const reference = match[1].replace(/^['"]|['"]$/g, "");
      if (reference.startsWith("./") || reference.startsWith("docker://")) return;
      const separator = reference.lastIndexOf("@");
      const revision = separator >= 0 ? reference.slice(separator + 1) : "";
      if (!/^[0-9a-f]{40}$/i.test(revision)) {
        mutable.push({ file: relative, line: index + 1, reference });
      }
    });
  }
}

if (!fs.existsSync(workflowRoot)) {
  console.error("[PINACT FAIL] .github/workflows is missing");
  process.exit(1);
}
visit(workflowRoot);

if (mutable.length > 0) {
  for (const item of mutable) {
    console.error(`${item.file}:${item.line} mutable action reference: ${item.reference}`);
  }
  if (verify) {
    console.error(`[PINACT FAIL] ${mutable.length} mutable action reference(s)`);
    process.exit(1);
  }
  console.log(`[PINACT DIAGNOSTIC] ${mutable.length} mutable action reference(s)`);
} else {
  console.log("[PINACT PASS] every external GitHub Action is pinned to a 40-character commit SHA");
}
