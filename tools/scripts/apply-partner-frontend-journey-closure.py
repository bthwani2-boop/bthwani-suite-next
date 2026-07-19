from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str) -> None:
    text = read(relative)
    if old in text:
        write(relative, text.replace(old, new, 1))
        return
    if new in text:
        return
    raise RuntimeError(f"missing replacement anchor: {relative}: {old[:120]}")


def update_partner_api() -> None:
    relative = "services/dsh/frontend/shared/partner/partner.api.ts"
    replace_once(
        relative,
        'import { createDshHttpClient } from "../_kernel/dsh-http-request";',
        'import { createDshHttpClient, type DshRequestOptions } from "../_kernel/dsh-http-request";',
    )
    replace_once(
        relative,
        'function request<T>(path: string, options: { readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; readonly body?: unknown } = {}): Promise<T> {\n  return httpClient.request<T>(path, options);\n}',
        'function request<T>(path: string, options: DshRequestOptions = {}): Promise<T> {\n  return httpClient.request<T>(path, options);\n}',
    )

    text = read(relative)
    anchor = 'export function fetchPartnerStoreSettings(storeId: string): Promise<unknown> {\n  return request(`/dsh/partner/stores/${storeId}/settings`);\n}\n\nexport function updatePartnerStoreSettings(storeId: string, settings: unknown): Promise<unknown> {\n  return request(`/dsh/partner/stores/${storeId}/settings`, { method: "PATCH", body: settings });\n}'
    replacement = '''export type DshPartnerStoreSettings = {
  readonly storeId: string;
  readonly status: string;
  readonly deliveryModes: readonly string[];
  readonly storeOpen: boolean;
  readonly listingEnabled: boolean;
  readonly version: number;
};

export type DshPartnerStoreSettingsUpdate = {
  readonly expectedVersion: number;
  readonly status: "active" | "inactive" | "temporarily_closed" | "unavailable";
  readonly deliveryModes: readonly string[];
  readonly reason: string;
};

export type DshPartnerStoreSettingsMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export type DshPartnerStoreSettingsMutationResponse = {
  readonly store: { readonly version: number };
  readonly audit: unknown;
  readonly replayed: boolean;
};

export function fetchPartnerStoreSettings(storeId: string): Promise<DshPartnerStoreSettings> {
  return request(`/dsh/partner/stores/${storeId}/settings`);
}

export function updatePartnerStoreSettings(
  storeId: string,
  settings: DshPartnerStoreSettingsUpdate,
  context: DshPartnerStoreSettingsMutationContext,
): Promise<DshPartnerStoreSettingsMutationResponse> {
  return request(`/dsh/partner/stores/${storeId}/settings`, {
    method: "PATCH",
    body: settings,
    idempotencyKey: context.idempotencyKey,
    correlationId: context.correlationId,
    expectedVersion: settings.expectedVersion,
  });
}'''
    if anchor in text:
        write(relative, text.replace(anchor, replacement, 1))
    elif "export type DshPartnerStoreSettingsMutationContext" not in text:
        raise RuntimeError("partner settings API anchor missing")


