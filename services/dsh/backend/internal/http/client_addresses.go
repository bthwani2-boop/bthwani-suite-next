package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

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

func observeClientAddressOperation(operation string, started time.Time, err error) {
	if isAddressServiceAreaConstraint(err) {
		err = clientaddress.ErrServiceAreaUnverified
	}
	clientaddress.RecordOperation(operation, started, err)
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
	case errors.Is(err, clientaddress.ErrMutationIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different address mutation")
	case errors.Is(err, clientaddress.ErrConflict):
		store.SendError(w, http.StatusConflict, "ADDRESS_CONFLICT", "address changed; reload and retry")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "address operation failed")
	}
}

func addressMutationContext(w http.ResponseWriter, r *http.Request) (clientaddress.MutationContext, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain between 8 and 200 characters")
		return clientaddress.MutationContext{}, false
	}
	return clientaddress.MutationContext{
		IdempotencyKey: idempotencyKey,
		CorrelationID:  strings.TrimSpace(r.Header.Get("X-Correlation-ID")),
	}, true
}

func addressExpectedVersion(w http.ResponseWriter, r *http.Request) (int, bool) {
	expectedVersion, err := strconv.Atoi(strings.TrimSpace(r.Header.Get("If-Match-Version")))
	if err != nil || expectedVersion < 1 {
		store.SendError(w, http.StatusBadRequest, "EXPECTED_VERSION_REQUIRED", "If-Match-Version must be a positive integer")
		return 0, false
	}
	return expectedVersion, true
}

func (s *protectedStoreServer) handleListClientAddresses(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	started := time.Now()
	addresses, err := clientaddress.List(r.Context(), s.db, actor.ID)
	observeClientAddressOperation("list", started, err)
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
	started := time.Now()
	var operationErr error
	defer func() { observeClientAddressOperation("create", started, operationErr) }()

	mutation, ok := addressMutationContext(w, r)
	if !ok {
		operationErr = clientaddress.ErrInvalid
		return
	}
	var input clientaddress.CreateInput
	if !decodeProtectedJSON(w, r, &input) {
		operationErr = clientaddress.ErrInvalid
		return
	}

	replay, found, err := clientaddress.FindCreateReplay(
		r.Context(),
		s.db,
		actor.ID,
		mutation.IdempotencyKey,
	)
	if err != nil {
		operationErr = err
		addressError(w, err)
		return
	}
	if found {
		store.SendJSON(w, http.StatusOK, map[string]any{"address": replay})
		return
	}
	if err := clientaddress.ValidateServiceArea(r.Context(), s.db, input); err != nil {
		operationErr = err
		addressError(w, err)
		return
	}

	address, created, err := clientaddress.Create(r.Context(), s.db, actor.ID, input, mutation)
	if err != nil {
		operationErr = err
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
	started := time.Now()
	var operationErr error
	defer func() { observeClientAddressOperation("update", started, operationErr) }()

	mutation, ok := addressMutationContext(w, r)
	if !ok {
		operationErr = clientaddress.ErrInvalid
		return
	}
	var input clientaddress.UpdateInput
	if !decodeProtectedJSON(w, r, &input) {
		operationErr = clientaddress.ErrInvalid
		return
	}
	if err := clientaddress.ValidateServiceArea(r.Context(), s.db, input.CreateInput); err != nil {
		operationErr = err
		addressError(w, err)
		return
	}
	address, err := clientaddress.UpdateIdempotent(
		r.Context(),
		s.db,
		actor.ID,
		r.PathValue("addressId"),
		input,
		mutation,
	)
	if err != nil {
		operationErr = err
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
	started := time.Now()
	var operationErr error
	defer func() { observeClientAddressOperation("delete", started, operationErr) }()

	mutation, ok := addressMutationContext(w, r)
	if !ok {
		operationErr = clientaddress.ErrInvalid
		return
	}
	expectedVersion, ok := addressExpectedVersion(w, r)
	if !ok {
		operationErr = clientaddress.ErrInvalid
		return
	}
	operationErr = clientaddress.DeleteIdempotent(
		r.Context(),
		s.db,
		actor.ID,
		r.PathValue("addressId"),
		expectedVersion,
		mutation,
	)
	if operationErr != nil {
		addressError(w, operationErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) handleSetClientDefaultAddress(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	started := time.Now()
	var operationErr error
	defer func() { observeClientAddressOperation("set_default", started, operationErr) }()

	mutation, ok := addressMutationContext(w, r)
	if !ok {
		operationErr = clientaddress.ErrInvalid
		return
	}
	expectedVersion, ok := addressExpectedVersion(w, r)
	if !ok {
		operationErr = clientaddress.ErrInvalid
		return
	}
	address, err := clientaddress.SetDefaultIdempotent(
		r.Context(),
		s.db,
		actor.ID,
		r.PathValue("addressId"),
		expectedVersion,
		mutation,
	)
	if err != nil {
		operationErr = err
		addressError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"address": address})
}
