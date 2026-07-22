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
        raise RuntimeError(f"{path}: expected one anchor, found {count}: {old[:100]!r}")
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

# exactOptionalPropertyTypes requires optional UI Kit props to be omitted rather
# than explicitly supplied as undefined.
replace_once(
    "services/dsh/frontend/shared/shein/SheinForm.tsx",
    '            error={submitError && !productUrl.trim() ? "رابط المنتج مطلوب" : undefined}\n',
    '            {...(submitError && !productUrl.trim() ? { error: "رابط المنتج مطلوب" } : {})}\n',
)
for path, field, message in (
    ("services/dsh/frontend/shared/awnak/AwnakForm.tsx", "itemType", "نوع الغرض مطلوب"),
    ("services/dsh/frontend/shared/awnak/AwnakForm.tsx", "pickupAddress", "مرجع الاستلام مطلوب"),
    ("services/dsh/frontend/shared/awnak/AwnakForm.tsx", "dropoffAddress", "مرجع التسليم مطلوب"),
):
    replace_once(
        path,
        f'            error={{submitError && !{field}.trim() ? "{message}" : undefined}}\n',
        f'            {{...(submitError && !{field}.trim() ? {{ error: "{message}" }} : {{}})}}\n',
    )

workbench = "services/dsh/frontend/shared/special-requests/OperatorSpecialRequestsWorkbench.tsx"
replace_once(workbench, "  SpecialRequestStatus,\n", "")
replace_once(
    workbench,
    "type FailureCopy = { title: string; description: string; tone: StateTone };\n\ntype OperatorForm = {\n  status: SpecialRequestStatus;",
    "type FailureCopy = { title: string; description: string; tone: StateTone };\n\ntype OperatorMutableStatus = NonNullable<DshUpdateSpecialRequest['status']>;\n\ntype OperatorForm = {\n  status: OperatorMutableStatus;",
)
replace_once(
    workbench,
    "const OPERATOR_STATUSES: readonly SpecialRequestStatus[] = [",
    "const OPERATOR_STATUSES: readonly OperatorMutableStatus[] = [",
)
replace_once(
    workbench,
    "    status: request.status,",
    "    status: request.status === 'submitted' ? 'under_review' : request.status,",
)
replace_once(
    workbench,
    "event.target.value as SpecialRequestStatus",
    "event.target.value as OperatorMutableStatus",
)

write(
    "services/dsh/tsconfig.jrn-022.json",
    '''{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "outDir": "dist-jrn-022",
    "paths": {
      "@bthwani/ui-kit": ["shared/ui-kit/src/index.ts"],
      "@bthwani/ui-kit/web": ["shared/ui-kit/src/web.ts"],
      "@bthwani/ui-kit/tokens": ["shared/ui-kit/src/tokens/index.ts"],
      "@bthwani/app-shell": ["shared/app-shell/src/index.ts"],
      "@bthwani/core-identity": ["core/identity/clients/index.ts"],
      "@dsh-shared/*": ["services/dsh/frontend/shared/*"],
      "react-native": ["apps/app-client/runtime/node_modules/react-native"]
    }
  },
  "include": [
    "frontend/**/*.d.ts",
    "frontend/shared/_kernel/**/*.ts",
    "frontend/shared/_kernel/**/*.tsx",
    "frontend/shared/special-requests/**/*.ts",
    "frontend/shared/special-requests/**/*.tsx",
    "frontend/shared/shein/**/*.tsx",
    "frontend/shared/awnak/**/*.tsx",
    "frontend/shared/delivery/captain-inbox.model.ts",
    "frontend/shared/delivery/captain-inbox.mapper.ts"
  ],
  "exclude": ["node_modules", "dist", "dist-jrn-022"]
}
''',
)

# The dedicated permanent workflow is updated after merge through the GitHub
# connector because Actions tokens cannot create or modify workflow files.
(ROOT / "tools/scripts/close-jrn-022-frontend-contract.py").unlink(missing_ok=True)
