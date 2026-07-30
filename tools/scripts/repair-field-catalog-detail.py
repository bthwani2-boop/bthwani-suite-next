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


def update_frontend_binding() -> None:
    api_path = "services/dsh/frontend/shared/catalog/central-catalog.api.ts"
    source = read(api_path)
    source = replace_once(
        source,
        "export async function fetchMasterProductById(productId: string): Promise<MasterProduct> {",
        "export async function fetchFieldMasterProductById(productId: string): Promise<MasterProduct> {",
        "field product detail function name",
    )
    source = replace_once(
        source,
        "`/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}`",
        "`/dsh/field/catalog/master-products/${encodeURIComponent(productId)}`",
        "field product detail path",
    )
    write(api_path, source)

    screen_path = "services/dsh/frontend/app-field/components/DshFieldAssortmentPauseScreen.tsx"
    screen = read(screen_path)
    screen = replace_once(
        screen,
        'import { fetchMasterProductById } from "../../shared/catalog/central-catalog.api";',
        'import { fetchFieldMasterProductById } from "../../shared/catalog/central-catalog.api";',
        "field product detail import",
    )
    screen = replace_once(
        screen,
        "const product = await fetchMasterProductById(id);",
        "const product = await fetchFieldMasterProductById(id);",
        "field product detail call",
    )
    write(screen_path, screen)


def update_backend_route() -> None:
    relative = "services/dsh/backend/internal/http/catalog_unified_routes.go"
    source = read(relative)
    if "handleFieldGetCatalogMasterProduct" not in source:
        anchor = "// registerUnifiedCatalogRoutes is the final protected-route extension point.\n"
        handler = '''func (s *protectedStoreServer) handleFieldGetCatalogMasterProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "field"); !ok {
		return
	}
	product, err := centralcatalog.GetMasterProduct(r.Context(), s.db, r.PathValue("productId"))
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"masterProduct": product})
}

'''
        source = replace_once(source, anchor, handler + anchor, "field product handler anchor")

    route_anchor = '\tmux.HandleFunc("GET /dsh/field/catalog/master-products/{productId}/attribute-values", s.handleListMasterProductAttributeValues)\n'
    route = '\tmux.HandleFunc("GET /dsh/field/catalog/master-products/{productId}", s.handleFieldGetCatalogMasterProduct)\n'
    if route not in source:
        source = replace_once(source, route_anchor, route + route_anchor, "field product detail route anchor")
    write(relative, source)


def update_entry_contract() -> None:
    relative = "services/dsh/contracts/dsh.openapi.yaml"
    source = read(relative)
    route = "  /dsh/field/catalog/master-products/{productId}:\n"
    if route in source:
        return
    anchor = '''  /dsh/field/catalog/master-products:
    $ref: "./paths/catalog.paths.yaml#/~1dsh~1field~1catalog~1master-products"
'''
    addition = anchor + '''  /dsh/field/catalog/master-products/{productId}:
    $ref: "./paths/catalog.paths.yaml#/~1dsh~1field~1catalog~1master-products~1{productId}"
'''
    source = replace_once(source, anchor, addition, "DSH field product detail entry")
    write(relative, source)


def update_path_fragment() -> None:
    relative = "services/dsh/contracts/paths/catalog.paths.yaml"
    source = read(relative)
    path_item = "/dsh/field/catalog/master-products/{productId}:\n"
    if path_item in source:
        return
    anchor = '''/dsh/field/catalog/master-products:
  get:
'''
    if anchor not in source:
        raise RuntimeError("field master-products list path anchor is missing")
    insert_at = source.index(anchor)
    next_path = source.find("\n/dsh/", insert_at + len(anchor))
    if next_path < 0:
        next_path = len(source)
    detail = '''

/dsh/field/catalog/master-products/{productId}:
  get:
    operationId: getFieldCatalogMasterProduct
    tags: [CentralCatalog]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: productId
        in: path
        required: true
        schema: { type: string, minLength: 1 }
    responses:
      "200":
        description: Canonical master-product detail for an authenticated field actor.
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required: [masterProduct]
              properties:
                masterProduct:
                  $ref: "../dsh.openapi.yaml#/components/schemas/DshMasterProduct"
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
'''
    source = source[:next_path] + detail + source[next_path:]
    write(relative, source)


def update_catalog_module() -> None:
    relative = "services/dsh/contracts/dsh.catalog.openapi.yaml"
    source = read(relative)
    path_item = "  /dsh/field/catalog/master-products/{productId}:\n"
    if path_item in source:
        return
    anchor = "  /dsh/operator/catalog/product-proposals:\n"
    if anchor not in source:
        raise RuntimeError("catalog module insertion anchor is missing")
    detail = '''  /dsh/field/catalog/master-products/{productId}:
    get:
      operationId: getFieldCatalogMasterProduct
      tags: [CentralCatalog]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: productId
          in: path
          required: true
          schema: { type: string, minLength: 1 }
      responses:
        "200":
          description: Canonical master-product detail for an authenticated field actor.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MasterProductResponse"
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }

'''
    source = replace_once(source, anchor, detail + anchor, "catalog module field detail anchor")
    write(relative, source)


def write_route_test() -> None:
    relative = "services/dsh/backend/internal/http/field_catalog_detail_route_test.go"
    content = '''package http

import (
	"net/http"
	"testing"
)

func TestFieldCatalogMasterProductDetailRouteIsRegistered(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)
	request, err := http.NewRequest(http.MethodGet, "/dsh/field/catalog/master-products/mp-1", nil)
	if err != nil {
		t.Fatal(err)
	}
	_, pattern := router.Handler(request)
	const expected = "GET /dsh/field/catalog/master-products/{productId}"
	if pattern != expected {
		t.Fatalf("expected route %q, got %q", expected, pattern)
	}
}
'''
    write(relative, content)


update_frontend_binding()
update_backend_route()
update_entry_contract()
update_path_fragment()
update_catalog_module()
write_route_test()
print("field catalog detail repair transformation: PASS")
