package dispatch

import (
	"errors"
	"testing"
)

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

	item, err := ReportCaptainStoreCaptainHandoffException(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		ReportDeliveryExceptionInput{
			ReasonCode:    ExceptionHandoffMismatch,
			Note:          "محتوى الطرد لا يطابق تفاصيل الطلب المعروضة",
			CorrelationID: "captain-handoff-mismatch:" + fixture.AssignmentID,
		},
	)
	if err != nil {
		t.Fatalf("captain handoff exception failed: %v", err)
	}
	if item.ReasonCode != ExceptionHandoffMismatch || item.Status != DeliveryExceptionOpen {
		t.Fatalf("unexpected exception=%+v", item)
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
}
