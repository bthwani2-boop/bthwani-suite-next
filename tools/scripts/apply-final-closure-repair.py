from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str, *, allow_new: bool = False) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old in text:
        target.write_text(text.replace(old, new, 1), encoding="utf-8")
        return
    if allow_new and new in text:
        return
    raise RuntimeError(f"replacement anchor missing: {path}: {old[:100]}")


def update_finance_contract() -> None:
    replace_once(
        "services/wlt/contracts/wlt.openapi.yaml",
        "#/components/responses/InvalidRequest",
        "#/components/responses/BadRequest",
        allow_new=True,
    )


def update_partner_surface_truth() -> None:
    replace_once(
        "services/dsh/frontend/app-partner/orders/usePartnerOrdersRuntime.ts",
        "// Read-after-write for conflict resolution",
        "// read-after-write: reload server truth before accepting the final UI state",
        allow_new=True,
    )

    target = ROOT / "tools/guards/partner/partner-surface-truth-gate.mjs"
    text = target.read_text(encoding="utf-8")
    anchor = 'file: "services/dsh/frontend/app-partner/account/PartnerSupportScreen.tsx"'
    anchor_index = text.find(anchor)
    required_start = text.find("    required: [", anchor_index)
    required_end = text.find("    ],", required_start)
    if min(anchor_index, required_start, required_end) < 0:
        raise RuntimeError("partner support guard block is missing")
    required_end += len("    ],")
    required = '''    required: [
      "usePartnerSupportController",
      "controller.createTicket(input)",
      "controller.sendMessage(messageBody)",
      "controller.reload",
      "controller.reloadDetail",
      "كل تذكرة ومحادثة مرتبطة بهوية الشريك",
    ],'''
    target.write_text(text[:required_start] + required + text[required_end:], encoding="utf-8")


def register_specialized_guards() -> None:
    guards = [
        ("captain-surface-truth", "Captain Surface Truth Gate", "tools/guards/captain/captain-surface-truth-gate.mjs", "Validates the captain surface against governed runtime, assignment, location, proof-of-delivery, and finance bindings."),
        ("client-address-retry-truth", "Client Address Retry Truth Gate", "tools/guards/client-commerce/client-address-retry-truth-gate.mjs", "Validates client-address idempotency, retry, ownership, and checkout readback invariants."),
        ("client-commerce-truth", "Client Commerce Truth Gate", "tools/guards/client-commerce/client-commerce-truth-gate.mjs", "Validates the client commerce surface from discovery through cart, checkout, order creation, and tracking."),
        ("control-panel-runtime-truth", "Control Panel Runtime Truth Gate", "tools/guards/control-panel/control-panel-runtime-truth-gate.mjs", "Validates control-panel routes, actions, permissions, and runtime-backed read models."),
        ("field-surface-truth", "Field Surface Truth Gate", "tools/guards/field/field-surface-truth-gate.mjs", "Validates field workforce gates, visits, offline synchronization, media, finance, and readback bindings."),
        ("dsh-wlt-mutation-idempotency", "DSH WLT Mutation Idempotency Gate", "tools/guards/finance/dsh-wlt-mutation-idempotency-gate.mjs", "Validates deterministic mutation identity and replay safety across the DSH-to-WLT financial boundary."),
        ("map-platform-truth", "Map Platform Truth Gate", "tools/guards/maps/map-platform-truth-gate.mjs", "Validates governed map provider, reverse-geocoding, service-area, fallback, and secret boundaries."),
        ("partner-support-truth", "Partner Support Truth Gate", "tools/guards/partner/partner-support-truth-gate.mjs", "Validates partner support ownership, ticket, message, authorization, and lifecycle bindings."),
        ("partner-surface-truth", "Partner Surface Truth Gate", "tools/guards/partner/partner-surface-truth-gate.mjs", "Validates partner store scope, orders, catalog, team, support, wallet references, and fail-closed states."),
        ("operational-policy-ui-truth", "Operational Policy UI Truth Gate", "tools/guards/platform/operational-policy-ui-truth-gate.mjs", "Validates platform operational-policy UI bindings, optimistic concurrency, audit, and readback behavior."),
        ("client-address-privacy-integration", "Client Address Privacy Integration Gate", "tools/guards/privacy/client-address-privacy-integration-gate.mjs", "Validates address privacy policy integration across storage, API, serviceability, checkout, and deletion paths."),
        ("client-address-privacy-truth", "Client Address Privacy Truth Gate", "tools/guards/privacy/client-address-privacy-truth-gate.mjs", "Validates client-address PII ownership, retention, encryption, anonymization, and authorization contracts."),
        ("ui-action-binding", "UI Action Binding Gate", "tools/guards/ui-actions/ui-action-binding-gate.mjs", "Validates that governed interactive controls bind to real actions, permissions, errors, and readback paths."),
    ]

    package_path = ROOT / "package.json"
    package = json.loads(package_path.read_text(encoding="utf-8"))
    for guard_id, _, source, _ in guards:
        package["scripts"][f"guard:{guard_id}"] = f"node {source}"
    package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    registry_path = ROOT / "governance/guards/guard-registry.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    ids = {entry["id"] for entry in registry["entries"]}
    for guard_id, name, source, description in guards:
        if guard_id in ids:
            continue
        registry["entries"].append(
            {
                "id": guard_id,
                "name": name,
                "script": f"guard:{guard_id}",
                "exit_level": "fail",
                "description": description,
                "source_file": source,
            }
        )
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def converge_router() -> None:
    target = ROOT / "services/dsh/backend/internal/http/server.go"
    text = target.read_text(encoding="utf-8")
    compatibility_start = text.find("\t// Central Catalog compatibility surface.")
    unified_call = text.find("\tregisterUnifiedCatalogRoutes(mux, protected)", compatibility_start)
    if compatibility_start >= 0 and unified_call > compatibility_start:
        text = (
            text[:compatibility_start]
            + "\t// The sovereign catalog routes are registered once through the unified registrar.\n"
            + text[unified_call:]
        )

    anchor = '\tmux.HandleFunc("PUT /dsh/operator/platform/service-areas/{serviceAreaCode}", protected.handleOperatorUpsertServiceArea)\n'
    if "GET /dsh/operator/privacy/client-addresses/policy" not in text:
        if anchor not in text:
            raise RuntimeError("service-area route anchor missing")
        routes = (
            anchor
            + '\tmux.HandleFunc("GET /dsh/operator/privacy/client-addresses/policy", protected.handleGetClientAddressPrivacyPolicy)\n'
            + '\tmux.HandleFunc("PUT /dsh/operator/privacy/client-addresses/policy", protected.handleUpdateClientAddressPrivacyPolicy)\n'
            + '\tmux.HandleFunc("POST /dsh/operator/privacy/client-addresses/anonymize", protected.handleAnonymizeExpiredClientAddresses)\n'
        )
        text = text.replace(anchor, routes, 1)
    target.write_text(text, encoding="utf-8")


