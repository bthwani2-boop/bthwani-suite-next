import fs from "node:fs";
import path from "node:path";

const targetDir = process.argv[2] ?? "services/dsh/frontend/control-panel";
const repoRoot = path.resolve(import.meta.dirname, "../..");
const absoluteTarget = path.join(repoRoot, targetDir);

const MOJIBAKE_MARKERS = ["Ã", "â€", "Â"];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(absoluteTarget, []);
const findings = [];

for (const file of files) {
  const buffer = fs.readFileSync(file);
  const hasBom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  const text = buffer.toString("utf8");
  const mojibakeHit = MOJIBAKE_MARKERS.some((marker) => text.includes(marker));
  if (hasBom || mojibakeHit) {
    findings.push({
      file: path.relative(repoRoot, file),
      hasBom,
      mojibakeHit,
    });
  }
}

for (const finding of findings) {
  console.log(
    `${finding.file}: ${finding.hasBom ? "BOM " : ""}${finding.mojibakeHit ? "MOJIBAKE" : ""}`.trim(),
  );
}
console.log(`\n${findings.length} file(s) with encoding issues under ${targetDir}`);
