import { migrateDshOpenApi } from './dsh-openapi-modular-lib.mjs';

const apply = process.argv.includes('--apply');
if (!apply) {
  throw new Error('Refusing to modify contracts without --apply.');
}

const result = migrateDshOpenApi();
console.log(`DSH OpenAPI modularization completed: ${JSON.stringify(result)}`);
