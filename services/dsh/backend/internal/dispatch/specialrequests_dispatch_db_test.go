package dispatch

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"testing"
	"time"

	"dsh-api/internal/specialrequests"
	"dsh-api/internal/wlt"

	"github.com/google/uuid"
)

const testSpecialRequestOperatorContextID = "OperatorContext-dispatch-test"

func approveSpecialRequestViaWlt(t *testing.T, db *sql.DB, svc *specialrequests.Service, req *specialrequests.SpecialRequest) *specialrequests.SpecialRequest {
	t.Helper()
	ctx := context.Background()
	reviewStatus := specialrequests.StatusUnderReview
	reviewed, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testSpecialRequestOperatorContextID, req.ID, req.Version, specialrequests.UpdateInput{Status: &reviewStatus})
	if err != nil {
		t.Fatalf("failed to transition fixture to under_review: %v", err)
	}
	needsInput := specialrequests.StatusNeedsCustomerInput
	approvalStage := "customer_approval"
	customerApproval, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testSpecialRequestOperatorContextID, req.ID, reviewed.Version, specialrequests.UpdateInput{Status: &needsInput, WorkflowStage: &approvalStage})
	if err != nil {
		t.Fatalf("failed to transition fixture to customer_approval: %v", err)
	}
	quote := &wlt.SpecialRequestQuote{
		ID: uuid.NewString(), OperatorContextID: testSpecialRequestOperatorContextID, SpecialRequestID: req.ID, ClientID: req.ClientID,
		PolicyID: "special-request-standard", PolicyVersion: 1, QuoteVersion: 1,
		AmountMinorUnits: 20000, Currency: "SAR", QuoteHash: "dispatch-test-quote", Status: "active", ExpiresAt: time.Now().Add(time.Hour), CreatedAt: time.Now().UTC(),
	}
	quoted, err := svc.AttachWltQuoteInOperatorContext(ctx, testSpecialRequestOperatorContextID, req.ID, customerApproval.Version, quote)
	if err != nil {
		t.Fatalf("failed to attach WLT quote to fixture: %v", err)
	}
	sessionID := "dispatch-wlt-session-" + uuid.NewString()
	attached, err := svc.AttachWltPaymentSessionInOperatorContext(ctx, testSpecialRequestOperatorContextID, req.ID, quoted.Version, sessionID)
	if err != nil {
		t.Fatalf("failed to attach WLT payment session to fixture: %v", err)
	}
	approved, err := specialrequests.ApplyWltPaymentEvent(db, testSpecialRequestOperatorContextID, req.ID, sessionID, "captured")
	if err != nil {
		t.Fatalf("failed to capture WLT payment for fixture: %v", err)
	}
	if approved.Version <= attached.Version || approved.Status != specialrequests.StatusApproved {
		t.Fatalf("expected WLT capture to produce approved fixture, got status=%s version=%d", approved.Status, approved.Version)
	}
	return approved
}

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
	req, err := svc.CreateInOperatorContext(ctx, testSpecialRequestOperatorContextID, clientID, specialrequests.CreateInput{
		OperatorContextID:       testSpecialRequestOperatorContextID,
		ClientID:                clientID,
		RequestType:             specialrequests.TypeAwnakErrand,
		IdempotencyKey:          "dispatch-awnak-" + clientID,
		PickupAddressReference:  &pickup,
		DropoffAddressReference: &dropoff,
	})
	if err != nil {
		t.Fatalf("failed to create special request fixture: %v", err)
	}
	id = req.ID

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_request_wlt_event_receipts WHERE special_request_id = $1::uuid`, id)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests_audit_events WHERE entity_id = $1::uuid`, id)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_requests WHERE id = $1::uuid`, id)
	})

	approveSpecialRequestViaWlt(t, db, svc, req)
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
	req, err := svc.CreateInOperatorContext(ctx, testSpecialRequestOperatorContextID, clientID, specialrequests.CreateInput{
		OperatorContextID: testSpecialRequestOperatorContextID, ClientID: clientID, RequestType: specialrequests.TypeSheinAssistedPurchase,
		IdempotencyKey: "dispatch-shein-" + clientID,
		ProductUrl:     &url, Quantity: &qty,
	})
	if err != nil {
		t.Fatalf("failed to create shein fixture: %v", err)
	}
	id = req.ID
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_request_wlt_event_receipts WHERE special_request_id = $1::uuid`, id)
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
		updated, err := svc.ApplyOperatorTransitionInOperatorContext(ctx, testSpecialRequestOperatorContextID, current.ID, current.Version, update)
		if err != nil {
			t.Fatalf("failed to transition shein fixture to stage %s: %v", stage, err)
		}
		current = updated
		if stage == targetStage {
			return id
		}
		if stage == "customer_approval" {
			current = approveSpecialRequestViaWlt(t, db, svc, current)
			if targetStage == "batch_pending" {
				return id
			}
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
				SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
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
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
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
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
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
		req, err := svc.CreateInOperatorContext(ctx, testSpecialRequestOperatorContextID, clientID, specialrequests.CreateInput{
			OperatorContextID:       testSpecialRequestOperatorContextID,
			ClientID:                clientID,
			RequestType:             specialrequests.TypeAwnakErrand,
			IdempotencyKey:          "dispatch-not-approved-" + clientID,
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
			SpecialRequestID: req.ID, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
		})
		if !errors.Is(err, ErrConflict) {
			t.Fatalf("expected ErrConflict assigning a non-approved special request, got %v", err)
		}
	})

	t.Run("succeeds from approved and stamps request/assignment linkage", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()

		assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
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
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
		}); err != nil {
			t.Fatalf("first CreateAssignmentForSpecialRequest failed: %v", err)
		}

		captainID2, actorID2 := newCaptainAndActor()
		_, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID2, ActorID: actorID2, OperatorContextID: testSpecialRequestOperatorContextID,
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
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}

		if _, err := AcceptAssignment(db, testSpecialRequestOperatorContextID, assignment.ID, captainID); err != nil {
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
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}

		if _, err := DeclineAssignment(db, testSpecialRequestOperatorContextID, assignment.ID, captainID, "captain unavailable"); err != nil {
			t.Fatalf("DeclineAssignment failed: %v", err)
		}

		req := getSpecialRequest(t, db, id)
		if req.Status != specialrequests.StatusApproved {
			t.Fatalf("expected special request status approved after decline, got %s", req.Status)
		}

		captainID2, actorID2 := newCaptainAndActor()
		reassignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID2, ActorID: actorID2, OperatorContextID: testSpecialRequestOperatorContextID,
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
// delivery sub-states forward to arrived_customer, the precondition for
// canonical delivery-proof submission.
// requires. None of these intermediate delivery sub-states change the special
// request's status (it stays in_progress throughout, per dispatch.go's
// updateDeliveryProgress comment). It also registers the two governed media
// references used by the completion subtests for this captain.
func driveDeliveryToArrivedCustomer(t *testing.T, db *sql.DB, operatorContextID, assignmentID, captainID, specialRequestID string) (proofMediaRef, outboxGuardMediaRef string) {
	t.Helper()
	if _, err := AcceptAssignment(db, operatorContextID, assignmentID, captainID); err != nil {
		t.Fatalf("AcceptAssignment failed: %v", err)
	}
	for _, status := range []DeliveryStatus{DeliveryArrivedStore, DeliveryPickedUp, DeliveryArrivedCustomer} {
		if _, err := UpdateDeliveryStatus(db, operatorContextID, assignmentID, captainID, status); err != nil {
			t.Fatalf("UpdateDeliveryStatus(%s) failed: %v", status, err)
		}
	}
	proofMediaRef = "sr-pod-ref-" + specialRequestID
	outboxGuardMediaRef = "sr-pod-outbox-guard-" + specialRequestID
	seedCaptainDeliveryProofMedia(t, db, captainID, proofMediaRef, "", "", "", specialRequestID)
	seedCaptainDeliveryProofMedia(t, db, captainID, outboxGuardMediaRef, "", "", "", specialRequestID)
	return proofMediaRef, outboxGuardMediaRef
}

