const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') walk(full, files);
    } else if (full.endsWith('.yaml') || full.endsWith('.yml')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('services/dsh/contracts');
let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let isPathFile = file.includes('paths\\\\') || file.includes('paths/');
  const doc = yaml.parseDocument(content);
  let changed = false;

  let pathsNodes = [];
  const pNode = doc.get('paths');
  if (pNode && yaml.isMap(pNode)) {
    pathsNodes.push(pNode);
  }
  if (yaml.isMap(doc.contents)) {
    // If the root is a map and has keys starting with '/', treat it as a paths map
    if (doc.contents.items.some(n => n.key && n.key.value && n.key.value.startsWith('/'))) {
       pathsNodes.push(doc.contents);
    }
  }

  for (const pathsNode of pathsNodes) {
    for (const pathPair of pathsNode.items) {
      if (!pathPair.key.value.startsWith('/')) continue;
      const pathValue = pathPair.value;
      if (yaml.isMap(pathValue)) {
        for (const methodPair of pathValue.items) {
          const method = methodPair.key.value;
          if (['post', 'put', 'patch', 'delete'].includes(method)) {
            const operation = methodPair.value;
            if (yaml.isMap(operation)) {
              let hasIdempotency = false;
              let hasCorrelation = false;

              const reqBody = operation.getIn(['requestBody', 'content', 'application/json', 'schema']);
              if (reqBody && yaml.isMap(reqBody)) {
                const props = reqBody.get('properties');
                if (props && yaml.isMap(props)) {
                  if (props.has('idempotencyKey')) {
                    props.delete('idempotencyKey');
                    hasIdempotency = true;
                  }
                  if (props.has('correlationId')) {
                    props.delete('correlationId');
                    hasCorrelation = true;
                  }
                }
                const reqNode = reqBody.get('required');
                if (reqNode && yaml.isSeq(reqNode)) {
                  const items = reqNode.items;
                  for (let i = items.length - 1; i >= 0; i--) {
                    if (items[i].value === 'idempotencyKey') {
                      reqNode.items.splice(i, 1);
                      hasIdempotency = true;
                      continue;
                    }
                    if (items[i].value === 'correlationId') {
                      reqNode.items.splice(i, 1);
                      hasCorrelation = true;
                      continue;
                    }
                  }
                }
              }

              if (hasIdempotency) {
                let params = operation.get('parameters');
                if (!params) {
                  params = doc.createNode([]);
                  operation.set('parameters', params);
                }
                if (yaml.isSeq(params)) {
                  const refPath = isPathFile ? '../dsh.openapi.yaml#/components/parameters/IdempotencyKey' : '#/components/parameters/IdempotencyKey';
                  const exists = params.items.some(n => yaml.isMap(n) && n.get('$ref') === refPath);
                  if (!exists) {
                    params.items.push(doc.createNode({ $ref: refPath }));
                    changed = true;
                  }
                }
              }

              if (hasCorrelation) {
                let params = operation.get('parameters');
                if (!params) {
                  params = doc.createNode([]);
                  operation.set('parameters', params);
                }
                if (yaml.isSeq(params)) {
                  const refPath = isPathFile ? '../dsh.openapi.yaml#/components/parameters/CorrelationId' : '#/components/parameters/CorrelationId';
                  const exists = params.items.some(n => yaml.isMap(n) && n.get('$ref') === refPath);
                  if (!exists) {
                    params.items.push(doc.createNode({ $ref: refPath }));
                    changed = true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const schemasNode = doc.getIn(['components', 'schemas']);
  if (schemasNode && yaml.isMap(schemasNode)) {
    for (const schemaPair of schemasNode.items) {
      const schema = schemaPair.value;
      if (yaml.isMap(schema)) {
         let props = schema.get('properties');
         if (props && yaml.isMap(props)) {
           if (props.has('idempotencyKey')) {
             props.delete('idempotencyKey');
             changed = true;
           }
           if (props.has('correlationId')) {
             props.delete('correlationId');
             changed = true;
           }
         }
         let reqNode = schema.get('required');
         if (reqNode && yaml.isSeq(reqNode)) {
           const items = reqNode.items;
           for (let i = items.length - 1; i >= 0; i--) {
             if (items[i].value === 'idempotencyKey') {
               reqNode.items.splice(i, 1);
               changed = true;
               continue;
             }
             if (items[i].value === 'correlationId') {
               reqNode.items.splice(i, 1);
               changed = true;
               continue;
             }
           }
         }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(file, doc.toString(), 'utf8');
    console.log('Migrated headers for', file);
    modifiedCount++;
  }
}
console.log('Total files modified:', modifiedCount);
