const fs = require('fs');

const content = fs.readFileSync('.github/workflows/ci.yml', 'utf8');

const jobsToExtract = {
  'backends.yml': ['dsh', 'wlt', 'identity', 'workforce', 'platform', 'providers'],
  'node-diagnostics.yml': ['node_deep_diagnostics', 'node_vertical_integrity', 'node_performance_budget', 'node_contracts', 'node_hygiene'],
  'node-verification.yml': ['node_typecheck', 'node_lint', 'node_test', 'node_build', 'node_journeys', 'node_platform_change_sets'],
  'policy.yml': ['objective_nomenclature', 'policy'],
  'runtime.yml': ['runtime_proof']
};

const allContextOutputs = [
  'base_sha', 'head_sha', 'full_verification', 'governance', 'workflow', 'infrastructure', 'security', 'policy', 'frontend', 'contracts', 'journey', 'journey_scope', 'node', 'node_scope', 'dsh', 'wlt', 'identity', 'workforce', 'platform', 'providers', 'database', 'runtime', 'shared_brain', 'heavy', 'platform_change_sets'
];

function generateInputs() {
  let out = '';
  for (const o of allContextOutputs) {
    out += `      ${o}:\n        type: string\n        required: false\n`;
  }
  out += `      runtime_proof:\n        type: boolean\n        required: false\n`;
  return out;
}

function extractJobs(jobsList) {
  let output = `name: Reusable Workflow\n\non:\n  workflow_call:\n    inputs:\n${generateInputs()}\njobs:\n`;
  const lines = content.replace(/\r/g, '').split('\n');
  let inJob = false;
  let currentJob = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const newJobMatch = line.match(/^  ([a-zA-Z0-9_]+):$/);
    
    if (newJobMatch) {
      if (jobsList.includes(newJobMatch[1])) {
        inJob = true;
        currentJob = newJobMatch[1];
        output += `  ${currentJob}:\n`;
        continue;
      } else {
        inJob = false;
        currentJob = null;
      }
    }
    
    if (inJob) {
       if (line.trim().startsWith('needs:')) {
          output += line.replace(/needs: \[.*?\]/, 'needs: []') + '\n';
       } else if (line.trim().startsWith('if:')) {
          let newLine = line.replace(/needs\.context\.outputs\./g, 'inputs.');
          output += newLine + '\n';
       } else if (line.includes('${{ needs.context.outputs.')) {
          let newLine = line.replace(/needs\.context\.outputs\./g, 'inputs.');
          output += newLine + '\n';
       } else {
          output += line + '\n';
       }
    }
  }
  return output;
}

for (const [file, list] of Object.entries(jobsToExtract)) {
  const result = extractJobs(list);
  fs.writeFileSync(`.github/workflows/reusable/${file}`, result, 'utf8');
}

console.log("Extracted workflows successfully!");
