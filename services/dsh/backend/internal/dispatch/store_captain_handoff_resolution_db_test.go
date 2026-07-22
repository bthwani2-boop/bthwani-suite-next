package dispatch

import "testing"

func TestHandoffExceptionRetrySameCaptainReleasesCustodyGuardDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOutboundHandoffFixture(t, db)

	if _, err := UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedStore,
	); err != nil {
		t.Fatalf("captain arrival failed: %v", err)
	}
	item, err := ReportPartnerStoreCaptainHandoffException(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-resolution-actor",
		ReportDeliveryExceptionInput{
			ReasonCode:    ExceptionHandoffShortage,
			Note:          "قطعة ناقصة وتم إيقاف تسليم العهدة",
			CorrelationID: "handoff-resolution-retry:" + fixture.AssignmentID,
		},
	)
	if err != nil {
		t.Fatalf("report handoff exception failed: %v", err)
	}

	resolutionNote := "تمت مطابقة الطرد وإضافة القطعة الناقصة"
	resolved, err := ResolveDeliveryExceptionRetrySameCaptain(
		db,
		item.ID,
		item.Version,
		resolutionNote,
		"operator-resolution-actor",
	)
	if err != nil {
		t.Fatalf("same-captain resolution failed: %v", err)
	}
	if resolved.Status != DeliveryExceptionResolved {
		t.Fatalf("resolved status=%s want=resolved", resolved.Status)
	}
	if resolved.ResolutionAction == nil || *resolved.ResolutionAction != "retry_same_captain" {
		t.Fatalf("resolution action=%v want=retry_same_captain", resolved.ResolutionAction)
	}

	if _, err = ConfirmStoreCaptainHandoffIdempotent(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-resolution-actor",
	); err != nil {
		t.Fatalf("partner confirmation after resolution failed: %v", err)
	}
	assignment, err := UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryPickedUp,
	)
	if err != nil {
		t.Fatalf("pickup after resolution failed: %v", err)
	}
	if assignment.Delivery.Status != DeliveryPickedUp {
		t.Fatalf("delivery status=%s want=picked_up", assignment.Delivery.Status)
	}
}

func TestHandoffExceptionReassignmentSupersedesCustodyDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOutboundHandoffFixture(t, db)

	if _, err := UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedStore,
	); err != nil {
		t.Fatalf("captain arrival failed: %v", err)
	}
	item, err := ReportCaptainStoreCaptainHandoffException(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		ReportDeliveryExceptionInput{
			ReasonCode:    ExceptionHandoffMismatch,
			Note:          "بيانات الطرد لا تطابق الطلب ويجب تغيير الكابتن",
			CorrelationID: "handoff-resolution-reassign:" + fixture.AssignmentID,
		},
	)
	if err != nil {
		t.Fatalf("report handoff mismatch failed: %v", err)
	}

	replacementCaptainID := fixture.CaptainID + "-replacement"
	resolved, err := ResolveDeliveryExceptionReassignCaptain(
		db,
		item.ID,
		item.Version,
		replacementCaptainID,
		"إعادة الإسناد بعد التحقق من عدم تطابق العهدة",
		"operator-resolution-actor",
	)
	if err != nil {
		t.Fatalf("reassignment resolution failed: %v", err)
	}
	if resolved.Status != DeliveryExceptionResolved {
		t.Fatalf("resolved status=%s want=resolved", resolved.Status)
	}
	if resolved.ResolutionAction == nil || *resolved.ResolutionAction != "reassign_captain" {
		t.Fatalf("resolution action=%v want=reassign_captain", resolved.ResolutionAction)
	}
	if resolved.ReplacementAssignmentID == nil || *resolved.ReplacementAssignmentID == "" {
		t.Fatal("replacement assignment id is missing")
	}
	if resolved.ReplacementCaptainID == nil || *resolved.ReplacementCaptainID != replacementCaptainID {
		t.Fatalf("replacement captain=%v want=%s", resolved.ReplacementCaptainID, replacementCaptainID)
	}

	var oldHandoffStatus string
	if err = db.QueryRow(`
		SELECT status
		FROM dsh_store_captain_handoffs
		WHERE assignment_id=$1::uuid`, fixture.AssignmentID).Scan(&oldHandoffStatus); err != nil {
		t.Fatal(err)
	}
	if oldHandoffStatus != "superseded" {
		t.Fatalf("old handoff status=%s want=superseded", oldHandoffStatus)
	}

	var replacementAssignmentStatus, replacementDeliveryStatus string
	if err = db.QueryRow(`
		SELECT a.status, d.status
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id=a.id
		WHERE a.id=$1::uuid`, *resolved.ReplacementAssignmentID).Scan(
		&replacementAssignmentStatus,
		&replacementDeliveryStatus,
	); err != nil {
		t.Fatal(err)
	}
	if replacementAssignmentStatus != "offered" || replacementDeliveryStatus != "assigned" {
		t.Fatalf(
			"replacement assignment status=%s delivery=%s want offered/assigned",
			replacementAssignmentStatus,
			replacementDeliveryStatus,
		)
	}
}
