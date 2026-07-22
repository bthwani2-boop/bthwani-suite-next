package dispatch

import (
	"errors"
	"testing"
)

func closeHandoffExceptionFixture(t *testing.T, item *DeliveryException, fixture outboundHandoffFixture) {
	t.Helper()
	db := openRequiredDB(t)
	if _, err := db.Exec(`
		UPDATE dsh_delivery_exceptions
		SET status='resolved',
		    resolution_action='retry_same_captain',
		    resolution_note='resolved for idempotent replay test',
		    resolved_at=NOW(),
		    resolved_by_actor_id='operator-replay-test',
		    version=version+1,
		    updated_at=NOW()
		WHERE id=$1::uuid`, item.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
		UPDATE dsh_store_captain_handoffs
		SET status='superseded', version=version+1, updated_at=NOW()
		WHERE assignment_id=$1::uuid`, fixture.AssignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
		UPDATE dsh_assignments
		SET status='cancelled', updated_at=NOW()
		WHERE id=$1::uuid`, fixture.AssignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
		UPDATE dsh_deliveries
		SET status='cancelled', updated_at=NOW()
		WHERE assignment_id=$1::uuid`, fixture.AssignmentID); err != nil {
		t.Fatal(err)
	}
}

func TestPartnerHandoffShortageOpensGovernedExceptionDBIntegration(t *testing.T) {
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

	input := ReportDeliveryExceptionInput{
		ReasonCode:    ExceptionHandoffShortage,
		Note:          "قطعة واحدة غير موجودة في الطرد عند المطابقة",
		CorrelationID: "partner-handoff-shortage:" + fixture.AssignmentID,
	}
	item, err := ReportPartnerStoreCaptainHandoffException(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-handoff-actor",
		input,
	)
	if err != nil {
		t.Fatalf("partner handoff exception failed: %v", err)
	}
	if item.ReasonCode != ExceptionHandoffShortage || item.Status != DeliveryExceptionOpen {
		t.Fatalf("unexpected exception=%+v", item)
	}
	if item.Severity != DeliveryExceptionHigh {
		t.Fatalf("severity=%s want=%s", item.Severity, DeliveryExceptionHigh)
	}

	replay, err := ReportPartnerStoreCaptainHandoffException(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-handoff-actor",
		input,
	)
	if err != nil {
		t.Fatalf("partner handoff exception replay failed: %v", err)
	}
	if replay.ID != item.ID || replay.Version != item.Version {
		t.Fatalf("exception replay changed result: first=%+v replay=%+v", item, replay)
	}

	driftedInput := input
	driftedInput.Note = "نفس المفتاح مع وصف مختلف يجب أن يرفض"
	if _, err = ReportPartnerStoreCaptainHandoffException(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-handoff-actor",
		driftedInput,
	); !errors.Is(err, ErrConflict) {
		t.Fatalf("partner payload drift error=%v want ErrConflict", err)
	}

	var reporterActorID, reporterRole string
	if err = db.QueryRow(`
		SELECT actor_id, actor_role
		FROM dsh_delivery_exception_reporters
		WHERE exception_id=$1::uuid`, item.ID).Scan(&reporterActorID, &reporterRole); err != nil {
		t.Fatal(err)
	}
	if reporterActorID != "partner-handoff-actor" || reporterRole != "partner" {
		t.Fatalf("reporter actor=%q role=%q", reporterActorID, reporterRole)
	}

	if _, err = ConfirmStoreCaptainHandoffIdempotent(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-handoff-actor",
	); !errors.Is(err, ErrConflict) {
		t.Fatalf("partner confirmation with open exception error=%v want ErrConflict", err)
	}
	if _, err = UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryPickedUp,
	); !errors.Is(err, ErrConflict) {
		t.Fatalf("pickup with open exception error=%v want ErrConflict", err)
	}

	closeHandoffExceptionFixture(t, item, fixture)
	closedReplay, err := ReportPartnerStoreCaptainHandoffException(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-handoff-actor",
		input,
	)
	if err != nil {
		t.Fatalf("partner replay after lifecycle closure failed: %v", err)
	}
	if closedReplay.ID != item.ID || closedReplay.Status != DeliveryExceptionResolved {
		t.Fatalf("closed replay=%+v want id=%s status=resolved", closedReplay, item.ID)
	}
}

func TestCaptainHandoffMismatchAfterPartnerConfirmationBlocksPickupDBIntegration(t *testing.T) {
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
	if _, err := ConfirmStoreCaptainHandoffIdempotent(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-handoff-actor",
	); err != nil {
		t.Fatalf("partner confirmation failed: %v", err)
	}

	input := ReportDeliveryExceptionInput{
		ReasonCode:    ExceptionHandoffMismatch,
		Note:          "محتوى الطرد لا يطابق تفاصيل الطلب المعروضة",
		CorrelationID: "captain-handoff-mismatch:" + fixture.AssignmentID,
	}
	item, err := ReportCaptainStoreCaptainHandoffException(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		input,
	)
	if err != nil {
		t.Fatalf("captain handoff exception failed: %v", err)
	}
	if item.ReasonCode != ExceptionHandoffMismatch || item.Status != DeliveryExceptionOpen {
		t.Fatalf("unexpected exception=%+v", item)
	}

	latitude := 15.3694
	longitude := 44.1910
	driftedInput := input
	driftedInput.Latitude = &latitude
	driftedInput.Longitude = &longitude
	if _, err = ReportCaptainStoreCaptainHandoffException(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		driftedInput,
	); !errors.Is(err, ErrConflict) {
		t.Fatalf("captain payload drift error=%v want ErrConflict", err)
	}

	var reporterActorID, reporterRole string
	if err = db.QueryRow(`
		SELECT actor_id, actor_role
		FROM dsh_delivery_exception_reporters
		WHERE exception_id=$1::uuid`, item.ID).Scan(&reporterActorID, &reporterRole); err != nil {
		t.Fatal(err)
	}
	if reporterActorID != fixture.CaptainID || reporterRole != "captain" {
		t.Fatalf("reporter actor=%q role=%q", reporterActorID, reporterRole)
	}
	if _, err = UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryPickedUp,
	); !errors.Is(err, ErrConflict) {
		t.Fatalf("pickup after partner confirmation with open exception error=%v want ErrConflict", err)
	}

	closeHandoffExceptionFixture(t, item, fixture)
	closedReplay, err := ReportCaptainStoreCaptainHandoffException(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		input,
	)
	if err != nil {
		t.Fatalf("captain replay after lifecycle closure failed: %v", err)
	}
	if closedReplay.ID != item.ID || closedReplay.Status != DeliveryExceptionResolved {
		t.Fatalf("closed replay=%+v want id=%s status=resolved", closedReplay, item.ID)
	}
}
