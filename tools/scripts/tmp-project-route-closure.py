from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"missing anchor: {label}")
    return text.replace(old, new, 1)


def remove_between(text: str, start_marker: str, end_marker: str, label: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        return text
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"missing end anchor: {label}")
    return text[:start] + text[end:]


# 1) Remove legacy duplicate catalog and incident surfaces from the root router.
server_path = Path("services/dsh/backend/internal/http/server.go")
server = server_path.read_text(encoding="utf-8")
server = remove_between(
    server,
    '\t// Central Catalog compatibility surface.\n',
    '\tregisterUnifiedCatalogRoutes(mux, protected)',
    "legacy catalog compatibility surface",
)
for legacy_incident_route in (
    '\tmux.HandleFunc("POST /dsh/operator/incidents", protected.handleCreateIncident)\n',
    '\tmux.HandleFunc("GET /dsh/operator/incidents", protected.handleListIncidents)\n',
    '\tmux.HandleFunc("PATCH /dsh/operator/incidents/{incidentId}", protected.handleUpdateIncident)\n',
):
    server = server.replace(legacy_incident_route, "")
server_path.write_text(server, encoding="utf-8")


# 2) Register governed incident routes explicitly so AST/runtime truth agree.
incidents_path = Path("services/dsh/backend/internal/http/governed_incidents.go")
incidents = incidents_path.read_text(encoding="utf-8")
registrar = '''func RegisterGovernedIncidentRoutes(
\tmux *http.ServeMux,
\tdb *sql.DB,
\tidentityClient *auth.Client,
\twltClient *wlt.Client,
\tmediaProvider *media.Provider,
) {
\tprotected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
\tmux.HandleFunc("GET /dsh/operator/support/incidents", protected.handleListGovernedIncidents)
\tmux.HandleFunc("POST /dsh/operator/support/incidents", protected.handleCreateGovernedIncident)
\tmux.HandleFunc("GET /dsh/operator/support/incidents/{incidentId}", protected.handleGetGovernedIncident)
\tmux.HandleFunc("PATCH /dsh/operator/support/incidents/{incidentId}", protected.handleUpdateGovernedIncident)
\tmux.HandleFunc("GET /dsh/operator/support/incidents/{incidentId}/events", protected.handleListGovernedIncidentEvents)
}

'''
if "func RegisterGovernedIncidentRoutes(" not in incidents:
    marker = "// GovernedIncidentMiddleware replaces the legacy incident CRUD at runtime"
    if marker not in incidents:
        raise SystemExit("missing governed incident registrar anchor")
    incidents = incidents.replace(marker, registrar + marker, 1)
incidents_path.write_text(incidents, encoding="utf-8")

main_path = Path("services/dsh/backend/cmd/dsh-api/main.go")
main = main_path.read_text(encoding="utf-8")
main = replace_once(
    main,
    "\tdshHttp.RegisterSupportMessageDeliveryRoutes(router, db, identityClient, wltClient, mediaProvider)\n",
    "\tdshHttp.RegisterSupportMessageDeliveryRoutes(router, db, identityClient, wltClient, mediaProvider)\n\tdshHttp.RegisterGovernedIncidentRoutes(router, db, identityClient, wltClient, mediaProvider)\n",
    "incident route registration",
)
old_middleware = '''\tgovernedIncidentRouter := dshHttp.GovernedIncidentMiddleware(
\t\tdb,
\t\tidentityClient,
\t\twltClient,
\t\tmediaProvider,
\t\tdeliveryExceptionGovernedRouter,
\t)
\thandler := dshHttp.CorsMiddleware(authMode, governedIncidentRouter)
'''
main = main.replace(old_middleware, "\thandler := dshHttp.CorsMiddleware(authMode, deliveryExceptionGovernedRouter)\n")
main_path.write_text(main, encoding="utf-8")


# 3) Remove superseded legacy incident paths from the modular primary contract.
support_paths = Path("services/dsh/contracts/paths/support.paths.yaml")
support = support_paths.read_text(encoding="utf-8")
support = remove_between(
    support,
    "/dsh/operator/incidents:\n",
    "# ── Platform Analytics & Operational Reporting",
    "legacy incident contract surface",
)
support_paths.write_text(support, encoding="utf-8")


