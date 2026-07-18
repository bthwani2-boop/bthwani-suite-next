package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/marketing"
	"dsh-api/internal/store"
)

func writeLoyaltyPolicyError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, marketing.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "loyalty earning policy not found")
	case errors.Is(err, marketing.ErrLoyaltyPolicyVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "loyalty policy changed; reload before retrying")
	case errors.Is(err, marketing.ErrLoyaltyPolicySelfApproval):
		store.SendError(w, http.StatusConflict, "SEPARATION_OF_DUTIES_REQUIRED", "policy creator cannot approve the same policy")
	case errors.Is(err, marketing.ErrActiveLoyaltyPolicyImmutable):
		store.SendError(w, http.StatusConflict, "ACTIVE_POLICY_IMMUTABLE", "pause the active loyalty policy before changing its terms")
	case errors.Is(err, marketing.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "loyalty policy input is invalid")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "loyalty policy action failed")
	}
}

// GET /dsh/operator/marketing/loyalty-earning-policies
func (s *protectedStoreServer) handleListLoyaltyEarningPolicies(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator"); !ok {
		return
	}
	policies, err := marketing.ListLoyaltyEarningPolicies(s.db)
	if err != nil {
		writeLoyaltyPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policies": policies})
}

// POST /dsh/operator/marketing/loyalty-earning-policies
func (s *protectedStoreServer) handleCreateLoyaltyEarningPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr                        string `json:"nameAr"`
		PointsNumerator               int64  `json:"pointsNumerator"`
		EligibleMinorUnitsDenominator int64  `json:"eligibleMinorUnitsDenominator"`
		MinimumPoints                 int64  `json:"minimumPoints"`
		MaximumPointsPerOrder         int64  `json:"maximumPointsPerOrder"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	policy, err := marketing.CreateLoyaltyEarningPolicy(s.db, marketing.CreateLoyaltyEarningPolicyInput{
		NameAr:                        body.NameAr,
		PointsNumerator:               body.PointsNumerator,
		EligibleMinorUnitsDenominator: body.EligibleMinorUnitsDenominator,
		MinimumPoints:                 body.MinimumPoints,
		MaximumPointsPerOrder:         body.MaximumPointsPerOrder,
		ActorID:                       actor.ID,
		CorrelationID:                 marketingCorrelationID(r),
	})
	if err != nil {
		writeLoyaltyPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"policy": policy})
}

// PATCH /dsh/operator/marketing/loyalty-earning-policies/{policyId}
func (s *protectedStoreServer) handleUpdateLoyaltyEarningPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr                        *string `json:"nameAr"`
		PointsNumerator               *int64  `json:"pointsNumerator"`
		EligibleMinorUnitsDenominator *int64  `json:"eligibleMinorUnitsDenominator"`
		MinimumPoints                 *int64  `json:"minimumPoints"`
		MaximumPointsPerOrder         *int64  `json:"maximumPointsPerOrder"`
		Status                        *string `json:"status"`
		ExpectedVersion               int     `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	policy, err := marketing.UpdateLoyaltyEarningPolicy(s.db, r.PathValue("policyId"), marketing.UpdateLoyaltyEarningPolicyInput{
		NameAr:                        body.NameAr,
		PointsNumerator:               body.PointsNumerator,
		EligibleMinorUnitsDenominator: body.EligibleMinorUnitsDenominator,
		MinimumPoints:                 body.MinimumPoints,
		MaximumPointsPerOrder:         body.MaximumPointsPerOrder,
		Status:                        body.Status,
		ExpectedVersion:               body.ExpectedVersion,
		ActorID:                       actor.ID,
		CorrelationID:                 marketingCorrelationID(r),
	})
	if err != nil {
		writeLoyaltyPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}
