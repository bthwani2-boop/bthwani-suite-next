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
	s.proxyFinanceRead(w, r, "/wlt/cod-records", query, actor.OperatorContextID)
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


func (s *protectedStoreServer) handleFinanceCodReconciliationCases(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator")
	if !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/cod-reconciliation-cases", financeQuery(r, "status"), actor.OperatorContextID)
}

