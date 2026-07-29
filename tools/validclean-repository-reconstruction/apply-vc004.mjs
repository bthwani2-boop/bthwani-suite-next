import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function write(file, content) {
  fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`VC-004 migration could not find ${label}`);
  return source.replace(before, after);
}

const rootPackagePath = 'package.json';
const rootPackage = JSON.parse(read(rootPackagePath));
rootPackage.scripts['openapi:compose:wlt'] = 'pnpm --dir services/wlt openapi:compose';
rootPackage.scripts['openapi:generate:wlt'] = 'pnpm --dir services/wlt openapi:generate';
rootPackage.scripts['openapi:lint:wlt'] = 'node tools/guards/wlt-openapi-bundle-gate.mjs';
rootPackage.scripts['openapi:verify:wlt'] = 'pnpm --dir services/wlt openapi:verify';
rootPackage.scripts['guard:wlt-openapi-bundle'] = 'node tools/guards/wlt-openapi-bundle-gate.mjs';
write(rootPackagePath, JSON.stringify(rootPackage, null, 2));

const backendGatePath = 'tools/guards/backend-api-binding-gate.mjs';
let backendGate = read(backendGatePath);
const oldWltService = `  {
    name: "WLT",
    openapi: "services/wlt/contracts/wlt.openapi.yaml",
    additionalOpenapi: [
      "services/wlt/contracts/wlt.payments.openapi.yaml",
      "services/wlt/contracts/wlt.delivery-collections.openapi.yaml",
      "services/wlt/contracts/wlt.commercial.openapi.yaml",
      "services/wlt/contracts/wlt.commercial-summary.openapi.yaml",
      "services/wlt/contracts/wlt.promotion-funding.openapi.yaml",
      "services/wlt/contracts/jrn-035-refunds.openapi.yaml",
      "services/wlt/contracts/jrn-036-settlements-commissions.openapi.yaml",
      "services/wlt/contracts/jrn-037-payouts-destinations.openapi.yaml",
      "services/wlt/contracts/jrn-038-cod-custody.openapi.yaml",
      "services/wlt/contracts/wlt.workforce-finance.openapi.yaml",
    ].filter((file) => fs.existsSync(path.join(repoRoot, file))),
    router: "services/wlt/backend/internal/http/server.go",
    routerDir: "services/wlt/backend/internal/http",
  },`;
const newWltService = `  {
    name: "WLT",
    openapi: "services/wlt/contracts/generated/wlt.bundle.openapi.yaml",
    router: "services/wlt/backend/internal/http/server.go",
    routerDir: "services/wlt/backend/internal/http",
  },`;
backendGate = replaceRequired(backendGate, oldWltService, newWltService, 'manual WLT contract list');
backendGate = backendGate.replace('  "POST /wlt/ledger/entries",\n', '');
write(backendGatePath, backendGate);

const typecheckPath = 'tools/important-scripts/contracts-typecheck.mjs';
let typecheck = read(typecheckPath);
const fullArtifactGate = `  run("wlt-openapi-bundle", "node", ["tools/guards/wlt-openapi-bundle-gate.mjs"], {
    stdio: "inherit",
  });
`;
typecheck = replaceRequired(typecheck, fullArtifactGate, '', 'premature generated-client gate');
write(typecheckPath, typecheck);

const entryPath = 'services/wlt/contracts/wlt.openapi.yaml';
let entry = read(entryPath);
if (!entry.includes('x-bthwani-contract-layout: INDEXED')) {
  entry = replaceRequired(
    entry,
    'x-bthwani-runtime-dependency: true\n',
    'x-bthwani-runtime-dependency: true\nx-bthwani-contract-layout: INDEXED\nx-bthwani-bundle: ./generated/wlt.bundle.openapi.yaml\n',
    'WLT runtime metadata anchor',
  );
}
write(entryPath, entry);

const composerPath = 'tools/scripts/wlt-openapi-bundle-lib.mjs';
let composer = read(composerPath);
if (!composer.includes('function mergePathEntries(contracts)')) {
  const mergeUniqueAnchor = `function mergeUniqueEntries(contracts, selector, label, { allowIdentical = true } = {}) {`;
  const methodAwareMerge = `const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

function mergePathEntries(contracts) {
  const merged = new Map();
  for (const contract of contracts) {
    for (const pathEntry of contract.pathEntries) {
      let target = merged.get(pathEntry.key);
      if (!target) {
        target = {
          key: pathEntry.key,
          firstLine: pathEntry.lines[0],
          children: [],
          owners: new Map(),
        };
        merged.set(pathEntry.key, target);
      }

      const children = parseEntries(pathEntry.lines, 1, pathEntry.lines.length, 4);
      if (children.length === 0) {
        throw new Error(\`WLT path \${pathEntry.key} in \${relative(contract.filePath)} has no path-item fields.\`);
      }
      for (const child of children) {
        const previous = target.owners.get(child.key);
        if (previous) {
          const currentCanonical = canonicalBlock(child.lines);
          const sameDefinition = currentCanonical === previous.canonical;
          if (HTTP_METHODS.has(child.key)) {
            throw new Error(
              \`WLT operation \${child.key.toUpperCase()} \${pathEntry.key} is owned by both \${relative(previous.filePath)} and \${relative(contract.filePath)}.\`,
            );
          }
          if (!sameDefinition) {
            throw new Error(
              \`WLT path field \${pathEntry.key}.\${child.key} is defined differently by \${relative(previous.filePath)} and \${relative(contract.filePath)}.\`,
            );
          }
          continue;
        }
        target.owners.set(child.key, {
          filePath: contract.filePath,
          canonical: canonicalBlock(child.lines),
        });
        target.children.push(child.lines);
      }
    }
  }
  return [...merged.values()].map((entry) => ({
    key: entry.key,
    lines: [entry.firstLine, ...entry.children.flat()],
  }));
}

${mergeUniqueAnchor}`;
  composer = replaceRequired(composer, mergeUniqueAnchor, methodAwareMerge, 'component merge function anchor');

  const oldPathMerge = `  const paths = mergeUniqueEntries(contracts, (contract) => contract.pathEntries, 'WLT path', { allowIdentical: false });
  const operationOwners = new Map();
  for (const entry of paths) {
    for (const line of entry.lines) {
      const match = line.match(/^\\s*operationId:\\s*([A-Za-z0-9_.-]+)\\s*(?:#.*)?$/);
      if (!match) continue;
      const existing = operationOwners.get(match[1]);
      if (existing) throw new Error(\`operationId \${match[1]} is duplicated by \${relative(existing)} and \${relative(entry.owner)}.\`);
      operationOwners.set(match[1], entry.owner);
    }
  }
`;
  const newPathMerge = `  const operationOwners = new Map();
  for (const contract of contracts) {
    for (const entry of contract.pathEntries) {
      for (const line of entry.lines) {
        const match = line.match(/^\\s*operationId:\\s*([A-Za-z0-9_.-]+)\\s*(?:#.*)?$/);
        if (!match) continue;
        const existing = operationOwners.get(match[1]);
        if (existing) {
          throw new Error(\`operationId \${match[1]} is duplicated by \${relative(existing)} and \${relative(contract.filePath)}.\`);
        }
        operationOwners.set(match[1], contract.filePath);
      }
    }
  }
  const paths = mergePathEntries(contracts);
`;
  composer = replaceRequired(composer, oldPathMerge, newPathMerge, 'whole-path collision logic');
}
write(composerPath, composer);

console.log('VC-004 source migration applied.');