def update_partner_hub() -> None:
    relative = "services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx"
    replace_once(
        relative,
        '''type PartnerStoreSettingsPayload = {
  readonly deliveryModes: readonly string[];
  readonly storeOpen: boolean;
  readonly listingEnabled: boolean;
};''',
        '''type PartnerStoreSettingsPayload = {
  readonly status: string;
  readonly deliveryModes: readonly string[];
  readonly storeOpen: boolean;
  readonly listingEnabled: boolean;
  readonly version: number;
};''',
    )
    replace_once(
        relative,
        '''    !Array.isArray(value.deliveryModes) ||
    !value.deliveryModes.every((mode) => typeof mode === "string") ||
    typeof value.storeOpen !== "boolean" ||
    typeof value.listingEnabled !== "boolean"
  ) {''',
        '''    typeof value.status !== "string" ||
    !Array.isArray(value.deliveryModes) ||
    !value.deliveryModes.every((mode) => typeof mode === "string") ||
    typeof value.storeOpen !== "boolean" ||
    typeof value.listingEnabled !== "boolean" ||
    !Number.isInteger(value.version) ||
    Number(value.version) < 1
  ) {''',
    )
    replace_once(
        relative,
        '''  return {
    deliveryModes: value.deliveryModes,
    storeOpen: value.storeOpen,
    listingEnabled: value.listingEnabled,
  };''',
        '''  return {
    status: value.status,
    deliveryModes: value.deliveryModes,
    storeOpen: value.storeOpen,
    listingEnabled: value.listingEnabled,
    version: Number(value.version),
  };''',
    )
    replace_once(
        relative,
        '''            storeOpen={resolvedStoreOpen}
            listingEnabled={resolvedListingEnabled}
            canonicalStoreId={canonicalStoreId}
            activationStatus={activationStatus}
            serviceModes={serviceModes}''',
        '''            storeOpen={resolvedStoreOpen}
            listingEnabled={resolvedListingEnabled}
            canonicalStoreId={canonicalStoreId}
            expectedVersion={storeRuntime.settings.version}
            activationStatus={activationStatus}
            serviceModes={serviceModes}
            onSettingsSaved={loadStoreRuntime}''',
    )


