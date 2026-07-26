// Builds manifest.json for one task's evidence bundle: identity, source SHA,
// contract hash, and the list of evidence files with their sha256 digests.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, gitHeadSha, sha256 } from "../_remediation-utils.mjs";

export function buildManifest({ taskId, contractPath, evidenceDir }) {
  const sourceSha = gitHeadSha();
  const contractFull = path.resolve(repoRoot, contractPath);
  const contract = JSON.parse(fs.readFileSync(contractFull, "utf8"));
  const contractHash = sha256(fs.readFileSync(contractFull));
  const files = fs.existsSync(evidenceDir)
    ? fs.readdirSync(evidenceDir).filter((name) => fs.statSync(path.join(evidenceDir, name)).isFile())
    : [];
  const artifacts = files.map((name) => ({
    name,
    sha256: sha256(fs.readFileSync(path.join(evidenceDir, name))),
  }));
  return {
    schemaVersion: 1,
    taskId,
    sourceSha,
    contractHash,
    contractPath,
    generatedAt: new Date().toISOString(),
    artifacts,
  };
}

function main() {
  const [taskId, contractPath, evidenceDir] = process.argv.slice(2);
  if (!taskId || !contractPath || !evidenceDir) {
    console.error("usage: create-manifest.mjs <task-id> <contract-path> <evidence-dir>");
    process.exit(2);
  }
  const manifest = buildManifest({ taskId, contractPath, evidenceDir: path.resolve(repoRoot, evidenceDir) });
  const target = path.join(path.resolve(repoRoot, evidenceDir), "manifest.json");
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`create-manifest: ${target}`);
}

if (process.argv[1]?.endsWith("create-manifest.mjs")) main();
