from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"missing anchor: {label}")
    return text.replace(old, new, 1)


def remove_between(text: str, start: str, end: str, label: str) -> str:
    left = text.find(start)
    if left < 0:
        return text
    right = text.find(end, left)
    if right < 0:
        raise SystemExit(f"missing end anchor: {label}")
    return text[:left] + text[right:]


server_path = Path("services/dsh/backend/internal/http/server.go")
server = server_path.read_text(encoding="utf-8")
server = remove_between(
    server,
    '\t// Central Catalog compatibility surface.\n',
    '\tregisterUnifiedCatalogRoutes(mux, protected)',
    "catalog compatibility",
)
for line in (
    '\tmux.HandleFunc("POST /dsh/operator/incidents", protected.handleCreateIncident)\n',
    '\tmux.HandleFunc("GET /dsh/operator/incidents", protected.handleListIncidents)\n',
    '\tmux.HandleFunc("PATCH /dsh/operator/incidents/{incidentId}", protected.handleUpdateIncident)\n',
):
    server = server.replace(line, "")
server_path.write_text(server, encoding="utf-8")

incidents_path = Path("services/dsh/backend/internal/http/governed_incidents.go")
incidents = incidents_path.read_text(encoding="utf-8")
if "func RegisterGovernedIncidentRoutes(" not in incidents:
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
    incidents = replace_once(
        incidents,
        "// GovernedIncidentMiddleware replaces the legacy incident CRUD at runtime",
        registrar + "// GovernedIncidentMiddleware replaces the legacy incident CRUD at runtime",
        "incident registrar",
    )
incidents_path.write_text(incidents, encoding="utf-8")

main_path = Path("services/dsh/backend/cmd/dsh-api/main.go")
main = main_path.read_text(encoding="utf-8")
main = replace_once(
    main,
    "\tdshHttp.RegisterSupportMessageDeliveryRoutes(router, db, identityClient, wltClient, mediaProvider)\n",
    "\tdshHttp.RegisterSupportMessageDeliveryRoutes(router, db, identityClient, wltClient, mediaProvider)\n\tdshHttp.RegisterGovernedIncidentRoutes(router, db, identityClient, wltClient, mediaProvider)\n",
    "incident registration call",
)
main = main.replace(
    '''\tgovernedIncidentRouter := dshHttp.GovernedIncidentMiddleware(
\t\tdb,
\t\tidentityClient,
\t\twltClient,
\t\tmediaProvider,
\t\tdeliveryExceptionGovernedRouter,
\t)
\thandler := dshHttp.CorsMiddleware(authMode, governedIncidentRouter)
''',
    "\thandler := dshHttp.CorsMiddleware(authMode, deliveryExceptionGovernedRouter)\n",
)
main_path.write_text(main, encoding="utf-8")

support_path = Path("services/dsh/contracts/paths/support.paths.yaml")
support = support_path.read_text(encoding="utf-8")
support = remove_between(
    support,
    "/dsh/operator/incidents:\n",
    "# ── Platform Analytics & Operational Reporting",
    "legacy incident contract",
)
support_path.write_text(support, encoding="utf-8")

root_contract_path = Path("services/dsh/contracts/dsh.openapi.yaml")
root_contract = root_contract_path.read_text(encoding="utf-8")
root_contract = root_contract.replace(
    '  /dsh/operator/workforce/media/uploads:\n    $ref: "./paths/workforce.paths.yaml#/~1dsh~1operator~1workforce~1media~1uploads"\n',
    "",
)
root_contract = root_contract.replace(
    "  /dsh/stores/{storeId}/images/{role}:\n    $ref: \"./paths/catalog.paths.yaml#/~1dsh~1stores~1{storeId}~1images~1{role}\"\n",
    "  /dsh/operator/catalog/stores/{storeId}/images/{role}:\n    $ref: \"./paths/catalog.paths.yaml#/~1dsh~1operator~1catalog~1stores~1{storeId}~1images~1{role}\"\n",
)
root_contract_path.write_text(root_contract, encoding="utf-8")

