import {
  composeDshOpenApi,
  verifyDshOpenApiModular,
} from '../scripts/dsh-openapi-modular-lib.mjs';

// Ownership is derived from the sovereign entry and sibling projection
// contracts. Generate the ignored diagnostic in the current workspace before
// verification; a committed copy would be a stale parallel source of truth.
composeDshOpenApi({ write: true });
const result = verifyDshOpenApiModular();
console.log(`DSH OpenAPI modular gate passed: ${JSON.stringify(result)}`);
