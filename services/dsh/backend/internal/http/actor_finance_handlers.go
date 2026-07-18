package http

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"

	"dsh-api/internal/store"
)

func writeWltActorFinanceResponse(w http.ResponseWriter, status int, body []byte, err error) {
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) requireCodOwner(w http.ResponseWriter, r *http.Request, actorID, recordID string) bool {
	status, body, err := s.wlt.FinanceReadCodRecord(r.Context(), recordID, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return false
	}
	if status < 200 || status >= 300 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write(body)
		return false
	}
	var envelope struct {
		CodRecord struct {
			CaptainID string `json:"captainId"`
		} `json:"codRecord"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil || envelope.CodRecord.CaptainID == "" {
		store.SendError(w, http.StatusBadGateway, "WLT_INVALID_RESPONSE", "WLT COD record response is invalid")
		return false
	}
	if envelope.CodRecord.CaptainID != actorID {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "captain cannot mutate another captain's COD record")
		return false
	}
	return true
}

func (s *protectedStoreServer) handleCaptainCollectCod(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	recordID := r.PathValue("recordId")
	if recordID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "recordId is required")
		return
	}
	if !s.requireCodOwner(w, r, actor.ID, recordID) {
		return
	}
	status, body, err := s.wlt.FinanceWriteCodRecord(r.Context(), recordID, "collect", r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleCaptainRemitCod(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	recordID := r.PathValue("recordId")
	if recordID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "recordId is required")
		return
	}
	if !s.requireCodOwner(w, r, actor.ID, recordID) {
		return
	}
	status, body, err := s.wlt.FinanceWriteCodRecord(r.Context(), recordID, "remit", r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleCaptainFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	query := url.Values{"captainId": {actor.ID}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/commissions", query, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleCaptainFinancePayouts(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}, "beneficiaryActorType": {"captain"}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/payout-requests", query, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

type actorPayoutRequestBody struct {
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
	IdempotencyKey   string `json:"idempotencyKey"`
}

func (s *protectedStoreServer) createActorPayout(w http.ResponseWriter, r *http.Request, actorID, actorType string) {
	var input actorPayoutRequestBody
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil || input.AmountMinorUnits <= 0 || input.Currency == "" || input.IdempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "amountMinorUnits, currency and idempotencyKey are required")
		return
	}
	payload, err := json.Marshal(map[string]any{
		"beneficiaryActorId":   actorID,
		"beneficiaryActorType": actorType,
		"amountMinorUnits":     input.AmountMinorUnits,
		"currency":             input.Currency,
		"idempotencyKey":       input.IdempotencyKey,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode payout request")
		return
	}
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/payout-requests", payload, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleCaptainCreatePayout(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	s.createActorPayout(w, r, actor.ID, "captain")
}

func (s *protectedStoreServer) handleFieldFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	s.handleFieldMeCommissions(w, r)
}

func (s *protectedStoreServer) handleFieldFinanceWallet(w http.ResponseWriter, r *http.Request) {
	s.handleFieldMeWallet(w, r)
}

func (s *protectedStoreServer) handleFieldFinancePayouts(w http.ResponseWriter, r *http.Request) {
	s.handleFieldMePayoutRequests(w, r)
}

func (s *protectedStoreServer) handleFieldCreatePayout(w http.ResponseWriter, r *http.Request) {
	s.handleSubmitFieldMePayoutRequest(w, r)
}

func (s *protectedStoreServer) handleFieldListPayoutDestinations(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	status, body, err := s.wlt.FinanceReadPayoutDestination(r.Context(), actor.ID, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) upsertFieldPayoutDestination(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 128*1024))
	if err != nil || len(body) == 0 || !json.Valid(body) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout destination body is invalid")
		return
	}
	status, responseBody, err := s.wlt.FinanceUpsertPayoutDestination(r.Context(), actor.ID, body, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, responseBody, err)
}

func (s *protectedStoreServer) handleFieldCreatePayoutDestination(w http.ResponseWriter, r *http.Request) {
	s.upsertFieldPayoutDestination(w, r)
}

func (s *protectedStoreServer) handleFieldUpdatePayoutDestination(w http.ResponseWriter, r *http.Request) {
	s.upsertFieldPayoutDestination(w, r)
}

func (s *protectedStoreServer) handleFieldDeletePayoutDestination(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	status, body, err := s.wlt.FinanceDeactivatePayoutDestination(r.Context(), actor.ID, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}
