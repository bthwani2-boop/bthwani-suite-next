package partner

import (
	"testing"
)

func TestOnboardingCollaborationIsObjectScopedAndLifecycleBound(t *testing.T) {
	db := openRequiredDB(t)
	p := createPartnerFixture(t, db, "COLLAB")
	storeID := partnerStoreID(t, db, p.ID)
	if _, err := db.Exec(`
		UPDATE dsh_partners
		SET payout_destination_id = 'wpd-collab', destination_method = 'bank',
		    masked_destination_reference = '*****0001', destination_verification_status = 'unverified'
		WHERE id = $1`, p.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
		UPDATE dsh_stores
		SET city_code = 'SAN', service_area_code = 'SAN-1', address_line = 'Test address',
		    operating_hours = '08:00-22:00', delivery_readiness = 'ready'
		WHERE id = $1`, storeID); err != nil {
		t.Fatal(err)
	}
	var assignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_field_onboarding_assignments
			(operator_context_id, field_actor_id, store_name_hint, phone_hint, created_by_actor_id)
		VALUES ($1,'field-local-001','متجر التعاون','+967770000001','operator-local-001')
		RETURNING id`, partnerTestOperatorContextID).Scan(&assignmentID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_field_onboarding_assignments WHERE id=$1`, assignmentID) })

	view, err := LoadCollaborationView(t.Context(), db, "field-local-001", "app-field", partnerTestOperatorContextID, p.ID, assignmentID, "")
	if err != nil {
		t.Fatal(err)
	}
	if view.Thread.AssignmentID != assignmentID || len(view.Messages) != 0 {
		t.Fatalf("unexpected initial collaboration view: %+v", view)
	}

	message, err := AddCollaborationMessage(t.Context(), db, "field-local-001", "app-field", partnerTestOperatorContextID, p.ID, assignmentID, "", CollaborationMessageInput{
		Body: "تمت مراجعة الملاحظات وسأعيد رفع المستند المطلوب.", ClientMessageID: "client-collab-1",
	})
	if err != nil {
		t.Fatal(err)
	}
	replay, err := AddCollaborationMessage(t.Context(), db, "field-local-001", "app-field", partnerTestOperatorContextID, p.ID, assignmentID, "", CollaborationMessageInput{
		Body: "تمت مراجعة الملاحظات وسأعيد رفع المستند المطلوب.", ClientMessageID: "client-collab-1",
	})
	if err != nil || replay.ID != message.ID || replay.SequenceNumber != message.SequenceNumber {
		t.Fatalf("message replay was not stable: first=%+v replay=%+v err=%v", message, replay, err)
	}

	operatorView, err := LoadCollaborationView(t.Context(), db, "operator-local-001", "control-panel", partnerTestOperatorContextID, p.ID, assignmentID, "")
	if err != nil || len(operatorView.Messages) != 1 || operatorView.UnreadCount != 1 {
		t.Fatalf("operator readback lost field message: view=%+v err=%v", operatorView, err)
	}
	if err := MarkCollaborationRead(t.Context(), db, "operator-local-001", "control-panel", partnerTestOperatorContextID, operatorView.Thread.ID, message.SequenceNumber); err != nil {
		t.Fatal(err)
	}

	// The explicit transition below uses the canonical repository path and
	// preserves the same version used by the change-request command.
	p, _, err = TransitionStatusGoverned(t.Context(), db, p.ID, TransitionInput{
		ToStatus: StatusSubmitted, ActorID: "operator-local-001", ActorSurface: "control-panel",
		Reason: "بدء المراجعة السياقية", IdempotencyKey: "collab-submit-1", CorrelationID: "collab-submit-correlation-1",
	}, p.Version)
	if err != nil {
		t.Fatal(err)
	}
	request, err := CreateCollaborationChangeRequest(t.Context(), db, "operator-local-001", partnerTestOperatorContextID, p.ID, assignmentID, "", CreateChangeRequestInput{
		TargetKind: "draft", TargetID: p.ID, ToStatus: string(StatusDocumentsMissing), Reason: "يرجى استكمال المستند وإعادة رفعه", ExpectedVersion: p.Version,
		IdempotencyKey: "collab-return-1", CorrelationID: "collab-correlation-1",
	})
	if err != nil || request.Status != "open" {
		t.Fatalf("change request failed: request=%+v err=%v", request, err)
	}

	if _, err := LoadCollaborationView(t.Context(), db, "field-other", "app-field", partnerTestOperatorContextID, p.ID, assignmentID, ""); err != ErrCollaborationForbidden {
		t.Fatalf("cross-field collaboration access was not rejected: %v", err)
	}
	if _, err := AddCollaborationMessage(t.Context(), db, "field-local-001", "app-field", partnerTestOperatorContextID, p.ID, assignmentID, "", CollaborationMessageInput{Body: "سأتابع الآن.", ClientMessageID: "client-collab-2"}); err != nil {
		t.Fatalf("returned-for-changes did not reopen field collaboration: %v", err)
	}
}
