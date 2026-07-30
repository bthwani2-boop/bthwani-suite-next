const fs = require('fs');
const yaml = require('yaml');

const text = fs.readFileSync('services/wlt/contracts/generated/wlt.bundle.openapi.yaml', 'utf8');
const doc = yaml.parse(text);

function findCycles(obj, path, visited) {
  if (!obj || typeof obj !== 'object') return;
  if (obj['$ref'] && obj['$ref'].startsWith('#/')) {
    const target = obj['$ref'].slice(2).split('/');
    let targetObj = doc;
    for (const t of target) {
      if (targetObj && typeof targetObj === 'object' && t in targetObj) {
        targetObj = targetObj[t];
      } else {
        targetObj = undefined;
        break;
      }
    }
    // Is the targetObj already in visited path?
    const idx = visited.indexOf(targetObj);
    if (idx !== -1) {
      console.log('CYCLE FOUND at path:', path, 'pointing to', obj['$ref']);
      // We don't return so we can find more, but we don't recurse here.
      return;
    }
    // We follow the ref
    if (targetObj) {
      findCycles(targetObj, path + ' -> ' + obj['$ref'], [...visited, targetObj]);
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') {
       findCycles(v, path + '.' + k, [...visited, v]);
    }
  }
}

findCycles(doc, 'root', [doc]);
