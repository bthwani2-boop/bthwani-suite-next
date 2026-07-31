from __future__ import annotations

import re
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


def remove_unused_catalog_detail_read() -> None:
    frontend_root = ROOT / "services/dsh/frontend"
    occurrences: list[tuple[Path, int]] = []
    for path in frontend_root.rglob("*"):
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
            continue
        content = path.read_text(encoding="utf-8")
        count = content.count("fetchMasterProductById")
        if count:
            occurrences.append((path, count))
    total = sum(count for _, count in occurrences)
    expected = ROOT / "services/dsh/frontend/shared/catalog/central-catalog.api.ts"
    if total != 1 or occurrences != [(expected, 1)]:
        detail = ", ".join(f"{path.relative_to(ROOT)}={count}" for path, count in occurrences)
        raise RuntimeError(f"fetchMasterProductById is not safely removable: total={total}; {detail}")

    source = expected.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\nexport async function fetchMasterProductById\(productId: string\): Promise<MasterProduct> \{\n"
        r"  const resp = await request<\{ masterProduct: MasterProduct \}>\(\n"
        r"    `/dsh/operator/catalog/master-products/\$\{encodeURIComponent\(productId\)\}`,\n"
        r"  \);\n"
        r"  return resp\.masterProduct;\n"
        r"\}\n",
    )
    source, count = pattern.subn("\n", source, count=1)
    if count != 1:
        raise RuntimeError("catalog detail-read function block was not found exactly once")
    expected.write_text(source, encoding="utf-8")


def update_wlt_finance_allowlists() -> None:
    relative = "services/dsh/backend/internal/wlt/finance_proxy.go"
    source = read(relative)
    read_anchor = '\t"/wlt/cod-records":              {},\n'
    read_insert = '\t"/wlt/cod-records":              {},\n\t"/wlt/cod-reconciliation-cases": {},\n'
    if '"/wlt/cod-reconciliation-cases": {}' not in source:
        source = replace_once(source, read_anchor, read_insert, "COD reconciliation read allowlist")

    write_anchor = '\t\t"/wlt/reconciliation-cases/": {"assign": {}, "resolve": {}},\n'
    write_insert = (
        '\t\t"/wlt/reconciliation-cases/": {"assign": {}, "resolve": {}},\n'
        '\t\t"/wlt/cod-reconciliation-cases/": {"assign": {}, "resolve": {}},\n'
    )
    if '"/wlt/cod-reconciliation-cases/": {"assign": {}, "resolve": {}}' not in source:
        source = replace_once(source, write_anchor, "".join(write_insert), "COD reconciliation write allowlist")
    write(relative, source)


def append_cod_handlers() -> None:
    relative = "services/dsh/backend/internal/http/cod_finance_handlers.go"
    source = read(relative)
    if "handleAssignFinanceCodReconciliationCase" in source:
        return
    block = r'''

func writeCodReconciliationProxyResponse(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleAssignFinanceCodReconciliationCase(w http.ResponseWriter, r *http.Request) {
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
		InvestigationNote string `json:"investigationNote"`
	}
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.InvestigationNote = strings.TrimSpace(input.InvestigationNote)
	if len(input.InvestigationNote) > 4000 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "investigationNote must not exceed 4000 characters")
		return
	}
	body, err := json.Marshal(map[string]string{
		"operatorId":        actor.ID,
		"investigationNote": input.InvestigationNote,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode COD reconciliation assignment")
		return
	}
	status, responseBody, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/cod-reconciliation-cases/"+url.PathEscape(caseID)+"/assign",
		body,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT COD reconciliation assignment failed")
		return
	}
	writeCodReconciliationProxyResponse(w, status, responseBody)
}

func (s *protectedStoreServer) handleResolveFinanceCodReconciliationCase(w http.ResponseWriter, r *http.Request) {
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
		"confirmed_variance": {},
		"cash_adjustment":    {},
		"collector_recovery": {},
		"write_off":          {},
	}
	if _, allowed := allowedActions[input.ResolutionAction]; !allowed {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "resolutionAction is invalid")
		return
	}
	if input.ResolutionNote == "" || len(input.ResolutionNote) > 4000 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "resolutionNote is required and must not exceed 4000 characters")
		return
	}
	body, err := json.Marshal(map[string]string{
		"operatorId":       actor.ID,
		"resolutionAction": input.ResolutionAction,
		"resolutionNote":   input.ResolutionNote,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode COD reconciliation resolution")
		return
	}
	status, responseBody, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/cod-reconciliation-cases/"+url.PathEscape(caseID)+"/resolve",
		body,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT COD reconciliation resolution failed")
		return
	}
	writeCodReconciliationProxyResponse(w, status, responseBody)
}
'''
    write(relative, source.rstrip() + block + "\n")


