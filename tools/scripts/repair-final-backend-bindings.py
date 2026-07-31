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


def normalize_refund_path_parameters() -> None:
    relative = "services/dsh/contracts/paths/refunds.paths.yaml"
    source = read(relative)
    replacements = {
        '      - $ref: "../dsh.openapi.yaml#/components/parameters/RefundId"\n': (
            "      - name: refundId\n"
            "        in: path\n"
            "        required: true\n"
            "        schema: { type: string, minLength: 1 }\n"
        ),
        '      - $ref: "../dsh.openapi.yaml#/components/parameters/OrderId"\n': (
            "      - name: orderId\n"
            "        in: path\n"
            "        required: true\n"
            "        schema: { type: string, format: uuid }\n"
        ),
    }
    for old, new in replacements.items():
        if old not in source:
            raise RuntimeError(f"refund parameter reference is missing: {old.strip()}")
        source = source.replace(old, new)
    write(relative, source)


def append_payout_transition_handlers() -> None:
    relative = "services/dsh/backend/internal/http/payout_routes.go"
    source = read(relative)
    if "handleFinancePayoutTransition" in source:
        return
    block = r'''

type payoutTransitionInput struct {
	IdempotencyKey string `json:"idempotencyKey"`
	Reason         string `json:"reason"`
	FailureReason  string `json:"failureReason"`
}

func (s *protectedStoreServer) handleFinancePayoutTransition(w http.ResponseWriter, r *http.Request, action string) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	payoutID := strings.TrimSpace(r.PathValue("payoutId"))
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	allowed := map[string]struct{}{
		"approve": {},
		"reject":  {},
		"process": {},
		"complete": {},
		"fail": {},
	}
	if _, ok := allowed[action]; !ok {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "unsupported payout transition")
		return
	}
	var input payoutTransitionInput
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout transition body is invalid")
		return
	}
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.Reason = strings.TrimSpace(input.Reason)
	input.FailureReason = strings.TrimSpace(input.FailureReason)
	if input.IdempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "idempotencyKey is required")
		return
	}
	if action == "reject" && input.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required for rejection")
		return
	}
	if action == "fail" && input.FailureReason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "failureReason is required")
		return
	}
	payload, err := json.Marshal(map[string]string{"operatorId": actor.ID})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode payout transition")
		return
	}
	correlationID := correlationForActorMutation(r, input.IdempotencyKey)
	status, body, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/payout-requests/"+url.PathEscape(payoutID)+"/"+action,
		payload,
		correlationID,
		operatorContextID,
	)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleApproveFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleFinancePayoutTransition(w, r, "approve")
}

func (s *protectedStoreServer) handleRejectFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleFinancePayoutTransition(w, r, "reject")
}

func (s *protectedStoreServer) handleProcessFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleFinancePayoutTransition(w, r, "process")
}

func (s *protectedStoreServer) handleCompleteFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleFinancePayoutTransition(w, r, "complete")
}

func (s *protectedStoreServer) handleFailFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleFinancePayoutTransition(w, r, "fail")
}

func registerPayoutFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/approve", s.handleApproveFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/reject", s.handleRejectFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/process", s.handleProcessFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/complete", s.handleCompleteFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/fail", s.handleFailFinancePayoutRequest)
}
'''
    write(relative, source.rstrip() + block + "\n")


