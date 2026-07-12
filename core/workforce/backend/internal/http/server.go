package http

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
	"workforce-api/internal/workforce"
)

type server struct {
	db      *sql.DB
	service *workforce.Service
	repo    *workforce.Repository
	auth    *auth.Client
}

func NewRouter(db *sql.DB, service *workforce.Service, repo *workforce.Repository, authClient *auth.Client) http.Handler {
	s := &server{db: db, service: service, repo: repo, auth: authClient}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /workforce/health", s.health)
	mux.HandleFunc("GET /workforce/readiness", s.readiness)

	mux.HandleFunc("POST /workforce/field-agents", s.operatorOnly("provider:create", s.createFieldAgent))
	mux.HandleFunc("GET /workforce/field-agents", s.operatorOnly("provider:read", s.listFieldAgents))
	mux.HandleFunc("GET /workforce/field-agents/{actorId}", s.operatorOnly("provider:read", s.getFieldAgent))
	mux.HandleFunc("PATCH /workforce/field-agents/{actorId}", s.operatorOnly("provider:update", s.updateFieldAgent))
	mux.HandleFunc("POST /workforce/field-agents/{actorId}/suspend", s.operatorOnly("provider:suspend", s.suspendFieldAgent))
	mux.HandleFunc("POST /workforce/field-agents/{actorId}/reactivate", s.operatorOnly("provider:reactivate", s.reactivateFieldAgent))
	mux.HandleFunc("POST /workforce/field-agents/{actorId}/activation-codes", s.operatorOnly("provider.activation:issue", s.issueActivation))
	mux.HandleFunc("DELETE /workforce/field-agents/{actorId}/activation-codes", s.operatorOnly("provider.activation:issue", s.revokeActivation))

	mux.HandleFunc("POST /workforce/captains", s.operatorOnly("provider:create", s.createCaptain))
	mux.HandleFunc("GET /workforce/captains", s.operatorOnly("provider:read", s.listCaptains))
	mux.HandleFunc("GET /workforce/captains/{actorId}", s.operatorOnly("provider:read", s.getCaptain))
	mux.HandleFunc("PATCH /workforce/captains/{actorId}", s.operatorOnly("provider:update", s.updateCaptain))
	mux.HandleFunc("POST /workforce/captains/{actorId}/suspend", s.operatorOnly("provider:suspend", s.suspendFieldAgent))
	mux.HandleFunc("POST /workforce/captains/{actorId}/reactivate", s.operatorOnly("provider:reactivate", s.reactivateFieldAgent))
	mux.HandleFunc("POST /workforce/captains/{actorId}/activation-codes", s.operatorOnly("provider.activation:issue", s.issueActivation))
	mux.HandleFunc("DELETE /workforce/captains/{actorId}/activation-codes", s.operatorOnly("provider.activation:issue", s.revokeActivation))

	mux.HandleFunc("GET /workforce/me", s.providerSelf("provider:read", s.me))
	mux.HandleFunc("PATCH /workforce/me", s.providerSelf("provider:update", s.updateMe))

	mux.HandleFunc("GET /workforce/reference/cities", s.anyAuthenticated(s.listCities))
	mux.HandleFunc("POST /workforce/reference/cities", s.operatorOnly("reference:manage", s.createCity))
	mux.HandleFunc("PATCH /workforce/reference/cities/{code}", s.operatorOnly("reference:manage", s.updateCity))
	mux.HandleFunc("GET /workforce/reference/shifts", s.anyAuthenticated(s.listShifts))
	mux.HandleFunc("POST /workforce/reference/shifts", s.operatorOnly("reference:manage", s.createShift))
	mux.HandleFunc("PATCH /workforce/reference/shifts/{code}", s.operatorOnly("reference:manage", s.updateShift))
	return mux
}

// allowedCorsOrigins mirrors the identity service convention.
func allowedCorsOrigins() map[string]bool {
	raw := strings.TrimSpace(os.Getenv("WORKFORCE_CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		return map[string]bool{"http://localhost:13000": true}
	}
	origins := map[string]bool{}
	for _, origin := range strings.Split(raw, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			origins[origin] = true
		}
	}
	return origins
}

func CorsMiddleware(next http.Handler) http.Handler {
	allowed := allowedCorsOrigins()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Service", "core-workforce")
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Correlation-ID")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	sendJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "core-workforce"})
}

func (s *server) readiness(w http.ResponseWriter, r *http.Request) {
	if err := s.db.PingContext(r.Context()); err != nil {
		sendError(w, http.StatusServiceUnavailable, "WORKFORCE_NOT_READY", "workforce database is unavailable")
		return
	}
	sendJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "core-workforce"})
}

// ---- auth guards ----

