package http

import (
	"encoding/json"
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

// Journey003MutationMiddleware owns the two JRN-003 mutations that cross an
// existing service boundary without duplicating the main router: operator city
// governance and linking an opaque DSH mediaRef to a Workforce profile.
func Journey003MutationMiddleware(next http.Handler, repo *workforce.Repository, authClient *auth.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && r.URL.Path == "/workforce/reference/cities" {
			handleJourney003CityCreate(w, r, repo, authClient)
			return
		}
		if r.Method == http.MethodPatch && strings.HasPrefix(r.URL.Path, "/workforce/reference/cities/") {
			handleJourney003CityUpdate(w, r, repo, authClient)
			return
		}
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/documents") {
			if kind, actorID, ok := parseProviderDocumentPath(r.URL.Path); ok {
				handleJourney003DocumentLink(w, r, repo, authClient, kind, actorID)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func resolveJourney003Operator(w http.ResponseWriter, r *http.Request, authClient *auth.Client, action string) (auth.Identity, bool) {
	identity, err := authClient.Resolve(r.Context(), r.Header.Get("Authorization"))
	if err != nil {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
		return auth.Identity{}, false
	}
	if !identity.HasPermission("workforce", action, "all") {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "workforce permission is required")
		return auth.Identity{}, false
	}
	return identity, true
}

func handleJourney003CityCreate(w http.ResponseWriter, r *http.Request, repo *workforce.Repository, authClient *auth.Client) {
	if _, ok := resolveJourney003Operator(w, r, authClient, "reference:manage"); !ok {
		return
	}
	var city workforce.City
	if !decodeJourney003JSON(w, r, &city) {
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

func handleJourney003CityUpdate(w http.ResponseWriter, r *http.Request, repo *workforce.Repository, authClient *auth.Client) {
	if _, ok := resolveJourney003Operator(w, r, authClient, "reference:manage"); !ok {
		return
	}
	var city workforce.City
	if !decodeJourney003JSON(w, r, &city) {
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

func handleJourney003DocumentLink(
	w http.ResponseWriter,
	r *http.Request,
	repo *workforce.Repository,
	authClient *auth.Client,
	kind string,
	actorID string,
) {
	identity, ok := resolveJourney003Operator(w, r, authClient, "provider:update")
	if !ok {
		return
	}
	var input struct {
		ExpectedVersion int    `json:"expectedVersion"`
		MediaRef        string `json:"mediaRef"`
	}
	if !decodeJourney003JSON(w, r, &input) {
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

func decodeJourney003JSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}