def append_captain_cod_handlers() -> None:
    relative = "services/dsh/backend/internal/http/cod_finance_handlers.go"
    source = read(relative)
    if "handleCaptainCollectFinanceCodRecord" in source:
        return
    block = r'''

func (s *protectedStoreServer) requireCaptainCodRecord(w http.ResponseWriter, r *http.Request, captainID, recordID string) bool {
	status, body, err := s.wlt.FinanceReadCodRecord(r.Context(), recordID, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return false
	}
	if status < 200 || status >= 300 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write(body)
		return false
	}
	var envelope struct {
		CodRecord struct {
			CaptainID    string `json:"captainId"`
			CollectorID  string `json:"collectorId"`
			CollectorType string `json:"collectorType"`
		} `json:"codRecord"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_INVALID_RESPONSE", "WLT COD captain identity is invalid")
		return false
	}
	owned := strings.TrimSpace(envelope.CodRecord.CaptainID) == captainID ||
		(strings.TrimSpace(envelope.CodRecord.CollectorType) == "captain" && strings.TrimSpace(envelope.CodRecord.CollectorID) == captainID)
	if !owned {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "captain cannot access another collector's COD record")
		return false
	}
	return true
}

func (s *protectedStoreServer) handleCaptainCodMutation(w http.ResponseWriter, r *http.Request, action string) {
	actor, ok := s.requireActor(w, r, "captain")
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
	if !s.requireCaptainCodRecord(w, r, actor.ID, recordID) {
		return
	}
	var input struct {
		ActualAmountMinorUnits int64  `json:"actualAmountMinorUnits"`
		ProofReference        string `json:"proofReference"`
		Note                  string `json:"note"`
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
	if action == "collect" && input.ActualAmountMinorUnits <= 0 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actualAmountMinorUnits must be positive")
		return
	}
	if len(input.Note) > 4000 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "note must not exceed 4000 characters")
		return
	}
	payload := map[string]any{
		"proofReference": input.ProofReference,
		"actorId": actor.ID,
		"actorType": "captain",
		"note": input.Note,
	}
	if action == "collect" {
		payload["actualAmountMinorUnits"] = input.ActualAmountMinorUnits
	}
	body, err := json.Marshal(payload)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode COD mutation")
		return
	}
	status, responseBody, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/cod-records/"+url.PathEscape(recordID)+"/"+action,
		body,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT COD mutation failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(responseBody)
}

func (s *protectedStoreServer) handleCaptainCollectFinanceCodRecord(w http.ResponseWriter, r *http.Request) {
	s.handleCaptainCodMutation(w, r, "collect")
}

func (s *protectedStoreServer) handleCaptainRemitFinanceCodRecord(w http.ResponseWriter, r *http.Request) {
	s.handleCaptainCodMutation(w, r, "remit")
}
'''
    write(relative, source.rstrip() + block + "\n")

    routes_relative = "services/dsh/backend/internal/http/cod_finance_routes.go"
    routes = read(routes_relative)
    anchor = '\tmux.HandleFunc("GET /dsh/partner/me/finance/cod-records", s.handlePartnerFinanceCodRecords)\n'
    additions = (
        anchor
        + '\tmux.HandleFunc("POST /dsh/captain/finance/cod-records/{recordId}/collect", s.handleCaptainCollectFinanceCodRecord)\n'
        + '\tmux.HandleFunc("POST /dsh/captain/finance/cod-records/{recordId}/remit", s.handleCaptainRemitFinanceCodRecord)\n'
    )
    if "handleCaptainCollectFinanceCodRecord" not in routes:
        routes = replace_once(routes, anchor, additions, "captain COD routes")
    write(routes_relative, routes)


def allow_captain_cod_mutations() -> None:
    relative = "services/dsh/backend/internal/wlt/finance_proxy.go"
    source = read(relative)
    source = source.replace(
        '\t\t"/wlt/cod-records/": {"remit": {}},\n',
        '\t\t"/wlt/cod-records/": {"collect": {}, "remit": {}},\n',
    )
    if '"/wlt/cod-records/": {"collect": {}, "remit": {}}' not in source:
        anchor = '\t\t"/wlt/refunds/": {"approve": {}, "reject": {}, "complete": {}, "reconcile": {}},\n'
        source = replace_once(
            source,
            anchor,
            anchor + '\t\t"/wlt/cod-records/": {"collect": {}, "remit": {}},\n',
            "captain COD write allowlist",
        )
    write(relative, source)


def register_finance_extensions() -> None:
    relative = "services/dsh/backend/internal/http/catalog_unified_routes.go"
    source = read(relative)
    anchor = "\tregisterRefundFinanceRoutes(mux, s)\n"
    additions = anchor + "\tregisterPayoutFinanceRoutes(mux, s)\n\tregisterCodFinanceRoutes(mux, s)\n"
    if "registerPayoutFinanceRoutes(mux, s)" not in source:
        source = replace_once(source, anchor, additions, "finance registrar composition")
    write(relative, source)


def remove_unsupported_financial_contracts() -> None:
    unsupported = [
        "/dsh/control-panel/finance/settlements/from-delivered-orders",
        "/dsh/control-panel/finance/settlement-policies/{partnerId}",
        "/dsh/field/finance/payout-destinations/{destinationId}",
    ]
    frontend_root = ROOT / "services/dsh/frontend"
    for route in unsupported:
        literal = route.replace("{partnerId}", "").replace("{destinationId}", "")
        hits = []
        for path in frontend_root.rglob("*"):
            if path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
                continue
            if literal in path.read_text(encoding="utf-8"):
                hits.append(str(path.relative_to(ROOT)))
        if hits:
            raise RuntimeError(f"unsupported financial route still used by frontend: {route}: {hits}")

    entry_relative = "services/dsh/contracts/dsh.openapi.yaml"
    entry = read(entry_relative)
    entry_patterns = [
        r'  /dsh/control-panel/finance/settlements/from-delivered-orders:\n    \$ref: .*?\n',
        r'  /dsh/control-panel/finance/settlement-policies/\{partnerId\}:\n    \$ref: .*?\n',
        r'  /dsh/field/finance/payout-destinations/\{destinationId\}:\n    \$ref: .*?\n',
    ]
    for pattern in entry_patterns:
        entry, count = re.subn(pattern, "", entry, count=1)
        if count != 1:
            raise RuntimeError(f"entry path removal failed: {pattern}")
    write(entry_relative, entry)

    misc_relative = "services/dsh/contracts/paths/misc.paths.yaml"
    misc = read(misc_relative)
    start = misc.index("/dsh/control-panel/finance/settlements/from-delivered-orders:\n")
    end = misc.index("/dsh/control-panel/finance/reconciliation-cases:\n")
    if start < 0 or end <= start:
        raise RuntimeError("unsupported settlement blocks were not found")
    misc = misc[:start] + misc[end:]
    write(misc_relative, misc)

    field_relative = "services/dsh/contracts/paths/field.paths.yaml"
    field = read(field_relative)
    start = field.index("/dsh/field/finance/payout-destinations/{destinationId}:\n")
    end = field.index("/dsh/field/stores/{storeId}/visits:\n", start)
    if start < 0 or end <= start:
        raise RuntimeError("unsupported field payout-destination detail block was not found")
    field = field[:start] + field[end:]
    write(field_relative, field)


