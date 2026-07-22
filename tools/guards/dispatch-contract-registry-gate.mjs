import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const contractPath = resolve(root, 'services/dsh/contracts/dsh.dispatch-governance.openapi.yaml');
const registryPath = resolve(root, 'services/dsh/contracts/contract-registry.ts');
const contract = readFileSync(contractPath, 'utf8');
const registry = readFileSync(registryPath, 'utf8');
const failures = [];

for (const marker of [
  'openapi: 3.1.0',
  'x-bthwani-owner: services/dsh',
  'x-bthwani-contract-state: CONTRACT_ACTIVE',
  'x-bthwani-client-generation: DISABLED',
  'x-bthwani-adapter-owner: frontend/shared/dispatch/dispatch.api.ts',
  'x-bthwani-runtime-dependency: true',
  '/dsh/operator/dispatch/assignments:',
  '/dsh/captain/dispatch/assignments:',
  '/dsh/operator/dispatch/candidates:',
  '/dsh/operator/dispatch/decisions:',
]) {
  if (!contract.includes(marker)) failures.push(`dispatch contract missing marker: ${marker}`);
}

for (const marker of [
  'id: "dsh-dispatch-governance"',
  'path: "contracts/dsh.dispatch-governance.openapi.yaml"',
  'clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER"',
  'adapterOwner: "frontend/shared/dispatch,frontend/shared/operations"',
]) {
  if (!registry.includes(marker)) failures.push(`contract registry missing marker: ${marker}`);
}

if (failures.length) {
  console.error('dispatch contract registry gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('dispatch contract registry gate passed');
