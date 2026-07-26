import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { repoRoot, listFiles, toPosix } from "../guards/_guard-utils.mjs";

export { repoRoot, listFiles, toPosix };

export const inventoryRoot = path.join(repoRoot, ".diagnostics", "remediation", "inventory");

export function writeInventory(name, data) {
  fs.mkdirSync(inventoryRoot, { recursive: true });
  const target = path.join(inventoryRoot, `${name}.json`);
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`remediation:discover:${name} -> .diagnostics/remediation/inventory/${name}.json (${Array.isArray(data.items) ? data.items.length : "n/a"} items)`);
  return target;
}

export function readJson(relativePath) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return undefined;
  }
}

export function gitHeadSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

export function sha256(content) {
  return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}