def register_cod_routes() -> None:
    relative = "services/dsh/backend/internal/http/cod_finance_routes.go"
    source = read(relative)
    if "cod-reconciliation-cases/{caseId}/assign" in source:
        return
    anchor = '\tmux.HandleFunc("GET /dsh/partner/me/finance/cod-records", s.handlePartnerFinanceCodRecords)\n'
    addition = (
        anchor
        + '\tmux.HandleFunc("POST /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign", s.handleAssignFinanceCodReconciliationCase)\n'
        + '\tmux.HandleFunc("POST /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/resolve", s.handleResolveFinanceCodReconciliationCase)\n'
    )
    source = replace_once(source, anchor, addition, "COD reconciliation route registration")
    write(relative, source)


def write_cod_contract() -> None:
    relative = "services/dsh/contracts/dsh.cod-custody.openapi.yaml"
    contract = '''openapi: 3.1.0
info:
  title: DSH COD Custody Proxy API
  version: 1.1.0
  description: >-
    Surface-scoped DSH proxy routes for WLT-owned COD custody and reconciliation
    truth. DSH derives operatorId and OperatorContext from the authenticated
    Identity actor; browser-controlled identity or context selectors are rejected.
x-bthwani-owner: services/dsh
x-bthwani-capability: cod-custody
x-bthwani-contract-state: CONTRACT_ACTIVE
x-bthwani-runtime-dependency: true
x-bthwani-client-generation: DISABLED
x-bthwani-client-binding: MANUAL_TYPED_ADAPTER
servers:
  - url: http://localhost:58080
paths:
  /dsh/control-panel/finance/cod-reconciliation-cases:
    get:
      tags: [dsh-control-panel]
      operationId: listDshControlPanelCodReconciliationCases
      parameters:
        - name: status
          in: query
          required: false
          schema:
            $ref: '#/components/schemas/CodReconciliationStatus'
      responses:
        '200':
          description: WLT COD reconciliation cases.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CodReconciliationCaseListEnvelope'
        '401': { $ref: '#/components/responses/Unauthorized' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '502': { $ref: '#/components/responses/WltUnavailable' }
      security:
        - bearerAuth: []
  /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign:
    post:
      tags: [dsh-control-panel]
      operationId: assignDshControlPanelCodReconciliationCase
      parameters:
        - $ref: '#/components/parameters/CaseId'
        - $ref: '#/components/parameters/CorrelationId'
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AssignCodReconciliationCaseRequest'
      responses:
        '200':
          description: Case assigned to the authenticated operator.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CodReconciliationCaseEnvelope'
        '400': { $ref: '#/components/responses/InvalidRequest' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '409': { $ref: '#/components/responses/Conflict' }
        '502': { $ref: '#/components/responses/WltUnavailable' }
      security:
        - bearerAuth: []
  /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/resolve:
    post:
      tags: [dsh-control-panel]
      operationId: resolveDshControlPanelCodReconciliationCase
      parameters:
        - $ref: '#/components/parameters/CaseId'
        - $ref: '#/components/parameters/CorrelationId'
        - $ref: '#/components/parameters/IdempotencyKey'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResolveCodReconciliationCaseRequest'
      responses:
        '200':
          description: Case resolved by the authenticated assigned operator.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CodReconciliationCaseEnvelope'
        '400': { $ref: '#/components/responses/InvalidRequest' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '409': { $ref: '#/components/responses/Conflict' }
        '502': { $ref: '#/components/responses/WltUnavailable' }
      security:
        - bearerAuth: []
  /dsh/partner/me/finance/cod-records:
    get:
      tags: [dsh-partner]
      operationId: listDshPartnerCodRecords
      responses:
        '200':
          description: Partner-owned COD records.
          content:
            application/json:
              schema:
                type: object
                additionalProperties: false
                required: [codRecords]
                properties:
                  codRecords:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
        '401': { $ref: '#/components/responses/Unauthorized' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '502': { $ref: '#/components/responses/WltUnavailable' }
      security:
        - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  parameters:
    CaseId:
      name: caseId
      in: path
      required: true
      schema:
        type: string
        minLength: 1
    CorrelationId:
      name: X-Correlation-ID
      in: header
      required: true
      schema:
        type: string
        minLength: 1
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      required: true
      schema:
        type: string
        minLength: 1
        maxLength: 255
  schemas:
    CodReconciliationStatus:
      type: string
      enum: [open, investigating, resolved]
    CodResolutionAction:
      type: string
      enum: [confirmed_variance, cash_adjustment, collector_recovery, write_off]
    AssignCodReconciliationCaseRequest:
      type: object
      additionalProperties: false
      properties:
        investigationNote:
          type: string
          maxLength: 4000
    ResolveCodReconciliationCaseRequest:
      type: object
      additionalProperties: false
      required: [resolutionAction, resolutionNote]
      properties:
        resolutionAction:
          $ref: '#/components/schemas/CodResolutionAction'
        resolutionNote:
          type: string
          minLength: 1
          maxLength: 4000
    CodReconciliationCase:
      type: object
      additionalProperties: false
      required:
        - id
        - codRecordId
        - custodyEvidenceId
        - expectedAmountMinorUnits
        - actualAmountMinorUnits
        - differenceMinorUnits
        - currency
        - triggerReason
        - status
        - investigationNote
        - resolutionNote
        - createdAt
        - updatedAt
      properties:
        id: { type: string }
        codRecordId: { type: string }
        custodyEvidenceId: { type: string }
        expectedAmountMinorUnits: { type: integer, format: int64, minimum: 0 }
        actualAmountMinorUnits: { type: integer, format: int64, minimum: 0 }
        differenceMinorUnits: { type: integer, format: int64, not: { const: 0 } }
        currency: { type: string }
        triggerReason: { type: string }
        status: { $ref: '#/components/schemas/CodReconciliationStatus' }
        assignedToOperatorId: { type: [string, 'null'] }
        assignedAt: { type: [string, 'null'], format: date-time }
        investigationNote: { type: string }
        resolvedByOperatorId: { type: [string, 'null'] }
        resolutionAction:
          anyOf:
            - $ref: '#/components/schemas/CodResolutionAction'
            - type: 'null'
        resolutionNote: { type: string }
        resolvedAt: { type: [string, 'null'], format: date-time }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
    CodReconciliationCaseEnvelope:
      type: object
      additionalProperties: false
      required: [codReconciliationCase]
      properties:
        codReconciliationCase:
          $ref: '#/components/schemas/CodReconciliationCase'
    CodReconciliationCaseListEnvelope:
      type: object
      additionalProperties: false
      required: [codReconciliationCases]
      properties:
        codReconciliationCases:
          type: array
          items:
            $ref: '#/components/schemas/CodReconciliationCase'
    Error:
      type: object
      additionalProperties: false
      required: [code, message]
      properties:
        code: { type: string }
        message: { type: string }
  responses:
    InvalidRequest:
      description: Request validation failed.
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    Unauthorized:
      description: Missing or invalid authenticated session.
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    Forbidden:
      description: Finance permission or trusted OperatorContext boundary denied.
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    Conflict:
      description: Case lifecycle or assignment conflict.
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    WltUnavailable:
      description: Canonical WLT financial service is unavailable.
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
'''
    write(relative, contract)


