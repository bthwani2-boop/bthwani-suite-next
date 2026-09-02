package support

import (
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestPartnerOperationsReadModelRuntimeReadback(t *testing.T) {
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}

	var partnerID string
	err = db.QueryRow(`
		SELECT p.id
		FROM dsh_partners p
		JOIN dsh_partner_store_readiness_v readiness
		  ON readiness.partner_id = p.id
		 AND readiness.operator_context_id = p.operator_context_id
	WHERE p.archived_at IS NULL
		ORDER BY p.id
		LIMIT 1`).Scan(&partnerID)
	if errors.Is(err, sql.ErrNoRows) {
		t.Skip("runtime has no linked partner store fixture")
	}
	if err != nil {
		t.Fatal(err)
	}

	model, err := GetPartnerOperationsReadModel(db, partnerID)
	if err != nil {
		t.Fatal(err)
	}
	if model.PartnerID != partnerID || model.OperatorContextID == "" {
		t.Fatalf("readback lost partner scope: %+v", model)
	}
	if len(model.Stores) == 0 {
		t.Fatal("readback did not return the linked store from the canonical readiness view")
	}
	if model.Stores[0].BlockingReasonCodes == nil {
		t.Fatal("readback returned a null blocking-reason list")
	}
	if model.GeneratedAt.Before(time.Now().UTC().Add(-time.Minute)) {
		t.Fatalf("readback timestamp is stale: %s", model.GeneratedAt)
	}
	aggregate, err := GetPartnerAggregate(db, partnerID)
	if err != nil {
		t.Fatal(err)
	}
	if aggregate.PartnerID != partnerID || aggregate.OperatorContextID != model.OperatorContextID {
		t.Fatalf("aggregate lost partner scope: %+v", aggregate)
	}

	for _, item := range model.Orders {
		var owned bool
		if err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM dsh_orders o
				JOIN dsh_stores s ON s.id = o.store_id
				WHERE o.id = $1::uuid
				  AND o.operator_context_id = $2
				  AND s.partner_id = $3
				  AND s.operator_context_id = $2
			)`, item.ID, model.OperatorContextID, partnerID).Scan(&owned); err != nil {
			t.Fatal(err)
		}
		if !owned {
			t.Fatalf("readback returned an order outside the partner scope: %+v", item)
		}
	}
}
