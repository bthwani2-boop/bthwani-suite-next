package http

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

type governedCommissionPolicyRequest struct {
	PolicyID                string `json:"policyId"`
	CommissionType          string `json:"commissionType"`
	SourceType              string `json:"sourceType"`
	BeneficiaryActorType    string `json:"beneficiaryActorType"`
	CalculationType         string `json:"calculationType"`
	FixedAmountMinorUnits   int64  `json:"fixedAmountMinorUnits"`
	BasisPoints             int    `json:"basisPoints"`
	MinimumAmountMinorUnits int64  `json:"minimumAmountMinorUnits"`
	MaximumAmountMinorUnits *int64 `json:"maximumAmountMinorUnits"`
	Currency                string `json:"currency"`
	Status                  string `json:"status"`
	ChangeReason            string `json:"changeReason"`
}

type governedCommissionAdjustmentRequest struct {
	DeltaMinorUnits int64  `json:"deltaMinorUnits"`
	Reason          string `json:"reason"`
}

type governedCommissionLifecycleRequest struct {
	Reason string `json:"reason"`
}

func writeGovernedCommissionProxyResponse(w http.ResponseWriter, status int, body []byte, err error) {
	w.Header().Set("Cache-Control", "no-store")
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT governed commission call failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

// PUT /dsh/control-panel/finance/commission-policies
func (s *protectedStoreServer) handleUpsertFinanceCommissionPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	var input governedCommissionPolicyRequest
	if !decodeStrictFinanceJSON(w, r, &input) {
		return
	}
	input.PolicyID = strings.TrimSpace(input.PolicyID)
	input.CommissionType = strings.TrimSpace(input.CommissionType)
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.BeneficiaryActorType = strings.ToLower(strings.TrimSpace(input.BeneficiaryActorType))
	input.CalculationType = strings.ToLower(strings.TrimSpace(input.CalculationType))
	input.Currency = strings.TrimSpace(input.Currency)
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	if input.PolicyID == "" || input.CommissionType == "" || input.SourceType == "" || input.ChangeReason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "policyId, commissionType, sourceType and changeReason are required")
		return
	}
	payload, err := json.Marshal(map[string]any{
		"policyId":                input.PolicyID,
		"commissionType":          input.CommissionType,
		"sourceType":              input.SourceType,
		"beneficiaryActorType":    input.BeneficiaryActorType,
		"calculationType":         input.CalculationType,
		"fixedAmountMinorUnits":   input.FixedAmountMinorUnits,
		"basisPoints":             input.BasisPoints,
		"minimumAmountMinorUnits": input.MinimumAmountMinorUnits,
		"maximumAmountMinorUnits": input.MaximumAmountMinorUnits,
		"currency":                input.Currency,
		"status":                  input.Status,
		"changeReason":            input.ChangeReason,
		"operatorId":              actor.ID,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode governed commission policy")
		return
	}
	status, body, err := s.wlt.FinanceWriteCommission(r.Context(), http.MethodPut, "/wlt/commission-policies", payload, r.Header.Get("X-Correlation-ID"))
	writeGovernedCommissionProxyResponse(w, status, body, err)
}

// GET /dsh/control-panel/finance/commissions/{commissionId}
func (s *protectedStoreServer) handleFinanceCommissionDetail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	commissionID := strings.TrimSpace(r.PathValue("commissionId"))
	if commissionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commissionId is required")
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/commissions/"+url.PathEscape(commissionID), nil)
}

// POST /dsh/control-panel/finance/commissions/{commissionId}/adjust
func (s *protectedStoreServer) handleAdjustFinanceCommission(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	var input governedCommissionAdjustmentRequest
	if !decodeStrictFinanceJSON(w, r, &input) {
		return
	}
	input.Reason = strings.TrimSpace(input.Reason)
	if input.DeltaMinorUnits == 0 || input.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "non-zero deltaMinorUnits and reason are required")
		return
	}
	s.proxyGovernedCommissionLifecycle(w, r, actor.ID, "adjust", map[string]any{
		"deltaMinorUnits": input.DeltaMinorUnits,
		"reason":          input.Reason,
	})
}

func (s *protectedStoreServer) proxyGovernedCommissionLifecycle(w http.ResponseWriter, r *http.Request, operatorID, action string, fields map[string]any) {
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	commissionID := strings.TrimSpace(r.PathValue("commissionId"))
	if commissionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commissionId is required")
		return
	}
	if fields == nil {
		fields = map[string]any{}
	}
	fields["operatorId"] = operatorID
	payload, err := json.Marshal(fields)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode governed commission action")
		return
	}
	path := "/wlt/commissions/" + url.PathEscape(commissionID) + "/" + action
	status, body, err := s.wlt.FinanceWriteCommission(r.Context(), http.MethodPost, path, payload, r.Header.Get("X-Correlation-ID"))
	writeGovernedCommissionProxyResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleConfirmFinanceCommission(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	s.proxyGovernedCommissionLifecycle(w, r, actor.ID, "confirm", nil)
}

func (s *protectedStoreServer) handleSettleFinanceCommission(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	s.proxyGovernedCommissionLifecycle(w, r, actor.ID, "settle", nil)
}

func (s *protectedStoreServer) decodeReasonedCommissionLifecycle(w http.ResponseWriter, r *http.Request, action string) (string, bool) {
	var input governedCommissionLifecycleRequest
	if !decodeStrictFinanceJSON(w, r, &input) {
		return "", false
	}
	input.Reason = strings.TrimSpace(input.Reason)
	if input.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", action+" reason is required")
		return "", false
	}
	return input.Reason, true
}

func (s *protectedStoreServer) handleRejectFinanceCommission(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	reason, ok := s.decodeReasonedCommissionLifecycle(w, r, "rejection")
	if !ok {
		return
	}
	s.proxyGovernedCommissionLifecycle(w, r, actor.ID, "reject", map[string]any{"reason": reason})
}

func (s *protectedStoreServer) handleReverseFinanceCommission(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	reason, ok := s.decodeReasonedCommissionLifecycle(w, r, "reversal")
	if !ok {
		return
	}
	s.proxyGovernedCommissionLifecycle(w, r, actor.ID, "reverse", map[string]any{"reason": reason})
}

// GET /dsh/control-panel/finance/settlements/{settlementId}/evidence
func (s *protectedStoreServer) handleFinanceSettlementEvidence(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	settlementID := strings.TrimSpace(r.PathValue("settlementId"))
	if settlementID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "settlementId is required")
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/settlements/"+url.PathEscape(settlementID)+"/evidence", nil)
}
