import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const changed = [];

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function write(relativePath, content) {
  const current = read(relativePath);
  if (current === content) return;
  fs.writeFileSync(absolute(relativePath), content, "utf8");
  changed.push(relativePath);
}

function replaceRequired(relativePath, before, after) {
  const current = read(relativePath);
  if (current.includes(after)) return;
  if (!current.includes(before)) {
    throw new Error(`${relativePath}: expected source pattern was not found`);
  }
  write(relativePath, current.replace(before, after));
}

const activeContracts = [
  "core/workforce/contracts/workforce.jrn-003.openapi.yaml",
  "services/dsh/contracts/dsh.administration.openapi.yaml",
  "services/dsh/contracts/dsh.jrn-003-workforce-scopes.openapi.yaml",
  "services/dsh/contracts/dsh.order-truth.openapi.yaml",
  "services/dsh/contracts/dsh.partner-onboarding.openapi.yaml",
  "services/wlt/contracts/wlt.payout-destination.openapi.yaml",
];

for (const relativePath of activeContracts) {
  const current = read(relativePath);
  if (current.includes("x-bthwani-contract-state:")) continue;
  const next = current.replace(
    /^(openapi:\s*[^\r\n]+\r?\n)/,
    "$1x-bthwani-contract-state: CONTRACT_ACTIVE\n",
  );
  if (next === current) throw new Error(`${relativePath}: OpenAPI header was not found`);
  write(relativePath, next);
}

{
  const relativePath = "tsconfig.base.json";
  const config = JSON.parse(read(relativePath));
  config.compilerOptions ??= {};
  config.compilerOptions.paths ??= {};
  config.compilerOptions.paths["@dsh-shared/*"] = ["services/dsh/frontend/shared/*"];
  write(relativePath, `${JSON.stringify(config, null, 2)}\n`);
}

{
  const relativePath = "services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx";
  let content = read(relativePath);
  const replacements = [
    ["onBack?: () => void;", "onBack?: (() => void) | undefined;"],
    ["onSecondaryAction?: () => void;", "onSecondaryAction?: (() => void) | undefined;"],
    ["onRetry?: () => void;", "onRetry?: (() => void) | undefined;"],
    ["onBackToInbox?: () => void;", "onBackToInbox?: (() => void) | undefined;"],
    ["summary?: DshCaptainOrderDetailSummary;", "summary?: DshCaptainOrderDetailSummary | undefined;"],
    ["onOpenOrder?: (orderId: DshCaptainOrderId) => void;", "onOpenOrder?: ((orderId: DshCaptainOrderId) => void) | undefined;"],
    ["onOpenNextOrder?: (orderId: DshCaptainOrderId) => void;", "onOpenNextOrder?: ((orderId: DshCaptainOrderId) => void) | undefined;"],
    ["onActionPress?: (action: DshCaptainOrderAction) => void;", "onActionPress?: ((action: DshCaptainOrderAction) => void) | undefined;"],
    ["onOpenOrder?: (id: DshCaptainOrderId) => void;", "onOpenOrder?: ((id: DshCaptainOrderId) => void) | undefined;"],
    ["onOpenOrder?: (id: string) => void;", "onOpenOrder?: ((id: string) => void) | undefined;"],
  ];
  for (const [before, after] of replacements) content = content.split(before).join(after);
  write(relativePath, content);
}

replaceRequired(
  "services/dsh/frontend/app-client/cart/GovernedCartScreen.tsx",
  "serviceability.check(storeId, serviceAreaCode)",
  "serviceability.check(storeId, serviceAreaCode, fulfillmentMode)",
);

replaceRequired(
  "services/dsh/frontend/shared/partner/index.ts",
  "  DshPartnerListResponse,\n} from \"./partner.types\";",
  "  DshPartnerListResponse, DshPartnerOperationalScope,\n} from \"./partner.types\";",
);

replaceRequired(
  "services/dsh/frontend/app-partner/store/DshPartnerStoreCourierScreen.tsx",
  "  onBack: () => void;\n}) {",
  "  onBack?: (() => void) | undefined;\n}) {",
);

{
  const relativePath = "services/dsh/frontend/shared/partner/operator-delivery-pricing.tsx";
  let content = read(relativePath);
  if (!content.includes("export function findDeliveryPricing")) {
    content += `\nexport function findDeliveryPricing(\n  records: readonly DeliveryPricingRecord[],\n  fulfillmentMode: DeliveryPricingFulfillmentMode,\n): DeliveryPricingRecord | undefined {\n  return records.find((record) => record.fulfillmentMode === fulfillmentMode);\n}\n\n/**\n * Partner delivery pricing uses the same governed pricing projection and mutation\n * controller. Backend authorization remains the source of truth for actor scope.\n */\nexport function usePartnerDeliveryPricingController(storeId: string) {\n  return useOperatorDeliveryPricingController(storeId);\n}\n`;
  }
  write(relativePath, content);
}

replaceRequired(
  "services/dsh/frontend/shared/partner/index.ts",
  "  useOperatorDeliveryPricingController,\n} from \"./operator-delivery-pricing\";",
  "  useOperatorDeliveryPricingController,\n  usePartnerDeliveryPricingController,\n  findDeliveryPricing,\n} from \"./operator-delivery-pricing\";",
);

replaceRequired(
  "services/dsh/frontend/control-panel/catalogs/CatalogGovernanceScreen.tsx",
  `    const page = await fetchOperatorCatalogAudit({\n      entityType: auditEntityType.trim() || undefined,\n      entityId: auditEntityId.trim() || undefined,\n      limit: 100,\n      offset: 0,\n    });`,
  `    const normalizedEntityType = auditEntityType.trim();\n    const normalizedEntityId = auditEntityId.trim();\n    const page = await fetchOperatorCatalogAudit({\n      ...(normalizedEntityType ? { entityType: normalizedEntityType } : {}),\n      ...(normalizedEntityId ? { entityId: normalizedEntityId } : {}),\n      limit: 100,\n      offset: 0,\n    });`,
);

