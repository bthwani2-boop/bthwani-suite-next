package http

import (
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"

	"identity-api/internal/identity"
)

type server struct {
	repository *identity.Repository
}

func NewRouter(repository *identity.Repository) http.Handler {
	s := &server{repository: repository}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /auth/login", s.login)
	mux.HandleFunc("POST /auth/activate", s.activate)
	mux.HandleFunc("POST /auth/refresh", s.refresh)
	mux.HandleFunc("POST /auth/logout", s.logout)
	mux.HandleFunc("GET /auth/session", s.session)
	mux.HandleFunc("GET /auth/sessions", s.listSessions)
	mux.HandleFunc("DELETE /auth/sessions/{sessionId}", s.revokeSession)
	mux.HandleFunc("DELETE /auth/account", s.deleteAccount)
	mux.HandleFunc("POST /auth/password/change", s.changePassword)
	mux.HandleFunc("POST /auth/introspect", s.introspect)
	mux.HandleFunc("POST /internal/actors/provision", s.serviceOnly(s.provisionActor))
	mux.HandleFunc("GET /internal/actors/search", s.serviceOnly(s.internalActorSearch))
	mux.HandleFunc("DELETE /internal/actors/{actorId}", s.serviceOnly(s.internalActorDeprovision))
	mux.HandleFunc("GET /internal/actors/{actorId}", s.serviceOnly(s.internalActorGet))
	mux.HandleFunc("POST /internal/actors/{actorId}/deactivate", s.serviceOnly(s.internalActorDeactivate))
	mux.HandleFunc("POST /internal/actors/{actorId}/reactivate", s.serviceOnly(s.internalActorReactivate))
	mux.HandleFunc("POST /internal/actors/{actorId}/activations", s.serviceOnly(s.internalActorIssueActivation))
	mux.HandleFunc("POST /internal/actors/{actorId}/activations/reissue", s.serviceOnly(s.internalActorIssueActivation))
	mux.HandleFunc("GET /internal/actors/{actorId}/activations/latest", s.serviceOnly(s.internalActorLatestActivation))
	mux.HandleFunc("GET /internal/actors/{actorId}/sessions", s.serviceOnly(s.internalActorListSessions))
	mux.HandleFunc("GET /internal/dsh/actors/{actorId}/sessions", s.dshServiceOnly(s.internalActorListSessions))
	mux.HandleFunc("DELETE /internal/actors/{actorId}/sessions/{sessionId}", s.serviceOnly(s.internalActorRevokeSession))
	mux.HandleFunc("DELETE /internal/actors/{actorId}/sessions", s.serviceOnly(s.internalActorRevokeAllSessions))
	mux.HandleFunc("POST /internal/actors/{actorId}/activations/revoke", s.serviceOnly(s.internalActorRevokeActivations))
	mux.HandleFunc("GET /internal/permissions/resolve", s.dshServiceOnly(s.internalPermissionsResolve))
	mux.HandleFunc("GET /internal/rbac/roles", s.dshServiceOnly(s.internalRbacListRoles))
	mux.HandleFunc("GET /internal/rbac/staff", s.dshServiceOnly(s.internalRbacListStaff))
	mux.HandleFunc("GET /internal/rbac/actors/{actorId}/roles", s.dshServiceOnly(s.internalRbacListActorRoles))
	mux.HandleFunc("POST /internal/rbac/actors/{actorId}/roles", s.dshServiceOnly(s.internalRbacGrantRole))
	mux.HandleFunc("DELETE /internal/rbac/actors/{actorId}/roles", s.dshServiceOnly(s.internalRbacRevokeRole))
	mux.HandleFunc("POST /internal/support-sessions", s.dshServiceOnly(s.internalSupportSessionsIssue))
	mux.HandleFunc("POST /internal/support-sessions/resolve", s.dshServiceOnly(s.internalSupportSessionsResolve))
	mux.HandleFunc("POST /internal/support-sessions/{requestId}/revoke", s.dshServiceOnly(s.internalSupportSessionsRevoke))

	return mux
}

