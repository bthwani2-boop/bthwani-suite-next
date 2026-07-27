from __future__ import annotations

import json
from pathlib import Path

CATALOG_PATH = Path("services/dsh/contracts/paths/catalog.paths.yaml")
ROOT_PATH = Path("services/dsh/contracts/dsh.openapi.yaml")
MANIFEST_PATH = Path("services/dsh/contracts/dsh.modular.manifest.json")

BATCH_KEY = "/dsh/field/partners/{partnerId}/stores/{storeId}/assortment/batch:"
BATCH_BLOCK = r'''
/dsh/field/partners/{partnerId}/stores/{storeId}/assortment/batch:
  post:
    operationId: fieldUpsertStoreAssortmentBatch
    summary: Link up to 100 approved central products to a field-onboarded partner store in one governed request.
    tags: [CentralCatalog]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: partnerId
        in: path
        required: true
        schema: { type: string }
      - $ref: "../dsh.openapi.yaml#/components/parameters/StoreId"
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            additionalProperties: false
            required: [items]
            properties:
              items:
                type: array
                minItems: 1
                maxItems: 100
                items:
                  type: object
                  additionalProperties: false
                  required: [masterProductId, unitPrice, currency, available, stockStatus, localNote, publicationStatus]
                  properties:
                    masterProductId: { type: string, minLength: 1 }
                    unitPrice: { type: number, minimum: 0 }
                    currency: { type: string, minLength: 1 }
                    available: { type: boolean }
                    stockStatus: { type: string, enum: [in_stock, low_stock, out_of_stock] }
                    localNote: { type: string }
                    customImageObjectKey: { type: [string, "null"] }
                    publicationStatus: { type: string, enum: [draft, submitted] }
                    expectedVersion: { type: integer, minimum: 1 }
    responses:
      "200":
        description: Per-item batch result. Successful rows remain committed when another row fails validation or OCC.
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required: [results, succeeded, failed]
              properties:
                succeeded: { type: integer, minimum: 0 }
                failed: { type: integer, minimum: 0 }
                results:
                  type: array
                  items:
                    type: object
                    additionalProperties: false
                    required: [index, masterProductId, status]
                    properties:
                      index: { type: integer, minimum: 0 }
                      masterProductId: { type: string }
                      status: { type: string, enum: [saved, failed] }
                      assortment: { type: object, additionalProperties: true }
                      code: { type: string }
                      message: { type: string }
                      currentVersion: { type: integer, minimum: 1 }
                      expectedVersion: { type: integer, minimum: 1 }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
'''.strip() + "\n\n"

CATALOG_ANCHOR = "/dsh/field/partners/{partnerId}/assortment:\n"
ROOT_KEY = "  /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/batch:\n"
ROOT_ANCHOR = (
    "  /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}:\n"
    "    $ref: \"./paths/catalog.paths.yaml#/~1dsh~1field~1partners~1{partnerId}~1stores~1{storeId}~1assortment~1{masterProductId}\"\n"
)
ROOT_BLOCK = (
    "  /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/batch:\n"
    "    $ref: \"./paths/catalog.paths.yaml#/~1dsh~1field~1partners~1{partnerId}~1stores~1{storeId}~1assortment~1batch\"\n"
)


def main() -> None:
    catalog = CATALOG_PATH.read_text(encoding="utf-8")
    root = ROOT_PATH.read_text(encoding="utf-8")

    if BATCH_KEY not in catalog:
        if CATALOG_ANCHOR not in catalog:
            raise SystemExit("catalog anchor not found")
        catalog = catalog.replace(CATALOG_ANCHOR, BATCH_BLOCK + CATALOG_ANCHOR, 1)

    if ROOT_KEY not in root:
        if ROOT_ANCHOR not in root:
            raise SystemExit("root anchor not found")
        root = root.replace(ROOT_ANCHOR, ROOT_ANCHOR + ROOT_BLOCK, 1)

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest["pathCount"] = 276
    manifest["operationIdCount"] = 325
    manifest.setdefault("pathDomains", {})["field"] = 29

    CATALOG_PATH.write_text(catalog, encoding="utf-8")
    ROOT_PATH.write_text(root, encoding="utf-8")
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
