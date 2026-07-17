package dispatch

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"testing"
	"time"

	"dsh-api/internal/specialrequests"

	"github.com/google/uuid"
)

// newApprovedSpecialRequestFixture creates an AWNAK_ERRAND special request and
// drives it through the real operator transition chain
// submitted -> under_review -> approved (via specialrequests.Service, not a
// direct SQL seed), since CreateAssignmentForSpecialRequest requires the
// request to already be approved. Cleanup deletes the special request row;
// dsh_assignments/dsh_deliveries rows sourced from it cascade via their
// special_request_id FK (ON DELETE CASCADE, dsh-054), and the audit-event
// table has no FK back to the request so it is cleaned up explicitly.
func newApprovedSpecialRequestFixture(t *testing.T, db *sql.DB) (id, clientID string) {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	clientID = uuid.New().String()

	repo := specialrequests.NewPostgresRepository(db)
	svc := specialrequests.NewService(repo)

	pickup := "dispatch-test-pickup-" + suffix
	dropoff := "dispatch-test-dropoff-" + suffix
	req, err := svc.Create(ctx, clientID, specialrequests.CreateInput{
		ClientID:                clientID,
		RequestType:             specialrequests.TypeAwnakErrand,
		PickupAddressReference:  &pickup,
		DropoffAddressReference: &dropoff,
	})
	if err != nil {
		t.Fatalf("failed to create special request fixture: %v", err)
	}
	id = req.ID

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests_audit_events WHERE entity_id = $1::uuid`, id)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests WHERE id = $1::uuid`, id)
	})

	underReview := specialrequests.StatusUnderReview
	reviewed, err := svc.ApplyOperatorTransition(ctx, id, req.Version, specialrequests.UpdateInput{Status: &underReview})
	if err != nil {
		t.Fatalf("failed to transition fixture to under_review: %v", err)
	}
	approved := specialrequests.StatusApproved
	if _, err := svc.ApplyOperatorTransition(ctx, id, reviewed.Version, specialrequests.UpdateInput{Status: &approved}); err != nil {
		t.Fatalf("failed to transition fixture to approved: %v", err)
	}
	return id, clientID
}

// newSheinFixtureAtStage drives a SHEIN_ASSISTED_PURCHASE special request
// through the real operator stage-transition chain (svc.ApplyOperatorTransition,
// not a direct SQL seed) up to and including targetStage, stamping the same
// readiness timestamps an operator would set along the way (purchasedAt at
// "purchased", inboundReceivedAt at "inbound", sortingCompletedAt at
// "sorting", fulfillmentPreparedAt/readyForDeliveryAt at "ready_for_delivery").
// It stops exactly at targetStage, which is what lets the dispatch-readiness
// tests below prove CheckSheinDispatchReadiness rejects every earlier stage.
func newSheinFixtureAtStage(t *testing.T, db *sql.DB, targetStage string) (id string) {
	t.Helper()
	ctx := context.Background()
	clientID := uuid.New().String()
	repo := specialrequests.NewPostgresRepository(db)
	svc := specialrequests.NewService(repo)

	url := "https://www.shein.com/item/dispatch-readiness-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	qty := 1
	req, err := svc.Create(ctx, clientID, specialrequests.CreateInput{
		ClientID: clientID, RequestType: specialrequests.TypeSheinAssistedPurchase,
		ProductUrl: &url, Quantity: &qty,
	})
	if err != nil {
		t.Fatalf("failed to create shein fixture: %v", err)
	}
	id = req.ID
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests_audit_events WHERE entity_id = $1::uuid`, id)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests WHERE id = $1::uuid`, id)
	})

	underReview := specialrequests.StatusUnderReview
	needsInput := specialrequests.StatusNeedsCustomerInput
	approved := specialrequests.StatusApproved
	now := func() *time.Time { t := time.Now(); return &t }

	type step struct {
		stage  string
		status *specialrequests.RequestStatus
		mutate func(*specialrequests.UpdateInput)
	}
	steps := []step{
		{stage: "intake_review", status: &underReview},
		{stage: "quote_pending"},
		{stage: "customer_approval", status: &needsInput},
		{stage: "batch_pending", status: &approved},
		{stage: "purchased", mutate: func(u *specialrequests.UpdateInput) { u.PurchasedAt = now() }},
		{stage: "inbound", mutate: func(u *specialrequests.UpdateInput) { u.InboundReceivedAt = now() }},
		{stage: "sorting", mutate: func(u *specialrequests.UpdateInput) { u.SortingCompletedAt = now() }},
		{stage: "ready_for_delivery", mutate: func(u *specialrequests.UpdateInput) {
			u.FulfillmentPreparedAt = now()
			u.ReadyForDeliveryAt = now()
		}},
	}

	current := req
	for _, st := range steps {
		stage := st.stage
		update := specialrequests.UpdateInput{WorkflowStage: &stage}
		if st.status != nil {
			update.Status = st.status
		}
		if st.mutate != nil {
			st.mutate(&update)
		}
		updated, err := svc.ApplyOperatorTransition(ctx, current.ID, current.Version, update)
		if err != nil {
			t.Fatalf("failed to transition shein fixture to stage %s: %v", stage, err)
		}
		current = updated
		if stage == targetStage {
			return id
		}
	}
	t.Fatalf("newSheinFixtureAtStage: unknown target stage %q", targetStage)
	return ""
}