func (s *server) serviceOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != "workforce" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
			return
		}
		expected := strings.TrimSpace(os.Getenv("IDENTITY_WORKFORCE_SERVICE_TOKEN"))
		if expected == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "internal API is not configured")
			return
		}
		token, ok := bearerToken(r)
		if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expected)) != 1 {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "service token is required")
			return
		}
		next(w, r)
	}
}

// dshServiceOnly guards internal endpoints that are exclusively called by the
// DSH backend. It validates X-Service-Caller: dsh and the IDENTITY_DSH_SERVICE_TOKEN
// bearer credential. No operator-context binding is enforced here; callers must
// supply their own actorId query parameter as the resolution scope.
func (s *server) dshServiceOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != "dsh" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
			return
		}
		expected := strings.TrimSpace(os.Getenv("IDENTITY_DSH_SERVICE_TOKEN"))
		if expected == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "DSH internal API is not configured")
			return
		}
		token, ok := bearerToken(r)
		if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expected)) != 1 {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "DSH service token is required")
			return
		}
		next(w, r)
	}
}

func allowedCorsOrigins() map[string]bool {
	raw := strings.TrimSpace(os.Getenv("IDENTITY_CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		return map[string]bool{"http://localhost:13000": true}
	}
	origins := map[string]bool{}
	for _, origin := range strings.Split(raw, ",") {
		if normalized := strings.TrimSpace(origin); normalized != "" {
			origins[normalized] = true
		}
	}
	return origins
}

func CorsMiddleware(next http.Handler) http.Handler {
	allowed := allowedCorsOrigins()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Service", "core-identity")
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Fingerprint, Idempotency-Key, X-Correlation-ID")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) login(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Username          string `json:"username"`
		Password          string `json:"password"`
		DeviceFingerprint string `json:"deviceFingerprint"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	pair, err := s.repository.Login(r.Context(), request.Username, request.Password, request.DeviceFingerprint, clientIP(r))
	if err != nil {
		if err == identity.ErrLoginRateLimited {
			sendError(w, http.StatusTooManyRequests, "LOGIN_RATE_LIMITED", "too many failed attempts; try again later")
			return
		}
		if err == identity.ErrActorDeactivated {
			sendError(w, http.StatusForbidden, "ACTOR_DEACTIVATED", "actor is deactivated")
			return
		}
		if err == identity.ErrForbidden {
			sendError(w, http.StatusForbidden, "LOGIN_SURFACE_FORBIDDEN", "actor has no unambiguous permitted login surface")
			return
		}
		sendError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid username or password")
		return
	}
	sendJSON(w, http.StatusOK, tokenResponse(pair))
}

func (s *server) activate(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ActorType         string `json:"actorType"`
		Phone             string `json:"phone"`
		Code              string `json:"code"`
		DeviceFingerprint string `json:"deviceFingerprint"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	pair, err := s.repository.ConsumeActivation(r.Context(), identity.ConsumeActivationInput{
		ActorType: request.ActorType, Phone: request.Phone, Code: request.Code,
		DeviceFingerprint: request.DeviceFingerprint,
	})
	if err != nil {
		writeActivationError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, tokenResponse(pair))
}

func (s *server) refresh(w http.ResponseWriter, r *http.Request) {
	var request struct {
		RefreshToken string `json:"refreshToken"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	pair, err := s.repository.Refresh(r.Context(), request.RefreshToken)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "refresh token is invalid or expired")
		return
	}
	sendJSON(w, http.StatusOK, tokenResponse(pair))
}

func (s *server) logout(w http.ResponseWriter, r *http.Request) {
	token, ok := bearerToken(r)
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer token is required")
		return
	}
	if err := s.repository.Logout(r.Context(), token); err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not revoke session")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) session(w http.ResponseWriter, r *http.Request) {
	resolved, ok := s.resolveSession(w, r)
	if !ok {
		return
	}
	sendJSON(w, http.StatusOK, resolved)
}

func (s *server) introspect(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Token string `json:"token"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	resolved, err := s.repository.ResolveAccessToken(r.Context(), request.Token)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "token is invalid or expired")
		return
	}
	sendJSON(w, http.StatusOK, resolved)
}

