from __future__ import annotations

from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
TOUCHED: set[Path] = set()


def replace_exact(relative: str, old: str, new: str, expected: int = 1) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{relative}: expected {expected} occurrence(s), found {count}")
    path.write_text(text.replace(old, new), encoding="utf-8")
    TOUCHED.add(path)


# Proven-unused residue: delete, do not suppress.
replace_exact(
    "services/wlt/backend/internal/cod/reservation.go",
    '''func getCodReservationForUpdate(ctx context.Context, tx *sql.Tx, operatorContextID, orderID string) (*CodReservation, error) {
\treservation, err := scanCodReservation(tx.QueryRowContext(ctx, `
\t\tSELECT `+codReservationCols+` FROM wlt_cod_reservations
\t\tWHERE operator_context_id = $1 AND order_id = $2 FOR UPDATE`,
\t\toperatorContextID, strings.TrimSpace(orderID),
\t))
\tif errors.Is(err, sql.ErrNoRows) {
\t\treturn nil, nil
\t}
\treturn reservation, err
}

''',
    "",
)

replace_exact(
    "services/wlt/backend/internal/commercial/commercial.go",
    '''const subscriptionSelectCols = `id::TEXT, operator_context_id, client_id, product_reference, status,
\tpayment_session_id::TEXT, starts_at::TEXT, ends_at::TEXT, created_at::TEXT, updated_at::TEXT`

func scanSubscription(row interface{ Scan(dest ...any) error }) (*Subscription, error) {
\tvar subscription Subscription
\tvar paymentSession sql.NullString
\tvar endsAt sql.NullString
\terr := row.Scan(
\t\t&subscription.ID, &subscription.OperatorContextID, &subscription.ClientID, &subscription.ProductReference,
\t\t&subscription.Status, &paymentSession, &subscription.StartsAt, &endsAt,
\t\t&subscription.CreatedAt, &subscription.UpdatedAt,
\t)
\tif errors.Is(err, sql.ErrNoRows) {
\t\treturn nil, ErrNotFound
\t}
\tif err != nil {
\t\treturn nil, err
\t}
\tif paymentSession.Valid {
\t\tsubscription.PaymentSessionID = &paymentSession.String
\t}
\tif endsAt.Valid {
\t\tsubscription.EndsAt = &endsAt.String
\t}
\treturn &subscription, nil
}

''',
    "",
)

replace_exact(
    "services/wlt/backend/internal/payout/payout_governance.go",
    '''type payoutReconciliationInput struct {
\tOperatorID string `json:"operatorId"`
}

''',
    "",
)
replace_exact(
    "services/wlt/backend/internal/payout/payout_governance.go",
    '''func mustJSON(value any) string {
\tencoded, _ := json.Marshal(value)
\treturn string(encoded)
}
''',
    "",
)
replace_exact(
    "services/wlt/backend/internal/settlement/runtime_operator_context_isolation_test.go",
    '''func insertOperatorContextSettlement(t *testing.T, operatorContextID, partnerID string, gross, fee, net int64) *Settlement {
\tt.Helper()
\tdb := getTestDB(t)
\tif db == nil {
\t\treturn nil
\t}
\tdefer db.Close()
\trow := db.QueryRow(`
\t\tINSERT INTO wlt_settlements
\t\t\t(operator_context_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
\t\tVALUES ($1, $2, DATE '2026-07-01', DATE '2026-07-31', $3::bigint, $4::bigint, $5::bigint, 'YER', 1, 'pending')
\t\tRETURNING `+settlementCols,
\t\toperatorContextID, partnerID, gross, fee, net,
\t)
\tsettlement, err := scanSettlement(row)
\tif err != nil {
\t\tt.Fatalf("insert OperatorContext settlement: %v", err)
\t}
\treturn settlement
}

''',
    "",
)

# Staticcheck findings: make the intended semantics explicit in source.
replace_exact(
    "services/wlt/backend/internal/commercial/subscription_lifecycle.go",
    '''\tactivationInput := ActivateSubscriptionLifecycleInput{
\t\tClientID: input.ClientID, ProductReference: input.ProductReference,
\t\tPaymentSessionID: input.PaymentSessionID, SubscriptionPurchaseID: input.SubscriptionPurchaseID,
\t}
''',
    '''\tactivationInput := ActivateSubscriptionLifecycleInput(input)
''',
)