// TestSheinDispatchReadinessGateDBIntegration is the regression guard for the
// resolved P0 gap: CreateAssignmentForSpecialRequest used to check only
// RequestStatus == approved, but status stays "approved" across five SHEIN
// stages (batch_pending, purchased, inbound, sorting, ready_for_delivery), so
// a captain could be dispatched to a request that had not even been
// purchased yet. This proves the governing protocol's dispatch-readiness gate
// (SPECIAL_REQUEST_NOT_READY_FOR_DISPATCH) now rejects every stage before
// ready_for_delivery and only that exact stage succeeds.
func TestSheinDispatchReadinessGateDBIntegration(t *testing.T) {
	db := openRequiredDB(t)

	for _, stage := range []string{"batch_pending", "purchased", "inbound", "sorting"} {
		stage := stage
		t.Run("dispatch rejected at "+stage, func(t *testing.T) {
			id := newSheinFixtureAtStage(t, db, stage)
			captainID, actorID := newCaptainAndActor()
			_, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
				SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
			})
			var notReady *specialrequests.ErrDispatchNotReady
			if !errors.As(err, &notReady) {
				t.Fatalf("expected ErrDispatchNotReady at stage %s, got %v", stage, err)
			}
			if notReady.Readiness.CurrentStage != stage {
				t.Fatalf("expected currentStage %s, got %s", stage, notReady.Readiness.CurrentStage)
			}
			if notReady.Readiness.RequiredStage != "ready_for_delivery" {
				t.Fatalf("expected requiredStage ready_for_delivery, got %s", notReady.Readiness.RequiredStage)
			}
			if len(notReady.Readiness.BlockingReasons) == 0 {
				t.Fatalf("expected non-empty blockingReasons at stage %s", stage)
			}

			req := getSpecialRequest(t, db, id)
			if req.Status != specialrequests.StatusApproved {
				t.Fatalf("expected status to remain approved after rejected dispatch at %s, got %s", stage, req.Status)
			}
			if req.DispatchAssignmentID != nil {
				t.Fatalf("expected no dispatch_assignment_id after rejected dispatch at %s", stage)
			}
		})
	}

	t.Run("dispatch succeeds at ready_for_delivery", func(t *testing.T) {
		id := newSheinFixtureAtStage(t, db, "ready_for_delivery")
		captainID, actorID := newCaptainAndActor()
		assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
		})
		if err != nil {
			t.Fatalf("expected dispatch to succeed at ready_for_delivery, got %v", err)
		}
		if assignment.SpecialRequestID != id {
			t.Fatalf("expected assignment.SpecialRequestID %s, got %s", id, assignment.SpecialRequestID)
		}
		req := getSpecialRequest(t, db, id)
		if req.Status != specialrequests.StatusAssigned {
			t.Fatalf("expected status assigned after successful dispatch, got %s", req.Status)
		}
	})

	// AWNAK_ERRAND has no equivalent gap (only dispatch_pending maps to
	// StatusApproved for that request type), so CheckSheinDispatchReadiness
	// must be a no-op for it -- this proves the existing AWNAK dispatch path
	// (newApprovedSpecialRequestFixture) still works unmodified.
	t.Run("AWNAK dispatch from approved is unaffected by the SHEIN-specific gate", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()
		if _, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
		}); err != nil {
			t.Fatalf("expected AWNAK dispatch from approved to still succeed, got %v", err)
		}
	})
}

