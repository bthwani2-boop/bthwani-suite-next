package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
)

func TestDocumentReviewAuthenticatesPermissionBeforeDecisionSeparation(t *testing.T) {
	server := fakeIdentityServerWithRBAC(t,
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(auth.ActorIdentity{
				Subject:           "operator-reviewer",
				OperatorContextID: "operator-context-review",
				Roles:             []string{"operator"},
				AuthState:         "authenticated",
			})
		},
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{"permissions": []any{}})
		},
	)

	request := httptest.NewRequest(
		http.MethodPatch,
		"/dsh/operator/partners/partner-1/documents/document-1/review",
		bytes.NewBufferString(`{"decision":"approved","reason":"independent evidence review"}`),
	)
	request.SetPathValue("partnerId", "partner-1")
	request.SetPathValue("docId", "document-1")
	request.Header.Set("Authorization", "Bearer operator-token")
	response := httptest.NewRecorder()

	server.handleReviewPartnerDocumentSeparated(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("document review permission boundary status=%d want=%d body=%s", response.Code, http.StatusForbidden, response.Body.String())
	}
	var body map[string]string
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["code"] != "FORBIDDEN" {
		t.Fatalf("document review permission boundary code=%q want FORBIDDEN", body["code"])
	}
}
