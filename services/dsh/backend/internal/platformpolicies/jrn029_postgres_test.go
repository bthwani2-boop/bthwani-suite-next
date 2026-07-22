package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestJRN029PostgresLifecycle(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for the JRN-029 PostgreSQL lifecycle proof")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		t.Fatalf("ping database: %v", err)
	}

	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	actorID := "jrn029-test-operator-" + suffix
	storeID := "jrn029-store-" + suffix
	cityCode := "jrn029-" + suffix

	mutation := func(key, reason string) MutationContext {
		return MutationContext{
			ActorID:        actorID,
			ActorSurface:   "control-panel",
			IdempotencyKey: "jrn029-" + key + "-" + suffix,
			CorrelationID:  "jrn029-correlation-" + suffix,
			Reason:         reason,
		}
	}

	zone, err := CreateZone(ctx, db, CreateZoneInput{
		Name:        "JRN-029 Remote Proof " + suffix,
		CityCode:    cityCode,
		Description: "same-commit PostgreSQL lifecycle proof",
	}, mutation("create-zone", "create remote proof zone"))
	if err != nil {
		t.Fatalf("create zone: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_platform_policy_mutation_results WHERE actor_id = $1`, actorID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_policy_events WHERE actor_id = $1 OR aggregate_id = $2`, actorID, zone.ID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_delivery_mode_policies WHERE zone_id = $1`, zone.ID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_capacity_configs WHERE zone_id = $1`, zone.ID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_sla_rules WHERE zone_id = $1`, zone.ID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id = $1`, storeID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_zones WHERE id = $1`, zone.ID)
	})

	_, err = db.Exec(`
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, partner_readiness,
			catalog_approval_status, marketing_visibility
		)
		VALUES (
			$1, $2, $3, 'active', $4, $4, 'serviceable', TRUE,
			'ready', 'approved', 'visible'
		)`,
		storeID, storeID, "JRN-029 Store", cityCode,
	)
	if err != nil {
		t.Fatalf("insert visible store: %v", err)
	}

	profile, err := UpsertOperationalProfile(ctx, db, UpsertOperationalProfileInput{
		ZoneID:                  zone.ID,
		SlaCategory:             "default",
		MaxPrepMins:             25,
		MaxAssignmentMins:       8,
		MaxDeliveryMins:         55,
		ExpectedSlaVersion:      0,
		MaxConcurrentOrders:     10,
		MaxCaptainsOnline:       20,
		ThrottleThreshold:       0.8,
		IsPaused:                false,
		PauseReason:             "",
		ExpectedCapacityVersion: 0,
	}, mutation("create-profile", "create SLA and capacity profile"))
	if err != nil {
		t.Fatalf("create operational profile: %v", err)
	}
	if profile.SLA.MaxAssignmentMins != 8 || profile.Capacity.IsPaused {
		t.Fatalf("unexpected initial profile: %+v", profile)
	}

	mode, err := UpsertDeliveryModePolicy(ctx, db, UpsertDeliveryModePolicyInput{
		ZoneID:          zone.ID,
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
		IsEnabled:       true,
		SlaCategory:     "default",
		ExpectedVersion: 0,
	}, mutation("create-mode", "enable BThwani delivery"))
	if err != nil {
		t.Fatalf("create delivery mode: %v", err)
	}

	decision, err := EvaluateOperationalPolicy(ctx, db, OperationalEvaluationInput{
		ZoneID:          zone.ID,
		ServiceAreaCode: cityCode,
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
		SlaCategory:     "default",
		ActiveOrders:    1,
		CaptainsOnline:  3,
	})
	if err != nil {
		t.Fatalf("evaluate serviceable policy: %v", err)
	}
	if !decision.Serviceable || !decision.Effects.CheckoutAllowed || !decision.Effects.DispatchAllowed {
		t.Fatalf("expected serviceable decision, got %+v", decision)
	}

	pausedProfile, err := UpsertOperationalProfile(ctx, db, UpsertOperationalProfileInput{
		ZoneID:                  zone.ID,
		SlaCategory:             "default",
		MaxPrepMins:             25,
		MaxAssignmentMins:       8,
		MaxDeliveryMins:         55,
		ExpectedSlaVersion:      profile.SLA.Version,
		MaxConcurrentOrders:     10,
		MaxCaptainsOnline:       20,
		ThrottleThreshold:       0.8,
		IsPaused:                true,
		PauseReason:             "remote operational pause proof",
		ExpectedCapacityVersion: profile.Capacity.Version,
	}, mutation("pause-profile", "pause zone capacity for proof"))
	if err != nil {
		t.Fatalf("pause operational profile: %v", err)
	}
	if !pausedProfile.Capacity.IsPaused || pausedProfile.Capacity.Version != 2 {
		t.Fatalf("unexpected paused profile: %+v", pausedProfile)
	}

	pausedDecision, err := EvaluateOperationalPolicy(ctx, db, OperationalEvaluationInput{
		ZoneID:          zone.ID,
		ServiceAreaCode: cityCode,
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
		ActiveOrders:    1,
		CaptainsOnline:  3,
	})
	if err != nil {
		t.Fatalf("evaluate paused policy: %v", err)
	}
	if pausedDecision.Decision != "paused" || pausedDecision.Effects.CartAllowed || pausedDecision.Effects.DispatchAllowed {
		t.Fatalf("pause must fail closed, got %+v", pausedDecision)
	}

	capacityEvents, err := ListPolicyAuditEvents(ctx, db, "capacity_config", profile.Capacity.ConfigID, 20)
	if err != nil {
		t.Fatalf("list capacity audit: %v", err)
	}
	var initialCapacityEventID string
	for _, event := range capacityEvents {
		if event.Action == "created" {
			initialCapacityEventID = event.ID
			break
		}
	}
	if initialCapacityEventID == "" {
		t.Fatal("initial capacity audit event was not recorded")
	}

	rollback, err := RollbackPolicyEvent(ctx, db, RollbackPolicyInput{
		EventID:               initialCapacityEventID,
		ExpectedCurrentVersion: pausedProfile.Capacity.Version,
	}, mutation("rollback-capacity", "restore pre-pause capacity snapshot"))
	if err != nil {
		t.Fatalf("rollback capacity: %v", err)
	}
	if rollback.ToVersion != 3 {
		t.Fatalf("rollback must create version 3, got %+v", rollback)
	}

	restored, err := GetOperationalProfile(ctx, db, zone.ID, "default")
	if err != nil {
		t.Fatalf("read restored profile: %v", err)
	}
	if restored.Capacity.IsPaused || restored.Capacity.Version != 3 {
		t.Fatalf("rollback did not restore active capacity: %+v", restored.Capacity)
	}

	disableMutation := mutation("disable-mode", "disable delivery mode for proof")
	disabledMode, err := UpsertDeliveryModePolicy(ctx, db, UpsertDeliveryModePolicyInput{
		ZoneID:          zone.ID,
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
		IsEnabled:       false,
		SlaCategory:     "default",
		ExpectedVersion: mode.Version,
	}, disableMutation)
	if err != nil {
		t.Fatalf("disable delivery mode: %v", err)
	}

	replayedMode, err := UpsertDeliveryModePolicy(ctx, db, UpsertDeliveryModePolicyInput{
		ZoneID:          zone.ID,
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
		IsEnabled:       false,
		SlaCategory:     "default",
		ExpectedVersion: mode.Version,
	}, disableMutation)
	if err != nil {
		t.Fatalf("idempotent delivery-mode replay: %v", err)
	}
	if replayedMode.Version != disabledMode.Version || replayedMode.ID != disabledMode.ID {
		t.Fatalf("idempotent replay changed result: first=%+v replay=%+v", disabledMode, replayedMode)
	}

	disabledDecision, err := EvaluateOperationalPolicy(ctx, db, OperationalEvaluationInput{
		ZoneID:          zone.ID,
		ServiceAreaCode: cityCode,
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
		ActiveOrders:    1,
		CaptainsOnline:  3,
	})
	if err != nil {
		t.Fatalf("evaluate disabled mode: %v", err)
	}
	if disabledDecision.Decision != "mode_disabled" || disabledDecision.Effects.CheckoutAllowed {
		t.Fatalf("disabled mode must fail closed, got %+v", disabledDecision)
	}

	_, err = UpsertDeliveryModePolicy(ctx, db, UpsertDeliveryModePolicyInput{
		ZoneID:          zone.ID,
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
		IsEnabled:       true,
		SlaCategory:     "default",
		ExpectedVersion: mode.Version,
	}, mutation("stale-mode", "prove stale mode rejection"))
	if !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("expected version conflict, got %v", err)
	}

	allEvents, err := ListPolicyAuditEvents(ctx, db, "", "", 200)
	if err != nil {
		t.Fatalf("list audit events: %v", err)
	}
	foundRollback := false
	for _, event := range allEvents {
		if event.ActorID == actorID && event.Action == "rolled_back" {
			foundRollback = true
			break
		}
	}
	if !foundRollback {
		t.Fatal("rollback audit event was not recorded")
	}
}