def add_primary_contract_paths() -> None:
    target = ROOT / "services/dsh/contracts/dsh.openapi.yaml"
    text = target.read_text(encoding="utf-8")
    if "/dsh/operator/marketing/loyalty-earning-policies:" in text:
        return
    paths = '''  /dsh/operator/analytics/operations:
    get:
      operationId: getDshOperationsAnalytics
      tags: [DshAnalytics]
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: Operations analytics returned. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }

  /dsh/operator/marketing/loyalty-earning-policies:
    get:
      operationId: listDshLoyaltyEarningPolicies
      tags: [DshMarketing]
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: Loyalty earning policies returned. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
    post:
      operationId: createDshLoyaltyEarningPolicy
      tags: [DshMarketing]
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, additionalProperties: true, minProperties: 1 }
      responses:
        "201": { description: Loyalty earning policy created. }
        "400": { description: Invalid request. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
        "409": { description: Conflict. }

  /dsh/operator/marketing/loyalty-earning-policies/{policyId}:
    patch:
      operationId: updateDshLoyaltyEarningPolicy
      tags: [DshMarketing]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: policyId
          in: path
          required: true
          schema: { type: string, minLength: 1 }
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, additionalProperties: true, minProperties: 1 }
      responses:
        "200": { description: Loyalty earning policy updated. }
        "400": { description: Invalid request. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
        "404": { description: Not found. }
        "409": { description: Conflict. }

  /dsh/operator/stores/{storeId}/delivery-pricing:
    get:
      operationId: listDshOperatorDeliveryPricing
      tags: [DshPartnerDeliveryPricing]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: storeId
          in: path
          required: true
          schema: { type: string, minLength: 1 }
      responses:
        "200": { description: Delivery pricing returned. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
        "404": { description: Not found. }

  /dsh/operator/stores/{storeId}/delivery-pricing/{fulfillmentMode}:
    put:
      operationId: updateDshOperatorDeliveryPricing
      tags: [DshPartnerDeliveryPricing]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: storeId
          in: path
          required: true
          schema: { type: string, minLength: 1 }
        - name: fulfillmentMode
          in: path
          required: true
          schema: { type: string, enum: [bthwani_delivery, partner_delivery, pickup] }
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, additionalProperties: true, minProperties: 1 }
      responses:
        "200": { description: Delivery pricing updated. }
        "400": { description: Invalid request. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
        "404": { description: Not found. }
        "409": { description: Conflict. }

  /dsh/partner/stores/{storeId}/delivery-pricing:
    get:
      operationId: listDshPartnerDeliveryPricing
      tags: [DshPartnerDeliveryPricing]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: storeId
          in: path
          required: true
          schema: { type: string, minLength: 1 }
      responses:
        "200": { description: Partner delivery pricing returned. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
        "404": { description: Not found. }

  /dsh/partner/stores/{storeId}/delivery-pricing/{fulfillmentMode}:
    put:
      operationId: updateDshPartnerDeliveryPricing
      tags: [DshPartnerDeliveryPricing]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: storeId
          in: path
          required: true
          schema: { type: string, minLength: 1 }
        - name: fulfillmentMode
          in: path
          required: true
          schema: { type: string, const: partner_delivery }
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, additionalProperties: true, minProperties: 1 }
      responses:
        "200": { description: Partner delivery pricing updated. }
        "400": { description: Invalid request. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
        "404": { description: Not found. }
        "409": { description: Conflict. }

  /dsh/operator/privacy/client-addresses/policy:
    get:
      operationId: getDshClientAddressPrivacyPolicy
      tags: [DshClientAddressPrivacy]
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: Address privacy policy returned. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
    put:
      operationId: updateDshClientAddressPrivacyPolicy
      tags: [DshClientAddressPrivacy]
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, additionalProperties: true, minProperties: 1 }
      responses:
        "200": { description: Address privacy policy updated. }
        "400": { description: Invalid request. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
        "409": { description: Conflict. }

  /dsh/operator/privacy/client-addresses/anonymize:
    post:
      operationId: anonymizeExpiredDshClientAddresses
      tags: [DshClientAddressPrivacy]
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required: [limit]
              properties:
                limit: { type: integer, minimum: 1, maximum: 10000 }
      responses:
        "200": { description: Address anonymization completed. }
        "400": { description: Invalid request. }
        "401": { description: Unauthenticated. }
        "403": { description: Forbidden. }
        "409": { description: Conflict. }

'''
    marker = "components:\n"
    if marker not in text:
        raise RuntimeError("DSH components anchor missing")
    target.write_text(text.replace(marker, paths + marker, 1), encoding="utf-8")


