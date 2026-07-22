import path from 'node:path';
import {
  composeDshOpenApi,
  generatedBundlePath,
  repositoryRoot,
} from './dsh-openapi-modular-lib.mjs';

const bundled = composeDshOpenApi({ write: true });
const relative = path.relative(repositoryRoot, generatedBundlePath).split(path.sep).join('/');
console.log(`Composed DSH OpenAPI bundle: ${relative} (${bundled.split(/\r?\n/).length - 1} lines)`);