func (s *server) provisionActor(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ActorID           string `json:"actorId"`
		Username          string `json:"username"`
		PhoneE164         string `json:"phoneE164"`
		Role              string `json:"role"`
		OperatorContextID string `json:"operatorContextId"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	operatorContextID, ok := trustedOperatorContext(r)
	if !ok {
		sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "trusted operator context is unavailable")
		return
	}
	view, err := s.repository.ProvisionActorGoverned(r.Context(), identity.ProvisionActorInput{
		ActorID: request.ActorID, Username: request.Username, PhoneE164: request.PhoneE164,
		Role: request.Role, OperatorContextID: operatorContextID,
	})
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, view)
}

func (s *server) internalActorGet(w http.ResponseWriter, r *http.Request) {
	operatorContextID, ok := trustedOperatorContext(r)
	if !ok {
		sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "trusted operator context is unavailable")
		return
	}
	view, err := s.repository.ActorAdminByIDGoverned(r.Context(), operatorContextID, r.PathValue("actorId"))
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, view)
}

func (s *server) internalActorSearch(w http.ResponseWriter, r *http.Request) {
	operatorContextID, ok := trustedOperatorContext(r)
	if !ok {
		sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "trusted operator context is unavailable")
		return
	}
	query := r.URL.Query()
	limit := 25
	cursor := ""
	if raw := strings.TrimSpace(query.Get("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			writeInternalActorError(w, identity.ErrInvalidActorQuery)
			return
		}
		limit = parsed
	}
	if raw := strings.TrimSpace(query.Get("cursor")); raw != "" {
		cursor = raw
	}
	page, err := s.repository.SearchActorsGoverned(r.Context(), identity.ActorSearchInput{
		OperatorContextID: operatorContextID,
		Role:              strings.TrimSpace(query.Get("role")),
		Query:             strings.TrimSpace(query.Get("q")),
		Status:            identity.ActorLifecycleStatus(strings.TrimSpace(query.Get("status"))),
		Limit:             limit,
		Cursor:            cursor,
	})
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, page)
}

func (s *server) internalActorDeactivate(w http.ResponseWriter, r *http.Request) {
	var request struct {
		RequestedByActorID string `json:"requestedByActorId"`
		Reason             string `json:"reason"`
		CorrelationID      string `json:"correlationId"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	if !validLifecycleRequest(request.RequestedByActorID, request.Reason, request.CorrelationID) {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "requestedByActorId, reason, and correlationId are required")
		return
	}
	if err := s.repository.SuspendActor(r.Context(), r.PathValue("actorId"), request.RequestedByActorID, request.Reason, request.CorrelationID); err != nil {
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) internalActorDeprovision(w http.ResponseWriter, r *http.Request) {
	operatorContextID, ok := trustedOperatorContext(r)
	if !ok {
		sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "trusted operator context is unavailable")
		return
	}
	if err := s.repository.DeprovisionActor(r.Context(), r.PathValue("actorId"), operatorContextID); err != nil {
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) internalActorReactivate(w http.ResponseWriter, r *http.Request) {
	var request struct {
		RequestedByActorID string `json:"requestedByActorId"`
		Reason             string `json:"reason"`
		CorrelationID      string `json:"correlationId"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	if !validLifecycleRequest(request.RequestedByActorID, request.Reason, request.CorrelationID) {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "requestedByActorId, reason, and correlationId are required")
		return
	}
	if err := s.repository.ReactivateActor(r.Context(), r.PathValue("actorId"), request.RequestedByActorID, request.Reason, request.CorrelationID); err != nil {
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func validLifecycleRequest(requestedByActorID, reason, correlationID string) bool {
	requestedByActorID = strings.TrimSpace(requestedByActorID)
	reason = strings.TrimSpace(reason)
	correlationID = strings.TrimSpace(correlationID)
	return requestedByActorID != "" && reason != "" && len(reason) <= 500 && correlationID != "" && len(correlationID) <= 128
}

func (s *server) internalActorIssueActivation(w http.ResponseWriter, r *http.Request) {
	var request struct {
		IssuedByActorID   string `json:"issuedByActorId"`
		ExpectedActorType string `json:"expectedActorType"`
		ExpectedSurface   string `json:"expectedSurface"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	if strings.TrimSpace(request.IssuedByActorID) == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "issuedByActorId is required")
		return
	}
	result, err := s.repository.IssueActivationForActor(
		r.Context(), r.PathValue("actorId"), identity.IssueActivationForActorInput{
			IssuedByActorID:   request.IssuedByActorID,
			ExpectedActorType: request.ExpectedActorType,
			ExpectedSurface:   request.ExpectedSurface,
		}, r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"),
	)
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, result)
}

