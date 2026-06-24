import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, repoRoot, toPosix } from "./_guard-utils.mjs";

const violations = [];
const dshUiRoots = [
  "services/dsh/frontend/app-client/",
  "services/dsh/frontend/app-partner/",
  "services/dsh/frontend/app-field/",
  "services/dsh/frontend/app-captain/",
  "services/dsh/frontend/control-panel/",
];
const wltUiRoots = [
  "services/wlt/frontend/dsh/app-client/",
  "services/wlt/frontend/dsh/app-partner/",
  "services/wlt/frontend/dsh/app-field/",
  "services/wlt/frontend/dsh/app-captain/",
  "services/wlt/frontend/dsh/control-panel/",
];

for (const file of listCodeFiles()) {
  const rel = toPosix(file);
  if ([...dshUiRoots, ...wltUiRoots].some((root) => rel.startsWith(root))) {
    const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
    if (/\bfetch\s*\(/.test(source)) {
      violations.push({ file: rel, message: "UI-only surface must not call fetch; use the sovereign shared brain" });
    }
    if (/process\.env/.test(source)) {
      violations.push({ file: rel, message: "UI-only surface must not resolve runtime environment" });
    }
  }
  if (rel.startsWith("services/wlt/") && !rel.startsWith("services/wlt/frontend/dsh/shared/")) {
    const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
    if (/\b(?:create|update|delete|approve|reject)(?:Catalog|Product|Category|Media)\b/i.test(source)) {
      violations.push({ file: rel, message: "WLT must not own catalog/product/category/media mutations" });
    }
  }
}

for (const required of [
  "services/dsh/frontend/shared/catalog/catalog.api.ts",
  "services/dsh/frontend/shared/catalog/use-catalog-controller.tsx",
  "services/dsh/frontend/app-client/catalog/PublishedCatalogScreen.tsx",
  "services/dsh/frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx",
  "services/dsh/frontend/control-panel/catalogs/CatalogApprovalScreen.tsx",
  "services/wlt/frontend/dsh/shared/wlt-dsh-checkout-handoff.contract.ts",
]) {
  if (!fs.existsSync(path.join(repoRoot, required))) {
    violations.push({ file: required, message: "required sovereign shared/UI binding is missing" });
  }
}

fail("dsh-003-catalog-ownership", violations);