func TestSpecialRequestDeliveryProofDBIntegration(t *testing.T) {
	db := openRequiredDB(t)

	t.Run("canonical proof review completes the special request", func(t *testing.T) {
		id, _ := newApprovedSpecialRequestFixture(t, db)
		captainID, actorID := newCaptainAndActor()
		assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}
		proofMediaRef, _ := driveDeliveryToArrivedCustomer(t, db, testSpecialRequestOperatorContextID, assignment.ID, captainID, id)

		proof, err := SubmitDeliveryProof(db, assignment.ID, captainID, SubmitDeliveryProofInput{
			OperatorContextID: testSpecialRequestOperatorContextID,
			Method:            DeliveryProofPhoto,
			PhotoMediaRef:     proofMediaRef,
			IdempotencyKey:    "special-request-proof-1",
		})
		if err != nil {
			t.Fatalf("SubmitDeliveryProof failed: %v", err)
		}
		if proof.SpecialRequestID != id || proof.OrderID != "" || proof.Status != DeliveryProofPendingReview {
			t.Fatalf("unexpected special-request proof: %+v", proof)
		}
		if _, err := ReviewDeliveryProof(db, proof.ID, "operator-1", ReviewDeliveryProofInput{
			OperatorContextID: testSpecialRequestOperatorContextID,
			ExpectedVersion:   proof.Version,
			Reason:            "تمت مراجعة إثبات التسليم",
			Accept:            true,
			IdempotencyKey:    "special-request-review-1",
		}); err != nil {
			t.Fatalf("ReviewDeliveryProof failed: %v", err)
		}

		req := getSpecialRequest(t, db, id)
		if req.Status != specialrequests.StatusCompleted {
			t.Fatalf("expected special request status completed after delivery proof review, got %s", req.Status)
		}
		if req.CompletedAt == nil {
			t.Fatal("expected completedAt to be set after delivery proof review")
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
			SpecialRequestID: id, CaptainID: captainID, ActorID: actorID, OperatorContextID: testSpecialRequestOperatorContextID,
		})
		if err != nil {
			t.Fatalf("CreateAssignmentForSpecialRequest failed: %v", err)
		}
		_, outboxGuardMediaRef := driveDeliveryToArrivedCustomer(t, db, testSpecialRequestOperatorContextID, assignment.ID, captainID, id)

		var before int
		if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_wlt_outbox_events WHERE captain_id = $1`, captainID).Scan(&before); err != nil {
			t.Fatalf("failed to count outbox rows before PoD: %v", err)
		}

		proof, err := SubmitDeliveryProof(db, assignment.ID, captainID, SubmitDeliveryProofInput{
			OperatorContextID: testSpecialRequestOperatorContextID,
			Method:            DeliveryProofPhoto,
			PhotoMediaRef:     outboxGuardMediaRef,
			IdempotencyKey:    "special-request-proof-outbox",
		})
		if err != nil {
			t.Fatalf("SubmitDeliveryProof failed: %v", err)
		}
		if _, err := ReviewDeliveryProof(db, proof.ID, "operator-2", ReviewDeliveryProofInput{
			OperatorContextID: testSpecialRequestOperatorContextID,
			ExpectedVersion:   proof.Version,
			Reason:            "تمت مراجعة إثبات التسليم",
			Accept:            true,
			IdempotencyKey:    "special-request-review-outbox",
		}); err != nil {
			t.Fatalf("ReviewDeliveryProof failed: %v", err)
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
