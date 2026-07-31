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


def register_payment_refresh_route() -> None:
    relative = "services/dsh/backend/internal/http/server.go"
    source = read(relative)
    route = '\tmux.HandleFunc("POST /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/refresh-provider-status", protected.handleRefreshFinancePaymentSessionProviderStatus)\n'
    if route not in source:
        anchor = '\tmux.HandleFunc("GET /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/timeline", protected.handleFinancePaymentSessionTimeline)\n'
        source = replace_once(source, anchor, anchor + route, "payment refresh route registration")
    write(relative, source)


def extend_payment_contract() -> None:
    relative = "services/dsh/contracts/dsh.payment-sessions.openapi.yaml"
    source = read(relative)
    path = "  /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/refresh-provider-status:\n"
    if path not in source:
        anchor = "\ncomponents:\n"
        operation = '''  /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/refresh-provider-status:
    post:
      operationId: refreshDshPaymentSessionProviderStatus
      summary: Refresh the authoritative WLT provider status without repeating authorization or capture.
      tags: [DshFinancePaymentSessions]
      security: [{ bearerAuth: [] }]
      parameters:
        - $ref: '#/components/parameters/PaymentSessionId'
        - $ref: '#/components/parameters/CorrelationId'
        - $ref: '#/components/parameters/IdempotencyKey'
      responses:
        '200':
          description: Current authoritative payment state from WLT.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PaymentOperationEnvelope' }
        '400': { $ref: '#/components/responses/Error' }
        '401': { $ref: '#/components/responses/Error' }
        '403': { $ref: '#/components/responses/Error' }
        '404': { $ref: '#/components/responses/Error' }
        '409': { $ref: '#/components/responses/Error' }
        '502': { $ref: '#/components/responses/Error' }
        '503': { $ref: '#/components/responses/Error' }
'''
        source = replace_once(source, anchor, "\n" + operation + anchor, "payment contract components anchor")
    write(relative, source)


def append_partner_remit_handler() -> None:
    relative = "services/dsh/backend/internal/http/cod_finance_handlers.go"
    source = read(relative)
    if "handlePartnerRemitFinanceCodRecord" in source:
        return
    block = r'''

func (s *protectedStoreServer) handlePartnerRemitFinanceCodRecord(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	recordID := strings.TrimSpace(r.PathValue("recordId"))
	if recordID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "recordId is required")
		return
	}
	if !s.requirePartnerCodRecord(w, r, actor.ID, recordID) {
		return
	}
	var input struct {
		ProofReference string `json:"proofReference"`
		Note           string `json:"note"`
	}
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.ProofReference = strings.TrimSpace(input.ProofReference)
	input.Note = strings.TrimSpace(input.Note)
	if len(input.ProofReference) < 3 || len(input.ProofReference) > 512 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "proofReference must contain 3 to 512 characters")
		return
	}
	if len(input.Note) > 4000 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "note must not exceed 4000 characters")
		return
	}
	body, err := json.Marshal(map[string]string{
		"proofReference": input.ProofReference,
		"actorId":        actor.ID,
		"actorType":      "partner",
		"note":           input.Note,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode COD remittance")
		return
	}
	status, responseBody, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/cod-records/"+url.PathEscape(recordID)+"/remit",
		body,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT COD remittance failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(responseBody)
}
'''
    write(relative, source.rstrip() + block + "\n")


def register_partner_remit_route() -> None:
    relative = "services/dsh/backend/internal/http/cod_finance_routes.go"
    source = read(relative)
    route = '\tmux.HandleFunc("POST /dsh/partner/me/finance/cod-records/{recordId}/remit", s.handlePartnerRemitFinanceCodRecord)\n'
    if route not in source:
        anchor = '\tmux.HandleFunc("GET /dsh/partner/me/finance/cod-records", s.handlePartnerFinanceCodRecords)\n'
        source = replace_once(source, anchor, anchor + route, "partner COD remit route registration")
    write(relative, source)


def allow_partner_remit_proxy() -> None:
    relative = "services/dsh/backend/internal/wlt/finance_proxy.go"
    source = read(relative)
    anchor = '\t\t"/wlt/refunds/": {"approve": {}, "reject": {}, "complete": {}, "reconcile": {}},\n'
    entry = '\t\t"/wlt/cod-records/": {"remit": {}},\n'
    if entry not in source:
        source = replace_once(source, anchor, anchor + entry, "partner COD remit allowlist")
    write(relative, source)


