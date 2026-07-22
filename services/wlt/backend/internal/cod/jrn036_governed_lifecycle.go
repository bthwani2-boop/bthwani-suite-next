package cod

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

type CommissionLifecycleInput struct {
	OperatorID string `json:"operatorId"`
	Reason     string `json:"reason"`
}

type CommissionEvidenceView struct {
	PolicyID                  string `json:"policyId"`
	PolicyVersion             int64  `json:"policyVersion"`
	SourceEvidenceID          string `json:"sourceEvidenceId"`
	SourceEvidenceHash        string `json:"sourceEvidenceHash"`
	SourceEvidenceStatus      string `json:"sourceEvidenceStatus"`
	GrossBasisMinorUnits      int64  `json:"grossBasisMinorUnits"`
	CalculatedAmountMinorUnits int64 `json:"calculatedAmountMinorUnits"`
	VerifiedAt                string `json:"verifiedAt"`
}

type CommissionAdjustmentView struct {
	ID              string `json:"id"`
	DeltaMinorUnits int64  `json:"deltaMinorUnits"`
	Reason          string `json:"reason"`
	OperatorID      string `json:"operatorId"`
	CreatedAt       string `json:"createdAt"`
}

type CommissionDetail struct {
	Commission  *Commission                `json:"commission"`
	Evidence    *CommissionEvidenceView    `json:"evidence,omitempty"`
	Adjustments []CommissionAdjustmentView `json:"adjustments"`
}

func commissionHasWalletEffectTx(ctx context.Context, tx *sql.Tx, commission *Commission) (bool, error) {
	if commission.SourceType == "field_visit" {
		return true, nil
	}
	var governed bool
	err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM wlt_jrn036_commission_evidence WHERE commission_id=$1)`, commission.ID).Scan(&governed)
	return governed, err
}

func appendCommissionAudit(ctx context.Context, tx *sql.Tx, commissionID, action, operatorID, reason, correlationID string) error {
	if strings.TrimSpace(operatorID) == "" {
		operatorID = "wlt"
	}
	if strings.TrimSpace(correlationID) == "" {
		return fmt.Errorf("correlationId is required")
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn036_audit_events
		(aggregate_type,aggregate_id,action,actor_id,actor_type,reason,correlation_id)
		VALUES ('commission',$1,$2,$3,$4,$5,$6)`,
		commissionID, action, operatorID, map[bool]string{true:"service", false:"operator"}[operatorID == "wlt"], reason, correlationID)
	return err
}

func ConfirmGovernedCommission(ctx context.Context, db *sql.DB, commissionID, operatorID, correlationID string) (*Commission, error) {
	tx, err := db.BeginTx(ctx, nil); if err != nil { return nil, err }; defer tx.Rollback()
	commission, err := getCommissionForUpdateTx(tx, strings.TrimSpace(commissionID)); if err != nil || commission == nil { return commission, err }
	if commission.Status != "pending" { return nil, ErrCommissionNotInExpectedState }
	row := tx.QueryRowContext(ctx, `UPDATE wlt_commissions SET status='confirmed',confirmed_at=NOW(),updated_at=NOW() WHERE id=$1 AND status='pending' RETURNING `+commissionCols, commission.ID)
	updated, err := scanCommission(row); if err != nil { return nil, err }
	if err := appendCommissionAudit(ctx,tx,commission.ID,"commission_confirmed",operatorID,"",correlationID); err != nil { return nil, err }
	if err := tx.Commit(); err != nil { return nil, err }; return updated,nil
}

func SettleGovernedCommission(ctx context.Context, db *sql.DB, commissionID, operatorID, correlationID string) (*Commission, error) {
	tx, err := db.BeginTx(ctx,nil); if err != nil { return nil,err }; defer tx.Rollback()
	commission, err := getCommissionForUpdateTx(tx,strings.TrimSpace(commissionID)); if err != nil || commission == nil { return commission,err }
	if commission.Status != "confirmed" { return nil,ErrCommissionNotInExpectedState }
	walletEffect, err := commissionHasWalletEffectTx(ctx,tx,commission); if err != nil { return nil,err }
	if walletEffect {
		result, err := tx.ExecContext(ctx, `UPDATE wlt_wallets SET pending_balance_minor_units=pending_balance_minor_units-$1,available_balance_minor_units=available_balance_minor_units+$1,settled_total_minor_units=settled_total_minor_units+$1,updated_at=NOW() WHERE actor_type=$2 AND actor_id=$3 AND pending_balance_minor_units>=$1`, commission.AmountMinorUnits,commission.BeneficiaryActorType,commission.BeneficiaryActorID)
		if err != nil { return nil,err }; if affected,_ := result.RowsAffected(); affected != 1 { return nil,fmt.Errorf("commission wallet pending balance is insufficient") }
	}
	row := tx.QueryRowContext(ctx, `UPDATE wlt_commissions SET status='settled',settled_at=NOW(),updated_at=NOW() WHERE id=$1 AND status='confirmed' RETURNING `+commissionCols,commission.ID)
	updated, err := scanCommission(row); if err != nil { return nil,err }
	if err := appendCommissionAudit(ctx,tx,commission.ID,"commission_settled",operatorID,"",correlationID); err != nil { return nil,err }
	if err := tx.Commit(); err != nil { return nil,err }; return updated,nil
}