func getSpecialRequest(t *testing.T, db *sql.DB, id string) *specialrequests.SpecialRequest {
	t.Helper()
	repo := specialrequests.NewPostgresRepository(db)
	req, err := repo.Get(context.Background(), id)
	if err != nil {
		t.Fatalf("failed to read back special request %s: %v", id, err)
	}
	return req
}

func newCaptainAndActor() (captainID, actorID string) {
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	return "sr-dispatch-captain-" + suffix, "sr-dispatch-operator-" + suffix
}

func TestCreateAssignmentForSpecialRequestDBIntegration(t *testing.T) {
	db := openRequiredDB(t)

	t.Run("fails when special request is not approved", func(t *testing.T) {
		ctx := context.Background()
		clientID := uuid.New().String()
		repo := specialrequests.NewPostgresRepository(db)
		svc := specialrequests.NewService(repo)
		pickup := "not-approved-pickup"
		dropoff := "not-approved-dropoff"
		req, err := svc.Create(ctx, clientID, specialrequests.CreateInput{
			ClientID:                clientID,
			RequestType:             specialrequests.TypeAwnakErrand,
			PickupAddressReference:  &pickup,
			DropoffAddressReference: &dropoff,
		})
		if err != nil {
			t.Fatalf("create failed: %v", err)
		}
		t.Cleanup(func() {
			_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests_audit_events WHERE entity_id = $1::uuid`, req.ID)
			_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests WHERE id = $1::uuid`, req.ID)
		})
		// req.Status is "submitted" here, not approved.
		captainID, actorID := newCaptainAndActor()
		_, err = CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: req.ID, CaptainID: captainID, ActorID: actorID,
		})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict assigning a non-approved special request, got %v", err)
		}
	})

	t.Run("succeeds from approved and stamps request/assignment linkage", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()

		assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}
		if assignment.SpecialRequestID != id {
			t.Fatalf("expected assignment.SpecialRequestID %s, got %s", id, assignment.SpecialRequestID)
		}
		if assignment.OrderID != "" {
			t.Fatalf("expected assignment.OrderID empty for a special-request-sourced assignment, got %s", assignment.OrderID)
		}
		if assignment.Delivery.SpecialRequestID != id {
			t.Fatalf("expected delivery.SpecialRequestID %s, got %s", id, assignment.Delivery.SpecialRequestID)
		}
		if assignment.Delivery.OrderID != "" {
			t.Fatalf("expected delivery.OrderID empty for a special-request-sourced delivery, got %s", assignment.Delivery.OrderID)
		}

		req := getSpecialRequest(t, db, id)
		if req.Status != specialrequests.StatusAssigned {
			t.Fatalf("expected special request status assigned, got %s", req.Status)
		}
		if req.DispatchAssignmentID == nil || *req.DispatchAssignmentID != assignment.ID {
			t.Fatalf("expected dispatch_assignment_id %s stamped on special request, got %v", assignment.ID, req.DispatchAssignmentID)
		}
	})

	// Double-assignment prevention: idx_dsh_assignments_active_special_request
	// is a unique partial index over (special_request_id) WHERE status IN
	// (offered, accepted). In practice, however, a second
	// CreateAssignmentForSpecialRequest call for the same request never
	// reaches that index: specialrequests.TransitionDispatchStatus locks the
	// request row FOR UPDATE and requires the CURRENT status to be
	// StatusApproved before allowing the assigned transition. Once the first
	// call succeeds, the request's status is "assigned", not "approved", so
	// the second call is rejected by that status guard before any INSERT is
	// attempted. This test documents that actual behavior: the error
	// observed is dispatch.ErrConflict via the status-guard path (mapped from
	// specialrequests.ErrConflict), not a pq unique-violation (23505) mapped
	// by the `if pqErr.Code == "23505"` branches in
	// CreateAssignmentForSpecialRequest. Those branches appear to be
	// effectively unreachable through this call path under normal operation.
	t.Run("second call while an active assignment exists fails via status guard", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()

		if _, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
		}); err != nil {
			t.Fatalf("first CreateAssignmentForSpecialRequest failed: %v", err)
		}

		captainID2, actorID2 := newCaptainAndActor()
		_, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID2, ActorID: actorID2,
		})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict on double-assignment attempt, got %v", err)
		}
	})
}

