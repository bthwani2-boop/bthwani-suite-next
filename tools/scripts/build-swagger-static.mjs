import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const outputDir = path.resolve(rootDir, "dist-swagger");
const specsDir = path.join(outputDir, "specs");

const specs = [
  { input: "contracts/master.openapi.yaml", name: "Master API Index" },
  { input: "core/identity/contracts/auth.openapi.yaml", name: "Core - Identity API" },
  { input: "core/platform-control/contracts/platform-control.openapi.yaml", name: "Core - Platform Control API" },
  { input: "core/providers/contracts/providers.openapi.yaml", name: "Core - Providers API" },
  { input: "core/workforce/contracts/workforce.openapi.yaml", name: "Core - Workforce API" },
  { input: "services/dsh/contracts/dsh.openapi.yaml", name: "Services - DSH API" },
  { input: "services/dsh/contracts/dsh.partner-onboarding.openapi.yaml", name: "Services - DSH Partner Onboarding" },
  { input: "services/dsh/contracts/dsh.delivery-proof-media.openapi.yaml", name: "Services - DSH Delivery Proof Media API" },
  { input: "services/dsh/contracts/dsh.catalog.openapi.yaml", name: "Services - DSH Catalog API" },
  { input: "services/dsh/contracts/dsh.client-address.openapi.yaml", name: "Services - DSH Client Address API" },
  { input: "services/dsh/contracts/dsh.client-map.openapi.yaml", name: "Services - DSH Client Map API" },
  { input: "services/dsh/contracts/dsh.marketing-commercial.openapi.yaml", name: "Services - DSH Marketing Commercial API" },
  { input: "services/dsh/contracts/dsh.partner-fleet.openapi.yaml", name: "Services - DSH Partner Fleet API" },
  { input: "services/dsh/contracts/dsh.partner-support.openapi.yaml", name: "Services - DSH Partner Support API" },
  { input: "services/dsh/contracts/dsh.platform-policies.openapi.yaml", name: "Services - DSH Platform Policies API" },
  { input: "services/dsh/contracts/dsh.support-governance.openapi.yaml", name: "Services - DSH Support Governance API" },
  { input: "services/wlt/contracts/wlt.openapi.yaml", name: "Services - WLT API" },
  { input: "services/wlt/contracts/wlt.payout-destination.openapi.yaml", name: "Services - WLT Payout Destination" },
  { input: "services/wlt/contracts/wlt.commercial.openapi.yaml", name: "Services - WLT Commercial API" },
  { input: "services/wlt/contracts/wlt.promotion-funding.openapi.yaml", name: "Services - WLT Promotion Funding API" },
];

function fail(message) {
  console.error(`[swagger-build] ${message}`);
  process.exit(1);
}

function copyContractTree(relativeRoot) {
  const source = path.join(rootDir, relativeRoot);
  if (!fs.existsSync(source)) fail(`required contract tree is missing: ${relativeRoot}`);
  const destination = path.join(specsDir, relativeRoot);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function validateSpec(spec, temporaryDirectory) {
  const inputPath = path.join(rootDir, spec.input);
  if (!fs.existsSync(inputPath)) fail(`required OpenAPI contract is missing: ${spec.input}`);

  const outputName = spec.input.replaceAll("/", "__").replace(/\.ya?ml$/i, ".ts");
  const validationOutput = path.join(temporaryDirectory, outputName);
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    pnpm,
    ["exec", "openapi-typescript", inputPath, "--output", validationOutput],
    { cwd: rootDir, encoding: "utf8", stdio: "pipe" },
  );
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    fail(`OpenAPI validation failed for ${spec.input} with exit code ${result.status ?? 1}`);
  }
  console.log(`[swagger-build] validated ${spec.input}`);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(specsDir, { recursive: true });

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-swagger-validation-"));
try {
  for (const spec of specs) validateSpec(spec, temporaryDirectory);

  copyContractTree("contracts");
  for (const service of ["identity", "platform-control", "providers", "workforce"]) {
    copyContractTree(`core/${service}/contracts`);
  }
  copyContractTree("services/dsh/contracts");
  copyContractTree("services/wlt/contracts");

  const manifest = {
    schemaVersion: 1,
    generatedFrom: "repository OpenAPI source contracts",
    specs: specs.map((spec) => ({
      name: spec.name,
      source: spec.input,
      url: `./specs/${spec.input}`,
    })),
  };
  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(path.join(outputDir, "index.html"), getHtmlContent(manifest.specs), "utf8");
  console.log(`[swagger-build] wrote ${manifest.specs.length} validated contracts to ${outputDir}`);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

function getHtmlContent(entries) {
  const urlsList = entries
    .map((entry) => `{ url: ${JSON.stringify(entry.url)}, name: ${JSON.stringify(entry.name)} }`)
    .join(",\n          ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BThwani API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *::before, *::after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        urls: [
          ${urlsList}
        ],
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout'
      });
    };
  </script>
</body>
</html>`;
}
