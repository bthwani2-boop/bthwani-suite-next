from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return source.replace(old, new, 1)


def write_handlers() -> None:
    relative = "services/dsh/backend/internal/http/reconciliation_finance_routes.go"
    content = r'''package http

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleAssignFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	caseID := strings.TrimSpace(r.PathValue("caseId"))
	if caseID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	body, err := json.Marshal(map[string]string{"operatorId": actor.ID})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode reconciliation assignment")
		return
	}
	status, responseBody, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/reconciliation-cases/"+url.PathEscape(caseID)+"/assign",
		body,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	writeWltActorFinanceResponse(w, status, responseBody, err)
}

func (s *protectedStoreServer) handleResolveFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	caseID := strings.TrimSpace(r.PathValue("caseId"))
	if caseID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	var input struct {
		ResolutionAction string `json:"resolutionAction"`
		ResolutionNote   string `json:"resolutionNote"`
	}
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.ResolutionAction = strings.TrimSpace(input.ResolutionAction)
	input.ResolutionNote = strings.TrimSpace(input.ResolutionNote)
	allowedActions := map[string]struct{}{
		"confirmed_success": {},
		"confirmed_failed":  {},
		"manual_adjustment": {},
		"ignored":           {},
	}
	if _, allowed := allowedActions[input.ResolutionAction]; !allowed {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "resolutionAction is invalid")
		return
	}
	if len(input.ResolutionNote) > 4000 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "resolutionNote must not exceed 4000 characters")
		return
	}
	body, err := json.Marshal(map[string]string{
		"operatorId":       actor.ID,
		"resolutionAction": input.ResolutionAction,
		"resolutionNote":   input.ResolutionNote,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode reconciliation resolution")
		return
	}
	status, responseBody, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/reconciliation-cases/"+url.PathEscape(caseID)+"/resolve",
		body,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	writeWltActorFinanceResponse(w, status, responseBody, err)
}

func registerReconciliationFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/assign", s.handleAssignFinanceReconciliationCase)
	mux.HandleFunc("POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/resolve", s.handleResolveFinanceReconciliationCase)
}
'''
    write(relative, content)


def register_routes() -> None:
    relative = "services/dsh/backend/internal/http/catalog_unified_routes.go"
    source = read(relative)
    call = "\tregisterReconciliationFinanceRoutes(mux, s)\n"
    if call not in source:
        anchor = "\tregisterCodFinanceRoutes(mux, s)\n"
        source = replace_once(source, anchor, anchor + call, "reconciliation finance registrar")
    write(relative, source)


def align_contract() -> None:
    relative = "services/dsh/contracts/paths/misc.paths.yaml"
    source = read(relative)
    assign_old = '''    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            additionalProperties: false
            required: [idempotencyKey]
            properties:
              idempotencyKey: { type: string, minLength: 1 }
              assigneeId: { type: string }
'''
    if assign_old not in source:
        raise RuntimeError("legacy reconciliation assignment request body was not found")
    source = source.replace(assign_old, "", 1)

    resolve_old = '''    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            additionalProperties: false
            required: [idempotencyKey, resolution]
            properties:
              idempotencyKey: { type: string, minLength: 1 }
              resolution: { type: string, minLength: 1 }
              notes: { type: string }
'''
    resolve_new = '''    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            additionalProperties: false
            required: [resolutionAction, resolutionNote]
            properties:
              resolutionAction:
                type: string
                enum: [confirmed_success, confirmed_failed, manual_adjustment, ignored]
              resolutionNote:
                type: string
                maxLength: 4000
'''
    source = replace_once(source, resolve_old, resolve_new, "reconciliation resolution request body")
    write(relative, source)


def write_tests() -> None:
    relative = "services/dsh/backend/internal/http/reconciliation_finance_routes_test.go"
    content = '''package http

import (
	"net/http"
	"testing"
)

func TestReconciliationFinanceMutationRoutesAreRegistered(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)
	cases := []struct {
		path    string
		pattern string
	}{
		{path: "/dsh/control-panel/finance/reconciliation-cases/case-1/assign", pattern: "POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/assign"},
		{path: "/dsh/control-panel/finance/reconciliation-cases/case-1/resolve", pattern: "POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/resolve"},
	}
	for _, tc := range cases {
		req, err := http.NewRequest(http.MethodPost, tc.path, nil)
		if err != nil {
			t.Fatal(err)
		}
		_, pattern := router.Handler(req)
		if pattern != tc.pattern {
			t.Fatalf("expected route %q, got %q", tc.pattern, pattern)
		}
	}
}
'''
    write(relative, content)


write_handlers()
register_routes()
align_contract()
write_tests()
print("reconciliation finance binding repair: PASS")
