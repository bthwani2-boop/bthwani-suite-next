package http

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handlePartnerFinanceCodRecords(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	query := url.Values{"partnerId": {actor.ID}}
	s.proxyFinanceRead(w, r, "/wlt/cod-records", query)
}

func (s *protectedStoreServer) requirePartnerCodRecord(w http.ResponseWriter, r *http.Request, partnerID, recordID string) bool {
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
			PartnerID string `json:"partnerId"`
		} `json:"codRecord"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil || strings.TrimSpace(envelope.CodRecord.PartnerID) == "" {
		store.SendError(w, http.StatusBadGateway, "WLT_INVALID_RESPONSE", "WLT COD partner identity is missing")
		return false
	}
	if envelope.CodRecord.PartnerID != partnerID {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "partner cannot access another partner's COD record")
		return false
	}
	return true
}

func (s *protectedStoreServer) handlePartnerRemitCod(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	recordID := strings.TrimSpace(r.PathValue("recordId"))
	if recordID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "recordId is required")
		return
	}
	var input captainCodRemitBody
	if !decodeActorFinanceJSON(w, r, &input) {
		return
	}
	input.ProofReference = strings.TrimSpace(input.ProofReference)
	input.Note = strings.TrimSpace(input.Note)
	if len(input.ProofReference) < 3 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "proofReference is required")
		return
	}
	if !s.requirePartnerCodRecord(w, r, actor.ID, recordID) {
		return
	}
	payload, err := json.Marshal(map[string]any{
		"proofReference": input.ProofReference,
		"note":           input.Note,
		"actorId":        actor.ID,
		"actorType":      "partner",
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode COD remittance evidence")
		return
	}
	status, body, err := s.wlt.FinanceWriteCodRecord(r.Context(), recordID, "remit", payload, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleFinanceCodReconciliationCases(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/cod-reconciliation-cases", financeQuery(r, "status"))
}

func (s *protectedStoreServer) handleAssignFinanceCodReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	caseID := strings.TrimSpace(r.PathValue("caseId"))
	if caseID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	var input struct {
		InvestigationNote string `json:"investigationNote"`
	}
	if !decodeActorFinanceJSON(w, r, &input) {
		return
	}
	payload, err := json.Marshal(map[string]string{
		"operatorId":       actor.ID,
		"investigationNote": strings.TrimSpace(input.InvestigationNote),
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode reconciliation assignment")
		return
	}
	status, body, err := s.wlt.FinanceWrite(
		r.Context(),
		http.MethodPost,
		"/wlt/cod-reconciliation-cases/"+url.PathEscape(caseID)+"/assign",
		payload,
		r.Header.Get("X-Correlation-ID"),
	)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleResolveFinanceCodReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	caseID := strings.TrimSpace(r.PathValue("caseId"))
	if caseID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	var input struct {
		ResolutionAction string `json:"resolutionAction"`
		ResolutionNote   string `json:"resolutionNote"`
	}
	if !decodeActorFinanceJSON(w, r, &input) {
		return
	}
	payload, err := json.Marshal(map[string]string{
		"operatorId":       actor.ID,
		"resolutionAction": strings.TrimSpace(input.ResolutionAction),
		"resolutionNote":   strings.TrimSpace(input.ResolutionNote),
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode reconciliation resolution")
		return
	}
	status, body, err := s.wlt.FinanceWrite(
		r.Context(),
		http.MethodPost,
		"/wlt/cod-reconciliation-cases/"+url.PathEscape(caseID)+"/resolve",
		payload,
		r.Header.Get("X-Correlation-ID"),
	)
	writeWltActorFinanceResponse(w, status, body, err)
}