func (s *server) internalActorLatestActivation(w http.ResponseWriter, r *http.Request) {
	meta, err := s.repository.LatestActivationForActor(r.Context(), r.PathValue("actorId"))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			sendJSON(w, http.StatusOK, nil)
			return
		}
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, meta)
}

func (s *server) internalActorRevokeActivations(w http.ResponseWriter, r *http.Request) {
	if err := s.repository.RevokeActivationChallenges(r.Context(), r.PathValue("actorId")); err != nil {
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) internalActorListSessions(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_INPUT", "actorId is required")
		return
	}
	sessions, err := s.repository.ListSessions(r.Context(), actorID)
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	if sessions == nil {
		sessions = []identity.SessionInfo{}
	}
	sendJSON(w, http.StatusOK, sessions)
}

func (s *server) internalActorRevokeSession(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	sessionID := r.PathValue("sessionId")
	if actorID == "" || sessionID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_INPUT", "actorId and sessionId are required")
		return
	}
	err := s.repository.RevokeSession(r.Context(), actorID, sessionID)
	if err != nil {
		if err.Error() == "session not found" {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "session not found")
			return
		}
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) internalActorRevokeAllSessions(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_INPUT", "actorId is required")
		return
	}
	err := s.repository.RevokeAllSessions(r.Context(), actorID)
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) listSessions(w http.ResponseWriter, r *http.Request) {
	resolved, ok := s.resolveSession(w, r)
	if !ok {
		return
	}
	sessions, err := s.repository.ListSessions(r.Context(), resolved.Subject)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not list sessions")
		return
	}
	if sessions == nil {
		sessions = []identity.SessionInfo{}
	}
	sendJSON(w, http.StatusOK, sessions)
}

func (s *server) revokeSession(w http.ResponseWriter, r *http.Request) {
	resolved, ok := s.resolveSession(w, r)
	if !ok {
		return
	}
	if err := s.repository.RevokeSession(r.Context(), resolved.Subject, r.PathValue("sessionId")); err != nil {
		if err.Error() == "session not found" {
			sendError(w, http.StatusNotFound, "SESSION_NOT_FOUND", "session was not found")
			return
		}
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not revoke session")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) deleteAccount(w http.ResponseWriter, r *http.Request) {
	resolved, ok := s.resolveSession(w, r)
	if !ok {
		return
	}
	if err := s.repository.DeleteAccount(r.Context(), resolved.Subject); err != nil {
		if err == identity.ErrActorNotFound {
			sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "actor was not found")
			return
		}
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not delete account")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) changePassword(w http.ResponseWriter, r *http.Request) {
	resolved, ok := s.resolveSession(w, r)
	if !ok {
		return
	}
	var request struct {
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	if err := s.repository.ChangePassword(r.Context(), resolved.Subject, request.Password); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_PASSWORD", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) resolveSession(w http.ResponseWriter, r *http.Request) (identity.ActorIdentity, bool) {
	token, ok := bearerToken(r)
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer token is required")
		return identity.ActorIdentity{}, false
	}
	resolved, err := s.repository.ResolveAccessToken(r.Context(), token)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
		return identity.ActorIdentity{}, false
	}
	return resolved, true
}