replaceRequired(
  "services/dsh/frontend/control-panel/catalogs/CatalogGovernanceScreen.tsx",
  `            const saved = await upsertOperatorMasterProductAttributeValue(productId.trim(), valueAttributeId.trim(), {\n              value: parsed, expectedVersion: current?.version,\n            });`,
  `            const saved = await upsertOperatorMasterProductAttributeValue(productId.trim(), valueAttributeId.trim(), {\n              value: parsed,\n              ...(current ? { expectedVersion: current.version } : {}),\n            });`,
);

replaceRequired(
  "services/dsh/frontend/control-panel/catalogs/CatalogGovernanceScreen.tsx",
  `            const saved = await upsertOperatorMasterProductRelationship(productId.trim(), {\n              targetMasterProductId: targetProductId.trim(), relationshipType, priority: current?.priority ?? relationships.length,\n              reason: relationshipReason.trim(), isActive: true, expectedVersion: current?.version,\n            });`,
  `            const saved = await upsertOperatorMasterProductRelationship(productId.trim(), {\n              targetMasterProductId: targetProductId.trim(), relationshipType, priority: current?.priority ?? relationships.length,\n              reason: relationshipReason.trim(), isActive: true,\n              ...(current ? { expectedVersion: current.version } : {}),\n            });`,
);

replaceRequired(
  "services/dsh/frontend/control-panel/hr/WorkforceReferenceView.tsx",
  `            void run(() => createWorkforceShift({\n              code: shiftCode.trim(),\n              nameAr: shiftName.trim(),\n              startsAt: shiftStartsAt.trim() || undefined,\n              endsAt: shiftEndsAt.trim() || undefined,\n              active: true,\n            })).then((ok) => {`,
  `            void run(() => createWorkforceShift({\n              code: shiftCode.trim(),\n              nameAr: shiftName.trim(),\n              ...(shiftStartsAt.trim() ? { startsAt: shiftStartsAt.trim() } : {}),\n              ...(shiftEndsAt.trim() ? { endsAt: shiftEndsAt.trim() } : {}),\n              active: true,\n            })).then((ok) => {`,
);

replaceRequired(
  "services/dsh/frontend/control-panel/partners/PartnerDetailOperationalScreen.tsx",
  `{readiness.viewModel.items.map((item) => <CpStatePanel key={item.id} role="status" title={\`${item.satisfied ? "مستوفى" : "غير مستوفى"}: ${item.label}\`} code={item.blockedReason || undefined} />)}`,
  `{readiness.viewModel.items.map((item) => <CpStatePanel key={item.id} role="status" title={\`${item.satisfied ? "مستوفى" : "غير مستوفى"}: ${item.label}\`} {...(item.blockedReason ? { code: item.blockedReason } : {})} />)}`,
);

replaceRequired(
  "services/dsh/frontend/control-panel/platform/PlatformRolloutPanel.tsx",
  "step <= steps[index - 1]",
  "step <= steps[index - 1]!",
);

replaceRequired(
  "services/dsh/frontend/control-panel/platform/OperationalPolicyGovernanceSection.tsx",
  "        ...(selectedZone ? {} : { id: zoneForm.id.trim().toLowerCase() || undefined }),",
  "        ...(!selectedZone && zoneForm.id.trim() ? { id: zoneForm.id.trim().toLowerCase() } : {}),",
);

{
  const relativePath = "services/dsh/frontend/shared/platform/use-platform-policies-controller.tsx";
  let content = read(relativePath);
  if (!content.includes("export function useOperationalPolicyEditor")) {
    content += `\nexport function useOperationalPolicyEditor(onSaved: () => Promise<void>) {\n  const [mutating, setMutating] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n\n  const execute = useCallback(async (action: () => Promise<void>): Promise<boolean> => {\n    setMutating(true);\n    setError(null);\n    try {\n      await action();\n      await onSaved();\n      return true;\n    } catch (caught) {\n      setError(resolveMsg(caught));\n      return false;\n    } finally {\n      setMutating(false);\n    }\n  }, [onSaved]);\n\n  const saveZone = useCallback((\n    current: DshZone | null,\n    input: DshCreateZoneInput & { readonly reason: string },\n  ) => execute(async () => {\n    if (current) {\n      await updateZone(current.id, {\n        name: input.name,\n        description: input.description,\n        isActive: input.isActive,\n        expectedVersion: current.version,\n        reason: input.reason,\n      });\n      return;\n    }\n    await createZone(input);\n  }), [execute]);\n\n  const saveSla = useCallback((\n    current: DshSlaRule | null,\n    input: Omit<DshUpsertSlaRuleInput, \"expectedVersion\">,\n  ) => execute(async () => {\n    await upsertSlaRule({ ...input, expectedVersion: current?.version ?? 0 });\n  }), [execute]);\n\n  const saveCapacity = useCallback((\n    current: DshCapacityConfig | null,\n    input: Omit<DshUpsertCapacityInput, \"expectedVersion\">,\n  ) => execute(async () => {\n    await upsertCapacityConfig({ ...input, expectedVersion: current?.version ?? 0 });\n  }), [execute]);\n\n  return {\n    mutating,\n    error,\n    clearError: () => setError(null),\n    saveZone,\n    saveSla,\n    saveCapacity,\n  } as const;\n}\n`;
  }
  write(relativePath, content);
}

console.log(`repository-debt-closure: updated ${changed.length} files`);
for (const relativePath of changed) console.log(`- ${relativePath}`);