def update_store_profile() -> None:
    relative = "services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx"
    text = read(relative)
    text = text.replace("  TextField,\n", "", 1)
    partner_import = "import { updatePartnerStoreSettings } from '../../shared/partner/partner.api';\n"
    if partner_import not in text:
        anchor = "import { resolveDshStoreClientVisibility } from '../../shared/partner/dsh-client-visibility.model';\n"
        if anchor not in text:
            raise RuntimeError("store profile partner API import anchor missing")
        text = text.replace(anchor, anchor + partner_import, 1)

    text = text.replace(
        "  serviceModes?: readonly { id: string; enabled: boolean }[];\n  onOpenStoreScope?: () => void;",
        "  expectedVersion: number;\n  serviceModes?: readonly { id: string; title?: string; enabled: boolean }[];\n  onSettingsSaved?: () => Promise<void> | void;\n  onOpenStoreScope?: () => void;",
        1,
    )
    text = text.replace(
        "  canonicalStoreId,\n  sourceRecordId,",
        "  canonicalStoreId,\n  expectedVersion,\n  sourceRecordId,",
        1,
    )
    text = text.replace(
        "  serviceModes = [],\n  onOpenStoreScope,",
        "  serviceModes = [],\n  onSettingsSaved,\n  onOpenStoreScope,",
        1,
    )

    old_state = '''  const [branchName, setBranchName] = React.useState(storeName);
  const [branchAddress, setBranchAddress] = React.useState(`${cityLabel}، الياسمين، شارع الندى`);
  const [branchContact, setBranchContact] = React.useState('011 555 0123');
  const [lastSavedLabel, setLastSavedLabel] = React.useState<string | null>(null);

  const storeStateLabel = storeOpen ? 'مفتوح الآن' : 'مغلق الآن';'''
    new_state = '''  const [storeOpenDraft, setStoreOpenDraft] = React.useState(storeOpen);
  const [enabledModeIds, setEnabledModeIds] = React.useState<ReadonlySet<string>>(
    () => new Set(serviceModes.filter((mode) => mode.enabled).map((mode) => mode.id)),
  );
  const [saveState, setSaveState] = React.useState<
    | { readonly kind: 'idle' }
    | { readonly kind: 'saving' }
    | { readonly kind: 'success'; readonly message: string }
    | { readonly kind: 'error'; readonly message: string }
  >({ kind: 'idle' });

  React.useEffect(() => {
    setStoreOpenDraft(storeOpen);
    setEnabledModeIds(new Set(serviceModes.filter((mode) => mode.enabled).map((mode) => mode.id)));
    setSaveState({ kind: 'idle' });
  }, [expectedVersion, serviceModes, storeOpen]);

  const storeStateLabel = storeOpenDraft ? 'مفتوح الآن' : 'مغلق مؤقتًا';'''
    if old_state in text:
        text = text.replace(old_state, new_state, 1)
    elif "const [storeOpenDraft" not in text:
        raise RuntimeError("store profile state anchor missing")

    text = text.replace("    storeOpen,\n  }), [activationStatus, listingEnabled, publishStage, serviceModes, storeOpen]);", "    storeOpen: storeOpenDraft,\n  }), [activationStatus, listingEnabled, publishStage, serviceModes, storeOpenDraft]);", 1)

    old_save = '''  const onSave = React.useCallback(() => {
    setLastSavedLabel(new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }));
  }, []);'''
    new_save = '''  const toggleMode = React.useCallback((modeId: string) => {
    setEnabledModeIds((current) => {
      const next = new Set(current);
      if (next.has(modeId)) next.delete(modeId);
      else next.add(modeId);
      return next;
    });
    setSaveState({ kind: 'idle' });
  }, []);

  const onSave = React.useCallback(async () => {
    if (!canonicalStoreId) {
      setSaveState({ kind: 'error', message: 'لا يوجد متجر موحّد صالح للحفظ.' });
      return;
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      setSaveState({ kind: 'error', message: 'نسخة إعدادات المتجر غير صالحة؛ أعد تحميل الصفحة.' });
      return;
    }
    const deliveryModes = [...enabledModeIds].sort();
    if (deliveryModes.length === 0) {
      setSaveState({ kind: 'error', message: 'يجب تفعيل نمط توصيل واحد على الأقل.' });
      return;
    }
    const status = storeOpenDraft ? 'active' : 'temporarily_closed';
    const operationFingerprint = `${canonicalStoreId}:${expectedVersion}:${status}:${deliveryModes.join(',')}`;
    const correlationSuffix = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
    setSaveState({ kind: 'saving' });
    try {
      const response = await updatePartnerStoreSettings(
        canonicalStoreId,
        {
          expectedVersion,
          status,
          deliveryModes,
          reason: 'تحديث تشغيلي موثّق من تطبيق الشريك',
        },
        {
          idempotencyKey: `partner-settings:${operationFingerprint}`,
          correlationId: `partner-settings-${correlationSuffix}`,
        },
      );
      await onSettingsSaved?.();
      setSaveState({
        kind: 'success',
        message: `تم الحفظ والمزامنة مع DSH — النسخة ${response.store.version}.`,
      });
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'تعذر حفظ إعدادات المتجر. أعد التحميل ثم حاول مجددًا.';
      setSaveState({ kind: 'error', message });
    }
  }, [canonicalStoreId, enabledModeIds, expectedVersion, onSettingsSaved, storeOpenDraft]);'''
    if old_save in text:
        text = text.replace(old_save, new_save, 1)
    elif "const toggleMode" not in text:
        raise RuntimeError("store profile save anchor missing")

    old_branch = '''        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <TextField label="اسم الفرع" value={branchName} onChangeText={setBranchName} placeholder="اسم الفرع الحالي" />
          <TextField label="العنوان" value={branchAddress} onChangeText={setBranchAddress} placeholder="عنوان الفرع" multiline />
          <TextField label="رقم التواصل" value={branchContact} onChangeText={setBranchContact} placeholder="رقم الهاتف" />
          <Text role="caption" tone="muted" align="start">
            التعديلات تبقى محلية حتى الضغط على زر الحفظ الأساسي أسفل الصفحة.
          </Text>
        </Box>'''
    new_branch = '''        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <KeyValueList
            dense
            items={[
              { label: 'اسم الفرع', value: branchLabel },
              { label: 'المدينة', value: cityLabel },
              { label: 'المدير', value: managerLabel },
              { label: 'مرجع المتجر', value: canonicalStoreId ?? 'غير مربوط', tone: canonicalStoreId ? 'brand' : 'warning' },
            ]}
          />
          <Text role="caption" tone="muted" align="start">
            بيانات الهوية والعنوان تُراجع ضمن رحلة الاعتماد؛ هذه الصفحة تحفظ الإعدادات التشغيلية التي يدعمها عقد DSH فقط.
          </Text>
        </Box>'''
    if old_branch in text:
        text = text.replace(old_branch, new_branch, 1)
    elif "بيانات الهوية والعنوان تُراجع" not in text:
        raise RuntimeError("store profile branch block anchor missing")

    operations_block = '''
      <Divider />

      <SectionBlock
        title="تشغيل المتجر وأنماط التوصيل"
        subtitle="تغييرات حقيقية تُحفظ في DSH مع رقم نسخة ومفتاح عدم تكرار."
        actionLabel={storeOpenDraft ? 'إغلاق مؤقت' : 'فتح المتجر'}
        expanded
        onToggle={() => {
          setStoreOpenDraft((current) => !current);
          setSaveState({ kind: 'idle' });
        }}
      >
        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <Text role="bodySm" tone="muted" align="start">
            اختر أنماط التنفيذ المتاحة لهذا المتجر. يجب بقاء نمط واحد على الأقل.
          </Text>
          <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
            {serviceModes.map((mode) => {
              const enabled = enabledModeIds.has(mode.id);
              return (
                <Button
                  key={mode.id}
                  label={`${enabled ? 'إيقاف' : 'تفعيل'} ${mode.title ?? mode.id}`}
                  tone={enabled ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth={false}
                  onPress={() => toggleMode(mode.id)}
                />
              );
            })}
          </Box>
          {saveState.kind === 'error' ? (
            <Text role="bodySm" tone="danger" align="start">{saveState.message}</Text>
          ) : null}
          {saveState.kind === 'success' ? (
            <Text role="bodySm" tone="success" align="start">{saveState.message}</Text>
          ) : null}
        </Box>
      </SectionBlock>
'''
    identity_marker = "\n      <Divider />\n\n      {/* 4) Flat Identity and Trust section */}"
    if "تشغيل المتجر وأنماط التوصيل" not in text:
        if identity_marker not in text:
            raise RuntimeError("store profile operations insertion anchor missing")
        text = text.replace(identity_marker, operations_block + identity_marker, 1)

    old_sticky = '''      <MobileStickyPrimaryAction
        label="حفظ تغييرات ملف المتجر"
        helperText={lastSavedLabel ? `آخر حفظ: ${lastSavedLabel}` : 'التعديلات تحفظ محليًا حتى المزامنة التالية.'}
        onPress={onSave}
      />'''
    new_sticky = '''      <MobileStickyPrimaryAction
        label={saveState.kind === 'saving' ? 'جارٍ الحفظ…' : 'حفظ الإعدادات التشغيلية'}
        helperText={
          saveState.kind === 'success' || saveState.kind === 'error'
            ? saveState.message
            : `نسخة الإعدادات الحالية: ${expectedVersion}`
        }
        disabled={saveState.kind === 'saving' || !canonicalStoreId || enabledModeIds.size === 0}
        onPress={() => { void onSave(); }}
      />'''
    if old_sticky in text:
        text = text.replace(old_sticky, new_sticky, 1)
    elif "حفظ الإعدادات التشغيلية" not in text:
        raise RuntimeError("store profile sticky action anchor missing")

    write(relative, text)


