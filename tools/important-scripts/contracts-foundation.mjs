import fs from "node:fs";
import path from "node:path";
import { fail, listFiles, repoRoot } from "../guards/_guard-utils.mjs";

const guardId = "contracts-foundation";
const violations = [];

// Allowed contract states
const ALLOWED_STATES = new Set(["CONTRACT_DRAFT", "CONTRACT_ACTIVE", "RESERVED"]);

// 1. A simple, robust line-based YAML parser for metadata/paths.
// It is customized for key-value structures we care about.
function parseYaml(content) {
  const lines = content.split(/\r?\n/);
  const result = {};
  const stack = [{ indent: -1, obj: result }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore empty lines and lines that are pure comments
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;

    // Detect indentation
    const matchIndent = line.match(/^(\s*)/);
    const indent = matchIndent ? matchIndent[1].length : 0;

    let cleanLine = line.trim();
    // Strip trailing comments (space + #)
    cleanLine = cleanLine.replace(/\s+#.*$/, "");

    // Match Key: Value
    const kvMatch = cleanLine.match(/^("([^"]+)"|'([^']+)'|([^:]+))\s*:\s*(.*)$/);
    if (!kvMatch) continue;

    const rawKey = kvMatch[2] || kvMatch[3] || kvMatch[4];
    const key = rawKey.trim();
    let val = kvMatch[5].trim();

    // Strip quotes around value
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    // Pop stack until parent indentation is found
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (val === "") {
      const newObj = {};
      if (Array.isArray(parent)) {
        parent.push({ [key]: newObj });
      } else {
        parent[key] = newObj;
      }
      stack.push({ indent, obj: newObj });
    } else {
      let typedVal = val;
      if (val === "true") typedVal = true;
      else if (val === "false") typedVal = false;
      else if (val === "{}") typedVal = {};
      else if (val === "[]") typedVal = [];
      else if (!isNaN(val) && val !== "") typedVal = Number(val);

      if (Array.isArray(parent)) {
        parent.push({ [key]: typedVal });
      } else {
        parent[key] = typedVal;
      }
    }
  }

  return result;
}

// 2. Validate that auth.openapi.yaml does not exist in root
const rootAuthPath = path.join(repoRoot, "auth.openapi.yaml");
if (fs.existsSync(rootAuthPath)) {
  violations.push({
    file: "auth.openapi.yaml",
    message: "auth.openapi.yaml must not exist in the repository root"
  });
}

// 3. Validate that services/auth directory does not exist
const servicesAuthPath = path.join(repoRoot, "services/auth");
if (fs.existsSync(servicesAuthPath)) {
  violations.push({
    file: "services/auth",
    message: "services/auth directory must not exist"
  });
}

// 4. Validate contracts/master.openapi.yaml and collect referenced files
const masterRelPath = "contracts/master.openapi.yaml";
const masterFullPath = path.join(repoRoot, masterRelPath);

if (!fs.existsSync(masterFullPath)) {
  violations.push({
    file: masterRelPath,
    message: "master.openapi.yaml is missing"
  });
} else {
  let masterContent = "";
  try {
    masterContent = fs.readFileSync(masterFullPath, "utf8");
  } catch (err) {
    violations.push({
      file: masterRelPath,
      message: `Could not read master contract: ${err.message}`
    });
  }

  if (masterContent) {
    let masterParsed;
    try {
      masterParsed = parseYaml(masterContent);
    } catch (err) {
      violations.push({
        file: masterRelPath,
        message: `Failed to parse master contract YAML: ${err.message}`
      });
    }

    if (masterParsed) {
      // Validate paths: {}
      if (!masterParsed.paths || typeof masterParsed.paths !== "object" || Object.keys(masterParsed.paths).length > 0) {
        violations.push({
          file: masterRelPath,
          message: "master contract must only serve as an index and must contain 'paths: {}'"
        });
      }

      // Validate referenced contracts under x-bthwani-contracts
      const contractsGroup = masterParsed["x-bthwani-contracts"];
      if (!contractsGroup) {
        violations.push({
          file: masterRelPath,
          message: "master contract is missing 'x-bthwani-contracts' index"
        });
      } else {
        const collectContractPaths = (obj) => {
          let pathsList = [];
          for (const val of Object.values(obj)) {
            if (typeof val === "object" && val !== null) {
              pathsList = pathsList.concat(collectContractPaths(val));
            } else if (typeof val === "string") {
              pathsList.push(val);
            }
          }
          return pathsList;
        };

        const referencedContracts = collectContractPaths(contractsGroup);
        for (const refPath of referencedContracts) {
          const fullRefPath = path.resolve(path.dirname(masterFullPath), refPath);
          if (!fs.existsSync(fullRefPath)) {
            violations.push({
              file: masterRelPath,
              message: `Referenced contract '${refPath}' does not exist physically`
            });
          }
        }
      }
    }
  }
}

// 5. Gather all contract files and validate metadata rules
const contractFiles = listFiles().filter((file) => {
  return file.endsWith(".openapi.yaml") ||
         file.endsWith(".openapi.yml") ||
         (file.includes("/contracts/") && (file.endsWith(".yaml") || file.endsWith(".yml")));
});

for (const contractFile of contractFiles) {
  // Skip root auth check as it's handled separately above
  if (contractFile === "auth.openapi.yaml") continue;

  const fullContractPath = path.join(repoRoot, contractFile);
  let content = "";
  try {
    content = fs.readFileSync(fullContractPath, "utf8");
  } catch (err) {
    violations.push({
      file: contractFile,
      message: `Could not read contract file: ${err.message}`
    });
    continue;
  }

  // Only check if it is actually an OpenAPI document
  if (!content.trim().startsWith("openapi:")) {
    continue;
  }

  let parsed;
  try {
    parsed = parseYaml(content);
  } catch (err) {
    violations.push({
      file: contractFile,
      message: `Failed to parse contract YAML: ${err.message}`
    });
    continue;
  }

  // Validate x-bthwani-contract-state
  const state = parsed["x-bthwani-contract-state"];
  if (!state) {
    violations.push({
      file: contractFile,
      message: "Missing required metadata 'x-bthwani-contract-state'"
    });
  } else if (!ALLOWED_STATES.has(state)) {
    violations.push({
      file: contractFile,
      message: `Invalid contract state '${state}'. Must be one of: ${Array.from(ALLOWED_STATES).join(", ")}`
    });
  }

  // Validate client generation is disabled for CONTRACT_DRAFT and RESERVED
  if (state === "CONTRACT_DRAFT" || state === "RESERVED") {
    const clientGen = parsed["x-bthwani-client-generation"];
    const gen = parsed["x-bthwani-generation"];

    if (clientGen !== undefined) {
      const clientGenStr = String(clientGen).toUpperCase();
      if (clientGenStr.includes("ENABLED") || clientGen === true) {
        violations.push({
          file: contractFile,
          message: `Client generation is enabled ('${clientGen}') but contract state is '${state}' (must be DISABLED)`
        });
      }
    }

    if (gen !== undefined) {
      const genStr = String(gen).toUpperCase();
      if (genStr.includes("ENABLED") || gen === true) {
        violations.push({
          file: contractFile,
          message: `Generation is enabled ('${gen}') but contract state is '${state}' (must be DISABLED)`
        });
      }
    }
  }
}

// 6. Validate that WltPaymentSession statuses in wlt.openapi.yaml match DB migrations
const wltOpenApiPath = path.join(repoRoot, "services/wlt/contracts/wlt.openapi.yaml");
const wltMigrationPath = path.join(repoRoot, "services/wlt/database/migrations/wlt-002_payment_capture.sql");

if (fs.existsSync(wltOpenApiPath) && fs.existsSync(wltMigrationPath)) {
  try {
    const migrationContent = fs.readFileSync(wltMigrationPath, "utf8");
    const statusChkMatch = migrationContent.match(/CHECK\s*\(\s*status\s+IN\s*\(([^)]+)\)\)/i);
    if (statusChkMatch) {
      const dbStatuses = statusChkMatch[1]
        .split(",")
        .map(s => s.trim().replace(/['"]/g, ""));
      
      const openApiContent = fs.readFileSync(wltOpenApiPath, "utf8");
      const openApiLines = openApiContent.split(/\r?\n/);
      let insideWltPaymentSession = false;
      let insideStatus = false;
      let insideEnum = false;
      const schemaStatusEnum = [];
      
      for (const line of openApiLines) {
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        const trimmed = line.trim();
        
        if (trimmed.startsWith("WltPaymentSession:")) {
          insideWltPaymentSession = true;
          insideStatus = false;
          insideEnum = false;
          continue;
        }
        
        if (insideWltPaymentSession) {
          if (indent <= 4 && trimmed !== "" && !trimmed.startsWith("WltPaymentSession:") && !trimmed.startsWith("properties:") && !trimmed.startsWith("required:")) {
            insideWltPaymentSession = false;
            insideStatus = false;
            insideEnum = false;
          }
        }
        
        if (insideWltPaymentSession) {
          if (trimmed.startsWith("status:")) {
            insideStatus = true;
            insideEnum = false;
            continue;
          }
          if (insideStatus) {
            if (indent <= 8 && trimmed !== "" && !trimmed.startsWith("status:") && !trimmed.startsWith("type:") && !trimmed.startsWith("enum:")) {
              insideStatus = false;
              insideEnum = false;
            }
          }
          if (insideStatus) {
            if (trimmed.startsWith("enum:")) {
              insideEnum = true;
              continue;
            }
            if (insideEnum) {
              if (trimmed.startsWith("- ")) {
                schemaStatusEnum.push(trimmed.slice(2).trim());
              } else if (trimmed !== "") {
                insideEnum = false;
              }
            }
          }
        }
      }
      
      if (schemaStatusEnum.length > 0) {
        for (const dbStatus of dbStatuses) {
          if (!schemaStatusEnum.includes(dbStatus)) {
            violations.push({
              file: "services/wlt/contracts/wlt.openapi.yaml",
              message: `OpenAPI WltPaymentSession.status enum is missing state '${dbStatus}' defined in DB migration wlt-002_payment_capture.sql`
            });
          }
        }
      } else {
        violations.push({
          file: "services/wlt/contracts/wlt.openapi.yaml",
          message: "Failed to find WltPaymentSession.status enum in OpenAPI schema"
        });
      }
    } else {
      violations.push({
        file: "services/wlt/database/migrations/wlt-002_payment_capture.sql",
        message: "Failed to parse CHECK constraint on status from migration file"
      });
    }
  } catch (err) {
    violations.push({
      file: "services/wlt/contracts/wlt.openapi.yaml",
      message: `Error validating OpenAPI statuses against DB migrations: ${err.message}`
    });
  }
}

fail(guardId, violations);