func writeInternalActorError(w http.ResponseWriter, err error) {
	switch err {
	case identity.ErrActorNotFound:
		sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "actor was not found")
	case identity.ErrPhoneAlreadyBound:
		sendError(w, http.StatusConflict, "PHONE_ALREADY_BOUND", "phone is already bound to another actor")
	case identity.ErrUsernameTaken:
		sendError(w, http.StatusConflict, "USERNAME_TAKEN", "username is already taken")
	case identity.ErrProvisionConflict:
		sendError(w, http.StatusConflict, "ACTOR_PROVISION_CONFLICT", "provisioning input conflicts with the existing actor")
	case identity.ErrForbidden:
		sendError(w, http.StatusForbidden, "FORBIDDEN", "actor operation is forbidden")
	case identity.ErrActorAlreadyDeactivated, identity.ErrActorAlreadyActive, identity.ErrInvalidActorTransition:
		sendError(w, http.StatusConflict, "ACTOR_STATE_CONFLICT", "actor lifecycle transition conflicts with current state")
	case identity.ErrInvalidActorQuery:
		sendError(w, http.StatusBadRequest, "INVALID_ACTOR_QUERY", "actor query is invalid")
	case identity.ErrActivationRateLimited:
		sendError(w, http.StatusTooManyRequests, "ACTIVATION_RATE_LIMITED", "activation can be requested again later")
	case identity.ErrActivationUnavailable:
		sendError(w, http.StatusServiceUnavailable, "ACTIVATION_UNAVAILABLE", "activation is not configured")
	case identity.ErrInvalidActivation:
		sendError(w, http.StatusUnprocessableEntity, "INVALID_ACTOR_INPUT", "actor input is invalid")
	default:
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
	}
}

func tokenResponse(pair identity.TokenPair) map[string]any {
	return map[string]any{
		"accessToken":  pair.AccessToken,
		"refreshToken": pair.RefreshToken,
		"tokenType":    "Bearer",
		"expiresIn":    900,
		"identity":     pair.Identity,
	}
}

func bearerToken(r *http.Request) (string, bool) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(header, "Bearer ") {
		return "", false
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	return token, token != ""
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		if first, _, found := strings.Cut(forwarded, ","); found {
			return strings.TrimSpace(first)
		}
		return forwarded
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
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
	sendJSON(w, status, identity.ApiError{Code: code, Message: message})
}

func writeActivationError(w http.ResponseWriter, err error) {
	switch err {
	case identity.ErrForbidden:
		sendError(w, http.StatusForbidden, "FORBIDDEN", "activation is not allowed")
	case identity.ErrActivationRateLimited:
		sendError(w, http.StatusTooManyRequests, "ACTIVATION_RATE_LIMITED", "activation can be requested again later")
	case identity.ErrActivationUnavailable:
		sendError(w, http.StatusServiceUnavailable, "ACTIVATION_UNAVAILABLE", "activation is not configured")
	case identity.ErrActivationTargetAbsent:
		sendError(w, http.StatusNotFound, "ACTIVATION_TARGET_NOT_FOUND", "activation target was not found")
	case identity.ErrInvalidActivation:
		sendError(w, http.StatusUnauthorized, "INVALID_ACTIVATION", "activation code is invalid or expired")
	default:
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
	}
}

func (s *server) internalPermissionsResolve(w http.ResponseWriter, r *http.Request) {
	actorID := r.URL.Query().Get("actorId")
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "BAD_REQUEST", "actorId query parameter is required")
		return
	}

	permissions, err := s.repository.Enforcer.GetActorPermissions(r.Context(), actorID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not resolve permissions")
		return
	}

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"actorId":     actorID,
		"permissions": permissions,
	})
}

// internalRbacListRoles returns every durable role definition. Identity is
// the sole owner of this table; DSH must read it here rather than maintain
// its own copy.
func (s *server) internalRbacListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := s.repository.Enforcer.ListRoles(r.Context())
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not list roles")
		return
	}
	if roles == nil {
		roles = []identity.RbacRole{}
	}
	sendJSON(w, http.StatusOK, map[string]interface{}{"roles": roles})
}

