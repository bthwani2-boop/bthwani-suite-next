package specialrequests

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	"dsh-api/internal/wlt"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

const testOperatorContextID = "OperatorContext-test"

// openRequiredDB mirrors the DSH_REQUIRE_DB_TESTS/DATABASE_URL gate used by
// every other *_db_test.go file in this backend (e.g.
// internal/dispatch/dispatch_db_test.go). There is no shared test-db-helper
// package across internal/* today, so this gate is intentionally duplicated
// here rather than introducing a new cross-package dependency for tests only.
func openRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
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
	return db
}

func newTestService(db *sql.DB) (*Service, *PostgresRepository) {
	repo := NewPostgresRepository(db)
	return NewService(repo), repo
}

// newClientID returns a fresh valid UUID string: dsh_special_requests.client_id
// is a UUID column, so arbitrary non-UUID test strings would fail to insert.
func newClientID(t *testing.T) string {
	t.Helper()
	return uuid.New().String()
}

func testSuffix() string {
	return strconv.FormatInt(time.Now().UnixNano(), 10)
}

// cleanupRequest deletes a special request (assignments/deliveries cascade via
// FK) plus its audit-event rows, which have no FK back to the request.
func cleanupRequest(t *testing.T, db *sql.DB, id string) {
	t.Helper()
	t.Cleanup(func() {
		ctx := context.Background()
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_request_wlt_event_receipts WHERE special_request_id = $1::uuid`, id)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests_audit_events WHERE entity_id = $1::uuid`, id)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests WHERE id = $1::uuid`, id)
	})
}

func validSheinInput(clientID string) CreateInput {
	url := "https://www.shein.com/item/12345"
	qty := 2
	return CreateInput{
		OperatorContextID: testOperatorContextID,
		ClientID:          clientID,
		RequestType:       TypeSheinAssistedPurchase,
		IdempotencyKey:    "test-shein-" + clientID,
		ProductUrl:        &url,
		Quantity:          &qty,
	}
}

func validAwnakInput(clientID string) CreateInput {
	pickup := "Pickup reference " + testSuffix()
	dropoff := "Dropoff reference " + testSuffix()
	return CreateInput{
		OperatorContextID:       testOperatorContextID,
		ClientID:                clientID,
		RequestType:             TypeAwnakErrand,
		IdempotencyKey:          "test-awnak-" + clientID,
		PickupAddressReference:  &pickup,
		DropoffAddressReference: &dropoff,
	}
}

func assertAuditEventExists(t *testing.T, db *sql.DB, entityID, action string) {
	t.Helper()
	var n int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_special_requests_audit_events
		WHERE entity_id = $1::uuid AND action = $2`, entityID, action).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n == 0 {
		t.Fatalf("expected an audit event for entity=%s action=%s", entityID, action)
	}
}

func TestSpecialRequestsCreateDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, _ := newTestService(db)
	ctx := context.Background()

	t.Run("valid shein succeeds with intake_review stage", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		if req.Status != StatusSubmitted {
			t.Fatalf("expected status submitted, got %s", req.Status)
		}
		if req.WorkflowStage == nil || *req.WorkflowStage != "intake_review" {
			t.Fatalf("expected workflowStage intake_review, got %v", req.WorkflowStage)
		}
	})

	t.Run("invalid shein productUrl is rejected", func(t *testing.T) {
		clientID := newClientID(t)
		bad := "not-a-url"
		qty := 1
		_, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeSheinAssistedPurchase,
			IdempotencyKey: "invalid-shein-" + testSuffix(),
			ProductUrl:     &bad, Quantity: &qty,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("missing shein productUrl is rejected", func(t *testing.T) {
		clientID := newClientID(t)
		qty := 1
		_, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeSheinAssistedPurchase,
			IdempotencyKey: "missing-shein-" + testSuffix(),
			Quantity:       &qty,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("shein quantity zero is rejected", func(t *testing.T) {
		clientID := newClientID(t)
		url := "https://www.shein.com/item/1"
		qty := 0
		_, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeSheinAssistedPurchase,
			IdempotencyKey: "zero-shein-" + testSuffix(),
			ProductUrl:     &url, Quantity: &qty,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("valid awnak succeeds with intake stage", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validAwnakInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		if req.Status != StatusSubmitted {
			t.Fatalf("expected status submitted, got %s", req.Status)
		}
		if req.WorkflowStage == nil || *req.WorkflowStage != "intake" {
			t.Fatalf("expected workflowStage intake, got %v", req.WorkflowStage)
		}
	})

	t.Run("awnak missing pickup is rejected", func(t *testing.T) {
		clientID := newClientID(t)
		dropoff := "Dropoff ref"
		_, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeAwnakErrand,
			IdempotencyKey:          "missing-pickup-" + testSuffix(),
			DropoffAddressReference: &dropoff,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("awnak missing dropoff is rejected", func(t *testing.T) {
		clientID := newClientID(t)
		pickup := "Pickup ref"
		_, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeAwnakErrand,
			IdempotencyKey:         "missing-dropoff-" + testSuffix(),
			PickupAddressReference: &pickup,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("idempotent duplicate create returns same row without duplicate insert", func(t *testing.T) {
		clientID := newClientID(t)
		key := "idem-" + testSuffix()
		in := validSheinInput(clientID)
		in.IdempotencyKey = key

		first, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, in)
		if err != nil {
			t.Fatalf("first Create failed: %v", err)
		}
		cleanupRequest(t, db, first.ID)

		in2 := validSheinInput(clientID)
		in2.IdempotencyKey = key
		second, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, in2)
		if err != nil {
			t.Fatalf("second Create failed: %v", err)
		}
		if first.ID != second.ID {
			t.Fatalf("expected idempotent duplicate to return same id, got %s vs %s", first.ID, second.ID)
		}

		var count int
		if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_special_requests WHERE client_id = $1::uuid AND idempotency_key = $2`,
			clientID, key).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("expected exactly 1 row for idempotency key, found %d", count)
		}
	})

	t.Run("audit event recorded on create", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validAwnakInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		assertAuditEventExists(t, db, req.ID, "create")
	})
}

// TestSpecialRequestsAuditAtomicityDBIntegration is a regression guard for
// the resolved gap where WriteAuditEvent wrote via a pooled *sql.DB
// connection after the mutation it described had already committed, making
// the audit event best-effort. WriteAuditEvent now takes the caller's *sql.Tx
// directly (mirroring partnerdelivery/pickup), so it is exercised here at the
// same level service.go calls it: within a transaction that also performed
// the row update, proving a failed audit write rolls the update back with it.
func TestSpecialRequestsAuditAtomicityDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	repo := NewPostgresRepository(db)
	ctx := context.Background()

	t.Run("a failed audit write rolls back the update in the same transaction", func(t *testing.T) {
		clientID := newClientID(t)
		in := validSheinInput(clientID)
		in.workflowStage = firstStageFor(in.RequestType)
		req, err := repo.Create(ctx, in)
		if err != nil {
			t.Fatalf("seed create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)

		tx, err := db.Begin()
		if err != nil {
			t.Fatalf("begin failed: %v", err)
		}
		status := StatusUnderReview
		if _, err := repo.UpdateInOperatorContextTx(ctx, tx, "", req.ID, req.Version, UpdateInput{Status: &status}); err != nil {
			_ = tx.Rollback()
			t.Fatalf("UpdateInOperatorContextTx failed: %v", err)
		}
		// entity_id is UUID NOT NULL (dsh-054): a malformed value forces
		// exactly the kind of audit-write failure service.go now guards
		// against by checking WriteAuditEvent's error before committing.
		if err := WriteAuditEvent(tx, "not-a-uuid", "operator", "operator", "transition", "", "", nil, nil); err == nil {
			_ = tx.Rollback()
			t.Fatal("expected WriteAuditEvent with a malformed entity_id to fail")
		}
		if err := tx.Rollback(); err != nil {
			t.Fatalf("rollback failed: %v", err)
		}

		current, err := repo.Get(ctx, req.ID)
		if err != nil {
			t.Fatalf("readback failed: %v", err)
		}
		if current.Status != StatusSubmitted {
			t.Fatalf("expected status to remain submitted after rollback, got %s", current.Status)
		}
		if current.Version != req.Version {
			t.Fatalf("expected version to remain %d after rollback, got %d", req.Version, current.Version)
		}
	})

	t.Run("a successful update and its audit event commit together", func(t *testing.T) {
		clientID := newClientID(t)
		in := validSheinInput(clientID)
		in.workflowStage = firstStageFor(in.RequestType)
		req, err := repo.Create(ctx, in)
		if err != nil {
			t.Fatalf("seed create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)

		tx, err := db.Begin()
		if err != nil {
			t.Fatalf("begin failed: %v", err)
		}
		status := StatusUnderReview
		updated, err := repo.UpdateInOperatorContextTx(ctx, tx, "", req.ID, req.Version, UpdateInput{Status: &status})
		if err != nil {
			_ = tx.Rollback()
			t.Fatalf("UpdateInOperatorContextTx failed: %v", err)
		}
		if err := WriteAuditEvent(tx, req.ID, "operator", "operator", "transition", "", "", nil, nil); err != nil {
			_ = tx.Rollback()
			t.Fatalf("WriteAuditEvent failed: %v", err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatalf("commit failed: %v", err)
		}

		current, err := repo.Get(ctx, req.ID)
		if err != nil {
			t.Fatalf("readback failed: %v", err)
		}
		if current.Status != StatusUnderReview {
			t.Fatalf("expected status under_review after commit, got %s", current.Status)
		}
		if current.Version != updated.Version {
			t.Fatalf("expected version %d after commit, got %d", updated.Version, current.Version)
		}
		assertAuditEventExists(t, db, req.ID, "transition")
	})
}

func TestSpecialRequestsListAndGetOwnershipDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, _ := newTestService(db)
	ctx := context.Background()

	clientA := newClientID(t)
	clientB := newClientID(t)

	reqA, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientA, validSheinInput(clientA))
	if err != nil {
		t.Fatalf("create for client A failed: %v", err)
	}
	cleanupRequest(t, db, reqA.ID)

	reqB, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientB, validAwnakInput(clientB))
	if err != nil {
		t.Fatalf("create for client B failed: %v", err)
	}
	cleanupRequest(t, db, reqB.ID)

	t.Run("ListForClient only returns caller's own requests", func(t *testing.T) {
		items, total, err := svc.ListForClientInOperatorContext(ctx, testOperatorContextID, clientA, 50, 0)
		if err != nil {
			t.Fatalf("ListForClient failed: %v", err)
		}
		if total != 1 {
			t.Fatalf("expected total 1 for client A, got %d", total)
		}
		for _, item := range items {
			if item.ClientID != clientA {
				t.Fatalf("ownership isolation violated: got request for client %s while listing client %s", item.ClientID, clientA)
			}
		}
	})

	t.Run("GetForClient masks other client's request as not found", func(t *testing.T) {
		_, err := svc.GetForClientInOperatorContext(ctx, testOperatorContextID, reqA.ID, clientB)
		if !errors.Is(err, ErrNotFound) {
			t.Fatalf("expected ErrNotFound (404-masking), got %v", err)
		}
	})

	t.Run("GetForClient succeeds for owner", func(t *testing.T) {
		got, err := svc.GetForClientInOperatorContext(ctx, testOperatorContextID, reqA.ID, clientA)
		if err != nil {
			t.Fatalf("expected owner to fetch their own request, got %v", err)
		}
		if got.ID != reqA.ID {
			t.Fatalf("expected id %s, got %s", reqA.ID, got.ID)
		}
	})

	t.Run("OperatorContext scope masks same-client request from another OperatorContext", func(t *testing.T) {
		OperatorContextA := "OperatorContext-a-" + testSuffix()
		OperatorContextB := "OperatorContext-b-" + testSuffix()
		clientID := newClientID(t)
		req, err := svc.CreateInOperatorContext(ctx, OperatorContextA, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("create for OperatorContext A failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)

		if _, err := svc.GetForClientInOperatorContext(ctx, OperatorContextB, req.ID, clientID); !errors.Is(err, ErrNotFound) {
			t.Fatalf("expected cross-OperatorContext GetForClientInOperatorContext to mask as ErrNotFound, got %v", err)
		}
		items, total, err := svc.ListForClientInOperatorContext(ctx, OperatorContextB, clientID, 50, 0)
		if err != nil {
			t.Fatalf("cross-OperatorContext ListForClientInOperatorContext failed: %v", err)
		}
		if total != 0 || len(items) != 0 {
			t.Fatalf("expected OperatorContext B list to be empty, got total=%d len=%d", total, len(items))
		}
	})
}

func TestSpecialRequestsCancelForClientDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, _ := newTestService(db)
	ctx := context.Background()

	t.Run("cancel from submitted succeeds and sets cancelledAt", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)

		updated, err := svc.CancelForClientInOperatorContext(ctx, testOperatorContextID, req.ID, clientID, nil)
		if err != nil {
			t.Fatalf("CancelForClient failed: %v", err)
		}
		if updated.Status != StatusCancelled {
			t.Fatalf("expected status cancelled, got %s", updated.Status)
		}
		if updated.CancelledAt == nil {
			t.Fatal("expected cancelledAt to be set")
		}
	})

	t.Run("cannot cancel from completed", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validAwnakInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)

		// Seed directly to completed via test-only SQL, bypassing the
		// transition chain: simpler than driving submitted -> ... -> completed
		// through the full state machine just to exercise this guard.
		if _, err := db.ExecContext(ctx, `UPDATE dsh_special_requests SET status = 'completed', completed_at = now() WHERE id = $1::uuid`, req.ID); err != nil {
			t.Fatalf("failed to seed completed status: %v", err)
		}

		_, err = svc.CancelForClientInOperatorContext(ctx, testOperatorContextID, req.ID, clientID, nil)
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict cancelling from completed, got %v", err)
		}
	})
}

func TestSpecialRequestsApplyOperatorTransitionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, _ := newTestService(db)
	ctx := context.Background()

	createReq := func(t *testing.T, reqType RequestType) *SpecialRequest {
		t.Helper()
		clientID := newClientID(t)
		var in CreateInput
		if reqType == TypeAwnakErrand {
			in = validAwnakInput(clientID)
		} else {
			in = validSheinInput(clientID)
		}
		req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, in)
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		return req
	}

	t.Run("valid transition submitted to under_review succeeds", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		updated, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{Status: &status})
		if err != nil {
			t.Fatalf("ApplyOperatorTransition failed: %v", err)
		}
		if updated.Status != StatusUnderReview {
			t.Fatalf("expected status under_review, got %s", updated.Status)
		}
		assertAuditEventExists(t, db, req.ID, "transition")
	})

	t.Run("invalid transition submitted to completed is rejected", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusCompleted
		_, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{Status: &status})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict for invalid direct transition, got %v", err)
		}
	})

	t.Run("terminal state protection blocks further transitions", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		cancelStatus := StatusCancelled
		cancelled, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{Status: &cancelStatus})
		if err != nil {
			t.Fatalf("expected submitted -> cancelled to succeed, got %v", err)
		}
		reviewStatus := StatusUnderReview
		_, err = svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, cancelled.Version, UpdateInput{Status: &reviewStatus})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict transitioning out of terminal state, got %v", err)
		}
	})

	t.Run("stale expectedVersion yields ErrVersionConflict", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		_, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version+999, UpdateInput{Status: &status})
		if !errors.Is(err, ErrVersionConflict) {
			t.Fatalf("expected ErrVersionConflict, got %v", err)
		}
	})

	t.Run("operator cancellation sets cancelledAt", func(t *testing.T) {
		req := createReq(t, TypeAwnakErrand)
		reviewStatus := StatusUnderReview
		reviewed, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{Status: &reviewStatus})
		if err != nil {
			t.Fatalf("transition to under_review failed: %v", err)
		}
		cancelStatus := StatusCancelled
		cancelled, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, reviewed.ID, reviewed.Version, UpdateInput{Status: &cancelStatus})
		if err != nil {
			t.Fatalf("transition to cancelled failed: %v", err)
		}
		if cancelled.CancelledAt == nil {
			t.Fatal("expected cancelledAt to be set on cancellation")
		}
	})

	t.Run("workflowStage that does not match resulting status is rejected", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		// "batch_pending" is the shein stage valid only under StatusApproved,
		// not the StatusUnderReview this transition resolves to.
		badStage := "batch_pending"
		_, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{Status: &status, WorkflowStage: &badStage})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict for stage/status mismatch, got %v", err)
		}
	})

	t.Run("unknown workflowStage for request type is invalid", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		badStage := "not-a-real-stage"
		_, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{Status: &status, WorkflowStage: &badStage})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for unknown stage, got %v", err)
		}
	})

	t.Run("operator transitions cannot populate financial projections", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		updated, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{
			Status: &status,
		})
		if err != nil {
			t.Fatalf("expected operational transition to succeed, got %v", err)
		}
		if updated.WltQuoteID != nil || updated.WltQuoteAmountMinorUnits != nil || updated.WltQuoteCurrency != nil {
			t.Fatalf("operator transition must not write WLT quote projection: %#v", updated)
		}
	})

	t.Run("WLT quote readback is the only financial projection writer", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		reviewStatus := StatusUnderReview
		reviewed, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{Status: &reviewStatus})
		if err != nil {
			t.Fatalf("transition to under_review failed: %v", err)
		}
		status := StatusNeedsCustomerInput
		stage := "customer_approval"
		reviewed, err = svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, reviewed.Version, UpdateInput{Status: &status, WorkflowStage: &stage})
		if err != nil {
			t.Fatalf("transition to customer approval failed: %v", err)
		}
		quote := &wlt.SpecialRequestQuote{
			ID: uuid.NewString(), OperatorContextID: testOperatorContextID, SpecialRequestID: reviewed.ID, ClientID: reviewed.ClientID,
			PolicyID: "special-request-standard", PolicyVersion: 1, QuoteVersion: 1,
			AmountMinorUnits: 15000, Currency: "SAR", QuoteHash: "quote-hash", Status: "active", ExpiresAt: time.Now().Add(time.Hour), CreatedAt: time.Now().UTC(),
		}
		attached, err := svc.AttachWltQuoteInOperatorContext(ctx, testOperatorContextID, reviewed.ID, reviewed.Version, quote)
		if err != nil {
			t.Fatalf("expected WLT quote attachment to succeed, got %v", err)
		}
		if attached.WltQuoteID == nil || *attached.WltQuoteID != quote.ID || attached.WltQuoteAmountMinorUnits == nil || *attached.WltQuoteAmountMinorUnits != quote.AmountMinorUnits {
			t.Fatalf("expected WLT quote projection readback, got %#v", attached)
		}
	})
}

func TestSpecialRequestsPaginationDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	repo := NewPostgresRepository(db)
	ctx := context.Background()

	clientID := newClientID(t)
	const total = 55
	for i := 0; i < total; i++ {
		in := validSheinInput(clientID)
		in.IdempotencyKey = "page-" + testSuffix() + "-" + strconv.Itoa(i)
		in.workflowStage = firstStageFor(in.RequestType)
		req, err := repo.Create(ctx, in)
		if err != nil {
			t.Fatalf("seed create %d failed: %v", i, err)
		}
		cleanupRequest(t, db, req.ID)
	}

	t.Run("limit=0 is clamped to default (50)", func(t *testing.T) {
		items, gotTotal, err := repo.ListByClientInOperatorContext(ctx, testOperatorContextID, clientID, 0, 0)
		if err != nil {
			t.Fatalf("ListByClient failed: %v", err)
		}
		if gotTotal != total {
			t.Fatalf("expected total %d, got %d", total, gotTotal)
		}
		if len(items) != 50 {
			t.Fatalf("expected clampLimit(0) to return 50 rows, got %d", len(items))
		}
	})

	t.Run("limit=500 is clamped to default (50)", func(t *testing.T) {
		items, _, err := repo.ListByClientInOperatorContext(ctx, testOperatorContextID, clientID, 500, 0)
		if err != nil {
			t.Fatalf("ListByClient failed: %v", err)
		}
		if len(items) != 50 {
			t.Fatalf("expected clampLimit(500) to return 50 rows, got %d", len(items))
		}
	})

	t.Run("offset paginates without overlap", func(t *testing.T) {
		page1, _, err := repo.ListByClientInOperatorContext(ctx, testOperatorContextID, clientID, 10, 0)
		if err != nil {
			t.Fatalf("ListByClient page1 failed: %v", err)
		}
		page2, _, err := repo.ListByClientInOperatorContext(ctx, testOperatorContextID, clientID, 10, 10)
		if err != nil {
			t.Fatalf("ListByClient page2 failed: %v", err)
		}
		if len(page1) != 10 || len(page2) != 10 {
			t.Fatalf("expected 10 rows per page, got %d and %d", len(page1), len(page2))
		}
		seen := map[string]bool{}
		for _, item := range page1 {
			seen[item.ID] = true
		}
		for _, item := range page2 {
			if seen[item.ID] {
				t.Fatalf("pagination overlap: id %s appeared on both pages", item.ID)
			}
		}
	})
}

func TestSpecialRequestsListForOperatorFiltersDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, _ := newTestService(db)
	ctx := context.Background()

	sheinClient := newClientID(t)
	awnakClient := newClientID(t)

	sheinReq, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, sheinClient, validSheinInput(sheinClient))
	if err != nil {
		t.Fatalf("create shein failed: %v", err)
	}
	cleanupRequest(t, db, sheinReq.ID)

	awnakReq, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, awnakClient, validAwnakInput(awnakClient))
	if err != nil {
		t.Fatalf("create awnak failed: %v", err)
	}
	cleanupRequest(t, db, awnakReq.ID)

	underReviewStatus := StatusUnderReview
	reviewedAwnak, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, awnakReq.ID, awnakReq.Version, UpdateInput{Status: &underReviewStatus})
	if err != nil {
		t.Fatalf("transition awnak to under_review failed: %v", err)
	}

	t.Run("requestType filter returns matching subset", func(t *testing.T) {
		reqType := string(TypeSheinAssistedPurchase)
		items, _, err := svc.ListForOperatorInOperatorContext(ctx, testOperatorContextID, &reqType, nil, nil, 200, 0)
		if err != nil {
			t.Fatalf("ListForOperator failed: %v", err)
		}
		foundShein, foundAwnak := false, false
		for _, item := range items {
			if item.ID == sheinReq.ID {
				foundShein = true
			}
			if item.ID == awnakReq.ID {
				foundAwnak = true
			}
			if item.RequestType != TypeSheinAssistedPurchase {
				t.Fatalf("requestType filter leaked a non-shein row: %s", item.RequestType)
			}
		}
		if !foundShein {
			t.Fatal("expected shein request in filtered results")
		}
		if foundAwnak {
			t.Fatal("expected awnak request to be excluded by requestType filter")
		}
	})

	t.Run("status filter returns matching subset", func(t *testing.T) {
		status := string(StatusUnderReview)
		items, _, err := svc.ListForOperatorInOperatorContext(ctx, testOperatorContextID, nil, &status, nil, 200, 0)
		if err != nil {
			t.Fatalf("ListForOperator failed: %v", err)
		}
		found := false
		for _, item := range items {
			if item.ID == reviewedAwnak.ID {
				found = true
			}
			if item.Status != StatusUnderReview {
				t.Fatalf("status filter leaked a non-matching row: %s", item.Status)
			}
			if item.ID == sheinReq.ID {
				t.Fatal("status filter leaked the still-submitted shein request")
			}
		}
		if !found {
			t.Fatal("expected the under_review awnak request in filtered results")
		}
	})

	t.Run("multi-row read completes without error (rows.Err sanity check)", func(t *testing.T) {
		// Triggering rows.Err() specifically (a mid-scan network/driver
		// failure) isn't practical to force in an integration test against a
		// real Postgres instance; this instead asserts the normal multi-row
		// path used above returns no error, which is the only branch coverage
		// practically achievable here.
		if _, _, err := svc.ListForOperatorInOperatorContext(ctx, testOperatorContextID, nil, nil, nil, 200, 0); err != nil {
			t.Fatalf("expected no error scanning multiple rows, got %v", err)
		}
	})
}

func TestSpecialRequestsWltPaymentDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, repo := newTestService(db)
	ctx := context.Background()

	createCustomerApproval := func(t *testing.T) *SpecialRequest {
		t.Helper()
		clientID := newClientID(t)
		req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		reviewStatus := StatusUnderReview
		reviewed, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, UpdateInput{Status: &reviewStatus})
		if err != nil {
			t.Fatalf("transition to under_review failed: %v", err)
		}
		status := StatusNeedsCustomerInput
		stage := "customer_approval"
		reviewed, err = svc.ApplyOperatorTransitionInOperatorContext(ctx, testOperatorContextID, req.ID, reviewed.Version, UpdateInput{Status: &status, WorkflowStage: &stage})
		if err != nil {
			t.Fatalf("transition to customer approval failed: %v", err)
		}
		return reviewed
	}

	quoteAndAttach := func(t *testing.T, req *SpecialRequest, sessionID string) *SpecialRequest {
		t.Helper()
		quote := &wlt.SpecialRequestQuote{
			ID: uuid.NewString(), OperatorContextID: testOperatorContextID, SpecialRequestID: req.ID, ClientID: req.ClientID,
			PolicyID: "special-request-standard", PolicyVersion: 1, QuoteVersion: 1,
			AmountMinorUnits: 20000, Currency: "SAR", QuoteHash: "quote-hash", Status: "active", ExpiresAt: time.Now().Add(time.Hour), CreatedAt: time.Now().UTC(),
		}
		quoted, err := svc.AttachWltQuoteInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, quote)
		if err != nil {
			t.Fatalf("attaching WLT quote failed: %v", err)
		}
		attached, err := svc.AttachWltPaymentSessionInOperatorContext(ctx, testOperatorContextID, quoted.ID, quoted.Version, sessionID)
		if err != nil {
			t.Fatalf("AttachWltPaymentSession failed: %v", err)
		}
		return attached
	}

	t.Run("AttachWltPaymentSession fails with ErrInvalid when WLT quote is unset", func(t *testing.T) {
		req := createCustomerApproval(t)
		_, err := svc.AttachWltPaymentSessionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, "wlt-session-"+testSuffix())
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid when money fields unset, got %v", err)
		}
	})

	t.Run("AttachWltPaymentSession fails with ErrConflict from non-editable status", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		// req is still "submitted", outside the customer approval stage.
		_, err = svc.AttachWltPaymentSessionInOperatorContext(ctx, testOperatorContextID, req.ID, req.Version, "wlt-session-"+testSuffix())
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict attaching from submitted status, got %v", err)
		}
	})

	t.Run("AttachWltPaymentSession succeeds once quote is set", func(t *testing.T) {
		req := createCustomerApproval(t)
		sessionID := "wlt-session-" + testSuffix()
		attached := quoteAndAttach(t, req, sessionID)
		if attached.WltPaymentSessionID == nil || *attached.WltPaymentSessionID != sessionID {
			t.Fatalf("expected wltPaymentSessionId %s to be persisted, got %v", sessionID, attached.WltPaymentSessionID)
		}
	})

	t.Run("ApplyWltPaymentEvent mismatched session id fails", func(t *testing.T) {
		req := createCustomerApproval(t)
		sessionID := "wlt-session-" + testSuffix()
		quoteAndAttach(t, req, sessionID)

		_, err := ApplyWltPaymentEvent(db, testOperatorContextID, req.ID, "wrong-session-id", "captured")
		if !errors.Is(err, ErrPaymentSessionMismatch) {
			t.Fatalf("expected ErrPaymentSessionMismatch, got %v", err)
		}
	})

	t.Run("captured event transitions customer approval to approved", func(t *testing.T) {
		req := createCustomerApproval(t)
		sessionID := "wlt-session-" + testSuffix()
		quoteAndAttach(t, req, sessionID)

		updated, err := ApplyWltPaymentEvent(db, testOperatorContextID, req.ID, sessionID, "captured")
		if err != nil {
			t.Fatalf("ApplyWltPaymentEvent(captured) failed: %v", err)
		}
		if updated.Status != StatusApproved {
			t.Fatalf("expected status approved after captured event, got %s", updated.Status)
		}
	})

	t.Run("failed event is a no-op leaving status unchanged", func(t *testing.T) {
		req := createCustomerApproval(t)
		sessionID := "wlt-session-" + testSuffix()
		attached := quoteAndAttach(t, req, sessionID)

		result, err := ApplyWltPaymentEvent(db, testOperatorContextID, req.ID, sessionID, "failed")
		if err != nil {
			t.Fatalf("ApplyWltPaymentEvent(failed) should be a no-op success, got error %v", err)
		}
		if result.Status != attached.Status {
			t.Fatalf("expected status to remain %s after failed event, got %s", attached.Status, result.Status)
		}

		current, err := repo.Get(ctx, req.ID)
		if err != nil {
			t.Fatalf("readback failed: %v", err)
		}
		if current.Status != StatusNeedsCustomerInput {
			t.Fatalf("expected status to remain needs_customer_input in DB, got %s", current.Status)
		}
	})

	t.Run("replay of captured event after status moved past approved is a no-op success", func(t *testing.T) {
		req := createCustomerApproval(t)
		sessionID := "wlt-session-" + testSuffix()
		quoteAndAttach(t, req, sessionID)

		approved, err := ApplyWltPaymentEvent(db, testOperatorContextID, req.ID, sessionID, "captured")
		if err != nil {
			t.Fatalf("first captured event failed: %v", err)
		}
		if approved.Status != StatusApproved {
			t.Fatalf("expected approved after first captured event, got %s", approved.Status)
		}

		replayed, err := ApplyWltPaymentEvent(db, testOperatorContextID, req.ID, sessionID, "captured")
		if err != nil {
			t.Fatalf("replayed captured event should be a no-op success, got error %v", err)
		}
		if replayed.Status != StatusApproved {
			t.Fatalf("expected replay to leave status as approved (no-op), got %s", replayed.Status)
		}
		if replayed.Version != approved.Version {
			t.Fatalf("expected replay not to bump version (no write performed), got %d want %d", replayed.Version, approved.Version)
		}
	})
}
