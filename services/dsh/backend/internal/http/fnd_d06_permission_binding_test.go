package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
)

// These tests prove the FND-D06 fix on a representative, high-severity sample
// of routes that were previously registered bare and gated only by
// ActorFromContext -- a silent context read that writes nothing, so an
// unauthenticated or under-permissioned caller received HTTP 200 with an
// empty body instead of 401/403. Full coverage against regression is the
// static dsh-route-permission-binding-gate guard; these tests prove the
// runtime behavior it assumes.

func unpermittedIdentitySessionServer(t *testing.T) *httptest.Server {
	t.Helper()
	return identitySessionServer(t, auth.Identity{
		Subject:           "actor-without-permission",
		OperatorContextID: "OperatorContext-test",
		Roles:             []string{"client"},
		Permissions:       nil,
		AuthState:         "authenticated",
	})
}

func TestPreviouslyBareRoutesRejectUnauthenticatedCallers(t *testing.T) {
	t.Parallel()

	identityClient := auth.NewClient(unpermittedIdentitySessionServer(t).URL)
	router := NewRouter(nil, identityClient, nil, nil, nil, nil)
	RegisterGovernedIncidentRoutes(router, nil, identityClient, nil, nil)
	RegisterPlatformPolicyRoutes(router, nil, identityClient, nil, nil)
	RegisterWorkforceScopesRoutes(router, nil, identityClient, nil, nil)

	cases := []struct {
		name   string
		method string
		path   string
	}{
		{"list governed incidents", http.MethodGet, "/dsh/operator/support/incidents"},
		{"create governed incident", http.MethodPost, "/dsh/operator/support/incidents"},
		{"approve finance refund", http.MethodPost, "/dsh/control-panel/finance/refunds/refund-1/approve"},
		{"reject finance refund", http.MethodPost, "/dsh/control-panel/finance/refunds/refund-1/reject"},
		{"rollback operational policy", http.MethodPost, "/dsh/operator/platform/operational-policy/audit/event-1/rollback"},
		{"list operational policy audit", http.MethodGet, "/dsh/operator/platform/operational-policy/audit"},
		{"read workforce scopes", http.MethodGet, "/dsh/operator/workforce/scopes/actor-1"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			// No Authorization header: this is exactly the caller FND-D06 let through.
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)

			if res.Code == http.StatusOK {
				t.Fatalf(
					"%s %s: unauthenticated caller received 200 (body=%q) -- this is the FND-D06 silent-success defect",
					tc.method, tc.path, res.Body.String(),
				)
			}
			if res.Code != http.StatusUnauthorized && res.Code != http.StatusServiceUnavailable {
				t.Fatalf("%s %s: status=%d, want 401 (or 503 when Identity is unreachable), body=%s", tc.method, tc.path, res.Code, res.Body.String())
			}
			if res.Body.Len() == 0 {
				t.Fatalf("%s %s: empty response body -- must return a governed error envelope, not a silent close", tc.method, tc.path)
			}
		})
	}
}

func TestPreviouslyBareRoutesRejectAuthenticatedCallersWithoutPermission(t *testing.T) {
	t.Parallel()

	identityServer := unpermittedIdentitySessionServer(t)
	identityClient := auth.NewClient(identityServer.URL)

	router := NewRouter(nil, identityClient, nil, nil, nil, nil)
	RegisterGovernedIncidentRoutes(router, nil, identityClient, nil, nil)

	cases := []struct {
		name   string
		method string
		path   string
	}{
		{"list governed incidents", http.MethodGet, "/dsh/operator/support/incidents"},
		{"approve finance refund", http.MethodPost, "/dsh/control-panel/finance/refunds/refund-1/approve"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			req.Header.Set("Authorization", "Bearer authenticated-without-permission")
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)

			if res.Code == http.StatusOK {
				t.Fatalf("%s %s: authenticated caller without the required permission received 200 (body=%q)", tc.method, tc.path, res.Body.String())
			}
			if res.Code != http.StatusForbidden {
				t.Fatalf("%s %s: status=%d, want 403 FORBIDDEN, body=%s", tc.method, tc.path, res.Code, res.Body.String())
			}
			var body map[string]any
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("%s %s: response body is not the governed error envelope: %v", tc.method, tc.path, err)
			}
			if body["code"] != "FORBIDDEN" {
				t.Fatalf("%s %s: code=%v want FORBIDDEN", tc.method, tc.path, body["code"])
			}
		})
	}
}
