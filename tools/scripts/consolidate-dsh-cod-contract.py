from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROOT_CONTRACT = ROOT / "services/dsh/contracts"


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


def write_components() -> None:
    schemas = '''CodReconciliationStatus:
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
      $ref: "../../dsh.openapi.yaml#/components/schemas/CodResolutionAction"
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
    currency: { type: string, minLength: 3, maxLength: 3 }
    triggerReason: { type: string }
    status:
      $ref: "../../dsh.openapi.yaml#/components/schemas/CodReconciliationStatus"
    assignedToOperatorId: { type: [string, "null"] }
    assignedAt: { type: [string, "null"], format: date-time }
    investigationNote: { type: string }
    resolvedByOperatorId: { type: [string, "null"] }
    resolutionAction:
      anyOf:
        - $ref: "../../dsh.openapi.yaml#/components/schemas/CodResolutionAction"
        - type: "null"
    resolutionNote: { type: string }
    resolvedAt: { type: [string, "null"], format: date-time }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }
CodReconciliationCaseEnvelope:
  type: object
  additionalProperties: false
  required: [codReconciliationCase]
  properties:
    codReconciliationCase:
      $ref: "../../dsh.openapi.yaml#/components/schemas/CodReconciliationCase"
CodReconciliationCaseListEnvelope:
  type: object
  additionalProperties: false
  required: [codReconciliationCases]
  properties:
    codReconciliationCases:
      type: array
      items:
        $ref: "../../dsh.openapi.yaml#/components/schemas/CodReconciliationCase"
PartnerCodRecordListEnvelope:
  type: object
  additionalProperties: false
  required: [codRecords]
  properties:
    codRecords:
      type: array
      items:
        type: object
        additionalProperties: true
'''
    parameters = '''CaseId:
  name: caseId
  in: path
  required: true
  schema:
    type: string
    minLength: 1
'''
    write("services/dsh/contracts/components/schemas/cod-custody.schemas.yaml", schemas)
    write("services/dsh/contracts/components/cod-custody.parameters.yaml", parameters)


def write_paths() -> None:
    paths = '''# BThwani DSH OpenAPI path-items module: governed COD custody and reconciliation.
# WLT remains the sole financial truth owner. DSH derives actor and OperatorContext
# from the authenticated Identity session before proxying any mutation.

/dsh/control-panel/finance/cod-reconciliation-cases:
  get:
    tags: [dsh-control-panel]
    operationId: listDshControlPanelCodReconciliationCases
    security: [{ bearerAuth: [] }]
    parameters:
      - name: status
        in: query
        required: false
        schema:
          $ref: "../dsh.openapi.yaml#/components/schemas/CodReconciliationStatus"
    responses:
      "200":
        description: WLT COD reconciliation cases.
        content:
          application/json:
            schema:
              $ref: "../dsh.openapi.yaml#/components/schemas/CodReconciliationCaseListEnvelope"
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "502": { $ref: "../dsh.openapi.yaml#/components/responses/ServiceUnavailable" }
/dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign:
  post:
    tags: [dsh-control-panel]
    operationId: assignDshControlPanelCodReconciliationCase
    security: [{ bearerAuth: [] }]
    parameters:
      - $ref: "../dsh.openapi.yaml#/components/parameters/CaseId"
      - $ref: "../dsh.openapi.yaml#/components/parameters/CorrelationId"
      - $ref: "../dsh.openapi.yaml#/components/parameters/IdempotencyKey"
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: "../dsh.openapi.yaml#/components/schemas/AssignCodReconciliationCaseRequest"
    responses:
      "200":
        description: Case assigned to the authenticated operator.
        content:
          application/json:
            schema:
              $ref: "../dsh.openapi.yaml#/components/schemas/CodReconciliationCaseEnvelope"
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }
      "502": { $ref: "../dsh.openapi.yaml#/components/responses/ServiceUnavailable" }
/dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/resolve:
  post:
    tags: [dsh-control-panel]
    operationId: resolveDshControlPanelCodReconciliationCase
    security: [{ bearerAuth: [] }]
    parameters:
      - $ref: "../dsh.openapi.yaml#/components/parameters/CaseId"
      - $ref: "../dsh.openapi.yaml#/components/parameters/CorrelationId"
      - $ref: "../dsh.openapi.yaml#/components/parameters/IdempotencyKey"
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: "../dsh.openapi.yaml#/components/schemas/ResolveCodReconciliationCaseRequest"
    responses:
      "200":
        description: Case resolved by the authenticated assigned operator.
        content:
          application/json:
            schema:
              $ref: "../dsh.openapi.yaml#/components/schemas/CodReconciliationCaseEnvelope"
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }
      "502": { $ref: "../dsh.openapi.yaml#/components/responses/ServiceUnavailable" }
/dsh/partner/me/finance/cod-records:
  get:
    tags: [dsh-partner]
    operationId: listDshPartnerCodRecords
    security: [{ bearerAuth: [] }]
    responses:
      "200":
        description: Partner-owned COD records.
        content:
          application/json:
            schema:
              $ref: "../dsh.openapi.yaml#/components/schemas/PartnerCodRecordListEnvelope"
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "502": { $ref: "../dsh.openapi.yaml#/components/responses/ServiceUnavailable" }
'''
    write("services/dsh/contracts/paths/cod-custody.paths.yaml", paths)


