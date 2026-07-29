package cod

import (
	"errors"
	"testing"
)

func TestNormalizeCustodyInputRequiresEvidenceAndMutationHeaders(t *testing.T) {
	t.Parallel()

	if _, _, _, _, _, err := normalizeCustodyInput("", "captain-1", "captain", "corr-1", "idem-1"); err == nil {
		t.Fatal("expected missing proofReference to fail")
	}
	if _, _, _, _, _, err := normalizeCustodyInput("proof-1", "captain-1", "captain", "", "idem-1"); err == nil {
		t.Fatal("expected missing correlation id to fail")
	}
	if _, _, _, _, _, err := normalizeCustodyInput("proof-1", "captain-1", "captain", "corr-1", ""); err == nil {
		t.Fatal("expected missing idempotency key to fail")
	}
	if _, _, _, _, _, err := normalizeCustodyInput("proof-1", "captain-1", "client", "corr-1", "idem-1"); err == nil {
		t.Fatal("expected unsupported actor type to fail")
	}

	proof, actorID, actorType, correlationID, idempotencyKey, err := normalizeCustodyInput(
		" proof-1 ", " captain-1 ", " captain ", " corr-1 ", " idem-1 ",
	)
	if err != nil {
		t.Fatalf("normalize valid input: %v", err)
	}
	if proof != "proof-1" || actorID != "captain-1" || actorType != "captain" || correlationID != "corr-1" || idempotencyKey != "idem-1" {
		t.Fatalf("unexpected normalized values: %q %q %q %q %q", proof, actorID, actorType, correlationID, idempotencyKey)
	}
}

func TestCodCustodyActorAuthorizationUsesPersistedCollector(t *testing.T) {
	t.Parallel()

	record := &CodRecord{
		CollectorID:   "captain-42",
		CollectorType: "captain",
		PartnerID:     "partner-7",
	}
	if !actorMatchesCollector(record, "captain-42", "captain") {
		t.Fatal("persisted collector must be authorized to collect")
	}
	if actorMatchesCollector(record, "captain-99", "captain") {
		t.Fatal("a different captain must not be authorized")
	}
	if actorMatchesCollector(record, "captain-42", "operator") {
		t.Fatal("matching id with a different actor type must not be authorized")
	}
	if !actorMayRemit(record, "captain-42", "captain") {
		t.Fatal("collector must be able to remit")
	}
	if !actorMayRemit(record, "partner-7", "partner") {
		t.Fatal("owning partner must be able to accept/remit custody")
	}
	if !actorMayRemit(record, "operator-1", "operator") {
		t.Fatal("governed operator must be able to remit custody")
	}
	if actorMayRemit(record, "partner-8", "partner") {
		t.Fatal("another partner must not be able to remit custody")
	}
}

func TestCodCustodyEvidenceReplayIsStrict(t *testing.T) {
	t.Parallel()

	evidence := &CodCustodyEvidence{
		ActualAmountMinorUnits: 12500,
		ProofReference:         "receipt-1",
		ActorID:                "captain-42",
		ActorType:              "captain",
		IdempotencyKey:         "idem-1",
	}
	if err := assertEvidenceReplay(evidence, 12500, "receipt-1", "captain-42", "captain", "idem-1"); err != nil {
		t.Fatalf("expected exact replay to succeed: %v", err)
	}
	if err := assertEvidenceReplay(evidence, 12400, "receipt-1", "captain-42", "captain", "idem-1"); !errors.Is(err, ErrCodEvidenceConflict) {
		t.Fatalf("expected changed amount to conflict, got %v", err)
	}
	if err := assertEvidenceReplay(evidence, 12500, "receipt-2", "captain-42", "captain", "idem-1"); !errors.Is(err, ErrCodEvidenceConflict) {
		t.Fatalf("expected changed proof to conflict, got %v", err)
	}
	if err := assertEvidenceReplay(evidence, 12500, "receipt-1", "captain-99", "captain", "idem-1"); !errors.Is(err, ErrCodEvidenceConflict) {
		t.Fatalf("expected changed actor to conflict, got %v", err)
	}
}

func TestCodDifferenceSignConvention(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		expected int64
		actual   int64
		want     int64
	}{
		{name: "exact", expected: 10000, actual: 10000, want: 0},
		{name: "shortage", expected: 10000, actual: 9500, want: -500},
		{name: "overage", expected: 10000, actual: 10200, want: 200},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.actual - tc.expected; got != tc.want {
				t.Fatalf("difference = %d, want %d", got, tc.want)
			}
		})
	}
}