# 4) Add a standalone contract for support message delivery extensions.
support_contract = Path("services/dsh/contracts/dsh.support-message-delivery.openapi.yaml")
support_contract.write_text('''openapi: 3.1.0
info:
  title: DSH Support Message Delivery API
  version: 1.0.0
  description: Actor-owned support attachment delivery and durable read receipts.
x-bthwani-owner: services/dsh
x-bthwani-journey: JRN-021
x-bthwani-contract-state: CONTRACT_ACTIVE
x-bthwani-runtime-dependency: true
x-bthwani-client-generation: DISABLED
x-bthwani-client-binding: MANUAL_TYPED_ADAPTER
servers:
  - url: http://localhost:58080
security:
  - bearerAuth: []
paths:
  /dsh/support/tickets/{ticketId}/messages/{messageId}/attachments:
    parameters:
      - $ref: '#/components/parameters/TicketId'
      - $ref: '#/components/parameters/MessageId'
    get:
      operationId: listDshActorSupportMessageAttachments
      responses:
        '200': { description: Actor-visible message attachments }
        '403': { description: Actor does not own the ticket }
        '404': { description: Ticket or message not found }
    post:
      operationId: attachDshActorSupportMessageAsset
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/AttachmentInput' }
      responses:
        '201': { description: Attachment linked to the message }
        '403': { description: Actor does not own the ticket }
        '404': { description: Ticket or message not found }
  /dsh/support/tickets/{ticketId}/messages/read:
    parameters:
      - $ref: '#/components/parameters/TicketId'
    post:
      operationId: markDshActorSupportMessagesRead
      responses:
        '200': { description: Durable actor read receipt }
        '403': { description: Actor does not own the ticket }
  /dsh/operator/support/tickets/{ticketId}/messages/{messageId}/attachments:
    parameters:
      - $ref: '#/components/parameters/TicketId'
      - $ref: '#/components/parameters/MessageId'
    get:
      operationId: listDshOperatorSupportMessageAttachments
      responses:
        '200': { description: Operator-visible message attachments }
        '403': { description: Missing support read permission }
    post:
      operationId: attachDshOperatorSupportMessageAsset
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/AttachmentInput' }
      responses:
        '201': { description: Operator attachment linked to the message }
        '403': { description: Missing support manage permission }
  /dsh/operator/support/tickets/{ticketId}/messages/read:
    parameters:
      - $ref: '#/components/parameters/TicketId'
    post:
      operationId: markDshOperatorSupportMessagesRead
      responses:
        '200': { description: Durable operator read receipt }
        '403': { description: Missing support read permission }
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  parameters:
    TicketId: { name: ticketId, in: path, required: true, schema: { type: string, minLength: 1 } }
    MessageId: { name: messageId, in: path, required: true, schema: { type: string, minLength: 1 } }
  schemas:
    AttachmentInput:
      type: object
      additionalProperties: false
      required: [mediaAssetId, fileName, mimeType, sizeBytes]
      properties:
        mediaAssetId: { type: string, minLength: 1 }
        fileName: { type: string, minLength: 1 }
        mimeType: { type: string, minLength: 1 }
        sizeBytes: { type: integer, minimum: 1 }
        isInternal: { type: boolean, default: false }
''', encoding="utf-8")


# 5) Add the DSH JRN-038 proxy contract for COD custody and reconciliation.
cod_contract = Path("services/dsh/contracts/dsh.jrn-038-cod-custody.openapi.yaml")
cod_contract.write_text('''openapi: 3.1.0
info:
  title: DSH JRN-038 COD Custody Proxy API
  version: 1.0.0
  description: Surface-scoped DSH proxy routes for WLT-owned COD custody and reconciliation truth.
x-bthwani-owner: services/dsh
x-bthwani-journey: JRN-038
x-bthwani-contract-state: CONTRACT_ACTIVE
x-bthwani-runtime-dependency: true
x-bthwani-client-generation: DISABLED
x-bthwani-client-binding: MANUAL_TYPED_ADAPTER
servers:
  - url: http://localhost:58080
security:
  - bearerAuth: []
paths:
  /dsh/control-panel/finance/cod-reconciliation-cases:
    get:
      operationId: listDshControlPanelCodReconciliationCases
      responses:
        '200': { description: WLT COD reconciliation cases }
        '403': { description: Missing finance read permission }
        '502': { description: WLT unavailable }
  /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign:
    post:
      operationId: assignDshControlPanelCodReconciliationCase
      parameters:
        - $ref: '#/components/parameters/CaseId'
      responses:
        '200': { description: COD case assignment readback }
        '403': { description: Missing finance manage permission }
        '409': { description: Assignment conflict }
        '502': { description: WLT unavailable }
  /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/resolve:
    post:
      operationId: resolveDshControlPanelCodReconciliationCase
      parameters:
        - $ref: '#/components/parameters/CaseId'
      responses:
        '200': { description: COD case resolution readback }
        '403': { description: Missing finance manage permission }
        '409': { description: Resolution conflict }
        '502': { description: WLT unavailable }
  /dsh/partner/me/finance/cod-records:
    get:
      operationId: listDshPartnerCodRecords
      responses:
        '200': { description: Partner-owned COD records }
        '403': { description: Actor is not a partner }
        '502': { description: WLT unavailable }
  /dsh/partner/me/finance/cod-records/{recordId}/remit:
    post:
      operationId: remitDshPartnerCodRecord
      parameters:
        - $ref: '#/components/parameters/RecordId'
      responses:
        '200': { description: Partner COD remittance readback }
        '403': { description: Actor is not the owning partner }
        '409': { description: Invalid custody transition }
        '502': { description: WLT unavailable }
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  parameters:
    CaseId: { name: caseId, in: path, required: true, schema: { type: string, minLength: 1 } }
    RecordId: { name: recordId, in: path, required: true, schema: { type: string, minLength: 1 } }
''', encoding="utf-8")