catalog_paths_path = Path("services/dsh/contracts/paths/catalog.paths.yaml")
catalog_paths = catalog_paths_path.read_text(encoding="utf-8")
catalog_paths = catalog_paths.replace(
    "/dsh/stores/{storeId}/images/{role}:\n",
    "/dsh/operator/catalog/stores/{storeId}/images/{role}:\n",
    1,
)
for path_key in (
    "/dsh/partner/catalog/product-proposals/{proposalId}:\n",
    "/dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}:\n",
):
    start = catalog_paths.find(path_key)
    if start >= 0:
        method = catalog_paths.find("  put:\n", start)
        next_path = catalog_paths.find("\n/dsh/", start + len(path_key))
        if method >= 0 and (next_path < 0 or method < next_path):
            catalog_paths = catalog_paths[:method] + "  patch:\n" + catalog_paths[method + len("  put:\n"):]
catalog_paths_path.write_text(catalog_paths, encoding="utf-8")

catalog_contract_path = Path("services/dsh/contracts/dsh.catalog.openapi.yaml")
catalog_contract = catalog_contract_path.read_text(encoding="utf-8")
catalog_contract = catalog_contract.replace("operationId: updatePartnerProductProposal", "operationId: updateCatalogPartnerProductProposal", 1)
catalog_contract = catalog_contract.replace("operationId: updateFieldProductProposal", "operationId: updateCatalogFieldProductProposal", 1)
catalog_contract_path.write_text(catalog_contract, encoding="utf-8")

registry_path = Path("services/dsh/contracts/contract-registry.ts")
registry = registry_path.read_text(encoding="utf-8")
if '| "dsh-support-message-delivery"' not in registry:
    registry = registry.replace('    | "dsh-support-governance"\n', '    | "dsh-support-governance"\n    | "dsh-support-message-delivery"\n', 1)
if '| "dsh-cod-custody"' not in registry:
    registry = registry.replace('    | "dsh-payout-destinations"\n', '    | "dsh-payout-destinations"\n    | "dsh-cod-custody"\n', 1)
if 'id: "dsh-cod-custody"' not in registry:
    marker = '  {\n    id: "dsh-marketing-commercial",\n'
    idx = registry.find(marker)
    if idx < 0:
        raise SystemExit("missing COD registry insertion point")
    registry = registry[:idx] + '''  {
    id: "dsh-cod-custody",
    path: "contracts/dsh.jrn-038-cod-custody.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/finance-wlt-link/wlt-cod",
  },
''' + registry[idx:]
if 'id: "dsh-support-message-delivery"' not in registry:
    marker = '  {\n    id: "dsh-notifications-governance",\n'
    idx = registry.find(marker)
    if idx < 0:
        raise SystemExit("missing support registry insertion point")
    registry = registry[:idx] + '''  {
    id: "dsh-support-message-delivery",
    path: "contracts/dsh.support-message-delivery.openapi.yaml",
    state: "CONTRACT_ACTIVE",
    runtimeDependency: true,
    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",
    adapterOwner: "frontend/shared/support",
  },
''' + registry[idx:]
registry_path.write_text(registry, encoding="utf-8")

backend_path = Path("tools/guards/backend-api-binding-gate.mjs")
backend = backend_path.read_text(encoding="utf-8")
if 'services/wlt/contracts/wlt.payments.openapi.yaml' not in backend:
    backend = backend.replace(
        '      "services/wlt/contracts/wlt.promotion-funding.openapi.yaml",\n',
        '      "services/wlt/contracts/wlt.promotion-funding.openapi.yaml",\n      "services/wlt/contracts/wlt.payments.openapi.yaml",\n',
        1,
    )
backend_path.write_text(backend, encoding="utf-8")

wlt_cod_path = Path("services/wlt/contracts/jrn-038-cod-custody.openapi.yaml")
wlt_cod = wlt_cod_path.read_text(encoding="utf-8")
for operation in ("collectCodCustody", "remitCodCustody"):
    marker = f"      operationId: {operation}\n"
    if marker + "      x-bthwani-mutation-approved:" not in wlt_cod:
        wlt_cod = replace_once(
            wlt_cod,
            marker,
            marker + "      x-bthwani-mutation-approved: false\n      x-bthwani-default-enabled: false\n",
            operation,
        )
wlt_cod_path.write_text(wlt_cod, encoding="utf-8")