def update_binding_registry() -> None:
    relative = "governance/guards/frontend-binding-registry.json"
    registry = json.loads(read(relative))
    entries = registry["entries"]
    by_id = {entry["id"]: entry for entry in entries}

    by_id["partner.store-settings"]["controller"] = "services/dsh/frontend/shared/partner/partner.api.ts"
    by_id["field.store-verification"]["controller"] = "services/dsh/frontend/shared/field-readiness/use-field-readiness-controller.tsx"
    by_id["field.media-upload"].update({
        "screen": "services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx",
        "controller": "services/dsh/frontend/shared/media/field-document-media.ts",
    })
    by_id["field.visit-history"].update({
        "id": "field.store-visits",
        "screen": "services/dsh/frontend/app-field/escalation/DshFieldVisitScreen.tsx",
        "controller": "services/dsh/frontend/shared/field-readiness/use-field-readiness-controller.tsx",
    })
    entries.append({
        "id": "field.partner-history",
        "surface": "app-field",
        "screen": "services/dsh/frontend/app-field/stores/DshFieldStoresHistoryScreen.tsx",
        "controller": "services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx",
        "operationId": "listFieldPartnerDrafts",
        "route": "GET /dsh/field/partners",
        "capabilityId": "dsh.partner.activation",
    })
    by_id["control.catalog-approvals"]["controller"] = "services/dsh/frontend/shared/catalog/use-catalog-approval-controller.tsx"
    by_id["control.notification-config"]["controller"] = "services/dsh/frontend/shared/notifications/use-notifications-controller.tsx"

    write(relative, json.dumps(registry, ensure_ascii=False, indent=2) + "\n")