type guardedHandler func(w http.ResponseWriter, r *http.Request, identity auth.Identity)

func (s *server) operatorOnly(action string, next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		if !identity.HasPermission("workforce", action, "all") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "workforce permission is required")
			return
		}
		next(w, r, identity)
	})
}

func (s *server) providerSelf(action string, next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		if !identity.HasPermission("workforce", action, "own") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "own provider permission is required")
			return
		}
		next(w, r, identity)
	})
}

func (s *server) anyAuthenticated(next guardedHandler) http.HandlerFunc {
	return s.withIdentity(next)
}

func (s *server) withIdentity(next guardedHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identity, err := s.auth.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			if errors.Is(err, auth.ErrIdentityUnavailable) {
				sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
				return
			}
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
			return
		}
		next(w, r, identity)
	}
}

// ---- field agents ----

func (s *server) createFieldAgent(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.CreateFieldAgentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
		return
	}
	person, replayed, err := s.service.CreateFieldAgent(r.Context(), operatorOf(identity), input,
		idempotencyKey, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	sendJSON(w, status, person)
}

func (s *server) listFieldAgents(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	query := r.URL.Query()
	limit, _ := strconv.Atoi(query.Get("limit"))
	offset, _ := strconv.Atoi(query.Get("offset"))
	people, err := s.repo.ListPeople(r.Context(), workforce.ListFilter{
		Status:       strings.TrimSpace(query.Get("status")),
		CityCode:     strings.TrimSpace(query.Get("city")),
		Query:        strings.TrimSpace(query.Get("q")),
		ProviderKind: "field",
		Limit:        limit,
		Offset:       offset,
	})
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"fieldAgents": people})
}