func TestSpecialRequestAssignmentAcceptDeclineDBIntegration(t *testing.T) {
	db := openRequiredDB(t)

	t.Run("accept moves special request to in_progress", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()
		assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}

		if _, err := AcceptAssignment(db, assignment.ID, captainID); err != nil {
			t.Fatalf("AcceptAssignment failed: %v", err)
		}

		req := getSpecialRequest(t, db, id)
		if req.Status != specialrequests.StatusInProgress {
			t.Fatalf("expected special request status in_progress after accept, got %s", req.Status)
		}
	})

	t.Run("decline returns special request to approved and allows re-dispatch", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()
		assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}

		if _, err := DeclineAssignment(db, assignment.ID, captainID, "captain unavailable"); err != nil {
			t.Fatalf("DeclineAssignment failed: %v", err)
		}

		req := getSpecialRequest(t, db, id)
		if req.Status != specialrequests.StatusApproved {
			t.Fatalf("expected special request status approved after decline, got %s", req.Status)
		}

		captainID2, actorID2 := newCaptainAndActor()
		reassignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID2, ActorID: actorID2,
		})
		if err != nil {
			t.Fatalf("expected re-dispatch after decline to succeed, got %v", err)
		}
		if reassignment.ID == assignment.ID {
			t.Fatal("expected re-dispatch to create a new assignment row")
		}

		req2 := getSpecialRequest(t, db, id)
		if req2.Status != specialrequests.StatusAssigned {
			t.Fatalf("expected special request status assigned after re-dispatch, got %s", req2.Status)
		}
	})
}

// driveDeliveryToArrivedCustomer accepts the assignment and walks the
// delivery sub-states forward to arrived_customer, the precondition SubmitPoD
// requires. None of these intermediate delivery sub-states change the special
// request's status (it stays in_progress throughout, per dispatch.go's
// updateDeliveryProgress comment).
func driveDeliveryToArrivedCustomer(t *testing.T, db *sql.DB, assignmentID, captainID string) {
	t.Helper()
	if _, err := AcceptAssignment(db, assignmentID, captainID); err != nil {
		t.Fatalf("AcceptAssignment failed: %v", err)
	}
	for _, status := range []DeliveryStatus{DeliveryArrivedStore, DeliveryPickedUp, DeliveryArrivedCustomer} {
		if _, err := UpdateDeliveryStatus(db, assignmentID, captainID, status); err != nil {
			t.Fatalf("UpdateDeliveryStatus(%s) failed: %v", status, err)
		}
	}
}

func TestSpecialRequestSubmitPoDDBIntegration(t *testing.T) {
	db := openRequiredDB(t)

	t.Run("SubmitPoD completes the special request", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()
		assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}
		driveDeliveryToArrivedCustomer(t, db, assignment.ID, captainID)

		if _, err := SubmitPoD(db, assignment.ID, captainID, PoDInput{Method: "photo", Reference: "sr-pod-ref"}); err != nil {
			t.Fatalf("SubmitPoD failed: %v", err)
		}

		req := getSpecialRequest(t, db, id)
		if req.Status != specialrequests.StatusCompleted {
			t.Fatalf("expected special request status completed after SubmitPoD, got %s", req.Status)
		}
		if req.CompletedAt == nil {
			t.Fatal("expected completedAt to be set after SubmitPoD")
		}
	})

	// WLT-COD guard regression test (safety-critical): enqueueWltDeliveryCompletedNotification
	// starts with `if orderID == "" { return nil }` specifically because a
	// special-request-sourced delivery has no dsh_orders/dsh_checkout_intents
	// row to resolve a payment method from — enqueuing a WLT COD notification
	// here would be a financial-truth violation. This proves that guard holds
	// at runtime: no row is inserted into dsh_wlt_outbox_events (the table
	// wltoutbox.Enqueue writes into) for a special-request PoD submission.
	t.Run("PoD on special request does not enqueue a WLT outbox event", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()
		assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}
		driveDeliveryToArrivedCustomer(t, db, assignment.ID, captainID)

		var before int
		if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_wlt_outbox_events WHERE captain_id = $1`, captainID).Scan(&before); err != nil {
			t.Fatalf("failed to count outbox rows before PoD: %v", err)
		}

		if _, err := SubmitPoD(db, assignment.ID, captainID, PoDInput{Method: "photo", Reference: "sr-pod-outbox-guard"}); err != nil {
			t.Fatalf("SubmitPoD failed: %v", err)
		}

		var after int
		if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_wlt_outbox_events WHERE captain_id = $1`, captainID).Scan(&after); err != nil {
			t.Fatalf("failed to count outbox rows after PoD: %v", err)
		}
		if after != before {
			t.Fatalf("expected no WLT outbox rows for special-request PoD (orderID guard), before=%d after=%d", before, after)
		}
	})
}