def update_entry() -> None:
    relative = "services/dsh/contracts/dsh.openapi.yaml"
    source = read(relative)
    source = source.replace("  codCustody: ./dsh.cod-custody.openapi.yaml\n", "")
    source = source.replace(
        '"./dsh.cod-custody.openapi.yaml#/paths/',
        '"./paths/cod-custody.paths.yaml#/',
    )

    parameter_anchor = '''    CorrelationId:
      $ref: "./components/parameters.yaml#/CorrelationId"
'''
    parameter_ref = '''    CaseId:
      $ref: "./components/cod-custody.parameters.yaml#/CaseId"
'''
    if parameter_ref not in source:
        source = replace_once(source, parameter_anchor, parameter_anchor + parameter_ref, "COD CaseId component")

    schema_anchor = "  schemas:\n"
    schema_names = [
        "CodReconciliationStatus",
        "CodResolutionAction",
        "AssignCodReconciliationCaseRequest",
        "ResolveCodReconciliationCaseRequest",
        "CodReconciliationCase",
        "CodReconciliationCaseEnvelope",
        "CodReconciliationCaseListEnvelope",
        "PartnerCodRecordListEnvelope",
    ]
    schema_refs = "".join(
        f'    {name}:\n      $ref: "./components/schemas/cod-custody.schemas.yaml#/{name}"\n'
        for name in schema_names
    )
    if "    CodReconciliationStatus:\n" not in source:
        source = replace_once(source, schema_anchor, schema_anchor + schema_refs, "COD schema components")
    write(relative, source)


def remove_parallel_module() -> None:
    manifest_relative = "services/dsh/contracts/contract.manifest.yaml"
    manifest = read(manifest_relative)
    manifest = replace_once(manifest, "  - dsh.cod-custody.openapi.yaml\n", "", "COD manifest entry")
    write(manifest_relative, manifest)

    registry_relative = "services/dsh/contracts/contract-registry.ts"
    registry = read(registry_relative)
    registry = registry.replace('    | "dsh-cod-custody"\n', "")
    pattern = re.compile(
        r'\n  \{\n'
        r'    id: "dsh-cod-custody",\n'
        r'    path: "contracts/dsh\.cod-custody\.openapi\.yaml",\n'
        r'    state: "CONTRACT_ACTIVE",\n'
        r'    runtimeDependency: true,\n'
        r'    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",\n'
        r'    adapterOwner: "frontend/shared/finance-wlt-link/finance",\n'
        r'  \},'
    )
    registry, count = pattern.subn("", registry, count=1)
    if count != 1:
        raise RuntimeError(f"COD registry entry: expected one match, found {count}")
    write(registry_relative, registry)

    module = ROOT / "services/dsh/contracts/dsh.cod-custody.openapi.yaml"
    if not module.exists():
        raise RuntimeError("COD module is missing before consolidation")
    module.unlink()


write_components()
write_paths()
update_entry()
remove_parallel_module()
print("DSH COD contract consolidation: PASS")