// internalRbacListStaff returns every actor holding at least one effective
// assignment to an active role. This is the canonical active-staff projection;
// durable assignments to inactive roles remain available from the actor-role
// assignment readback.
func (s *server) internalRbacListStaff(w http.ResponseWriter, r *http.Request) {
	staff, err := s.repository.Enforcer.ListStaffActors(r.Context())
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not list staff")
		return
	}
	if staff == nil {
		staff = []identity.StaffActor{}
	}
	sendJSON(w, http.StatusOK, map[string]interface{}{"staff": staff})
}

// internalRbacListActorRoles returns durable actor-role membership without
// filtering inactive roles. It is read-only and therefore requires neither an
// idempotency key nor a canonical mutation intent.
func (s *server) internalRbacListActorRoles(w http.ResponseWriter, r *http.Request) {
	assignments, err := s.repository.Enforcer.ListActorRoleAssignments(r.Context(), r.PathValue("actorId"))
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not list actor role assignments")
		return
	}
	sendJSON(w, http.StatusOK, map[string]interface{}{"assignments": assignments})
}

// internalRbacGrantRole applies a canonical actor→role grant. Idempotent:
// granting an already-held role returns 200 instead of 201.
func (s *server) internalRbacGrantRole(w http.ResponseWriter, r *http.Request) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		sendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", identity.ErrIdempotencyKeyRequired.Error())
		return
	}
	if strings.TrimSpace(r.Header.Get("X-Canonical-Intent-ID")) != idempotencyKey {
		sendError(w, http.StatusBadRequest, "INVALID_CANONICAL_INTENT", "canonical mutation intent is required")
		return
	}
	actorID := r.PathValue("actorId")
	var request struct {
		RoleName            string `json:"roleName"`
		RequestedByActorID  string `json:"requestedByActorId"`
		ExpectedRoleVersion int    `json:"expectedRoleVersion"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	assignment, created, err := s.repository.Enforcer.GrantRoleWithIdempotency(r.Context(), actorID, request.RoleName, request.RequestedByActorID, request.ExpectedRoleVersion, idempotencyKey, "dsh")
	if err != nil {
		writeRbacError(w, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	sendJSON(w, status, assignment)
}

// internalRbacRevokeRole applies a canonical actor role revocation. This is
// the sole write path for the inverse of a role grant.
func (s *server) internalRbacRevokeRole(w http.ResponseWriter, r *http.Request) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		sendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", identity.ErrIdempotencyKeyRequired.Error())
		return
	}
	if strings.TrimSpace(r.Header.Get("X-Canonical-Intent-ID")) != idempotencyKey {
		sendError(w, http.StatusBadRequest, "INVALID_CANONICAL_INTENT", "canonical mutation intent is required")
		return
	}
	actorID := r.PathValue("actorId")
	roleName := r.URL.Query().Get("roleName")
	requestedByActorID := r.URL.Query().Get("requestedByActorId")
	expectedRoleVersion, err := strconv.Atoi(r.URL.Query().Get("expectedRoleVersion"))
	if err != nil || expectedRoleVersion < 1 {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "expectedRoleVersion must be a positive integer")
		return
	}
	if err := s.repository.Enforcer.RevokeRoleWithIdempotency(r.Context(), actorID, roleName, requestedByActorID, expectedRoleVersion, idempotencyKey, "dsh"); err != nil {
		writeRbacError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeRbacError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, identity.ErrSelfGrantProhibited), errors.Is(err, identity.ErrInvalidRoleName), errors.Is(err, identity.ErrIdempotencyKeyRequired):
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	case errors.Is(err, identity.ErrRoleInactive):
		sendError(w, http.StatusConflict, "ROLE_INACTIVE", err.Error())
	case errors.Is(err, identity.ErrIdempotencyConflict):
		sendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
	case errors.Is(err, identity.ErrRoleVersionConflict):
		sendError(w, http.StatusConflict, "ROLE_VERSION_CONFLICT", err.Error())
	case errors.Is(err, identity.ErrRoleNotFound):
		sendError(w, http.StatusNotFound, "ROLE_NOT_FOUND", err.Error())
	case errors.Is(err, identity.ErrRoleAlreadyExists):
		sendError(w, http.StatusConflict, "ROLE_ALREADY_EXISTS", err.Error())
	default:
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "rbac request failed")
	}
}
