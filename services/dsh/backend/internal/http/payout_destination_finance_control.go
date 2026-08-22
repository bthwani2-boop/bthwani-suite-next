package http

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

func resolveManagedPayoutDestinationActor(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	actorType := strings.ToLower(strings.TrimSpace(r.PathValue("actorType")))
	switch actorType {
	case "partner", "captain", "field":
	default:
		store.SendError(w, http.StatusBadRequest, "UNSUPPORTED_ACTOR_TYPE", "actorType must be partner, captain, or field")
		return "", "", false
	}
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	if actorID == "" || len(actorID) > 200 {
		store.SendError(w, http.StatusBadRequest, "INVALID_ACTOR_ID", "actorId is required and must not exceed 200 characters")
		return "", "", false
	}
	return actorType, actorID, true
}

func managedPayoutDestinationPath(actorType, actorID string) string {
	return "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID)
}

func writeManagedPayoutDestinationResponse(w http.ResponseWriter, status int, body []byte, err error) {
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT payout destination governance operation failed")
		return
	}
	if len(body) > 0 {
		w.Header().Set("Content-Type", "application/json")
	}
	w.WriteHeader(status)
	if len(body) > 0 {
		_, _ = w.Write(body)
	}
}

func (s *protectedStoreServer) handleFinancePayoutDestinationRead(w http.ResponseWriter, r *http.Request) {
	operator, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	actorType, actorID, ok := resolveManagedPayoutDestinationActor(w, r)
	if !ok {
		return
	}
	status, body, err := s.wlt.ExecuteFinanceRead(
		r.Context(),
		"finance.payout_destinations.read",
		managedPayoutDestinationPath(actorType, actorID),
		nil,
		r.Header.Get("X-Correlation-ID"),
		operator.OperatorContextID,
	)
	writeManagedPayoutDestinationResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleFinancePayoutDestinationUpsert(w http.ResponseWriter, r *http.Request) {
	operator, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	actorType, actorID, ok := resolveManagedPayoutDestinationActor(w, r)
	if !ok {
		return
	}
	var input struct {
		BeneficiaryName           string `json:"beneficiaryName"`
		OfficialWalletProviderKey string `json:"officialWalletProviderKey"`
		DestinationReference      string `json:"destinationReference"`
		Reason                    string `json:"reason"`
		EvidenceReference         string `json:"evidenceReference"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout destination body is invalid")
		return
	}
	input.BeneficiaryName = strings.TrimSpace(input.BeneficiaryName)
	input.OfficialWalletProviderKey = strings.ToLower(strings.TrimSpace(input.OfficialWalletProviderKey))
	input.DestinationReference = strings.TrimSpace(input.DestinationReference)
	input.Reason = strings.TrimSpace(input.Reason)
	input.EvidenceReference = strings.TrimSpace(input.EvidenceReference)
	if input.BeneficiaryName == "" || input.OfficialWalletProviderKey == "" || input.DestinationReference == "" || input.Reason == "" || input.EvidenceReference == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "beneficiaryName, officialWalletProviderKey, destinationReference, reason and evidenceReference are required")
		return
	}
	body, _ := json.Marshal(input)
	status, responseBody, err := s.wlt.ExecuteFinanceWrite(
		r.Context(),
		"finance.payout_destinations.upsert",
		http.MethodPut,
		managedPayoutDestinationPath(actorType, actorID),
		body,
		r.Header.Get("X-Correlation-ID"),
		r.Header.Get("Idempotency-Key"),
		operator.OperatorContextID,
		operator.ID,
	)
	writeManagedPayoutDestinationResponse(w, status, responseBody, err)
}

func (s *protectedStoreServer) handleFinancePayoutDestinationVerify(w http.ResponseWriter, r *http.Request) {
	operator, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	actorType, actorID, ok := resolveManagedPayoutDestinationActor(w, r)
	if !ok {
		return
	}
	var input struct {
		DestinationVersion int    `json:"destinationVersion"`
		Decision           string `json:"decision"`
		Reason             string `json:"reason"`
		EvidenceReference  string `json:"evidenceReference"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "destination verification body is invalid")
		return
	}
	input.Decision = strings.ToLower(strings.TrimSpace(input.Decision))
	input.Reason = strings.TrimSpace(input.Reason)
	input.EvidenceReference = strings.TrimSpace(input.EvidenceReference)
	if input.DestinationVersion <= 0 || (input.Decision != "verified" && input.Decision != "rejected") || input.Reason == "" || input.EvidenceReference == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "destinationVersion, verified/rejected decision, reason and evidenceReference are required")
		return
	}
	body, _ := json.Marshal(input)
	if _, ok := s.requirePermission(w, r, "control-panel", "finance.payout_destinations.verify"); !ok {
		return
	}
	status, responseBody, err := s.wlt.ExecuteFinanceWrite(
		r.Context(),
		"finance.payout_destinations.verify",
		http.MethodPost,
		managedPayoutDestinationPath(actorType, actorID)+"/verify",
		body,
		r.Header.Get("X-Correlation-ID"),
		r.Header.Get("Idempotency-Key"),
		operator.OperatorContextID,
		operator.ID,
	)
	writeManagedPayoutDestinationResponse(w, status, responseBody, err)
}

func (s *protectedStoreServer) handleFinancePayoutDestinationDeactivate(w http.ResponseWriter, r *http.Request) {
	operator, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	actorType, actorID, ok := resolveManagedPayoutDestinationActor(w, r)
	if !ok {
		return
	}
	var input struct {
		Reason            string `json:"reason"`
		EvidenceReference string `json:"evidenceReference"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "destination deactivation body is invalid")
		return
	}
	input.Reason = strings.TrimSpace(input.Reason)
	input.EvidenceReference = strings.TrimSpace(input.EvidenceReference)
	if input.Reason == "" || input.EvidenceReference == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason and evidenceReference are required")
		return
	}
	body, _ := json.Marshal(input)
	if _, ok := s.requirePermission(w, r, "control-panel", "finance.payout_destinations.deactivate"); !ok {
		return
	}
	status, responseBody, err := s.wlt.ExecuteFinanceWrite(
		r.Context(),
		"finance.payout_destinations.deactivate",
		http.MethodPost,
		managedPayoutDestinationPath(actorType, actorID)+"/deactivate",
		body,
		r.Header.Get("X-Correlation-ID"),
		r.Header.Get("Idempotency-Key"),
		operator.OperatorContextID,
		operator.ID,
	)
	writeManagedPayoutDestinationResponse(w, status, responseBody, err)
}