# 6) Register the new standalone contracts.
registry_path = Path("services/dsh/contracts/contract-registry.ts")
registry = registry_path.read_text(encoding="utf-8")
if '| "dsh-support-message-delivery"' not in registry:
    registry = registry.replace(
        '    | "dsh-support-governance"\n',
        '    | "dsh-support-governance"\n    | "dsh-support-message-delivery"\n',
        1,
    )
if '| "dsh-cod-custody"' not in registry:
    registry = registry.replace(
        '    | "dsh-payout-destinations"\n',
        '    | "dsh-payout-destinations"\n    | "dsh-cod-custody"\n',
        1,
    )
if 'id: "dsh-cod-custody"' not in registry:
    anchor = '''  {
    id: "dsh-payout-destinations",
    path: "contracts/dsh.jrn-037-payouts-destinations.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/finance-wlt-link/jrn037",
  },
'''
    entry = anchor + '''  {
    id: "dsh-cod-custody",
    path: "contracts/dsh.jrn-038-cod-custody.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/finance-wlt-link/wlt-cod",
  },
'''
    registry = replace_once(registry, anchor, entry, "COD contract registry")
if 'id: "dsh-support-message-delivery"' not in registry:
    anchor = '''  {
    id: "dsh-support-governance",
    path: "contracts/dsh.partner-support.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/support",
  },
'''
    if anchor not in registry:
        # Current registry may use a different support-governance path; insert before notifications.
        notifications = '  {\n    id: "dsh-notifications-governance",\n'
        idx = registry.find(notifications)
        if idx < 0:
            raise SystemExit("missing support registry insertion anchor")
        entry = '''  {
    id: "dsh-support-message-delivery",
    path: "contracts/dsh.support-message-delivery.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/support",
  },
'''
        registry = registry[:idx] + entry + registry[idx:]
    else:
        registry = registry.replace(anchor, anchor + '''  {
    id: "dsh-support-message-delivery",
    path: "contracts/dsh.support-message-delivery.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/support",
  },
''', 1)
registry_path.write_text(registry, encoding="utf-8")


# 7) Register the existing WLT payment-session contract with backend parity.
backend_gate_path = Path("tools/guards/backend-api-binding-gate.mjs")
backend_gate = backend_gate_path.read_text(encoding="utf-8")
if 'services/wlt/contracts/wlt.payments.openapi.yaml' not in backend_gate:
    backend_gate = backend_gate.replace(
        '      "services/wlt/contracts/wlt.promotion-funding.openapi.yaml",\n',
        '      "services/wlt/contracts/wlt.promotion-funding.openapi.yaml",\n      "services/wlt/contracts/wlt.payments.openapi.yaml",\n',
        1,
    )
backend_gate_path.write_text(backend_gate, encoding="utf-8")


# 8) Close JRN-038 financial gate metadata without enabling the route by default.
wlt_cod_path = Path("services/wlt/contracts/jrn-038-cod-custody.openapi.yaml")
wlt_cod = wlt_cod_path.read_text(encoding="utf-8")
for operation_id in ("collectWltCodRecord", "remitWltCodRecord"):
    marker = f"      operationId: {operation_id}\n"
    metadata = marker + "      x-bthwani-mutation-approved: false\n      x-bthwani-default-enabled: false\n"
    if metadata not in wlt_cod:
        wlt_cod = replace_once(wlt_cod, marker, metadata, operation_id)
wlt_cod_path.write_text(wlt_cod, encoding="utf-8")


# 9) Avoid cross-contract operationId collisions while keeping paths unchanged.
catalog_contract_path = Path("services/dsh/contracts/dsh.catalog.openapi.yaml")
catalog_contract = catalog_contract_path.read_text(encoding="utf-8")
catalog_contract = catalog_contract.replace(
    "operationId: updatePartnerProductProposal",
    "operationId: updateCatalogPartnerProductProposal",
    1,
)
catalog_contract = catalog_contract.replace(
    "operationId: updateFieldProductProposal",
    "operationId: updateCatalogFieldProductProposal",
    1,
)
catalog_contract_path.write_text(catalog_contract, encoding="utf-8")
