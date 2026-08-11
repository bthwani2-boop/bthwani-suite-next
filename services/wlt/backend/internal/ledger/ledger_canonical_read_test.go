package ledger

import (
	"context"
	"testing"

	"wlt-api/internal/shared"
)

func TestCanonicalLedgerRead_UsesCurrentDoubleEntryAndIsolatesContext(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	actorID := uniqueActorID("ledger-read-captain")
	ctxAID := uniqueActorID("ledger-read-a")
	ctxBID := uniqueActorID("ledger-read-b")
	ctxA := shared.WithOperatorContext(context.Background(), ctxAID)
	ctxB := shared.WithOperatorContext(context.Background(), ctxBID)

	post := func(ctx context.Context, amount int64, ref string) {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatalf("begin tx: %v", err)
		}
		defer tx.Rollback()
		if _, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", amount, ref, Actor{ID: "test", Type: "test"}); err != nil {
			t.Fatalf("post opening balance: %v", err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatalf("commit: %v", err)
		}
	}

	post(ctxA, 1500, uniqueActorID("ledger-read-ref-a"))
	post(ctxB, 9500, uniqueActorID("ledger-read-ref-b"))

	entriesA, nextA, err := ListLedgerEntries(ctxA, db, ListLedgerEntriesParams{
		ActorID:   actorID,
		ActorType: "captain",
		Limit:     10,
	})
	if err != nil {
		t.Fatalf("list context A ledger: %v", err)
	}
	if nextA != "" {
		t.Fatalf("unexpected next cursor for one context-A entry: %q", nextA)
	}
	if len(entriesA) != 1 {
		t.Fatalf("expected one canonical wallet line in context A, got %d", len(entriesA))
	}
	if entriesA[0].EntryType != "opening_balance" || entriesA[0].BalanceAfter != 1500 {
		t.Fatalf("unexpected canonical context-A ledger entry: %+v", entriesA[0])
	}

	entriesB, _, err := ListLedgerEntries(ctxB, db, ListLedgerEntriesParams{
		ActorID:   actorID,
		ActorType: "captain",
		Limit:     10,
	})
	if err != nil {
		t.Fatalf("list context B ledger: %v", err)
	}
	if len(entriesB) != 1 || entriesB[0].BalanceAfter != 9500 {
		t.Fatalf("context B ledger projection is wrong: %+v", entriesB)
	}

	crossContext, err := GetLedgerEntryForOperatorContext(ctxA, db, entriesB[0].ID)
	if err != nil {
		t.Fatalf("cross-context get returned error: %v", err)
	}
	if crossContext != nil {
		t.Fatalf("cross-context canonical ledger line leaked into context A: %+v", crossContext)
	}
}