def rewrite_captain_cod_contracts() -> None:
    relative = "services/dsh/contracts/paths/captain.paths.yaml"
    source = read(relative)
    start = source.index("/dsh/captain/finance/cod-records/{recordId}/collect:\n")
    end = source.index("/dsh/operator/admin/captains:\n", start)
    if start < 0 or end <= start:
        raise RuntimeError("captain COD contract block was not found")
    block = '''/dsh/captain/finance/cod-records/{recordId}/collect:
  post:
    operationId: collectDshCaptainCodRecord
    summary: Captain records cash collection against their own WLT COD record.
    tags: [DshFinanceProxy]
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
            type: object
            additionalProperties: false
            required: [actualAmountMinorUnits, proofReference]
            properties:
              actualAmountMinorUnits: { type: integer, format: int64, minimum: 1 }
              proofReference: { type: string, minLength: 3, maxLength: 512 }
              note: { type: string, maxLength: 4000 }
    responses:
      "200": { description: COD collection committed by WLT or replayed idempotently. }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }
      "502": { $ref: "../dsh.openapi.yaml#/components/responses/ServiceUnavailable" }

/dsh/captain/finance/cod-records/{recordId}/remit:
  post:
    operationId: remitDshCaptainCodRecord
    summary: Captain records remittance against their own collected WLT COD record.
    tags: [DshFinanceProxy]
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
            type: object
            additionalProperties: false
            required: [proofReference]
            properties:
              proofReference: { type: string, minLength: 3, maxLength: 512 }
              note: { type: string, maxLength: 4000 }
    responses:
      "200": { description: COD remittance committed by WLT or replayed idempotently. }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }
      "502": { $ref: "../dsh.openapi.yaml#/components/responses/ServiceUnavailable" }

'''
    source = source[:start] + block + source[end:]
    write(relative, source)


def write_tests() -> None:
    route_test = '''package http

import (
	"net/http"
	"testing"
)

func TestFinalFinanceMutationRoutesAreRegistered(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)
	cases := []struct {
		path string
		pattern string
	}{
		{path: "/dsh/control-panel/finance/payout-requests/pay-1/approve", pattern: "POST /dsh/control-panel/finance/payout-requests/{payoutId}/approve"},
		{path: "/dsh/control-panel/finance/payout-requests/pay-1/reject", pattern: "POST /dsh/control-panel/finance/payout-requests/{payoutId}/reject"},
		{path: "/dsh/control-panel/finance/payout-requests/pay-1/process", pattern: "POST /dsh/control-panel/finance/payout-requests/{payoutId}/process"},
		{path: "/dsh/control-panel/finance/payout-requests/pay-1/complete", pattern: "POST /dsh/control-panel/finance/payout-requests/{payoutId}/complete"},
		{path: "/dsh/control-panel/finance/payout-requests/pay-1/fail", pattern: "POST /dsh/control-panel/finance/payout-requests/{payoutId}/fail"},
		{path: "/dsh/captain/finance/cod-records/cod-1/collect", pattern: "POST /dsh/captain/finance/cod-records/{recordId}/collect"},
		{path: "/dsh/captain/finance/cod-records/cod-1/remit", pattern: "POST /dsh/captain/finance/cod-records/{recordId}/remit"},
	}
	for _, tc := range cases {
		req, err := http.NewRequest(http.MethodPost, tc.path, nil)
		if err != nil { t.Fatal(err) }
		_, pattern := router.Handler(req)
		if pattern != tc.pattern { t.Fatalf("expected %q, got %q", tc.pattern, pattern) }
	}
}
'''
    write("services/dsh/backend/internal/http/final_finance_routes_test.go", route_test)


normalize_refund_path_parameters()
append_payout_transition_handlers()
append_captain_cod_handlers()
allow_captain_cod_mutations()
register_finance_extensions()
remove_unsupported_financial_contracts()
rewrite_captain_cod_contracts()
write_tests()
print("final backend binding repair: PASS")