func RejectGovernedCommission(ctx context.Context, db *sql.DB, commissionID, operatorID, reason, correlationID string) (*Commission,error) {
	reason = strings.TrimSpace(reason); if reason == "" { return nil,fmt.Errorf("reason is required") }
	tx, err := db.BeginTx(ctx,nil); if err != nil { return nil,err }; defer tx.Rollback()
	commission, err := getCommissionForUpdateTx(tx,strings.TrimSpace(commissionID)); if err != nil || commission == nil { return commission,err }
	if commission.Status != "pending" { return nil,ErrCommissionNotInExpectedState }
	walletEffect, err := commissionHasWalletEffectTx(ctx,tx,commission); if err != nil { return nil,err }
	if walletEffect {
		result, err := tx.ExecContext(ctx, `UPDATE wlt_wallets SET pending_balance_minor_units=pending_balance_minor_units-$1,earned_total_minor_units=earned_total_minor_units-$1,updated_at=NOW() WHERE actor_type=$2 AND actor_id=$3 AND pending_balance_minor_units>=$1 AND earned_total_minor_units>=$1`,commission.AmountMinorUnits,commission.BeneficiaryActorType,commission.BeneficiaryActorID)
		if err != nil { return nil,err }; if affected,_ := result.RowsAffected(); affected != 1 { return nil,fmt.Errorf("commission wallet balance cannot be reversed") }
		lines := []ledger.LedgerLine{{AccountType:"wallet",ActorType:commission.BeneficiaryActorType,ActorID:commission.BeneficiaryActorID,DebitCredit:"debit",AmountMinorUnits:commission.AmountMinorUnits,Currency:commission.Currency},{AccountType:"platform_commission_receivable",DebitCredit:"credit",AmountMinorUnits:commission.AmountMinorUnits,Currency:commission.Currency}}
		if _,err := ledger.PostLedgerTransaction(ctx,tx,"commission_rejected","commission",commission.ID,lines,ledger.Actor{ID:operatorID,Type:"operator"}); err != nil { return nil,err }
	}
	row := tx.QueryRowContext(ctx, `UPDATE wlt_commissions SET status='rejected',rejected_at=NOW(),resolution_note=$2,updated_at=NOW() WHERE id=$1 AND status='pending' RETURNING `+commissionCols,commission.ID,reason)
	updated,err := scanCommission(row); if err != nil { return nil,err }
	if err := appendCommissionAudit(ctx,tx,commission.ID,"commission_rejected",operatorID,reason,correlationID); err != nil { return nil,err }
	if err := tx.Commit(); err != nil { return nil,err }; return updated,nil
}

func ReverseGovernedCommission(ctx context.Context, db *sql.DB, commissionID, operatorID, reason, correlationID string) (*Commission,error) {
	reason = strings.TrimSpace(reason); if reason == "" { return nil,fmt.Errorf("reason is required") }
	tx,err := db.BeginTx(ctx,nil); if err != nil { return nil,err }; defer tx.Rollback()
	commission,err := getCommissionForUpdateTx(tx,strings.TrimSpace(commissionID)); if err != nil || commission == nil { return commission,err }
	if commission.Status != "settled" { return nil,ErrCommissionNotInExpectedState }
	walletEffect,err := commissionHasWalletEffectTx(ctx,tx,commission); if err != nil { return nil,err }
	if walletEffect {
		result,err := tx.ExecContext(ctx, `UPDATE wlt_wallets SET available_balance_minor_units=available_balance_minor_units-$1,settled_total_minor_units=settled_total_minor_units-$1,updated_at=NOW() WHERE actor_type=$2 AND actor_id=$3 AND available_balance_minor_units>=$1 AND settled_total_minor_units>=$1`,commission.AmountMinorUnits,commission.BeneficiaryActorType,commission.BeneficiaryActorID)
		if err != nil { return nil,err }; if affected,_ := result.RowsAffected(); affected != 1 { return nil,fmt.Errorf("commission available balance cannot be reversed") }
		lines := []ledger.LedgerLine{{AccountType:"wallet",ActorType:commission.BeneficiaryActorType,ActorID:commission.BeneficiaryActorID,DebitCredit:"debit",AmountMinorUnits:commission.AmountMinorUnits,Currency:commission.Currency},{AccountType:"platform_commission_receivable",DebitCredit:"credit",AmountMinorUnits:commission.AmountMinorUnits,Currency:commission.Currency}}
		if _,err := ledger.PostLedgerTransaction(ctx,tx,"commission_reversed","commission",commission.ID,lines,ledger.Actor{ID:operatorID,Type:"operator"}); err != nil { return nil,err }
	}
	row := tx.QueryRowContext(ctx, `UPDATE wlt_commissions SET status='reversed',reversed_at=NOW(),resolution_note=$2,updated_at=NOW() WHERE id=$1 AND status='settled' RETURNING `+commissionCols,commission.ID,reason)
	updated,err := scanCommission(row); if err != nil { return nil,err }
	if err := appendCommissionAudit(ctx,tx,commission.ID,"commission_reversed",operatorID,reason,correlationID); err != nil { return nil,err }
	if err := tx.Commit(); err != nil { return nil,err }; return updated,nil
}

