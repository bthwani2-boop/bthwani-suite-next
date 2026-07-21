package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"dsh-api/internal/clientaddress"
	"dsh-api/internal/store"
	"github.com/lib/pq"
)

func isAddressServiceAreaConstraint(err error) bool {
	var postgresError *pq.Error
	if !errors.As(err, &postgresError) || postgresError.Code != "23514" {
		return false
	}
	switch strings.TrimSpace(postgresError.Message) {
	case "DSH_ADDRESS_COORDINATES_REQUIRED", "DSH_ADDRESS_SERVICE_AREA_UNVERIFIED":
		return true
	default:
		return false
	}
}

func addressError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, clientaddress.ErrServiceAreaUnverified), isAddressServiceAreaConstraint(err):
		store.SendError(w, http.StatusUnprocessableEntity, "ADDRESS_SERVICE_AREA_UNVERIFIED", "address coordinates must resolve to the supplied active DSH service area")
	case errors.Is(err, clientaddress.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_ADDRESS", "address input is invalid")
	case errors.Is(err, clientaddress.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "ADDRESS_NOT_FOUND", "address was not found")
	case clientaddress.IsDuplicateError(err):
		store.SendError(w, http.StatusConflict, "ADDRESS_ALREADY_EXISTS", "an identical active address already exists; update the existing address instead")
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

	replay, found, err := clientaddress.FindCreateReplay(
		r.Context(),
		s.db,
		actor.ID,
		idempotencyKey,
	)
	if err != nil {
		addressError(w, err)
		return
	}
	if found {
		store.SendJSON(w, http.StatusOK, map[string]any{"address": replay})
		return
	}
	if err := clientaddress.ValidateServiceArea(r.Context(), s.db, input); err != nil {
		addressError(w, err)
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
	if err := clientaddress.ValidateServiceArea(r.Context(), s.db, input.CreateInput); err != nil {
		addressError(w, err)
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
