package payout

import (
	"strings"
	"testing"
	"time"
)

func testAuthoritativeStatementInput() ImportAuthoritativeStatementInput {
	occurredAt := time.Date(2026, time.August, 27, 12, 30, 0, 0, time.UTC)
	return ImportAuthoritativeStatementInput{
		ExternalProviderAccountID: "account-1",
		StatementReference:        "statement-2026-08-27",
		BusinessDate:              "2026-08-27",
		ClosingBalanceMinorUnits:  250000,
		Currency:                  "YER",
		Lines: []AuthoritativeStatementLineInput{
			{
				ExternalTransferReference: "transfer-1",
				Direction:                 "outgoing",
				AmountMinorUnits:          5000,
				Currency:                  "YER",
				DestinationReferenceHash:  strings.Repeat("a", 64),
				OccurredAt:                &occurredAt,
				SourceRecord:              map[string]any{"provider": "rail-1", "sequence": float64(7)},
			},
		},
	}
}

func TestCanonicalStatementArtifactSHA256IsDeterministicAndPayloadBound(t *testing.T) {
	input := testAuthoritativeStatementInput()
	businessDate, err := time.Parse(time.DateOnly, input.BusinessDate)
	if err != nil {
		t.Fatal(err)
	}
	first, err := canonicalStatementArtifactSHA256(input, businessDate)
	if err != nil {
		t.Fatal(err)
	}
	second, err := canonicalStatementArtifactSHA256(input, businessDate)
	if err != nil {
		t.Fatal(err)
	}
	if first != second || !isSHA256(first) {
		t.Fatalf("expected deterministic SHA-256 fingerprint, first=%q second=%q", first, second)
	}

	changed := input
	changed.ClosingBalanceMinorUnits++
	changedDigest, err := canonicalStatementArtifactSHA256(changed, businessDate)
	if err != nil {
		t.Fatal(err)
	}
	if changedDigest == first {
		t.Fatal("changing the financial payload must change the canonical fingerprint")
	}
}

func TestCanonicalStatementArtifactSHA256CanonicalizesSourceRecordMapKeys(t *testing.T) {
	input := testAuthoritativeStatementInput()
	businessDate, err := time.Parse(time.DateOnly, input.BusinessDate)
	if err != nil {
		t.Fatal(err)
	}
	first, err := canonicalStatementArtifactSHA256(input, businessDate)
	if err != nil {
		t.Fatal(err)
	}
	input.Lines[0].SourceRecord = map[string]any{"sequence": float64(7), "provider": "rail-1"}
	second, err := canonicalStatementArtifactSHA256(input, businessDate)
	if err != nil {
		t.Fatal(err)
	}
	if first != second {
		t.Fatal("source-record map key order must not alter the canonical fingerprint")
	}
}

func TestCanonicalStatementArtifactSHA256RejectsCallerHashThatDoesNotMatchPayload(t *testing.T) {
	input := testAuthoritativeStatementInput()
	businessDate, err := time.Parse(time.DateOnly, input.BusinessDate)
	if err != nil {
		t.Fatal(err)
	}
	computed, err := canonicalStatementArtifactSHA256(input, businessDate)
	if err != nil {
		t.Fatal(err)
	}
	input.ArtifactSHA256 = strings.Repeat("b", 64)
	if input.ArtifactSHA256 == computed {
		t.Fatal("test hash unexpectedly matches computed fingerprint")
	}
	if _, _, err := validateCanonicalStatementArtifact(input, businessDate); err == nil {
		t.Fatal("caller-supplied hash must be rejected when it does not match the server-computed fingerprint")
	}
}
