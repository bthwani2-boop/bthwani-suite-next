package settlement

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"wlt-api/internal/shared"
	"wlt-api/internal/testsupport"
)

func settlementFinanceContext(operatorContextID, operatorID string) context.Context {
	return shared.WithDelegatedFinancePrincipal(
		shared.WithOperatorContext(context.Background(), operatorContextID),
		operatorID,
	)
}

func seedApprovedSettlementSnapshot(t *testing.T, db *sql.DB, contextID, providerID string, amount int64) {
	t.Helper()
	destinationID := testsupport.UniqueID("settlement-destination")
	requestID := testsupport.UniqueID("settlement-request")
	operatorID := testsupport.UniqueID("settlement-approver")
	if _, err := db.ExecContext(context.Background(), `INSERT INTO wlt_official_wallet_providers(operator_context_id,provider_key,display_name) VALUES($1,$2,'Settlement Test Provider') ON CONFLICT DO NOTHING`, contextID, providerID); err != nil {
		t.Fatalf("seed wallet provider: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `INSERT INTO wlt_payout_destinations(
		id,partner_id,owner_actor_id,owner_actor_type,beneficiary_name,operator_context_id,
		destination_method,masked_destination_reference,destination_verification_status,
		official_wallet_provider_key,destination_version,material_identity_hash,active,created_by_actor_id)
		VALUES($1,$2,$2,'partner','Settlement Beneficiary',$3,'official_wallet','****0001','verified',$4,1,$5,true,$6)`,
		destinationID, testsupport.UniqueID("settlement-partner"), contextID, providerID, testsupport.UniqueID("settlement-hash"), operatorID); err != nil {
		t.Fatalf("seed payout destination: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `INSERT INTO wlt_payout_requests(
		id,beneficiary_actor_id,beneficiary_actor_type,amount_minor_units,currency,status,
		approved_at,approved_by_operator_id,payout_destination_id,operator_context_id)
		VALUES($1,$2,'partner',$3,'YER','approved',$4,$5,$6,$7)`,
		requestID, testsupport.UniqueID("settlement-beneficiary"), amount, time.Now().UTC(), operatorID, destinationID, contextID); err != nil {
		t.Fatalf("seed approved payout request: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `INSERT INTO wlt_approved_payout_snapshots(
		operator_context_id,payout_request_id,payout_destination_id,amount_minor_units,currency,
		beneficiary_actor_id,beneficiary_actor_type,snapshot_hash,approved_by_operator_id,destination_version)
		SELECT $1,id,payout_destination_id,amount_minor_units,currency,beneficiary_actor_id,
		beneficiary_actor_type,$2,approved_by_operator_id,1
		FROM wlt_payout_requests WHERE operator_context_id=$1 AND id=$3`,
		contextID, testsupport.UniqueID("settlement-snapshot-hash"), requestID); err != nil {
		t.Fatalf("seed approved payout snapshot: %v", err)
	}
}

func TestSettlementBatchCreateAndFreezeAreCanonicalAndIdempotent(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	contextID := testsupport.UniqueID("settlement-batch-context")
	providerID := testsupport.UniqueID("settlement-provider")
	operatorID := testsupport.UniqueID("settlement-operator")
	ctx := settlementFinanceContext(contextID, operatorID)
	seedApprovedSettlementSnapshot(t, db, contextID, providerID, 2300)

	batch, err := CreateSettlementBatch(ctx, db, CreateSettlementBatchInput{
		ProviderID: providerID, Currency: "yer", IdempotencyKey: "batch-create-001",
	}, "corr-batch-create-001")
	if err != nil {
		t.Fatalf("create settlement batch: %v", err)
	}
	if batch.Status != "open" || batch.ControlTotalMinorUnits != 2300 || batch.RowCount != 1 || batch.BatchHash == "" {
		t.Fatalf("unexpected canonical batch: %+v", batch)
	}

	replay, err := CreateSettlementBatch(ctx, db, CreateSettlementBatchInput{
		ProviderID: providerID, Currency: "YER", IdempotencyKey: "batch-create-001",
	}, "corr-batch-create-replay")
	if err != nil {
		t.Fatalf("replay batch create: %v", err)
	}
	if !replay.IdempotentReplay || replay.ID != batch.ID {
		t.Fatalf("expected idempotent create replay, got %+v", replay)
	}
	if _, err := CreateSettlementBatch(ctx, db, CreateSettlementBatchInput{
		ProviderID: providerID + "-other", Currency: "YER", IdempotencyKey: "batch-create-001",
	}, "corr-batch-create-conflict"); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("create idempotency conflict error=%v, want %v", err, ErrIdempotencyConflict)
	}
	if _, err := CreateSettlementBatch(ctx, db, CreateSettlementBatchInput{
		ProviderID: providerID, Currency: "YER", IdempotencyKey: "batch-create-002",
	}, "corr-batch-create-empty"); !errors.Is(err, ErrNoApprovedPayoutsFound) {
		t.Fatalf("second create error=%v, want %v", err, ErrNoApprovedPayoutsFound)
	}

	frozen, err := FreezeSettlementBatch(ctx, db, batch.ID, "batch-freeze-001", "corr-batch-freeze-001")
	if err != nil {
		t.Fatalf("freeze settlement batch: %v", err)
	}
	if frozen.Status != "frozen" || frozen.FrozenAt == nil {
		t.Fatalf("unexpected frozen batch: %+v", frozen)
	}
	freezeReplay, err := FreezeSettlementBatch(ctx, db, batch.ID, "batch-freeze-001", "corr-batch-freeze-replay")
	if err != nil {
		t.Fatalf("replay batch freeze: %v", err)
	}
	if !freezeReplay.IdempotentReplay || freezeReplay.ID != batch.ID {
		t.Fatalf("expected idempotent freeze replay, got %+v", freezeReplay)
	}
	if _, err := FreezeSettlementBatch(ctx, db, batch.ID, "batch-freeze-002", "corr-batch-freeze-conflict"); !errors.Is(err, ErrBatchAlreadyFrozen) {
		t.Fatalf("second freeze error=%v, want %v", err, ErrBatchAlreadyFrozen)
	}
}
