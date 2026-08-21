package pricing

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"

	"wlt-api/internal/shared"
)

func TestNormalizeSpecialRequestQuoteProposalEnforcesCanonicalFinancialContract(t *testing.T) {
	specialRequestID := uuid.NewString()
	clientID := uuid.NewString()
	operatorContextID, normalized, err := normalizeSpecialRequestQuoteProposal(" operator-1 ", SpecialRequestQuoteProposal{
		SpecialRequestID: specialRequestID, ClientID: clientID, PolicyID: " special-request-standard ",
		ProposedAmountMinorUnits: 1250, ProposedCurrency: " yer ", ProposalReason: "  approved operational quote  ",
		IdempotencyKey: " idem-1 ", CorrelationID: " corr-1 ",
	})
	if err != nil {
		t.Fatal(err)
	}
	if operatorContextID != "operator-1" || normalized.PolicyID != "special-request-standard" || normalized.ProposedCurrency != "YER" || normalized.ProposalReason != "approved operational quote" || normalized.IdempotencyKey != "idem-1" || normalized.CorrelationID != "corr-1" {
		t.Fatalf("proposal was not normalized canonically: %#v", normalized)
	}

	cases := []SpecialRequestQuoteProposal{
		{ClientID: clientID, PolicyID: "policy", ProposedAmountMinorUnits: 1, ProposedCurrency: "YER", ProposalReason: "valid reason", IdempotencyKey: "id", CorrelationID: "corr"},
		{SpecialRequestID: "not-a-uuid", ClientID: clientID, PolicyID: "policy", ProposedAmountMinorUnits: 1, ProposedCurrency: "YER", ProposalReason: "valid reason", IdempotencyKey: "id", CorrelationID: "corr"},
		{SpecialRequestID: specialRequestID, ClientID: "not-a-uuid", PolicyID: "policy", ProposedAmountMinorUnits: 1, ProposedCurrency: "YER", ProposalReason: "valid reason", IdempotencyKey: "id", CorrelationID: "corr"},
		{SpecialRequestID: specialRequestID, ClientID: clientID, PolicyID: "policy", ProposedAmountMinorUnits: 0, ProposedCurrency: "YER", ProposalReason: "valid reason", IdempotencyKey: "id", CorrelationID: "corr"},
		{SpecialRequestID: specialRequestID, ClientID: clientID, PolicyID: "policy", ProposedAmountMinorUnits: 1, ProposedCurrency: "YE", ProposalReason: "valid reason", IdempotencyKey: "id", CorrelationID: "corr"},
		{SpecialRequestID: specialRequestID, ClientID: clientID, PolicyID: "policy", ProposedAmountMinorUnits: 1, ProposedCurrency: "YER", ProposalReason: "no", IdempotencyKey: "id", CorrelationID: "corr"},
	}
	for _, input := range cases {
		if _, _, err := normalizeSpecialRequestQuoteProposal("operator-1", input); err == nil {
			t.Fatalf("invalid proposal was accepted: %#v", input)
		}
	}
}

func TestSpecialRequestQuoteHashesAreStableAndInputBound(t *testing.T) {
	input := SpecialRequestQuoteProposal{SpecialRequestID: uuid.NewString(), ClientID: uuid.NewString(), PolicyID: "policy", ProposedAmountMinorUnits: 100, ProposedCurrency: "YER", ProposalReason: "valid reason"}
	first := specialRequestQuoteRequestHash(input)
	if len(first) != 64 || first != specialRequestQuoteRequestHash(input) {
		t.Fatalf("request hash is not stable SHA-256: %q", first)
	}
	input.ProposedAmountMinorUnits++
	if first == specialRequestQuoteRequestHash(input) {
		t.Fatal("request hash did not bind amount")
	}
	expires := time.Now().UTC().Add(time.Minute)
	quoteHash := specialRequestQuoteHash("quote-1", "operator-1", input, 1, 1, expires)
	if len(quoteHash) != 64 || quoteHash == specialRequestQuoteHash("quote-2", "operator-1", input, 1, 1, expires) {
		t.Fatal("quote hash did not bind quote identity")
	}
}

func TestIssueAndReadSpecialRequestQuoteMaintainsWltAuthorityDBIntegration(t *testing.T) {
	if os.Getenv("WLT_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set WLT_REQUIRE_DB_TESTS=true to run WLT DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when WLT_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	operatorContextID := "quote-test-" + uuid.NewString()
	specialRequestID := uuid.NewString()
	clientID := uuid.NewString()
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	proposal := SpecialRequestQuoteProposal{SpecialRequestID: specialRequestID, ClientID: clientID, PolicyID: "special-request-standard", ProposedAmountMinorUnits: 1250, ProposedCurrency: "YER", ProposalReason: "approved operational quote", IdempotencyKey: "quote-idem-1", CorrelationID: "quote-corr-1"}
	quote, replayed, err := IssueSpecialRequestQuote(ctx, db, operatorContextID, proposal)
	if err != nil {
		t.Fatal(err)
	}
	if replayed || quote.QuoteVersion != 1 || quote.Status != "active" || quote.AmountMinorUnits != 1250 {
		t.Fatalf("unexpected first quote: replayed=%v quote=%#v", replayed, quote)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_special_request_quotes WHERE operator_context_id=$1`, operatorContextID)
	})

	replayedQuote, replayed, err := IssueSpecialRequestQuote(ctx, db, operatorContextID, proposal)
	if err != nil || !replayed || replayedQuote.ID != quote.ID {
		t.Fatalf("idempotent quote replay mismatch: replayed=%v quote=%#v err=%v", replayed, replayedQuote, err)
	}
	conflict := proposal
	conflict.ProposedAmountMinorUnits = 1300
	if _, _, err := IssueSpecialRequestQuote(ctx, db, operatorContextID, conflict); !errors.Is(err, ErrSpecialRequestQuoteConflict) {
		t.Fatalf("expected idempotency conflict, got %v", err)
	}

	replacement := proposal
	replacement.IdempotencyKey = "quote-idem-2"
	replacement.CorrelationID = "quote-corr-2"
	replacement.ProposedAmountMinorUnits = 1500
	newQuote, replayed, err := IssueSpecialRequestQuote(ctx, db, operatorContextID, replacement)
	if err != nil || replayed || newQuote.QuoteVersion != 2 {
		t.Fatalf("quote supersession mismatch: replayed=%v quote=%#v err=%v", replayed, newQuote, err)
	}
	if _, err := LoadSpecialRequestQuote(ctx, db, operatorContextID, quote.ID); !errors.Is(err, ErrSpecialRequestQuoteExpired) {
		t.Fatalf("superseded quote remained loadable: %v", err)
	}
	active, err := LoadActiveSpecialRequestQuote(ctx, db, operatorContextID, specialRequestID)
	if err != nil || active.ID != newQuote.ID {
		t.Fatalf("active quote readback mismatch: quote=%#v err=%v", active, err)
	}
}
