package http

import (
	"net/http"
)

func (s *protectedStoreServer) handleFieldMeWallet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	// Mock implementation for now, in a real implementation we would call WLT
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"actorId":"` + actor.ID + `","actorType":"field","status":"active","currency":"YER","availableBalanceMinorUnits":0,"pendingBalanceMinorUnits":0,"heldBalanceMinorUnits":0,"earnedTotalMinorUnits":0,"settledTotalMinorUnits":0,"paidTotalMinorUnits":0,"lastLedgerEntryAt":null,"updatedAt":null}`))
}

func (s *protectedStoreServer) handleFieldMeCommissions(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`[]`))
}

func (s *protectedStoreServer) handleFieldMeLedgerEntries(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`[]`))
}

func (s *protectedStoreServer) handleFieldMePayoutRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`[]`))
}

func (s *protectedStoreServer) handleSubmitFieldMePayoutRequest(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"pending"}`))
}
