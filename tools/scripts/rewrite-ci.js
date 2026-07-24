const fs = require('fs');
const content = fs.readFileSync('.github/workflows/ci.yml', 'utf8').replace(/\r/g, '');
const lines = content.split('\n');

const allContextOutputs = [
  'base_sha', 'head_sha', 'full_verification', 'governance', 'workflow', 'infrastructure', 'security', 'policy', 'frontend', 'contracts', 'journey', 'journey_scope', 'node', 'node_scope', 'dsh', 'wlt', 'identity', 'workforce', 'platform', 'providers', 'database', 'runtime', 'shared_brain', 'heavy', 'platform_change_sets'
];

let withBlock = '';
for (const o of allContextOutputs) {
  withBlock += `      ${o}: \${{ needs.context.outputs.${o} }}\n`;
}
withBlock += `      runtime_proof: \${{ github.event_name == 'workflow_dispatch' && inputs.runtime_proof == true }}\n`;

let newCi = '';
let inContext = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line === '  objective_nomenclature:') break; // Stop reading at the first extracted job
  newCi += line + '\n';
}

newCi += `  policy_bundle:\n    needs: [context]\n    uses: ./.github/workflows/reusable/policy.yml\n    with:\n${withBlock}\n`;
newCi += `  node_diagnostics_bundle:\n    needs: [context]\n    uses: ./.github/workflows/reusable/node-diagnostics.yml\n    with:\n${withBlock}\n`;
newCi += `  node_verification_bundle:\n    needs: [context]\n    uses: ./.github/workflows/reusable/node-verification.yml\n    with:\n${withBlock}\n`;
newCi += `  backends_bundle:\n    needs: [context]\n    uses: ./.github/workflows/reusable/backends.yml\n    with:\n${withBlock}\n`;
newCi += `  runtime_bundle:\n    needs: [context]\n    uses: ./.github/workflows/reusable/runtime.yml\n    with:\n${withBlock}\n`;

newCi += `  result:
    name: BThwani CI result
    needs: [context, policy_bundle, node_diagnostics_bundle, node_verification_bundle, backends_bundle, runtime_bundle]
    if: \${{ always() }}
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - name: Enforce result and publish immutable commit status
        env:
          GH_TOKEN: \${{ github.token }}
          HEAD_SHA: \${{ needs.context.outputs.head_sha }}
          FULL_VERIFICATION: \${{ needs.context.outputs.full_verification }}
          PUBLISH_STATUS: \${{ github.event_name != 'pull_request' }}
          CONTEXT_RESULT: \${{ needs.context.result }}
          POLICY_RESULT: \${{ needs.policy_bundle.result }}
          DIAGNOSTICS_RESULT: \${{ needs.node_diagnostics_bundle.result }}
          VERIFICATION_RESULT: \${{ needs.node_verification_bundle.result }}
          BACKENDS_RESULT: \${{ needs.backends_bundle.result }}
          RUNTIME_RESULT: \${{ needs.runtime_bundle.result }}
        run: |
          set -euo pipefail
          failed=0
          failures=()
          check_result() {
            local name="$1" result="$2"
            if [[ "\${result}" != "success" && "\${result}" != "skipped" ]]; then failures+=("\${name}:\${result}"); failed=1; fi
          }
          check_result context "\${CONTEXT_RESULT}"
          check_result policy "\${POLICY_RESULT}"
          check_result diagnostics "\${DIAGNOSTICS_RESULT}"
          check_result verification "\${VERIFICATION_RESULT}"
          check_result backends "\${BACKENDS_RESULT}"
          check_result runtime "\${RUNTIME_RESULT}"

          state=success
          description="all required scopes passed"
          if [[ "\${failed}" -ne 0 ]]; then
            state=failure
            description="failed: $(IFS=,; echo "\${failures[*]}")"
          fi
          description="\${description:0:140}"
          context="bthwani/contextual-verification"
          if [[ "\${FULL_VERIFICATION}" == "true" ]]; then context="bthwani/full-verification"; fi

          if [[ "\${PUBLISH_STATUS}" == "true" ]]; then
            jq -n \\
              --arg state "\${state}" \\
              --arg context "\${context}" \\
              --arg description "\${description}" \\
              --arg target_url "\${GITHUB_SERVER_URL}/\${GITHUB_REPOSITORY}/actions/runs/\${GITHUB_RUN_ID}" \\
              '{state:$state,context:$context,description:$description,target_url:$target_url}' > /tmp/status.json
            curl --fail-with-body --retry 3 \\
              -X POST \\
              -H "Accept: application/vnd.github+json" \\
              -H "Authorization: Bearer \${GH_TOKEN}" \\
              -H "X-GitHub-Api-Version: 2022-11-28" \\
              "\${GITHUB_API_URL}/repos/\${GITHUB_REPOSITORY}/statuses/\${HEAD_SHA}" \\
              --data-binary @/tmp/status.json
          fi
          printf '%s\\n' "\${description}"
          exit "\${failed}"
`;

fs.writeFileSync('.github/workflows/ci.yml', newCi, 'utf8');
console.log('Rewrote ci.yml successfully!');
