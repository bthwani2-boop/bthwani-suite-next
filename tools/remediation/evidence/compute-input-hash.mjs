// Computes the dedup key from spec §13.5:
// inputHash = taskContractHash + sourceSha + toolVersion + configHash + relevantFilesHash
// A cached result may be reused within the same pipeline only when every component
// matches and the result is not runtime-sensitive or expired.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, sha256, gitHeadSha } from "../_remediation-utils.mjs";

export function computeInputHash({ contractHash, sourceSha, toolVersion, configHash, relevantFilesHash }) {
  return sha256(Buffer.from([contractHash, sourceSha, toolVersion, configHash, relevantFilesHash].join("|")));
}

export function hashRelevantFiles(relativePaths) {
  const digests = relativePaths
    .slice()
    .sort()
    .map((relativePath) => {
      const full = path.join(repoRoot, relativePath);
      return fs.existsSync(full) ? sha256(fs.readFileSync(full)) : `MISSING:${relativePath}`;
    });
  return sha256(Buffer.from(digests.join("|")));
}

function main() {
  const [contractPath, toolVersion, ...relevantFiles] = process.argv.slice(2);
  if (!contractPath || !toolVersion) {
    console.error("usage: compute-input-hash.mjs <task-contract.json> <tool-version> <relevant-file...>");
    process.exit(2);
  }
  const contractFull = path.resolve(repoRoot, contractPath);
  const contractHash = sha256(fs.readFileSync(contractFull));
  const inputHash = computeInputHash({
    contractHash,
    sourceSha: gitHeadSha(),
    toolVersion,
    configHash: sha256(Buffer.from(toolVersion)),
    relevantFilesHash: hashRelevantFiles(relevantFiles),
  });
  console.log(inputHash);
}

if (process.argv[1] && process.argv[1].endsWith("compute-input-hash.mjs")) main();
