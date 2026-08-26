package http

import (
	"encoding/json"
	"net/http"
	"strings"

	"dsh-api/internal/store"
)

type captainCollateralAllocationBody struct {
	PaymentSessionID string `json:"paymentSessionId"`
}
type captainCollateralReleaseBody struct {
	PositionID    string `json:"positionId"`
	ReleaseReason string `json:"releaseReason"`
}

func (s *protectedStoreServer) handleCaptainReadCollateral(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.captain_collateral.read",
		map[string]string{"captainId": actor.ID}, nil,
		r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleCaptainAllocateCollateral(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	idempotencyKey, ok := requireFinanceMutationIdempotency(w, r)
	if !ok {
		return
	}
	correlationID, ok := requireFinanceCorrelation(w, r)
	if !ok {
		return
	}
	var input captainCollateralAllocationBody
	if !decodeActorFinanceJSON(w, r, &input) {
		return
	}
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	if input.PaymentSessionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "paymentSessionId is required")
		return
	}
	body, err := json.Marshal(map[string]string{
		"captainId": actor.ID, "paymentSessionId": input.PaymentSessionID, "allocatedByActorId": actor.ID,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode collateral allocation")
		return
	}
	status, response, err := s.wlt.ExecuteFinanceWrite(r.Context(), "finance.captain_collateral.allocate", nil, body, correlationID, idempotencyKey, actor.OperatorContextID, actor.ID)
	writeWltActorFinanceResponse(w, status, response, err)
}

func (s *protectedStoreServer) handleCaptainReleaseCollateral(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	idempotencyKey, ok := requireFinanceMutationIdempotency(w, r)
	if !ok {
		return
	}
	correlationID, ok := requireFinanceCorrelation(w, r)
	if !ok {
		return
	}
	var input captainCollateralReleaseBody
	if !decodeActorFinanceJSON(w, r, &input) {
		return
	}
	input.PositionID = strings.TrimSpace(input.PositionID)
	input.ReleaseReason = strings.TrimSpace(input.ReleaseReason)
	if input.PositionID == "" || input.ReleaseReason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "positionId and releaseReason are required")
		return
	}
	body, err := json.Marshal(map[string]string{
		"captainId": actor.ID, "positionId": input.PositionID,
		"releaseReason": input.ReleaseReason, "releasedByActorId": actor.ID,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode collateral release")
		return
	}
	status, response, err := s.wlt.ExecuteFinanceWrite(r.Context(), "finance.captain_collateral.release", nil, body, correlationID, idempotencyKey, actor.OperatorContextID, actor.ID)
	writeWltActorFinanceResponse(w, status, response, err)
}
