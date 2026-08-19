package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/dshclient"
	"workforce-api/internal/workforce"
)

type providerMediaVerifier interface {
	ValidateProviderDocumentMedia(context.Context, string, string, string) error
}

// ReferenceMutationMiddleware owns governed Workforce mutations that augment
// the primary provider router: local reference metadata and opaque document-link
// validation. Provider affiliation replacement is registered canonically in
// NewRouter so the active contract and HTTP route have one explicit owner.
func ReferenceMutationMiddleware(next http.Handler, repo *workforce.Repository, authClient *auth.Client, mediaVerifier providerMediaVerifier) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && r.URL.Path == "/workforce/reference/cities" {
			handleCityCreate(w, r, repo, authClient)
			return
		}
		if r.Method == http.MethodPatch && strings.HasPrefix(r.URL.Path, "/workforce/reference/cities/") {
			handleCityUpdate(w, r, repo, authClient)
			return
		}
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/documents") {
			if kind, actorID, ok := parseProviderDocumentPath(r.URL.Path); ok {
				handleDocumentLink(w, r, repo, authClient, mediaVerifier, kind, actorID)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func resolveReferenceOperator(w http.ResponseWriter, r *http.Request, authClient *auth.Client, action string) (auth.Identity, bool) {
	identity, err := authClient.Resolve(r.Context(), r.Header.Get("Authorization"))
	if err != nil {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
		return auth.Identity{}, false
	}
	boundContext, bindErr := auth.BindIdentityContext(r.Context(), identity)
	if bindErr != nil {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "identity operator context is missing")
		return auth.Identity{}, false
	}
	*r = *r.WithContext(boundContext)
	if !identity.HasPermission("workforce", action, "all") {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "workforce permission is required")
		return auth.Identity{}, false
	}
	return identity, true
}

func handleCityCreate(w http.ResponseWriter, r *http.Request, repo *workforce.Repository, authClient *auth.Client) {
	if _, ok := resolveReferenceOperator(w, r, authClient, "reference:manage"); !ok {
		return
	}
	var city workforce.City
	if !decodeReferenceMutationJSON(w, r, &city) {
		return
	}
	city.Code = strings.TrimSpace(city.Code)
	city.NameAr = strings.TrimSpace(city.NameAr)
	city.NameEn = strings.TrimSpace(city.NameEn)
	if city.Code == "" || city.NameAr == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "code and nameAr are required")
		return
	}
	city.Active = true
	if err := repo.UpsertCity(r.Context(), city, true); err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, city)
}

func handleCityUpdate(w http.ResponseWriter, r *http.Request, repo *workforce.Repository, authClient *auth.Client) {
	if _, ok := resolveReferenceOperator(w, r, authClient, "reference:manage"); !ok {
		return
	}
	var city workforce.City
	if !decodeReferenceMutationJSON(w, r, &city) {
		return
	}
	city.Code = strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/workforce/reference/cities/"))
	city.NameAr = strings.TrimSpace(city.NameAr)
	city.NameEn = strings.TrimSpace(city.NameEn)
	if city.Code == "" || city.NameAr == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "city code and nameAr are required")
		return
	}
	if err := repo.UpsertCity(r.Context(), city, false); err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, city)
}

func (s *server) replaceProviderAffiliations(w http.ResponseWriter, r *http.Request) {
	role, ok := workforceKindForCollection(r.PathValue("collection"))
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	if !ok || actorID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "provider collection and actor id are required")
		return
	}
	handleAffiliationReplace(w, r, s.repo, s.auth, role, actorID)
}

func workforceKindForCollection(collection string) (string, bool) {
	switch strings.TrimSpace(collection) {
	case "field-agents":
		return "field", true
	case "captains":
		return "captain", true
	case "employees":
		return "employee", true
	default:
		return "", false
	}
}

func handleAffiliationReplace(w http.ResponseWriter, r *http.Request, repo *workforce.Repository, authClient *auth.Client, role, actorID string) {
	identity, ok := resolveReferenceOperator(w, r, authClient, "provider:update")
	if !ok {
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "X-Correlation-ID is required")
		return
	}
	var input struct {
		Affiliations []workforce.OperationalAssignmentInput `json:"affiliations"`
	}
	if !decodeReferenceMutationJSON(w, r, &input) {
		return
	}
	person, err := repo.PersonByActorID(r.Context(), actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	if person.WorkforceKind != role {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "provider collection does not match workforce kind")
		return
	}
	scopes, err := repo.SetOperationalScopes(
		r.Context(),
		actorID,
		identity.OperatorContextID,
		role,
		input.Affiliations,
		identity.Subject,
		correlationID,
	)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"affiliations": scopes})
}

func parseProviderDocumentPath(path string) (kind string, actorID string, ok bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 4 || parts[0] != "workforce" || parts[3] != "documents" {
		return "", "", false
	}
	switch parts[1] {
	case "field-agents":
		kind = "field"
	case "captains":
		kind = "captain"
	case "employees":
		kind = "employee"
	default:
		return "", "", false
	}
	actorID = strings.TrimSpace(parts[2])
	return kind, actorID, actorID != ""
}

func handleDocumentLink(
	w http.ResponseWriter,
	r *http.Request,
	repo *workforce.Repository,
	authClient *auth.Client,
	mediaVerifier providerMediaVerifier,
	kind string,
	actorID string,
) {
	identity, ok := resolveReferenceOperator(w, r, authClient, "provider:update")
	if !ok {
		return
	}
	var input struct {
		ExpectedVersion int    `json:"expectedVersion"`
		MediaRef        string `json:"mediaRef"`
	}
	if !decodeReferenceMutationJSON(w, r, &input) {
		return
	}
	if mediaVerifier == nil {
		sendError(w, http.StatusServiceUnavailable, "MEDIA_AUTHORITY_UNAVAILABLE", "DSH media authority is unavailable")
		return
	}
	if err := mediaVerifier.ValidateProviderDocumentMedia(r.Context(), actorID, kind, input.MediaRef); err != nil {
		if errors.Is(err, dshclient.ErrProviderMediaInvalid) {
			sendError(w, http.StatusBadRequest, "INVALID_REFERENCE", "media reference is not valid for this provider")
			return
		}
		sendError(w, http.StatusServiceUnavailable, "MEDIA_AUTHORITY_UNAVAILABLE", "DSH media authority is unavailable")
		return
	}
	operatorRole := "operator"
	if len(identity.Roles) > 0 {
		operatorRole = identity.Roles[0]
	}
	person, err := repo.AppendProviderDocument(
		r.Context(),
		identity.Subject,
		operatorRole,
		actorID,
		kind,
		input.MediaRef,
		input.ExpectedVersion,
		r.Header.Get("X-Correlation-ID"),
	)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func decodeReferenceMutationJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}
