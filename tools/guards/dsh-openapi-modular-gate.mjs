import fs from 'node:fs';
import {
  composeDshOpenApi,
  ownershipReportPath,
  verifyDshOpenApiModular,
} from '../scripts/dsh-openapi-modular-lib.mjs';

// Ownership is derived from the sovereign entry and sibling projection
// contracts. Generate the ignored diagnostic in the current workspace before
// verification; a committed copy would be a stale parallel source of truth.
composeDshOpenApi({ write: true });

// composeDshOpenApi writes text artifacts with a final newline, while the
// verifier compares the ownership JSON's canonical serialization without one.
// Normalize only this ignored diagnostic so the verifier measures semantic
// ownership drift rather than a newline written by its own generator.
const ownership = fs.readFileSync(ownershipReportPath, 'utf8').trimEnd();
fs.writeFileSync(ownershipReportPath, ownership, 'utf8');

const result = verifyDshOpenApiModular();
console.log(`DSH OpenAPI modular gate passed: ${JSON.stringify(result)}`);
