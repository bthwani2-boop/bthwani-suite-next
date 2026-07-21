package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"dsh-api/internal/clientaddress"
	"dsh-api/internal/store"
)

func addressError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, clientaddress.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_ADDRESS", "address input is invalid")
	case errors.Is(err, clientaddress.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "ADDRESS_NOT_FOUND", "address was not found")
	case errors.Is(err, clientaddress.ErrConflict):
		store.SendError(w, http.StatusConflict, "ADDRESS_CONFLICT", "address changed; reload and retry")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "address operation failed")
	}
}

func (s *protectedStoreServer) handleListClientAddresses(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	addresses, err := clientaddress.List(r.Context(), s.db, actor.ID)
	if err != nil {
		addressError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"addresses": addresses})
}

func (s *protectedStoreServer) handleCreateClientAddress(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) < 8 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
		return
	}
	var input clientaddress.CreateInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	address, created, err := clientaddress.Create(r.Context(), s.db, actor.ID, input, clientaddress.MutationContext{
		IdempotencyKey: idempotencyKey,
		CorrelationID:  strings.TrimSpace(r.Header.Get("X-Correlation-ID")),
	})
	if err != nil {
		addressError(w, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	store.SendJSON(w, status, map[string]any{"address": address})
}

func (s *protectedStoreServer) handleUpdateClientAddress(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var input clientaddress.UpdateInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	address, err := clientaddress.Update(
		r.Context(), s.db, actor.ID, r.PathValue("addressId"), input,
		strings.TrimSpace(r.Header.Get("X-Correlation-ID")),
	)
	if err != nil {
		addressError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"address": address})
}

func (s *protectedStoreServer) handleDeleteClientAddress(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	expectedVersion, err := strconv.Atoi(strings.TrimSpace(r.Header.Get("If-Match-Version")))
	if err != nil || expectedVersion < 1 {
		store.SendError(w, http.StatusBadRequest, "EXPECTED_VERSION_REQUIRED", "If-Match-Version must be a positive integer")
		return
	}
	err = clientaddress.Delete(
		r.Context(), s.db, actor.ID, r.PathValue("addressId"), expectedVersion,
		strings.TrimSpace(r.Header.Get("X-Correlation-ID")),
	)
	if err != nil {
		addressError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) handleSetClientDefaultAddress(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	if len(strings.TrimSpace(r.Header.Get("Idempotency-Key"))) < 8 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
		return
	}
	addressID := r.PathValue("addressId")
	addresses, err := clientaddress.List(r.Context(), s.db, actor.ID)
	if err != nil {
		addressError(w, err)
		return
	}
	for index := range addresses {
		if addresses[index].ID == addressID && addresses[index].IsDefault {
			store.SendJSON(w, http.StatusOK, map[string]any{"address": addresses[index]})
			return
		}
	}
	address, err := clientaddress.SetDefault(
		r.Context(), s.db, actor.ID, addressID,
		strings.TrimSpace(r.Header.Get("X-Correlation-ID")),
	)
	if err != nil {
		addressError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"address": address})
}