func GetGovernedCommissionDetail(ctx context.Context,db *sql.DB,commissionID string)(*CommissionDetail,error){
	commission,err := GetCommission(db,strings.TrimSpace(commissionID)); if err != nil || commission == nil { return nil,err }
	detail := &CommissionDetail{Commission:commission,Adjustments:[]CommissionAdjustmentView{}}
	var evidence CommissionEvidenceView
	err = db.QueryRowContext(ctx, `SELECT policy_id,policy_version,source_evidence_id,source_evidence_hash,source_evidence_status,gross_basis_minor_units,calculated_amount_minor_units,verified_at::text FROM wlt_jrn036_commission_evidence WHERE commission_id=$1`,commission.ID).Scan(&evidence.PolicyID,&evidence.PolicyVersion,&evidence.SourceEvidenceID,&evidence.SourceEvidenceHash,&evidence.SourceEvidenceStatus,&evidence.GrossBasisMinorUnits,&evidence.CalculatedAmountMinorUnits,&evidence.VerifiedAt)
	if err == nil { detail.Evidence=&evidence } else if !errors.Is(err,sql.ErrNoRows){ return nil,err }
	rows,err := db.QueryContext(ctx, `SELECT id,delta_minor_units,reason,operator_id,created_at::text FROM wlt_jrn036_commission_adjustments WHERE commission_id=$1 ORDER BY created_at,id`,commission.ID); if err != nil { return nil,err }; defer rows.Close()
	for rows.Next(){ var item CommissionAdjustmentView; if err:=rows.Scan(&item.ID,&item.DeltaMinorUnits,&item.Reason,&item.OperatorID,&item.CreatedAt);err!=nil{return nil,err};detail.Adjustments=append(detail.Adjustments,item)}
	return detail,rows.Err()
}

func decodeLifecycleInput(w http.ResponseWriter,r *http.Request)(CommissionLifecycleInput,bool){
	var input CommissionLifecycleInput
	if r.Body==nil { return input,true }
	decoder:=json.NewDecoder(http.MaxBytesReader(w,r.Body,64*1024));decoder.DisallowUnknownFields()
	if err:=decoder.Decode(&input);err!=nil { shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST","request body is invalid");return input,false }
	return input,true
}

func writeCommissionLifecycleResult(w http.ResponseWriter,commission *Commission,err error){
	if errors.Is(err,ErrCommissionNotInExpectedState){shared.SendError(w,http.StatusConflict,"INVALID_STATE",err.Error());return}
	if err!=nil{shared.SendError(w,http.StatusConflict,"INVALID_STATE",err.Error());return}
	if commission==nil{shared.SendError(w,http.StatusNotFound,"NOT_FOUND","commission not found");return}
	shared.SendJSON(w,http.StatusOK,map[string]any{"commission":commission})
}

func HandleConfirmGovernedCommission(db *sql.DB)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){input,ok:=decodeLifecycleInput(w,r);if !ok{return};commission,err:=ConfirmGovernedCommission(r.Context(),db,r.PathValue("commissionId"),input.OperatorID,r.Header.Get("X-Correlation-ID"));writeCommissionLifecycleResult(w,commission,err)}}
func HandleSettleGovernedCommission(db *sql.DB)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){input,ok:=decodeLifecycleInput(w,r);if !ok{return};commission,err:=SettleGovernedCommission(r.Context(),db,r.PathValue("commissionId"),input.OperatorID,r.Header.Get("X-Correlation-ID"));writeCommissionLifecycleResult(w,commission,err)}}
func HandleRejectGovernedCommission(db *sql.DB)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){input,ok:=decodeLifecycleInput(w,r);if !ok{return};commission,err:=RejectGovernedCommission(r.Context(),db,r.PathValue("commissionId"),input.OperatorID,input.Reason,r.Header.Get("X-Correlation-ID"));writeCommissionLifecycleResult(w,commission,err)}}
func HandleReverseGovernedCommission(db *sql.DB)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){input,ok:=decodeLifecycleInput(w,r);if !ok{return};commission,err:=ReverseGovernedCommission(r.Context(),db,r.PathValue("commissionId"),input.OperatorID,input.Reason,r.Header.Get("X-Correlation-ID"));writeCommissionLifecycleResult(w,commission,err)}}
func HandleGetGovernedCommission(db *sql.DB)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){detail,err:=GetGovernedCommissionDetail(r.Context(),db,r.PathValue("commissionId"));if err!=nil{shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST",err.Error());return};if detail==nil{shared.SendError(w,http.StatusNotFound,"NOT_FOUND","commission not found");return};shared.SendJSON(w,http.StatusOK,detail)}}