replace_exact(
    "services/wlt/backend/internal/payout/external_statements.go",
    '''\tfor _, line := range input.Lines {
\t\tlines = append(lines, canonicalStatementLine{
\t\t\tExternalTransferReference: line.ExternalTransferReference,
\t\t\tDirection:                 line.Direction,
\t\t\tAmountMinorUnits:          line.AmountMinorUnits,
\t\t\tCurrency:                  line.Currency,
\t\t\tDestinationReferenceHash:  line.DestinationReferenceHash,
\t\t\tOccurredAt:                line.OccurredAt,
\t\t\tSourceRecord:              line.SourceRecord,
\t\t})
\t}
''',
    '''\tfor _, line := range input.Lines {
\t\tlines = append(lines, canonicalStatementLine(line))
\t}
''',
)
replace_exact(
    "services/wlt/backend/internal/payout/external_statements.go",
    '''\t\tif !((runeValue >= '0' && runeValue <= '9') || (runeValue >= 'a' && runeValue <= 'f')) {
''',
    '''\t\tif (runeValue < '0' || runeValue > '9') && (runeValue < 'a' || runeValue > 'f') {
''',
)
replace_exact(
    "services/wlt/backend/internal/payout/external_statements.go",
    '''\tif input.ProvenanceType == "operator_attested" {
\t\tinput.ProvenanceEvidenceSHA256 = input.ArtifactSHA256
\t\tprovenanceEvidenceBytes = artifactBytes
\t} else if input.ProvenanceType == "provider_signed" {
\t\tif input.ProvenanceKeyID == "" || input.ProviderSignatureBase64 == "" {
\t\t\treturn nil, fmt.Errorf("provider_signed requires a provider key id and signature; self-asserted evidence is not accepted")
\t\t}
\t\tprovenanceEvidenceBytes, err = base64.StdEncoding.DecodeString(input.ProviderSignatureBase64)
\t\tif err != nil || len(provenanceEvidenceBytes) != ed25519.SignatureSize {
\t\t\treturn nil, fmt.Errorf("provider_signed evidence must be a valid Ed25519 signature")
\t\t}
\t\tinput.ProvenanceEvidenceBytesBase64 = input.ProviderSignatureBase64
\t\tinput.ProvenanceEvidenceSHA256 = ""
\t} else {
\t\treturn nil, fmt.Errorf("provider_api_verified requires the trusted provider API verifier; caller-asserted API provenance is rejected")
\t}
''',
    '''\tswitch input.ProvenanceType {
\tcase "operator_attested":
\t\tinput.ProvenanceEvidenceSHA256 = input.ArtifactSHA256
\t\tprovenanceEvidenceBytes = artifactBytes
\tcase "provider_signed":
\t\tif input.ProvenanceKeyID == "" || input.ProviderSignatureBase64 == "" {
\t\t\treturn nil, fmt.Errorf("provider_signed requires a provider key id and signature; self-asserted evidence is not accepted")
\t\t}
\t\tprovenanceEvidenceBytes, err = base64.StdEncoding.DecodeString(input.ProviderSignatureBase64)
\t\tif err != nil || len(provenanceEvidenceBytes) != ed25519.SignatureSize {
\t\t\treturn nil, fmt.Errorf("provider_signed evidence must be a valid Ed25519 signature")
\t\t}
\t\tinput.ProvenanceEvidenceBytesBase64 = input.ProviderSignatureBase64
\t\tinput.ProvenanceEvidenceSHA256 = ""
\tdefault:
\t\treturn nil, fmt.Errorf("provider_api_verified requires the trusted provider API verifier; caller-asserted API provenance is rejected")
\t}
''',
)

for relative in (
    "services/wlt/backend/internal/reconciliation/reconciliation.go",
    "services/wlt/backend/internal/refund/governed_refund.go",
):
    replace_exact(
        relative,
        "Identity-authenticated delegated finance principal is required",
        "identity-authenticated delegated finance principal is required",
    )

# Explicitly discard only resource-cleanup Close errors in production WLT code.
close_re = re.compile(r"^(?P<indent>\s*)(?P<expr>[A-Za-z_][A-Za-z0-9_.]*)\.Close\(\)(?P<suffix>\s*(?://.*)?)$", re.MULTILINE)
close_count = 0
for path in (ROOT / "services/wlt/backend").rglob("*.go"):
    if path.name.endswith("_test.go"):
        continue
    text = path.read_text(encoding="utf-8")
    updated, count = close_re.subn(r"\g<indent>_ = \g<expr>.Close()\g<suffix>", text)
    if count:
        path.write_text(updated, encoding="utf-8")
        TOUCHED.add(path)
        close_count += count

if close_count != 15:
    raise SystemExit(f"expected to make 15 production Close discards explicit, changed {close_count}")

# Preserve canonical Go formatting before verification.
go_files = sorted(str(path) for path in TOUCHED if path.suffix == ".go")
subprocess.run(["gofmt", "-w", *go_files], check=True, cwd=ROOT)

print("WLT Level-4 cleanup touched:")
for path in sorted(TOUCHED):
    print(path.relative_to(ROOT))
print(f"explicit Close cleanup conversions: {close_count}")