def extend_cod_components() -> None:
    relative = "services/dsh/contracts/components/schemas/cod-custody.schemas.yaml"
    source = read(relative)
    if "RemitPartnerCodRecordRequest:\n" in source:
        return
    block = '''RemitPartnerCodRecordRequest:
  type: object
  additionalProperties: false
  required: [proofReference]
  properties:
    proofReference:
      type: string
      minLength: 3
      maxLength: 512
    note:
      type: string
      maxLength: 4000
CodRecord:
  type: object
  additionalProperties: true
  required: [id, orderId, partnerId, collectorId, collectorType, amountMinorUnits, currency, status]
  properties:
    id: { type: string }
    orderId: { type: string }
    partnerId: { type: string }
    captainId: { type: string }
    collectorId: { type: string }
    collectorType: { type: string }
    amountMinorUnits: { type: integer, format: int64 }
    currency: { type: string, minLength: 3, maxLength: 3 }
    status: { type: string, enum: [pending_collection, collected, remitted] }
CodCustodyEvidence:
  type: object
  additionalProperties: false
  required: [id, codRecordId, eventType, expectedAmountMinorUnits, actualAmountMinorUnits, differenceMinorUnits, currency, proofReference, actorId, actorType, note, correlationId, idempotencyKey, ledgerTransactionId, createdAt]
  properties:
    id: { type: string }
    codRecordId: { type: string }
    eventType: { type: string, enum: [collection, remittance] }
    expectedAmountMinorUnits: { type: integer, format: int64, minimum: 0 }
    actualAmountMinorUnits: { type: integer, format: int64, minimum: 0 }
    differenceMinorUnits: { type: integer, format: int64 }
    currency: { type: string, minLength: 3, maxLength: 3 }
    proofReference: { type: string }
    actorId: { type: string }
    actorType: { type: string }
    note: { type: string }
    correlationId: { type: string }
    idempotencyKey: { type: string }
    ledgerTransactionId: { type: string }
    createdAt: { type: string, format: date-time }
CodCustodyMutationResult:
  type: object
  additionalProperties: false
  required: [codRecord, custodyEvidence, replayed]
  properties:
    codRecord:
      $ref: "../../dsh.openapi.yaml#/components/schemas/CodRecord"
    custodyEvidence:
      $ref: "../../dsh.openapi.yaml#/components/schemas/CodCustodyEvidence"
    reconciliationCase:
      anyOf:
        - $ref: "../../dsh.openapi.yaml#/components/schemas/CodReconciliationCase"
        - type: "null"
    replayed: { type: boolean }
'''
    write(relative, source.rstrip() + "\n" + block)


def extend_cod_paths() -> None:
    relative = "services/dsh/contracts/paths/cod-custody.paths.yaml"
    source = read(relative)
    path = "/dsh/partner/me/finance/cod-records/{recordId}/remit:\n"
    if path in source:
        return
    block = '''
/dsh/partner/me/finance/cod-records/{recordId}/remit:
  post:
    tags: [dsh-partner]
    operationId: remitDshPartnerCodRecord
    security: [{ bearerAuth: [] }]
    parameters:
      - name: recordId
        in: path
        required: true
        schema: { type: string, minLength: 1 }
      - $ref: "../dsh.openapi.yaml#/components/parameters/CorrelationId"
      - $ref: "../dsh.openapi.yaml#/components/parameters/IdempotencyKey"
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: "../dsh.openapi.yaml#/components/schemas/RemitPartnerCodRecordRequest"
    responses:
      "200":
        description: Partner COD remittance committed by WLT or replayed idempotently.
        content:
          application/json:
            schema:
              $ref: "../dsh.openapi.yaml#/components/schemas/CodCustodyMutationResult"
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }
      "502": { $ref: "../dsh.openapi.yaml#/components/responses/ServiceUnavailable" }
'''
    write(relative, source.rstrip() + "\n" + block)


def index_partner_remit_and_components() -> None:
    relative = "services/dsh/contracts/dsh.openapi.yaml"
    source = read(relative)
    path_ref = '''  /dsh/partner/me/finance/cod-records/{recordId}/remit:
    $ref: "./paths/cod-custody.paths.yaml#/~1dsh~1partner~1me~1finance~1cod-records~1{recordId}~1remit"
'''
    if path_ref not in source:
        anchor = '''  /dsh/partner/me/finance/cod-records:
    $ref: "./paths/cod-custody.paths.yaml#/~1dsh~1partner~1me~1finance~1cod-records"
'''
        source = replace_once(source, anchor, anchor + path_ref, "partner COD remit entry path")

    schema_anchor = "  schemas:\n"
    names = ["RemitPartnerCodRecordRequest", "CodRecord", "CodCustodyEvidence", "CodCustodyMutationResult"]
    refs = "".join(
        f'    {name}:\n      $ref: "./components/schemas/cod-custody.schemas.yaml#/{name}"\n'
        for name in names
    )
    if "    RemitPartnerCodRecordRequest:\n" not in source:
        source = replace_once(source, schema_anchor, schema_anchor + refs, "partner COD remit schema index")
    write(relative, source)


def write_route_tests() -> None:
    content = '''package http

import (
	"net/http"
	"testing"
)

func TestPaymentRefreshAndPartnerCodRemitRoutesAreRegistered(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)
	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{method: http.MethodPost, path: "/dsh/control-panel/finance/payment-sessions/ps-1/refresh-provider-status", pattern: "POST /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/refresh-provider-status"},
		{method: http.MethodPost, path: "/dsh/partner/me/finance/cod-records/cod-1/remit", pattern: "POST /dsh/partner/me/finance/cod-records/{recordId}/remit"},
	}
	for _, tc := range cases {
		request, err := http.NewRequest(tc.method, tc.path, nil)
		if err != nil {
			t.Fatal(err)
		}
		_, pattern := router.Handler(request)
		if pattern != tc.pattern {
			t.Fatalf("expected route %q, got %q", tc.pattern, pattern)
		}
	}
}
'''
    write("services/dsh/backend/internal/http/payment_partner_cod_routes_test.go", content)


register_payment_refresh_route()
extend_payment_contract()
append_partner_remit_handler()
register_partner_remit_route()
allow_partner_remit_proxy()
extend_cod_components()
extend_cod_paths()
index_partner_remit_and_components()
write_route_tests()
print("payment refresh and partner COD remit repair: PASS")
