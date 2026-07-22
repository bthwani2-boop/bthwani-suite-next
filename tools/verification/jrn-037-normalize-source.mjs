import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

function replaceExactly(relativePath, before, after) {
  const absolutePath = path.join(root, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) {
    throw new Error(`unable to normalize ${relativePath}: expected source fragment was not found`);
  }
  fs.writeFileSync(absolutePath, source.replace(before, after));
}

const payoutPath = "services/wlt/backend/internal/payout/jrn037_governed_payout.go";
replaceExactly(
  payoutPath,
  `\t\tif _, err := tx.ExecContext(r.Context(), \`\n\t\t\tUPDATE wlt_payout_requests SET reconciliation_status = 'inquiry_pending'\n\t\t\tWHERE id = $1 AND status IN ('provider_result_unknown','provider_pending')\`, payoutID); err != nil {\n\t\t\tshared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to claim payout reconciliation")\n\t\t\treturn\n\t\t}`,
  `\t\tclaim, err := tx.ExecContext(r.Context(), \`\n\t\t\tUPDATE wlt_payout_requests\n\t\t\tSET reconciliation_status = 'inquiry_pending'\n\t\t\tWHERE id = $1\n\t\t\t  AND status IN ('provider_result_unknown','provider_pending')\n\t\t\t  AND reconciliation_status IN ('not_required','required')\`, payoutID)\n\t\tif err != nil {\n\t\t\tshared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to claim payout reconciliation")\n\t\t\treturn\n\t\t}\n\t\tif affected, _ := claim.RowsAffected(); affected != 1 {\n\t\t\tshared.SendError(w, http.StatusConflict, "RECONCILIATION_IN_PROGRESS", "payout reconciliation is already in progress or no longer eligible")\n\t\t\treturn\n\t\t}`,
);
replaceExactly(
  payoutPath,
  `\t\t\t       reason, correlation_id, metadata, created_at\n`,
  `\t\t\t       reason, correlation_id, metadata, created_at::text\n`,
);

const panelPath = "services/dsh/frontend/shared/finance-wlt-link/jrn037/PayoutDestinationPanel.tsx";
replaceExactly(
  panelPath,
  `function DestinationEditor({\n`,
  `type DestinationTextField = Exclude<\n  keyof PayoutDestinationInput,\n  "settlementPreference" | "bankAccountHolderMatchesOwner"\n>;\n\nfunction DestinationEditor({\n`,
);
replaceExactly(
  panelPath,
  `  const field = (key: keyof PayoutDestinationInput, placeholder: string, secure = false) => (\n`,
  `  const field = (key: DestinationTextField, placeholder: string, secure = false) => (\n`,
);

const runtimeSmokePath = "tools/verification/jrn-037-runtime-smoke.sh";
replaceExactly(
  runtimeSmokePath,
  `echo '{"operatorId":"finance-maker-1"}' | api POST "/wlt/payout-requests/$PAYOUT_ID/approve" "$REQUEST_KEY-approve" "$REQUEST_KEY-approve" "$(cat)" >/tmp/jrn037-approved.json\necho '{"operatorId":"finance-processor-2"}' | api POST "/wlt/payout-requests/$PAYOUT_ID/process" "$REQUEST_KEY-process" "$REQUEST_KEY-process" "$(cat)" >/tmp/jrn037-processed.json\necho '{"operatorId":"finance-checker-3"}' | api POST "/wlt/payout-requests/$PAYOUT_ID/complete" "$REQUEST_KEY-complete" "$REQUEST_KEY-complete" "$(cat)" >/tmp/jrn037-completed.json\n`,
  `api POST "/wlt/payout-requests/$PAYOUT_ID/approve" "$REQUEST_KEY-approve" "$REQUEST_KEY-approve" '{"operatorId":"finance-maker-1"}' >/tmp/jrn037-approved.json\napi POST "/wlt/payout-requests/$PAYOUT_ID/process" "$REQUEST_KEY-process" "$REQUEST_KEY-process" '{"operatorId":"finance-processor-2"}' >/tmp/jrn037-processed.json\napi POST "/wlt/payout-requests/$PAYOUT_ID/complete" "$REQUEST_KEY-complete" "$REQUEST_KEY-complete" '{"operatorId":"finance-checker-3"}' >/tmp/jrn037-completed.json\n`,
);

const goFiles = [
  "services/wlt/backend/internal/payout/jrn037_governed_payout.go",
  "services/wlt/backend/internal/payout/jrn037_governed_payout_test.go",
  "services/wlt/backend/internal/payout/model_request.go",
  "services/wlt/backend/internal/payout/read_provider_proof.go",
  "services/wlt/backend/internal/http/server.go",
  "services/dsh/backend/internal/http/jrn037_payout_routes.go",
  "services/dsh/backend/internal/http/representative_finance_routes.go",
  "services/dsh/backend/internal/wlt/actor_finance_client.go",
  "services/dsh/backend/internal/wlt/finance_proxy.go",
];

execFileSync("gofmt", ["-w", ...goFiles], { cwd: root, stdio: "inherit" });
console.log("JRN-037 source normalization completed.");
