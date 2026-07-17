package specialrequests

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

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
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests_audit_events WHERE entity_id = $1::uuid`, id)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests WHERE id = $1::uuid`, id)
	})
}

func validSheinInput(clientID string) CreateInput {
	url := "https://www.shein.com/item/12345"
	qty := 2
	return CreateInput{
		ClientID:    clientID,
		RequestType: TypeSheinAssistedPurchase,
		ProductUrl:  &url,
		Quantity:    &qty,
	}
}

func validAwnakInput(clientID string) CreateInput {
	pickup := "Pickup reference " + testSuffix()
	dropoff := "Dropoff reference " + testSuffix()
	return CreateInput{
		ClientID:                clientID,
		RequestType:             TypeAwnakErrand,
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
		req, err := svc.Create(ctx, clientID, validSheinInput(clientID))
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
		_, err := svc.Create(ctx, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeSheinAssistedPurchase,
			ProductUrl: &bad, Quantity: &qty,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("missing shein productUrl is rejected", func(t *testing.T) {
		clientID := newClientID(t)
		qty := 1
		_, err := svc.Create(ctx, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeSheinAssistedPurchase,
			Quantity: &qty,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("shein quantity zero is rejected", func(t *testing.T) {
		clientID := newClientID(t)
		url := "https://www.shein.com/item/1"
		qty := 0
		_, err := svc.Create(ctx, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeSheinAssistedPurchase,
			ProductUrl: &url, Quantity: &qty,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("valid awnak succeeds with intake stage", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.Create(ctx, clientID, validAwnakInput(clientID))
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
		_, err := svc.Create(ctx, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeAwnakErrand,
			DropoffAddressReference: &dropoff,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})

	t.Run("awnak missing dropoff is rejected", func(t *testing.T) {
		clientID := newClientID(t)
		pickup := "Pickup ref"
		_, err := svc.Create(ctx, clientID, CreateInput{
			ClientID: clientID, RequestType: TypeAwnakErrand,
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

		first, err := svc.Create(ctx, clientID, in)
		if err != nil {
			t.Fatalf("first Create failed: %v", err)
		}
		cleanupRequest(t, db, first.ID)

		in2 := validSheinInput(clientID)
		in2.IdempotencyKey = key
		second, err := svc.Create(ctx, clientID, in2)
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
		req, err := svc.Create(ctx, clientID, validAwnakInput(clientID))
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
		if _, err := repo.UpdateInTenantTx(ctx, tx, "", req.ID, req.Version, UpdateInput{Status: &status}); err != nil {
			_ = tx.Rollback()
			t.Fatalf("UpdateInTenantTx failed: %v", err)
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
		updated, err := repo.UpdateInTenantTx(ctx, tx, "", req.ID, req.Version, UpdateInput{Status: &status})
		if err != nil {
			_ = tx.Rollback()
			t.Fatalf("UpdateInTenantTx failed: %v", err)
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

	reqA, err := svc.Create(ctx, clientA, validSheinInput(clientA))
	if err != nil {
		t.Fatalf("create for client A failed: %v", err)
	}
	cleanupRequest(t, db, reqA.ID)

	reqB, err := svc.Create(ctx, clientB, validAwnakInput(clientB))
	if err != nil {
		t.Fatalf("create for client B failed: %v", err)
	}
	cleanupRequest(t, db, reqB.ID)

	t.Run("ListForClient only returns caller's own requests", func(t *testing.T) {
		items, total, err := svc.ListForClient(ctx, clientA, 50, 0)
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
		_, err := svc.GetForClient(ctx, reqA.ID, clientB)
		if !errors.Is(err, ErrNotFound) {
			t.Fatalf("expected ErrNotFound (404-masking), got %v", err)
		}
	})

	t.Run("GetForClient succeeds for owner", func(t *testing.T) {
		got, err := svc.GetForClient(ctx, reqA.ID, clientA)
		if err != nil {
			t.Fatalf("expected owner to fetch their own request, got %v", err)
		}
		if got.ID != reqA.ID {
			t.Fatalf("expected id %s, got %s", reqA.ID, got.ID)
		}
	})

	t.Run("tenant scope masks same-client request from another tenant", func(t *testing.T) {
		tenantA := "tenant-a-" + testSuffix()
		tenantB := "tenant-b-" + testSuffix()
		clientID := newClientID(t)
		req, err := svc.CreateInTenant(ctx, tenantA, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("create for tenant A failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)

		if _, err := svc.GetForClientInTenant(ctx, tenantB, req.ID, clientID); !errors.Is(err, ErrNotFound) {
			t.Fatalf("expected cross-tenant GetForClientInTenant to mask as ErrNotFound, got %v", err)
		}
		items, total, err := svc.ListForClientInTenant(ctx, tenantB, clientID, 50, 0)
		if err != nil {
			t.Fatalf("cross-tenant ListForClientInTenant failed: %v", err)
		}
		if total != 0 || len(items) != 0 {
			t.Fatalf("expected tenant B list to be empty, got total=%d len=%d", total, len(items))
		}
	})
}

func TestSpecialRequestsCancelForClientDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, _ := newTestService(db)
	ctx := context.Background()

	t.Run("cancel from submitted succeeds and sets cancelledAt", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.Create(ctx, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)

		updated, err := svc.CancelForClient(ctx, req.ID, clientID, nil)
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
		req, err := svc.Create(ctx, clientID, validAwnakInput(clientID))
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

		_, err = svc.CancelForClient(ctx, req.ID, clientID, nil)
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
		req, err := svc.Create(ctx, clientID, in)
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		return req
	}

	t.Run("valid transition submitted to under_review succeeds", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		updated, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{Status: &status})
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
		_, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{Status: &status})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict for invalid direct transition, got %v", err)
		}
	})

	t.Run("terminal state protection blocks further transitions", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		cancelStatus := StatusCancelled
		cancelled, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{Status: &cancelStatus})
		if err != nil {
			t.Fatalf("expected submitted -> cancelled to succeed, got %v", err)
		}
		reviewStatus := StatusUnderReview
		_, err = svc.ApplyOperatorTransition(ctx, req.ID, cancelled.Version, UpdateInput{Status: &reviewStatus})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict transitioning out of terminal state, got %v", err)
		}
	})

	t.Run("stale expectedVersion yields ErrVersionConflict", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		_, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version+999, UpdateInput{Status: &status})
		if !errors.Is(err, ErrVersionConflict) {
			t.Fatalf("expected ErrVersionConflict, got %v", err)
		}
	})

	t.Run("completedAt and cancelledAt are set on terminal transitions", func(t *testing.T) {
		req := createReq(t, TypeAwnakErrand)

		steps := []RequestStatus{StatusUnderReview, StatusApproved, StatusAssigned, StatusInProgress, StatusCompleted}
		current := req
		for _, next := range steps {
			s := next
			updated, err := svc.ApplyOperatorTransition(ctx, current.ID, current.Version, UpdateInput{Status: &s})
			if err != nil {
				t.Fatalf("transition to %s failed: %v", next, err)
			}
			current = updated
		}
		if current.Status != StatusCompleted {
			t.Fatalf("expected final status completed, got %s", current.Status)
		}
		if current.CompletedAt == nil {
			t.Fatal("expected completedAt to be set on completion")
		}

		// Separate request driven to cancelled to check cancelledAt.
		req2 := createReq(t, TypeAwnakErrand)
		reviewStatus := StatusUnderReview
		reviewed, err := svc.ApplyOperatorTransition(ctx, req2.ID, req2.Version, UpdateInput{Status: &reviewStatus})
		if err != nil {
			t.Fatalf("transition to under_review failed: %v", err)
		}
		cancelStatus := StatusCancelled
		cancelled, err := svc.ApplyOperatorTransition(ctx, reviewed.ID, reviewed.Version, UpdateInput{Status: &cancelStatus})
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
		_, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{Status: &status, WorkflowStage: &badStage})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict for stage/status mismatch, got %v", err)
		}
	})

	t.Run("unknown workflowStage for request type is invalid", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		badStage := "not-a-real-stage"
		_, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{Status: &status, WorkflowStage: &badStage})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for unknown stage, got %v", err)
		}
	})

	t.Run("money fields settable when transitioning into under_review", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		status := StatusUnderReview
		amount := int64(15000)
		currency := "SAR"
		updated, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{
			Status: &status, EstimatedAmountMinorUnits: &amount, Currency: &currency,
		})
		if err != nil {
			t.Fatalf("expected setting money fields while entering under_review to succeed, got %v", err)
		}
		if updated.EstimatedAmountMinorUnits == nil || *updated.EstimatedAmountMinorUnits != amount {
			t.Fatalf("expected estimated amount %d to be persisted, got %v", amount, updated.EstimatedAmountMinorUnits)
		}
	})

	t.Run("money fields rejected when transitioning out of under_review into approved", func(t *testing.T) {
		req := createReq(t, TypeSheinAssistedPurchase)
		reviewStatus := StatusUnderReview
		reviewed, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{Status: &reviewStatus})
		if err != nil {
			t.Fatalf("transition to under_review failed: %v", err)
		}
		approvedStatus := StatusApproved
		amount := int64(5000)
		currency := "SAR"
		// The actual code gates money-field edits on the RESULTING status
		// (newStatus), not the current status, so setting money fields in the
		// same call that moves the request OUT of under_review/
		// needs_customer_input must fail even though the request currently
		// sits in an editable status.
		_, err = svc.ApplyOperatorTransition(ctx, reviewed.ID, reviewed.Version, UpdateInput{
			Status: &approvedStatus, EstimatedAmountMinorUnits: &amount, Currency: &currency,
		})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict setting money fields while transitioning into approved, got %v", err)
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
		items, gotTotal, err := repo.ListByClient(ctx, clientID, 0, 0)
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
		items, _, err := repo.ListByClient(ctx, clientID, 500, 0)
		if err != nil {
			t.Fatalf("ListByClient failed: %v", err)
		}
		if len(items) != 50 {
			t.Fatalf("expected clampLimit(500) to return 50 rows, got %d", len(items))
		}
	})

	t.Run("offset paginates without overlap", func(t *testing.T) {
		page1, _, err := repo.ListByClient(ctx, clientID, 10, 0)
		if err != nil {
			t.Fatalf("ListByClient page1 failed: %v", err)
		}
		page2, _, err := repo.ListByClient(ctx, clientID, 10, 10)
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

	sheinReq, err := svc.Create(ctx, sheinClient, validSheinInput(sheinClient))
	if err != nil {
		t.Fatalf("create shein failed: %v", err)
	}
	cleanupRequest(t, db, sheinReq.ID)

	awnakReq, err := svc.Create(ctx, awnakClient, validAwnakInput(awnakClient))
	if err != nil {
		t.Fatalf("create awnak failed: %v", err)
	}
	cleanupRequest(t, db, awnakReq.ID)

	underReviewStatus := StatusUnderReview
	reviewedAwnak, err := svc.ApplyOperatorTransition(ctx, awnakReq.ID, awnakReq.Version, UpdateInput{Status: &underReviewStatus})
	if err != nil {
		t.Fatalf("transition awnak to under_review failed: %v", err)
	}

	t.Run("requestType filter returns matching subset", func(t *testing.T) {
		reqType := string(TypeSheinAssistedPurchase)
		items, _, err := svc.ListForOperator(ctx, &reqType, nil, nil, 200, 0)
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
		items, _, err := svc.ListForOperator(ctx, nil, &status, nil, 200, 0)
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
		if _, _, err := svc.ListForOperator(ctx, nil, nil, nil, 200, 0); err != nil {
			t.Fatalf("expected no error scanning multiple rows, got %v", err)
		}
	})
}

func TestSpecialRequestsWltPaymentDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, repo := newTestService(db)
	ctx := context.Background()

	createUnderReview := func(t *testing.T) *SpecialRequest {
		t.Helper()
		clientID := newClientID(t)
		req, err := svc.Create(ctx, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		status := StatusUnderReview
		reviewed, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{Status: &status})
		if err != nil {
			t.Fatalf("transition to under_review failed: %v", err)
		}
		return reviewed
	}

	quoteAndAttach := func(t *testing.T, req *SpecialRequest, sessionID string) *SpecialRequest {
		t.Helper()
		amount := int64(20000)
		currency := "SAR"
		quoted, err := svc.ApplyOperatorTransition(ctx, req.ID, req.Version, UpdateInput{
			EstimatedAmountMinorUnits: &amount, Currency: &currency,
		})
		if err != nil {
			t.Fatalf("setting money fields failed: %v", err)
		}
		attached, err := svc.AttachWltPaymentSession(ctx, quoted.ID, quoted.Version, sessionID)
		if err != nil {
			t.Fatalf("AttachWltPaymentSession failed: %v", err)
		}
		return attached
	}

	t.Run("AttachWltPaymentSession fails with ErrInvalid when money fields unset", func(t *testing.T) {
		req := createUnderReview(t)
		_, err := svc.AttachWltPaymentSession(ctx, req.ID, req.Version, "wlt-session-"+testSuffix())
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid when money fields unset, got %v", err)
		}
	})

	t.Run("AttachWltPaymentSession fails with ErrConflict from non-editable status", func(t *testing.T) {
		clientID := newClientID(t)
		req, err := svc.Create(ctx, clientID, validSheinInput(clientID))
		if err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		cleanupRequest(t, db, req.ID)
		// req is still "submitted", which is not in moneyEditableStatuses.
		_, err = svc.AttachWltPaymentSession(ctx, req.ID, req.Version, "wlt-session-"+testSuffix())
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict attaching from submitted status, got %v", err)
		}
	})

	t.Run("AttachWltPaymentSession succeeds once quote is set", func(t *testing.T) {
		req := createUnderReview(t)
		sessionID := "wlt-session-" + testSuffix()
		attached := quoteAndAttach(t, req, sessionID)
		if attached.WltPaymentSessionID == nil || *attached.WltPaymentSessionID != sessionID {
			t.Fatalf("expected wltPaymentSessionId %s to be persisted, got %v", sessionID, attached.WltPaymentSessionID)
		}
	})

	t.Run("ApplyWltPaymentEvent mismatched session id fails", func(t *testing.T) {
		req := createUnderReview(t)
		sessionID := "wlt-session-" + testSuffix()
		quoteAndAttach(t, req, sessionID)

		_, err := ApplyWltPaymentEvent(db, DefaultTenantID, req.ID, "wrong-session-id", "captured")
		if !errors.Is(err, ErrPaymentSessionMismatch) {
			t.Fatalf("expected ErrPaymentSessionMismatch, got %v", err)
		}
	})

	t.Run("captured event transitions under_review to approved", func(t *testing.T) {
		req := createUnderReview(t)
		sessionID := "wlt-session-" + testSuffix()
		quoteAndAttach(t, req, sessionID)

		updated, err := ApplyWltPaymentEvent(db, DefaultTenantID, req.ID, sessionID, "captured")
		if err != nil {
			t.Fatalf("ApplyWltPaymentEvent(captured) failed: %v", err)
		}
		if updated.Status != StatusApproved {
			t.Fatalf("expected status approved after captured event, got %s", updated.Status)
		}
	})

	t.Run("failed event is a no-op leaving status unchanged", func(t *testing.T) {
		req := createUnderReview(t)
		sessionID := "wlt-session-" + testSuffix()
		attached := quoteAndAttach(t, req, sessionID)

		result, err := ApplyWltPaymentEvent(db, DefaultTenantID, req.ID, sessionID, "failed")
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
		if current.Status != StatusUnderReview {
			t.Fatalf("expected status to remain under_review in DB, got %s", current.Status)
		}
	})

	t.Run("replay of captured event after status moved past approved is a no-op success", func(t *testing.T) {
		req := createUnderReview(t)
		sessionID := "wlt-session-" + testSuffix()
		quoteAndAttach(t, req, sessionID)

		approved, err := ApplyWltPaymentEvent(db, DefaultTenantID, req.ID, sessionID, "captured")
		if err != nil {
			t.Fatalf("first captured event failed: %v", err)
		}
		if approved.Status != StatusApproved {
			t.Fatalf("expected approved after first captured event, got %s", approved.Status)
		}

		// Move the request on operationally (approved -> assigned) so a
		// replayed "captured" event arrives after moneyEditableStatuses no
		// longer includes the current status.
		assignedStatus := StatusAssigned
		assigned, err := svc.ApplyOperatorTransition(ctx, approved.ID, approved.Version, UpdateInput{Status: &assignedStatus})
		if err != nil {
			t.Fatalf("transition to assigned failed: %v", err)
		}

		replayed, err := ApplyWltPaymentEvent(db, DefaultTenantID, req.ID, sessionID, "captured")
		if err != nil {
			t.Fatalf("replayed captured event should be a no-op success, got error %v", err)
		}
		if replayed.Status != StatusAssigned {
			t.Fatalf("expected replay to leave status as assigned (no-op), got %s", replayed.Status)
		}
		if replayed.Version != assigned.Version {
			t.Fatalf("expected replay not to bump version (no write performed), got %d want %d", replayed.Version, assigned.Version)
		}
	})
}
