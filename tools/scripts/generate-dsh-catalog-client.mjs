import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const contractPath = resolve(repoRoot, "services/dsh/contracts/dsh.catalog.openapi.yaml");
const overlayPath = resolve(repoRoot, "services/dsh/contracts/dsh.catalog.overlay.yaml");
const facadePath = resolve(repoRoot, "services/dsh/clients/generated/dsh-catalog-api.ts");
const checkMode = process.argv.includes("--check");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "bthwani-dsh-catalog-client-"));
const materializedPath = join(temporaryDirectory, "dsh.catalog.materialized.openapi.yaml");
const generatedProbePath = join(temporaryDirectory, "dsh-catalog-openapi-probe.ts");

function fail(message) {
  console.error(`[dsh-catalog-client] ${message}`);
  process.exitCode = 1;
}

function requireSnippet(content, snippet, sourceName) {
  if (!content.includes(snippet)) {
    throw new Error(`${sourceName} is missing required sovereign fragment: ${snippet}`);
  }
}

function applyOverlay(contract, overlay) {
  for (const snippet of [
    "target: $.components.schemas.UpdateNodeRequest",
    "additionalProperties: false",
    "- expectedVersion",
    '$ref: "#/components/schemas/PositiveVersion"',
  ]) {
    requireSnippet(overlay, snippet, "dsh.catalog.overlay.yaml");
  }

  for (const immutableField of ["domainId:", "parentId:", "level:", "slug:"]) {
    if (overlay.includes(immutableField)) {
      throw new Error(
        `UpdateNodeRequest overlay exposes immutable field ${immutableField.slice(0, -1)}`,
      );
    }
  }

  const startMarker = "    UpdateNodeRequest:\n";
  const endMarker = "    MasterProduct:\n";
  const start = contract.indexOf(startMarker);
  const end = contract.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("UpdateNodeRequest schema boundaries were not found");
  }

  const replacement = `    UpdateNodeRequest:
      type: object
      additionalProperties: false
      required:
        - expectedVersion
      properties:
        expectedVersion:
          $ref: "#/components/schemas/PositiveVersion"
        nameAr:
          type: string
          minLength: 1
        nameEn:
          type: string
        icon:
          type: string
        sortOrder:
          type: integer
        isActive:
          type: boolean
        isClientVisible:
          type: boolean
        requiresBarcode:
          type: boolean
        allowsProductProposal:
          type: boolean
        allowsStoreProductCustomImage:
          type: boolean
        requiresCatalogReview:
          type: boolean
        requiresProductCatalog:
          type: boolean
`;

  const materialized =
    contract.slice(0, start) + replacement + contract.slice(end);

  const materializedBlock = materialized.slice(
    materialized.indexOf(startMarker),
    materialized.indexOf(endMarker),
  );
  if (materializedBlock.includes("CreateNodeRequest")) {
    throw new Error("UpdateNodeRequest must not inherit CreateNodeRequest");
  }
  return materialized;
}

function verifyCatalogContractFacade(facade) {
  requireSnippet(
    facade,
    'UpdateNodeRequest: Partial<Omit<components["schemas"]["CreateNodeRequest"], "domainId" | "parentId" | "level" | "slug">> & ExpectedVersion;',
    "catalog contract facade",
  );
  requireSnippet(facade, "type ExpectedVersion = { expectedVersion: number };", "catalog contract facade");
  if (
    facade.includes(
      'UpdateNodeRequest: components["schemas"]["CreateNodeRequest"]',
    )
  ) {
    throw new Error("catalog contract facade reintroduced create-style node updates");
  }
}

try {
  for (const requiredPath of [contractPath, overlayPath, facadePath]) {
    if (!existsSync(requiredPath)) {
      throw new Error(`required source is missing: ${requiredPath}`);
    }
  }

  const contract = readFileSync(contractPath, "utf8").replaceAll("\r\n", "\n");
  const overlay = readFileSync(overlayPath, "utf8").replaceAll("\r\n", "\n");
  const facade = readFileSync(facadePath, "utf8").replaceAll("\r\n", "\n");
  const materialized = applyOverlay(contract, overlay);
  writeFileSync(materializedPath, materialized, "utf8");

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    pnpmCommand,
    [
      "exec",
      "openapi-typescript",
      materializedPath,
      "--output",
      generatedProbePath,
    ],
    { cwd: repoRoot, encoding: "utf8", stdio: "pipe" },
  );
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(
      `openapi-typescript rejected the materialized sovereign catalog contract with exit code ${result.status ?? 1}`,
    );
  }

  verifyCatalogContractFacade(facade);

  if (!checkMode) {
    writeFileSync(facadePath, facade, "utf8");
  }
  console.log(
    `[dsh-catalog-client] ${checkMode ? "verified" : "materialized"} overlay-backed generated OpenAPI client input and catalog contract facade`,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
