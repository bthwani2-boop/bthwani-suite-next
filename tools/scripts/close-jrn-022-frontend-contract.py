from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one anchor, found {count}")
    write(path, content.replace(old, new, 1))


replace_once(
    "services/dsh/contracts/components/schemas/common.schemas.yaml",
    '''DshSpecialRequestExecutionResponse:\n  type: object\n  additionalProperties: false\n  required: [execution]\n  properties:\n    execution: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestExecution" }\n''',
    '''DshSpecialRequestPaymentSessionReadback:\n  type: object\n  additionalProperties: false\n  required: [id, specialRequestId, status, amountMinorUnits, currency, updatedAt]\n  properties:\n    id: { type: string }\n    specialRequestId: { type: string, format: uuid }\n    status: { type: string }\n    providerReference: { type: [string, "null"] }\n    amountMinorUnits: { type: integer, format: int64 }\n    currency: { type: string }\n    updatedAt: { type: string, format: date-time }\n\nDshSpecialRequestFinancialReadback:\n  type: object\n  additionalProperties: false\n  required: [owner, readState, paymentSession, settlementApplicability, settlementReason]\n  properties:\n    owner: { type: string, enum: [WLT] }\n    readState: { type: string, enum: [not_started, unavailable, not_found, available] }\n    paymentSession:\n      oneOf:\n        - $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestPaymentSessionReadback"\n        - type: "null"\n    settlementApplicability: { type: string, enum: [not_applicable] }\n    settlementReason: { type: string }\n\nDshSpecialRequestExecutionResponse:\n  type: object\n  additionalProperties: false\n  required: [execution, financial]\n  properties:\n    execution: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestExecution" }\n    financial: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestFinancialReadback" }\n''',
)

replace_once(
    "services/dsh/contracts/dsh.openapi.yaml",
    '''    DshSpecialRequestExecution:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestExecution"\n    DshSpecialRequestExecutionResponse:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestExecutionResponse"''',
    '''    DshSpecialRequestExecution:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestExecution"\n    DshSpecialRequestPaymentSessionReadback:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestPaymentSessionReadback"\n    DshSpecialRequestFinancialReadback:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestFinancialReadback"\n    DshSpecialRequestExecutionResponse:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestExecutionResponse"''',
)

# The dedicated permanent workflow is updated after merge through the GitHub
# connector because Actions tokens cannot create or modify workflow files.
(ROOT / "tools/scripts/close-jrn-022-frontend-contract.py").unlink(missing_ok=True)