def update_binding_guard() -> None:
    relative = "tools/guards/frontend-feature-binding-gate.mjs"
    content = r'''import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";
import { cleanupGoRouteExtractor, extractGoRoutes, routeKey } from "./lib/go-route-extractor.mjs";

const guardId = "frontend-feature-binding-gate";
const violations = [];
const registryRelative = "governance/guards/frontend-binding-registry.json";
const schemaRelative = "governance/guards/frontend-binding-registry.schema.json";
const openapiPath = "services/dsh/contracts/dsh.openapi.yaml";
const routerPaths = [
  "services/dsh/backend/internal/http/server.go",
  "services/dsh/backend/internal/http/catalog_unified_routes.go",
];
const manifestPath = "services/dsh/service.manifest.ts";
const capabilitySourcePaths = [
  "services/dsh/capability-map.ts",
  "services/dsh/capability-map.extensions.ts",
];
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

const partnerJourneyIds = new Set([
  "partner.orders-inbox",
  "partner.catalog-workspace",
  "partner.product-proposal",
  "partner.taxonomy-browse",
  "partner.store-settings",
  "field.partner-onboarding",
  "field.store-verification",
  "field.media-upload",
  "field.store-visits",
  "field.partner-history",
  "control.catalog-approvals",
  "control.partner-activation",
  "control.support-tickets",
  "control.notification-config",
]);

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_OR_MISSING_JSON ${error.message}` });
    return null;
  }
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf8");
}

function moduleSpecifiers(content) {
  const specifiers = [];
  const staticPattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const pattern of [staticPattern, dynamicPattern]) {
    for (const match of content.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveRelativeModule(fromRelative, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(repoRoot, path.dirname(fromRelative), specifier);
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => path.join(base, `index${extension}`)),
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(`${repoRoot}${path.sep}`)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return toPosix(path.relative(repoRoot, candidate));
    }
  }
  return null;
}

function hasDependencyPath(startRelative, targetRelative) {
  const target = toPosix(targetRelative);
  const queue = [toPosix(startRelative)];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (current === target) return true;
    visited.add(current);
    const content = readText(current);
    for (const specifier of moduleSpecifiers(content)) {
      const resolved = resolveRelativeModule(current, specifier);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return false;
}

const scopeArgument = process.argv.find((argument) => argument.startsWith("--scope="));
const scope = scopeArgument?.slice("--scope=".length) ?? "all";
if (scope !== "all" && scope !== "partner-journey") {
  violations.push({ file: registryRelative, line: 0, message: `UNKNOWN_BINDING_SCOPE ${scope}` });
}

const registry = readJson(registryRelative);
const schema = readJson(schemaRelative);
if (registry && schema) {
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  if (!validate(registry)) {
    for (const error of validate.errors ?? []) {
      violations.push({ file: registryRelative, line: 0, message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message}` });
    }
  }
}

const allEntries = registry?.entries ?? [];
const entries = scope === "partner-journey"
  ? allEntries.filter((entry) => partnerJourneyIds.has(entry.id))
  : allEntries;
const openapi = readText(openapiPath);
const manifest = readText(manifestPath);
const capabilitySource = capabilitySourcePaths.map(readText).join("\n");
if (!manifest.includes("capabilityIds: DSH_CAPABILITY_IDS")) {
  violations.push({ file: manifestPath, line: 0, message: "SERVICE_MANIFEST_CAPABILITY_WIRING_MISSING" });
}

let routeSet;
try {
  routeSet = new Set(routerPaths.flatMap((routerPath) => extractGoRoutes(routerPath)).map(routeKey));
} catch (error) {
  violations.push({ file: routerPaths.join(","), line: 0, message: `GO_AST_ROUTE_EXTRACTION_FAILED ${error.message}` });
}

const seenIds = new Set();
const seenScreenOperations = new Set();
const expectedPrefix = {
  "app-client": "services/dsh/frontend/app-client/",
  "app-partner": "services/dsh/frontend/app-partner/",
  "app-captain": "services/dsh/frontend/app-captain/",
  "app-field": "services/dsh/frontend/app-field/",
  "control-panel": "services/dsh/frontend/control-panel/",
};

try {
  for (const entry of entries) {
    if (seenIds.has(entry.id)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_BINDING_ID ${entry.id}` });
    seenIds.add(entry.id);
    const screenOperationKey = `${entry.screen}::${entry.operationId}`;
    if (seenScreenOperations.has(screenOperationKey)) {
      violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_SCREEN_OPERATION_BINDING ${screenOperationKey}` });
    }
    seenScreenOperations.add(screenOperationKey);

    if (!entry.screen.startsWith(expectedPrefix[entry.surface] ?? "<invalid>/")) {
      violations.push({ file: registryRelative, line: 0, message: `SURFACE_SCREEN_PATH_MISMATCH ${entry.id}` });
    }

    const screenExists = fs.existsSync(path.join(repoRoot, entry.screen));
    const controllerExists = fs.existsSync(path.join(repoRoot, entry.controller));
    if (!screenExists) violations.push({ file: entry.screen, line: 0, message: `SCREEN_MISSING ${entry.id}` });
    if (!controllerExists) violations.push({ file: entry.controller, line: 0, message: `CONTROLLER_MISSING ${entry.id}` });
    if (screenExists && controllerExists && !hasDependencyPath(entry.screen, entry.controller)) {
      violations.push({ file: entry.screen, line: 0, message: `SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE ${entry.id} -> ${entry.controller}` });
    }

    const escapedOperationId = entry.operationId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`operationId:\\s*${escapedOperationId}\\b`).test(openapi)) {
      violations.push({ file: openapiPath, line: 0, message: `OPENAPI_OPERATION_MISSING ${entry.id} -> ${entry.operationId}` });
    }
    if (routeSet && !routeSet.has(entry.route)) {
      violations.push({ file: routerPaths.join(","), line: 0, message: `BACKEND_ROUTE_MISSING ${entry.id} -> ${entry.route}` });
    }
    if (!capabilitySource.includes(`"${entry.capabilityId}"`)) {
      violations.push({ file: capabilitySourcePaths.join(","), line: 0, message: `CAPABILITY_REGISTRY_MISSING ${entry.id} -> ${entry.capabilityId}` });
    }
  }
} finally {
  cleanupGoRouteExtractor();
}

if (allEntries.length === 0) {
  violations.push({ file: registryRelative, line: 0, message: "EMPTY_FRONTEND_BINDING_REGISTRY" });
}
if (scope === "partner-journey" && entries.length !== partnerJourneyIds.size) {
  violations.push({ file: registryRelative, line: 0, message: `PARTNER_JOURNEY_BINDING_SET_INCOMPLETE expected=${partnerJourneyIds.size} actual=${entries.length}` });
}

console.log(`frontend-feature-binding-gate: checked ${entries.length} STATIC_BINDING entries scope=${scope}`);
console.log("frontend-feature-binding-gate: proves static dependency and contract reachability only; runtime requires same-commit runtime evidence");
fail(guardId, violations);
'''
    write(relative, content)


def remove_self() -> None:
    path = ROOT / "tools/scripts/apply-partner-frontend-journey-closure.py"
    if path.exists():
        path.unlink()


update_partner_api()
update_partner_hub()
update_store_profile()
update_binding_registry()
update_binding_guard()
remove_self()
