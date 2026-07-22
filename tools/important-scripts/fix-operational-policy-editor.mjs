import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const relativePath = "services/dsh/frontend/shared/platform/use-platform-policies-controller.tsx";
const fullPath = path.join(repoRoot, relativePath);
const before = `    input: DshCreateZoneInput & { readonly reason: string },`;
const after = `    input: {\n      readonly id?: string;\n      readonly name: string;\n      readonly cityCode: string;\n      readonly description: string;\n      readonly isActive: boolean;\n      readonly reason: string;\n    },`;
const current = fs.readFileSync(fullPath, "utf8");
if (current.includes(after)) {
  console.log("operational-policy-editor: already aligned");
  process.exit(0);
}
if (!current.includes(before)) {
  throw new Error(`${relativePath}: expected editor input signature not found`);
}
fs.writeFileSync(fullPath, current.replace(before, after), "utf8");
console.log(`operational-policy-editor: updated ${relativePath}`);
