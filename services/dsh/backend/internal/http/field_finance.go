package http

import (
	"dsh-api/internal/opctx"
	"net/http"
	"net/url"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleFieldMeCommissions(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}, "beneficiaryActorType": {"field"}}
	trustedContext := opctx.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.ExecuteFinanceRead(trustedContext, "finance.ledger.commissions.read", nil, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "FINANCE_RESPONSE_UNAVAILABLE", "finance operation response was invalid or unavailable")
		return
	}
	writeFinanceResponse(w, status, body, nil)
}
