package settlement

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

var (
	ErrSettlementEvidenceRequired    = errors.New("verified DSH completion and cancellation evidence is required")
	ErrSettlementIdempotencyConflict = errors.New("idempotency key was already used with different settlement inputs")
	ErrSettlementRefundExceedsGross  = errors.New("completed refunds exceed the authoritative order gross")
	ErrSettlementMinimumNotMet       = errors.New("settlement net amount is below the active policy minimum")
)

type VerifiedDeliveredOrderSource struct {
	OrderID                 string    `json:"orderId"`
	GrossAmountMinorUnits   int64     `json:"grossAmountMinorUnits"`
	Currency                string    `json:"currency"`
	DeliveredAt             time.Time `json:"deliveredAt"`
	PricingSnapshotHash     string    `json:"pricingSnapshotHash"`
	CompletionEventID       string    `json:"completionEventId"`
	CompletionEvidenceHash  string    `json:"completionEvidenceHash"`
	CancellationStatus      string    `json:"cancellationStatus"`
}

type CreateEvidenceSettlementInput struct {
	PartnerID      string                         `json:"partnerId"`
	PeriodStart    string                         `json:"periodStart"`
	PeriodEnd      string                         `json:"periodEnd"`
	OrderSources   []VerifiedDeliveredOrderSource `json:"orderSources"`
	OperatorID     string                         `json:"operatorId"`
	IdempotencyKey string                         `json:"idempotencyKey"`
}

type UpsertGovernedSettlementPolicyInput struct {
	FeeBasisPoints           int    `json:"feeBasisPoints"`
	Currency                 string `json:"currency"`
	Status                   string `json:"status"`
	CycleDays                int    `json:"cycleDays"`
	MinimumNetMinorUnits     int64  `json:"minimumNetMinorUnits"`
	ChangeReason             string `json:"changeReason"`
	OperatorID               string `json:"operatorId"`
}

type GovernedSettlementPolicy struct {
	PartnerID               string `json:"partnerId"`
	Version                 int64  `json:"version"`
	FeeBasisPoints          int    `json:"feeBasisPoints"`
	Currency                string `json:"currency"`
	Status                  string `json:"status"`
	CycleDays               int    `json:"cycleDays"`
	MinimumNetMinorUnits    int64  `json:"minimumNetMinorUnits"`
	ChangeReason            string `json:"changeReason"`
	UpdatedByOperatorID     string `json:"updatedByOperatorId"`
}

type SettlementSourceEvidenceView struct {
	OrderID                    string `json:"orderId"`
	PricingSnapshotHash        string `json:"pricingSnapshotHash"`
	CompletionEventID          string `json:"completionEventId"`
	CompletionEvidenceHash     string `json:"completionEvidenceHash"`
	CancellationStatus         string `json:"cancellationStatus"`
	OriginalGrossMinorUnits    int64  `json:"originalGrossMinorUnits"`
	CompletedRefundMinorUnits  int64  `json:"completedRefundMinorUnits"`
	SettlementBasisMinorUnits  int64  `json:"settlementBasisMinorUnits"`
	RefundEvidenceCount        int    `json:"refundEvidenceCount"`
	VerifiedAt                 string `json:"verifiedAt"`
}