def index_cod_paths_in_entry() -> None:
    relative = "services/dsh/contracts/dsh.openapi.yaml"
    source = read(relative)
    if "/dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign:" in source:
        return
    anchor = (
        '  /dsh/control-panel/finance/cod-records:\n'
        '    $ref: "./paths/misc.paths.yaml#/~1dsh~1control-panel~1finance~1cod-records"\n'
    )
    addition = anchor + '''  /dsh/control-panel/finance/cod-reconciliation-cases:
    $ref: "./dsh.cod-custody.openapi.yaml#/paths/~1dsh~1control-panel~1finance~1cod-reconciliation-cases"
  /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign:
    $ref: "./dsh.cod-custody.openapi.yaml#/paths/~1dsh~1control-panel~1finance~1cod-reconciliation-cases~1{caseId}~1assign"
  /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/resolve:
    $ref: "./dsh.cod-custody.openapi.yaml#/paths/~1dsh~1control-panel~1finance~1cod-reconciliation-cases~1{caseId}~1resolve"
  /dsh/partner/me/finance/cod-records:
    $ref: "./dsh.cod-custody.openapi.yaml#/paths/~1dsh~1partner~1me~1finance~1cod-records"
'''
    source = replace_once(source, anchor, addition, "DSH COD path index")
    write(relative, source)