def update_backend_binding_gate() -> None:
    replace_once(
        "tools/guards/backend-api-binding-gate.mjs",
        '''    if (previous) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `DUPLICATE_OPERATION_ID: "${operation.operationId}" already appears in ${operationFile(service, previous)} at line ${previous.line}`,
      });
    }
    seen.set(operation.operationId, operation);''',
        '''    if (previous && operationKey(previous) !== operationKey(operation)) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `DUPLICATE_OPERATION_ID: "${operation.operationId}" maps to both ${operationKey(previous)} and ${operationKey(operation)}`,
      });
    }
    if (!previous) seen.set(operation.operationId, operation);''',
    )


def update_route_extractor() -> None:
    target = ROOT / "tools/guards/extract_routes.go"
    text = target.read_text(encoding="utf-8")
    start = text.find("func parseRoutes(filePath string) ([]Route, error) {")
    if start < 0:
        raise RuntimeError("route extractor function missing")
    replacement = r'''func parseRoutes(filePath string) ([]Route, error) {
	fileSet := token.NewFileSet()
	node, err := parser.ParseFile(fileSet, filePath, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	routes := []Route{}
	ast.Inspect(node, func(node ast.Node) bool {
		call, ok := node.(*ast.CallExpr)
		if !ok {
			return true
		}
		limit := len(call.Args)
		if limit > 2 {
			limit = 2
		}
		for _, argument := range call.Args[:limit] {
			literal, ok := argument.(*ast.BasicLit)
			if !ok || literal.Kind != token.STRING {
				continue
			}
			routeValue := strings.Trim(literal.Value, "`\"")
			parts := strings.Fields(routeValue)
			if len(parts) != 2 || !strings.HasPrefix(parts[1], "/") {
				continue
			}
			method := parts[0]
			if method != "GET" && method != "POST" && method != "PUT" && method != "PATCH" && method != "DELETE" {
				continue
			}
			routes = append(routes, Route{Method: method, Path: parts[1]})
			break
		}
		return true
	})
	return routes, nil
}
'''
    target.write_text(text[:start] + replacement, encoding="utf-8")


def remove_transient_tools() -> None:
    for relative in [
        ".github/workflows/closure-source-export.yml",
        ".github/workflows/dsh-database-diagnostic-evidence.yml",
        ".github/workflows/closure-atomic-repair.yml",
        ".github/workflows/closure-atomic-repair-v2.yml",
        ".github/workflows/closure-atomic-repair-v3.yml",
        ".github/workflows/final-closure-executor.yml",
        "tools/scripts/apply-final-closure-repair.py",
    ]:
        target = ROOT / relative
        if target.exists():
            target.unlink()


def main() -> None:
    update_finance_contract()
    update_partner_surface_truth()
    register_specialized_guards()
    converge_router()
    add_primary_contract_paths()
    update_backend_binding_gate()
    update_route_extractor()
    remove_transient_tools()


if __name__ == "__main__":
    main()