func hashSettlementParts(parts ...string) string {
	h := sha256.New()
	for _, part := range parts {
		_, _ = h.Write([]byte(strings.TrimSpace(part)))
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

func normalizeEvidenceSettlementInput(input CreateEvidenceSettlementInput) (CreateEvidenceSettlementInput, time.Time, time.Time, error) {
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.PeriodStart = strings.TrimSpace(input.PeriodStart)
	input.PeriodEnd = strings.TrimSpace(input.PeriodEnd)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if input.PartnerID == "" || input.PeriodStart == "" || input.PeriodEnd == "" || input.OperatorID == "" || input.IdempotencyKey == "" || len(input.OrderSources) == 0 {
		return input, time.Time{}, time.Time{}, fmt.Errorf("partnerId, periodStart, periodEnd, operatorId, idempotencyKey and orderSources are required")
	}
	periodStart, err := time.Parse("2006-01-02", input.PeriodStart)
	if err != nil { return input, time.Time{}, time.Time{}, fmt.Errorf("periodStart must use YYYY-MM-DD") }
	periodEnd, err := time.Parse("2006-01-02", input.PeriodEnd)
	if err != nil || periodEnd.Before(periodStart) { return input, time.Time{}, time.Time{}, fmt.Errorf("periodEnd must use YYYY-MM-DD and be on or after periodStart") }
	seen := map[string]struct{}{}
	for index := range input.OrderSources {
		source := input.OrderSources[index]
		source.OrderID = strings.TrimSpace(source.OrderID)
		source.Currency = strings.TrimSpace(source.Currency)
		source.PricingSnapshotHash = strings.TrimSpace(source.PricingSnapshotHash)
		source.CompletionEventID = strings.TrimSpace(source.CompletionEventID)
		source.CompletionEvidenceHash = strings.TrimSpace(source.CompletionEvidenceHash)
		source.CancellationStatus = strings.ToLower(strings.TrimSpace(source.CancellationStatus))
		if source.OrderID == "" || source.GrossAmountMinorUnits <= 0 || source.Currency == "" || source.DeliveredAt.IsZero() || source.PricingSnapshotHash == "" || source.CompletionEventID == "" || source.CompletionEvidenceHash == "" {
			return input, time.Time{}, time.Time{}, fmt.Errorf("orderSources[%d]: %w", index, ErrSettlementEvidenceRequired)
		}
		if source.CancellationStatus != "not_cancelled" { return input, time.Time{}, time.Time{}, fmt.Errorf("orderSources[%d] is cancelled: %w", index, ErrSettlementEvidenceRequired) }
		if source.DeliveredAt.Before(periodStart) || !source.DeliveredAt.Before(periodEnd.Add(24*time.Hour)) { return input, time.Time{}, time.Time{}, fmt.Errorf("orderSources[%d] deliveredAt is outside the settlement period", index) }
		if _, ok := seen[source.OrderID]; ok { return input, time.Time{}, time.Time{}, fmt.Errorf("duplicate orderId %s", source.OrderID) }
		seen[source.OrderID] = struct{}{}
		input.OrderSources[index] = source
	}
	sort.Slice(input.OrderSources, func(i,j int) bool { return input.OrderSources[i].OrderID < input.OrderSources[j].OrderID })
	return input, periodStart, periodEnd, nil
}

func scanGovernedSettlementPolicy(row *sql.Row) (*GovernedSettlementPolicy,error) {
	var policy GovernedSettlementPolicy
	err := row.Scan(&policy.PartnerID,&policy.Version,&policy.FeeBasisPoints,&policy.Currency,&policy.Status,&policy.CycleDays,&policy.MinimumNetMinorUnits,&policy.ChangeReason,&policy.UpdatedByOperatorID)
	if errors.Is(err,sql.ErrNoRows){return nil,nil}
	return &policy,err
}

func getOrAdoptSettlementPolicyTx(ctx context.Context,tx *sql.Tx,partnerID string)(*GovernedSettlementPolicy,error){
	const versionQuery = `SELECT partner_id,version,fee_basis_points,currency,status,cycle_days,minimum_net_minor_units,change_reason,updated_by_operator_id FROM wlt_jrn036_settlement_policy_versions WHERE partner_id=$1 ORDER BY version DESC LIMIT 1`
	policy,err:=scanGovernedSettlementPolicy(tx.QueryRowContext(ctx,versionQuery,partnerID));if err!=nil{return nil,err};if policy!=nil{return policy,nil}
	var fee int;var currency,status,operator string
	if err:=tx.QueryRowContext(ctx,`SELECT fee_basis_points,currency,status,updated_by_operator_id FROM wlt_settlement_policies WHERE partner_id=$1`,partnerID).Scan(&fee,&currency,&status,&operator);errors.Is(err,sql.ErrNoRows){return nil,ErrSettlementPolicyMissing}else if err!=nil{return nil,err}
	row:=tx.QueryRowContext(ctx,`INSERT INTO wlt_jrn036_settlement_policy_versions (partner_id,version,fee_basis_points,currency,status,cycle_days,minimum_net_minor_units,change_reason,updated_by_operator_id) VALUES ($1,1,$2,$3,$4,7,0,'adopted existing sovereign WLT settlement policy',$5) RETURNING partner_id,version,fee_basis_points,currency,status,cycle_days,minimum_net_minor_units,change_reason,updated_by_operator_id`,partnerID,fee,currency,status,operator)
	return scanGovernedSettlementPolicy(row)
}

func UpsertGovernedSettlementPolicy(ctx context.Context,db *sql.DB,partnerID string,input UpsertGovernedSettlementPolicyInput,correlationID string)(*GovernedSettlementPolicy,error){
	partnerID=strings.TrimSpace(partnerID);input.Currency=strings.TrimSpace(input.Currency);input.Status=strings.ToLower(strings.TrimSpace(input.Status));input.ChangeReason=strings.TrimSpace(input.ChangeReason);input.OperatorID=strings.TrimSpace(input.OperatorID);correlationID=strings.TrimSpace(correlationID)
	if partnerID==""||input.OperatorID==""||input.ChangeReason==""||correlationID==""||input.FeeBasisPoints<0||input.FeeBasisPoints>10000||input.MinimumNetMinorUnits<0{return nil,fmt.Errorf("valid partnerId, feeBasisPoints, changeReason, operatorId, correlationId and minimum are required")}
	if input.Currency==""{input.Currency="YER"};if input.Status==""{input.Status="active"};if input.Status!="active"&&input.Status!="inactive"{return nil,fmt.Errorf("status must be active or inactive")};if input.CycleDays==0{input.CycleDays=7};if input.CycleDays<1||input.CycleDays>366{return nil,fmt.Errorf("cycleDays must be between 1 and 366")}
	tx,err:=db.BeginTx(ctx,nil);if err!=nil{return nil,err};defer tx.Rollback()
	if _,err:=tx.ExecContext(ctx,`INSERT INTO wlt_settlement_policies (partner_id,fee_basis_points,currency,status,updated_by_operator_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (partner_id) DO UPDATE SET fee_basis_points=EXCLUDED.fee_basis_points,currency=EXCLUDED.currency,status=EXCLUDED.status,updated_by_operator_id=EXCLUDED.updated_by_operator_id,updated_at=NOW()`,partnerID,input.FeeBasisPoints,input.Currency,input.Status,input.OperatorID);err!=nil{return nil,err}
	var version int64;if err:=tx.QueryRowContext(ctx,`SELECT COALESCE(MAX(version),0)+1 FROM wlt_jrn036_settlement_policy_versions WHERE partner_id=$1`,partnerID).Scan(&version);err!=nil{return nil,err}
	row:=tx.QueryRowContext(ctx,`INSERT INTO wlt_jrn036_settlement_policy_versions (partner_id,version,fee_basis_points,currency,status,cycle_days,minimum_net_minor_units,change_reason,updated_by_operator_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING partner_id,version,fee_basis_points,currency,status,cycle_days,minimum_net_minor_units,change_reason,updated_by_operator_id`,partnerID,version,input.FeeBasisPoints,input.Currency,input.Status,input.CycleDays,input.MinimumNetMinorUnits,input.ChangeReason,input.OperatorID)
	policy,err:=scanGovernedSettlementPolicy(row);if err!=nil{return nil,err}
	if _,err:=tx.ExecContext(ctx,`INSERT INTO wlt_jrn036_audit_events (aggregate_type,aggregate_id,action,actor_id,actor_type,reason,correlation_id,metadata) VALUES ('settlement_policy',$1,'policy_version_created',$2,'operator',$3,$4,jsonb_build_object('version',$5,'feeBasisPoints',$6,'status',$7))`,partnerID,input.OperatorID,input.ChangeReason,correlationID,version,input.FeeBasisPoints,input.Status);err!=nil{return nil,err}
	if err:=tx.Commit();err!=nil{return nil,err};return policy,nil
}

func CreateEvidenceBackedSettlement(ctx context.Context,db *sql.DB,input CreateEvidenceSettlementInput,correlationID string)(*Settlement,error){
	var periodStart,periodEnd time.Time;var err error
	input,periodStart,periodEnd,err=normalizeEvidenceSettlementInput(input);if err!=nil{return nil,err};_ = periodStart;_ = periodEnd
	correlationID=strings.TrimSpace(correlationID);if correlationID==""{return nil,fmt.Errorf("correlationId is required")}
	hashParts:=[]string{input.PartnerID,input.PeriodStart,input.PeriodEnd,input.OperatorID}
	for _,source:=range input.OrderSources{hashParts=append(hashParts,source.OrderID,fmt.Sprint(source.GrossAmountMinorUnits),source.Currency,source.DeliveredAt.UTC().Format(time.RFC3339Nano),source.PricingSnapshotHash,source.CompletionEventID,source.CompletionEvidenceHash,source.CancellationStatus)}
	requestHash:=hashSettlementParts(hashParts...)
	tx,err:=db.BeginTx(ctx,nil);if err!=nil{return nil,err};defer tx.Rollback()
	var existingSettlementID,existingHash string
	if err:=tx.QueryRowContext(ctx,`SELECT settlement_id,request_hash FROM wlt_jrn036_settlement_requests WHERE idempotency_key=$1`,input.IdempotencyKey).Scan(&existingSettlementID,&existingHash);err==nil{
		if existingHash!=requestHash{return nil,ErrSettlementIdempotencyConflict}
		existing,err:=scanSettlement(tx.QueryRowContext(ctx,`SELECT `+settlementCols+` FROM wlt_settlements WHERE id=$1`,existingSettlementID));if err!=nil{return nil,err};if err:=tx.Commit();err!=nil{return nil,err};return existing,nil
	}else if !errors.Is(err,sql.ErrNoRows){return nil,err}
	policy,err:=getOrAdoptSettlementPolicyTx(ctx,tx,input.PartnerID);if err!=nil{return nil,err};if policy.Status!="active"{return nil,ErrSettlementPolicyMissing}
	type verifiedSource struct{ source VerifiedDeliveredOrderSource; refund int64; refundCount int; basis int64 }
	verified:=make([]verifiedSource,0,len(input.OrderSources));var gross int64
	for _,source:=range input.OrderSources{
		if source.Currency!=policy.Currency{return nil,fmt.Errorf("order %s currency does not match settlement policy",source.OrderID)}
		var refund int64;var refundCount int
		if err:=tx.QueryRowContext(ctx,`SELECT COALESCE(SUM(amount_minor_units),0),COUNT(*) FROM wlt_refunds WHERE order_id=$1 AND status='completed'`,source.OrderID).Scan(&refund,&refundCount);err!=nil{return nil,err}
		if refund>source.GrossAmountMinorUnits{return nil,ErrSettlementRefundExceedsGross}
		basis:=source.GrossAmountMinorUnits-refund
		if basis>0{gross,err=addPositiveMinorUnits(gross,basis);if err!=nil{return nil,err}}
		verified=append(verified,verifiedSource{source:source,refund:refund,refundCount:refundCount,basis:basis})
	}
	if gross<=0{return nil,fmt.Errorf("all delivered order value was refunded; no payable settlement basis remains")}
	fee,err:=settlementFeeFromBasisPoints(gross,policy.FeeBasisPoints);if err!=nil{return nil,err};net:=gross-fee;if net<policy.MinimumNetMinorUnits{return nil,ErrSettlementMinimumNotMet}
	positiveCount:=0;for _,item:=range verified{if item.basis>0{positiveCount++}}
	settlement,err:=scanSettlement(tx.QueryRowContext(ctx,`INSERT INTO wlt_settlements (partner_id,period_start,period_end,gross_amount,platform_fee,net_amount,currency,order_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING `+settlementCols,input.PartnerID,input.PeriodStart,input.PeriodEnd,gross,fee,net,policy.Currency,positiveCount));if err!=nil{return nil,err}
	for _,item:=range verified{
		if item.basis>0{if _,err:=tx.ExecContext(ctx,`INSERT INTO wlt_settlement_source_orders (order_id,settlement_id,partner_id,gross_amount_minor_units,currency,delivered_at) VALUES ($1,$2,$3,$4,$5,$6)`,item.source.OrderID,settlement.ID,input.PartnerID,item.basis,item.source.Currency,item.source.DeliveredAt);err!=nil{return nil,err}}
		if _,err:=tx.ExecContext(ctx,`INSERT INTO wlt_jrn036_settlement_source_evidence (order_id,settlement_id,pricing_snapshot_hash,completion_event_id,completion_evidence_hash,cancellation_status,original_gross_minor_units,completed_refund_minor_units,settlement_basis_minor_units,refund_evidence_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,item.source.OrderID,settlement.ID,item.source.PricingSnapshotHash,item.source.CompletionEventID,item.source.CompletionEvidenceHash,item.source.CancellationStatus,item.source.GrossAmountMinorUnits,item.refund,item.basis,item.refundCount);err!=nil{return nil,err}
	}
	if _,err:=tx.ExecContext(ctx,`INSERT INTO wlt_jrn036_settlement_requests (idempotency_key,request_hash,settlement_id,partner_id,policy_version) VALUES ($1,$2,$3,$4,$5)`,input.IdempotencyKey,requestHash,settlement.ID,input.PartnerID,policy.Version);err!=nil{return nil,err}
	if _,err:=tx.ExecContext(ctx,`INSERT INTO wlt_jrn036_audit_events (aggregate_type,aggregate_id,action,actor_id,actor_type,correlation_id,metadata) VALUES ('settlement',$1,'settlement_calculated',$2,'operator',$3,jsonb_build_object('policyVersion',$4,'grossMinorUnits',$5,'feeMinorUnits',$6,'netMinorUnits',$7))`,settlement.ID,input.OperatorID,correlationID,policy.Version,gross,fee,net);err!=nil{return nil,err}
	if err:=tx.Commit();err!=nil{return nil,err};return settlement,nil
}

func ListSettlementEvidence(ctx context.Context,db *sql.DB,settlementID string)([]SettlementSourceEvidenceView,error){
	rows,err:=db.QueryContext(ctx,`SELECT order_id,pricing_snapshot_hash,completion_event_id,completion_evidence_hash,cancellation_status,original_gross_minor_units,completed_refund_minor_units,settlement_basis_minor_units,refund_evidence_count,verified_at::text FROM wlt_jrn036_settlement_source_evidence WHERE settlement_id=$1 ORDER BY order_id`,strings.TrimSpace(settlementID));if err!=nil{return nil,err};defer rows.Close();out:=[]SettlementSourceEvidenceView{}
	for rows.Next(){var item SettlementSourceEvidenceView;if err:=rows.Scan(&item.OrderID,&item.PricingSnapshotHash,&item.CompletionEventID,&item.CompletionEvidenceHash,&item.CancellationStatus,&item.OriginalGrossMinorUnits,&item.CompletedRefundMinorUnits,&item.SettlementBasisMinorUnits,&item.RefundEvidenceCount,&item.VerifiedAt);err!=nil{return nil,err};out=append(out,item)};return out,rows.Err()
}

func HandleCreateEvidenceBackedSettlement(db *sql.DB)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){var input CreateEvidenceSettlementInput;decoder:=json.NewDecoder(http.MaxBytesReader(w,r.Body,2*1024*1024));decoder.DisallowUnknownFields();if err:=decoder.Decode(&input);err!=nil{shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST","request body is invalid");return};if input.IdempotencyKey==""{input.IdempotencyKey=strings.TrimSpace(r.Header.Get("Idempotency-Key"))};settlement,err:=CreateEvidenceBackedSettlement(r.Context(),db,input,r.Header.Get("X-Correlation-ID"));switch{case errors.Is(err,ErrSettlementPolicyMissing):shared.SendError(w,http.StatusConflict,"SETTLEMENT_POLICY_MISSING",err.Error());return;case errors.Is(err,ErrSettlementEvidenceRequired):shared.SendError(w,http.StatusConflict,"SETTLEMENT_EVIDENCE_REQUIRED",err.Error());return;case errors.Is(err,ErrSettlementIdempotencyConflict):shared.SendError(w,http.StatusConflict,"IDEMPOTENCY_CONFLICT",err.Error());return;case errors.Is(err,ErrSettlementRefundExceedsGross):shared.SendError(w,http.StatusConflict,"REFUND_EXCEEDS_GROSS",err.Error());return;case errors.Is(err,ErrSettlementMinimumNotMet):shared.SendError(w,http.StatusConflict,"SETTLEMENT_MINIMUM_NOT_MET",err.Error());return;case err!=nil:shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST",err.Error());return};shared.SendJSON(w,http.StatusCreated,map[string]any{"settlement":settlement})}}
func HandleUpsertGovernedSettlementPolicy(db *sql.DB)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){var input UpsertGovernedSettlementPolicyInput;decoder:=json.NewDecoder(http.MaxBytesReader(w,r.Body,128*1024));decoder.DisallowUnknownFields();if err:=decoder.Decode(&input);err!=nil{shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST","request body is invalid");return};policy,err:=UpsertGovernedSettlementPolicy(r.Context(),db,r.PathValue("partnerId"),input,r.Header.Get("X-Correlation-ID"));if err!=nil{shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST",err.Error());return};shared.SendJSON(w,http.StatusOK,map[string]any{"settlementPolicy":policy})}}
func HandleListSettlementEvidence(db *sql.DB)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){evidence,err:=ListSettlementEvidence(r.Context(),db,r.PathValue("settlementId"));if err!=nil{shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST",err.Error());return};shared.SendJSON(w,http.StatusOK,map[string]any{"evidence":evidence})}}