def write_tests() -> None:
    route_test = '''package http

import (
	"net/http"
	"testing"
)

func TestCodReconciliationMutationRoutesAreRegistered(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)
	cases := []struct {
		name    string
		path    string
		pattern string
	}{
		{name: "assign", path: "/dsh/control-panel/finance/cod-reconciliation-cases/case-1/assign", pattern: "POST /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign"},
		{name: "resolve", path: "/dsh/control-panel/finance/cod-reconciliation-cases/case-1/resolve", pattern: "POST /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/resolve"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request, err := http.NewRequest(http.MethodPost, tc.path, nil)
			if err != nil {
				t.Fatal(err)
			}
			_, pattern := router.Handler(request)
			if pattern != tc.pattern {
				t.Fatalf("expected route %q, got %q", tc.pattern, pattern)
			}
		})
	}
}
'''
    write("services/dsh/backend/internal/http/cod_reconciliation_routes_test.go", route_test)

    allowlist_test = '''package wlt

import "testing"

func TestCodReconciliationFinanceProxyAllowlist(t *testing.T) {
	if !financeReadPathAllowed("/wlt/cod-reconciliation-cases") {
		t.Fatal("COD reconciliation list read must be allowlisted")
	}
	for _, path := range []string{
		"/wlt/cod-reconciliation-cases/case-1/assign",
		"/wlt/cod-reconciliation-cases/case-1/resolve",
	} {
		if !financeWritePathAllowed(path) {
			t.Fatalf("expected COD reconciliation mutation path to be allowlisted: %s", path)
		}
	}
	for _, path := range []string{
		"/wlt/cod-reconciliation-cases/case-1/delete",
		"/wlt/cod-reconciliation-cases//assign",
		"/wlt/cod-reconciliation-cases/case-1/assign/extra",
	} {
		if financeWritePathAllowed(path) {
			t.Fatalf("unexpected COD reconciliation mutation path allowlisted: %s", path)
		}
	}
}
'''
    write("services/dsh/backend/internal/wlt/finance_proxy_test.go", allowlist_test)


remove_unused_catalog_detail_read()
update_wlt_finance_allowlists()
append_cod_handlers()
register_cod_routes()
write_cod_contract()
index_cod_paths_in_entry()
write_tests()
print("COD and catalog binding repair transformation: PASS")