func (s *server) getFieldAgent(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	detail, err := s.service.FieldAgentByID(r.Context(), r.PathValue("actorId"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, detail)
}

func (s *server) updateFieldAgent(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.UpdateFieldAgentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	person, err := s.service.UpdateFieldAgent(r.Context(), operatorOf(identity),
		r.PathValue("actorId"), input, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func (s *server) suspendFieldAgent(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	person, err := s.service.Suspend(r.Context(), operatorOf(identity),
		r.PathValue("actorId"), input.ExpectedVersion, input.Reason, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func (s *server) reactivateFieldAgent(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	person, err := s.service.Reactivate(r.Context(), operatorOf(identity),
		r.PathValue("actorId"), input.ExpectedVersion, input.Reason, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func (s *server) issueActivation(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input struct {
		ExpectedVersion int `json:"expectedVersion"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	code, err := s.service.IssueActivation(r.Context(), operatorOf(identity),
		r.PathValue("actorId"), input.ExpectedVersion,
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, code)
}

func (s *server) revokeActivation(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	if err := s.service.RevokeActivation(r.Context(), operatorOf(identity),
		r.PathValue("actorId"), r.Header.Get("X-Correlation-ID")); err != nil {
		writeWorkforceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- captains ----

func (s *server) createCaptain(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.CreateCaptainInput
	if !decodeJSON(w, r, &input) {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
		return
	}
	person, replayed, err := s.service.CreateCaptain(r.Context(), operatorOf(identity), input,
		idempotencyKey, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	sendJSON(w, status, person)
}

func (s *server) listCaptains(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	query := r.URL.Query()
	limit, _ := strconv.Atoi(query.Get("limit"))
	offset, _ := strconv.Atoi(query.Get("offset"))
	people, err := s.repo.ListCaptains(r.Context(), workforce.ListFilter{
		Status:   strings.TrimSpace(query.Get("status")),
		CityCode: strings.TrimSpace(query.Get("city")),
		Query:    strings.TrimSpace(query.Get("q")),
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"captains": people})
}

func (s *server) getCaptain(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	detail, err := s.service.CaptainByID(r.Context(), r.PathValue("actorId"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, detail)
}

func (s *server) updateCaptain(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.UpdateCaptainInput
	if !decodeJSON(w, r, &input) {
		return
	}
	person, err := s.service.UpdateCaptain(r.Context(), operatorOf(identity),
		r.PathValue("actorId"), input, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

// ---- self ----

func (s *server) me(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	view, err := s.service.Me(r.Context(), identity.Subject)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, view)
}

func (s *server) updateMe(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.UpdateSelfInput
	if !decodeJSON(w, r, &input) {
		return
	}
	view, err := s.service.UpdateMe(r.Context(), identity.Subject, input, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, view)
}

// ---- reference data ----

func (s *server) listCities(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	cities, err := s.repo.ListCities(r.Context(), identity.HasRole("operator") && r.URL.Query().Get("includeInactive") == "true")
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"cities": cities})
}

func (s *server) createCity(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	var city workforce.City
	if !decodeJSON(w, r, &city) {
		return
	}
	if strings.TrimSpace(city.Code) == "" || strings.TrimSpace(city.NameAr) == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "code and nameAr are required")
		return
	}
	city.Active = true
	if err := s.repo.UpsertCity(r.Context(), city, true); err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, city)
}

func (s *server) updateCity(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	var city workforce.City
	if !decodeJSON(w, r, &city) {
		return
	}
	city.Code = r.PathValue("code")
	if err := s.repo.UpsertCity(r.Context(), city, false); err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, city)
}

func (s *server) listShifts(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	shifts, err := s.repo.ListShifts(r.Context(), identity.HasRole("operator") && r.URL.Query().Get("includeInactive") == "true")
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"shifts": shifts})
}

func (s *server) createShift(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	var shift workforce.Shift
	if !decodeJSON(w, r, &shift) {
		return
	}
	if strings.TrimSpace(shift.Code) == "" || strings.TrimSpace(shift.NameAr) == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "code and nameAr are required")
		return
	}
	shift.Active = true
	if err := s.repo.UpsertShift(r.Context(), shift, true); err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, shift)
}

func (s *server) updateShift(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	var shift workforce.Shift
	if !decodeJSON(w, r, &shift) {
		return
	}
	shift.Code = r.PathValue("code")
	if err := s.repo.UpsertShift(r.Context(), shift, false); err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, shift)
}

// ---- plumbing ----

func operatorOf(identity auth.Identity) workforce.Operator {
	role := "operator"
	if len(identity.Roles) > 0 {
		role = identity.Roles[0]
	}
	return workforce.Operator{ActorID: identity.Subject, Role: role}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

func sendJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func sendError(w http.ResponseWriter, status int, code, message string) {
	sendJSON(w, status, workforce.ApiError{Code: code, Message: message})
}

func writeWorkforceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, workforce.ErrNotFound):
		sendError(w, http.StatusNotFound, "PROFILE_NOT_PROVISIONED", "no provider profile exists for this actor")
	case errors.Is(err, workforce.ErrVersionConflict):
		sendError(w, http.StatusConflict, "VERSION_CONFLICT", "profile was modified by someone else; reload and retry")
	case errors.Is(err, workforce.ErrDuplicateProviderCode):
		sendError(w, http.StatusConflict, "DUPLICATE_PROVIDER_CODE", "provider code is already used")
	case errors.Is(err, workforce.ErrInvalidReference):
		sendError(w, http.StatusUnprocessableEntity, "INVALID_REFERENCE_CODE", "city or shift code is unknown or inactive")
	case errors.Is(err, workforce.ErrIdempotencyConflict):
		sendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different request")
	case errors.Is(err, workforce.ErrReferenceExists):
		sendError(w, http.StatusConflict, "REFERENCE_EXISTS", "reference code already exists")
	case errors.Is(err, workforce.ErrReferenceInUse):
		sendError(w, http.StatusConflict, "REFERENCE_IN_USE", "reference code is in use")
	case errors.Is(err, workforce.ErrProfileIncomplete):
		sendError(w, http.StatusUnprocessableEntity, "PROFILE_INCOMPLETE", "sovereign profile fields are incomplete")
	case errors.Is(err, workforce.ErrSuspended):
		sendError(w, http.StatusConflict, "ENGAGEMENT_SUSPENDED", "provider engagement is suspended")
	case errors.Is(err, workforce.ErrStatusNotIssuable):
		sendError(w, http.StatusConflict, "STATUS_NOT_ALLOWED", "engagement status does not allow this action")
	case errors.Is(err, workforce.ErrInvalidInput):
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "input validation failed")
	case errors.Is(err, identityclient.ErrPhoneAlreadyBound):
		sendError(w, http.StatusConflict, "DUPLICATE_PHONE", "phone is already bound to another actor")
	case errors.Is(err, identityclient.ErrUsernameTaken):
		sendError(w, http.StatusConflict, "DUPLICATE_PROVIDER_CODE", "provider code is already used as a username")
	case errors.Is(err, identityclient.ErrActorNotFound):
		sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "identity actor was not found")
	case errors.Is(err, identityclient.ErrRateLimited):
		sendError(w, http.StatusTooManyRequests, "ACTIVATION_RATE_LIMITED", "activation can be requested again later")
	case errors.Is(err, identityclient.ErrInvalidActor):
		sendError(w, http.StatusUnprocessableEntity, "INVALID_ACTOR_INPUT", "identity rejected the actor input")
	case errors.Is(err, identityclient.ErrUnavailable):
		sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
	default:
		sendError(w, http.StatusInternalServerError, "WORKFORCE_INTERNAL_ERROR", "workforce request failed")
	}
}
