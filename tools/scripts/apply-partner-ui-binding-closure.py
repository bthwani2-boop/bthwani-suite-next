from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str, *, allow_new: bool = False) -> None:
    text = read(relative)
    if old in text:
        write(relative, text.replace(old, new, 1))
        return
    if allow_new and new in text:
        return
    raise RuntimeError(f"missing replacement anchor in {relative}: {old[:120]!r}")


def close_frontend_binding_guard() -> None:
    relative = "tools/guards/frontend-feature-binding-gate.mjs"
    replace_once(
        relative,
        'const manifestPath = "services/dsh/service.manifest.ts";\n',
        'const manifestPath = "services/dsh/service.manifest.ts";\n'
        'const capabilityMapPath = "services/dsh/capability-map.ts";\n'
        'const capabilityExtensionPath = "services/dsh/capability-map.extensions.ts";\n',
        allow_new=True,
    )
    replace_once(
        relative,
        'const manifest = readText(manifestPath);\n',
        'const manifest = readText(manifestPath);\n'
        'const capabilitySources = [manifest, readText(capabilityMapPath), readText(capabilityExtensionPath)].join("\\n");\n'
        'const requestedIds = new Set((process.env.FRONTEND_BINDING_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean));\n'
        'let selectedEntryCount = 0;\n',
        allow_new=True,
    )
    replace_once(
        relative,
        '    const screenExists = fs.existsSync(path.join(repoRoot, entry.screen));\n',
        '    if (requestedIds.size > 0 && !requestedIds.has(entry.id)) continue;\n'
        '    selectedEntryCount += 1;\n\n'
        '    const screenExists = fs.existsSync(path.join(repoRoot, entry.screen));\n',
        allow_new=True,
    )
    replace_once(
        relative,
        '    if (!manifest.includes(entry.capabilityId)) {\n',
        '    if (!capabilitySources.includes(`"${entry.capabilityId}"`)) {\n',
        allow_new=True,
    )
    replace_once(
        relative,
        'console.log(`frontend-feature-binding-gate: checked ${(registry?.entries ?? []).length} STATIC_BINDING entries`);\n',
        'console.log(`frontend-feature-binding-gate: checked ${selectedEntryCount} selected STATIC_BINDING entries from ${(registry?.entries ?? []).length} governed entries`);\n',
        allow_new=True,
    )


def close_binding_registry() -> None:
    relative = "governance/guards/frontend-binding-registry.json"
    payload = json.loads(read(relative))
    replacements = {
        "partner.store-settings": {
            "screen": "services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx",
            "controller": "services/dsh/frontend/shared/partner/partner.api.ts",
        },
        "control.catalog-approvals": {
            "controller": "services/dsh/frontend/shared/catalog/use-catalog-approval-controller.tsx",
        },
        "control.partner-activation": {
            "controller": "services/dsh/frontend/shared/partner/use-partner-admin-controller.tsx",
        },
    }
    seen = set()
    for entry in payload["entries"]:
        entry_id = entry["id"]
        if entry_id in replacements:
            entry.update(replacements[entry_id])
            seen.add(entry_id)
    missing = set(replacements) - seen
    if missing:
        raise RuntimeError(f"binding entries missing: {sorted(missing)}")
    write(relative, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def close_partner_settings_adapter() -> None:
    relative = "services/dsh/frontend/shared/partner/partner.api.ts"
    replace_once(
        relative,
        'import { createDshHttpClient } from "../_kernel/dsh-http-request";\n',
        'import { corrId, createDshHttpClient, type DshRequestOptions } from "../_kernel/dsh-http-request";\n',
        allow_new=True,
    )
    replace_once(
        relative,
        'const httpClient = createDshHttpClient(baseUrl, "partner");\n',
        '''const httpClient = createDshHttpClient(baseUrl, "partner");

export type DshPartnerStoreSettings = {
  readonly storeId: string;
  readonly status: string;
  readonly deliveryModes: readonly string[];
  readonly storeOpen: boolean;
  readonly listingEnabled: boolean;
  readonly version: number;
};

export type DshPartnerStoreSettingsUpdate = {
  readonly expectedVersion: number;
  readonly status: string;
  readonly deliveryModes: readonly string[];
  readonly reason: string;
};
''',
        allow_new=True,
    )
    replace_once(
        relative,
        'function request<T>(path: string, options: { readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; readonly body?: unknown } = {}): Promise<T> {\n',
        'function request<T>(path: string, options: DshRequestOptions = {}): Promise<T> {\n',
        allow_new=True,
    )
    replace_once(
        relative,
        '''export function fetchPartnerStoreSettings(storeId: string): Promise<unknown> {
  return request(`/dsh/partner/stores/${storeId}/settings`);
}

export function updatePartnerStoreSettings(storeId: string, settings: unknown): Promise<unknown> {
  return request(`/dsh/partner/stores/${storeId}/settings`, { method: "PATCH", body: settings });
}
''',
        '''export function fetchPartnerStoreSettings(storeId: string): Promise<DshPartnerStoreSettings> {
  return request(`/dsh/partner/stores/${encodeURIComponent(storeId)}/settings`);
}

export function updatePartnerStoreSettings(
  storeId: string,
  settings: DshPartnerStoreSettingsUpdate,
): Promise<unknown> {
  const normalizedModes = [...settings.deliveryModes].sort();
  const normalizedReason = settings.reason.trim();
  const idempotencyKey = [
    "partner-store-settings",
    storeId,
    String(settings.expectedVersion),
    normalizedModes.join("."),
    encodeURIComponent(normalizedReason).slice(0, 72),
  ].join("-");
  return request(`/dsh/partner/stores/${encodeURIComponent(storeId)}/settings`, {
    method: "PATCH",
    body: {
      expectedVersion: settings.expectedVersion,
      status: settings.status,
      deliveryModes: normalizedModes,
      reason: normalizedReason,
    },
    expectedVersion: settings.expectedVersion,
    idempotencyKey,
    correlationId: corrId("partner-store-settings"),
  });
}
''',
        allow_new=True,
    )


def close_store_profile_screen() -> None:
    relative = "services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx"
    replace_once(
        relative,
        "import { resolveDshStoreClientVisibility } from '../../shared/partner/dsh-client-visibility.model';\n",
        "import { resolveDshStoreClientVisibility } from '../../shared/partner/dsh-client-visibility.model';\n"
        "import {\n"
        "  fetchPartnerStoreSettings,\n"
        "  updatePartnerStoreSettings,\n"
        "  type DshPartnerStoreSettings,\n"
        "} from '../../shared/partner/partner.api';\n",
        allow_new=True,
    )
    replace_once(
        relative,
        '''  serviceModes?: readonly { id: string; enabled: boolean }[];
  onOpenStoreScope?: () => void;
};
''',
        '''  serviceModes?: readonly { id: string; enabled: boolean; title?: string }[];
  storeStatus: string;
  storeVersion: number;
  onSettingsReadback: (settings: DshPartnerStoreSettings) => void;
  onOpenStoreScope?: () => void;
};
''',
        allow_new=True,
    )
    replace_once(
        relative,
        '''  serviceModes = [],
  onOpenStoreScope,
}: StoreProfileScreenProps) {
''',
        '''  serviceModes = [],
  storeStatus,
  storeVersion,
  onSettingsReadback,
  onOpenStoreScope,
}: StoreProfileScreenProps) {
''',
        allow_new=True,
    )
    replace_once(
        relative,
        '''  const [branchName, setBranchName] = React.useState(storeName);
  const [branchAddress, setBranchAddress] = React.useState(`${cityLabel}، الياسمين، شارع الندى`);
  const [branchContact, setBranchContact] = React.useState('011 555 0123');
  const [lastSavedLabel, setLastSavedLabel] = React.useState<string | null>(null);
''',
        '''  const [selectedDeliveryModes, setSelectedDeliveryModes] = React.useState<readonly string[]>(
    serviceModes.filter((mode) => mode.enabled).map((mode) => mode.id),
  );
  const [saveReason, setSaveReason] = React.useState('تحديث إعدادات تشغيل المتجر من تطبيق الشريك');
  const [saveState, setSaveState] = React.useState<
    | { readonly kind: 'idle' }
    | { readonly kind: 'saving' }
    | { readonly kind: 'saved'; readonly label: string }
    | { readonly kind: 'error'; readonly message: string }
  >({ kind: 'idle' });

  React.useEffect(() => {
    setSelectedDeliveryModes(serviceModes.filter((mode) => mode.enabled).map((mode) => mode.id));
  }, [serviceModes]);
''',
        allow_new=True,
    )
    replace_once(
        relative,
        '''  const onSave = React.useCallback(() => {
    setLastSavedLabel(new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }));
  }, []);
''',
        '''  const toggleDeliveryMode = React.useCallback((modeId: string) => {
    setSaveState({ kind: 'idle' });
    setSelectedDeliveryModes((current) =>
      current.includes(modeId)
        ? current.filter((value) => value !== modeId)
        : [...current, modeId],
    );
  }, []);

  const onSave = React.useCallback(async () => {
    if (!canonicalStoreId || selectedDeliveryModes.length === 0 || saveReason.trim().length < 3) return;
    setSaveState({ kind: 'saving' });
    try {
      await updatePartnerStoreSettings(canonicalStoreId, {
        expectedVersion: storeVersion,
        status: storeStatus,
        deliveryModes: selectedDeliveryModes,
        reason: saveReason.trim(),
      });
      const readback = await fetchPartnerStoreSettings(canonicalStoreId);
      if (readback.version <= storeVersion) {
        throw new Error('لم يؤكد DSH إصدارًا أحدث بعد الحفظ.');
      }
      onSettingsReadback(readback);
      setSaveState({
        kind: 'saved',
        label: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (error) {
      setSaveState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر حفظ إعدادات تشغيل المتجر.',
      });
    }
  }, [canonicalStoreId, onSettingsReadback, saveReason, selectedDeliveryModes, storeStatus, storeVersion]);
''',
        allow_new=True,
    )
    replace_once(
        relative,
        '''        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <TextField label="اسم الفرع" value={branchName} onChangeText={setBranchName} placeholder="اسم الفرع الحالي" />
          <TextField label="العنوان" value={branchAddress} onChangeText={setBranchAddress} placeholder="عنوان الفرع" multiline />
          <TextField label="رقم التواصل" value={branchContact} onChangeText={setBranchContact} placeholder="رقم الهاتف" />
          <Text role="caption" tone="muted" align="start">
            التعديلات تبقى محلية حتى الضغط على زر الحفظ الأساسي أسفل الصفحة.
          </Text>
        </Box>
''',
        '''        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <KeyValueList
            dense
            items={[
              { label: 'اسم الفرع', value: branchLabel },
              { label: 'المدينة', value: cityLabel },
              { label: 'مدير الفرع', value: managerLabel },
            ]}
          />
          <Text role="caption" tone="muted" align="start">
            بيانات الهوية والعنوان مملوكة لمسار تهيئة الشريك والمراجعة الميدانية، ولا تُعدّل محليًا من ملف التشغيل.
          </Text>
        </Box>
''',
        allow_new=True,
    )
    sticky = '''      <MobileStickyPrimaryAction
        label="حفظ تغييرات ملف المتجر"
        helperText={lastSavedLabel ? `آخر حفظ: ${lastSavedLabel}` : 'التعديلات تحفظ محليًا حتى المزامنة التالية.'}
        onPress={onSave}
      />
'''
    replacement = '''      <Divider />

      <SectionBlock
        title="إعدادات تشغيل المتجر"
        subtitle="تُحفظ مباشرة في DSH مع حماية OCC ثم تُقرأ من الخادم للتأكيد."
        actionLabel="ضبط أنماط التوصيل"
        expanded
        onToggle={() => undefined}
      >
        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
            {serviceModes.map((mode) => {
              const selected = selectedDeliveryModes.includes(mode.id);
              return (
                <Button
                  key={mode.id}
                  label={`${selected ? '✓ ' : ''}${mode.title ?? mode.id}`}
                  tone={selected ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth={false}
                  onPress={() => toggleDeliveryMode(mode.id)}
                />
              );
            })}
          </Box>
          <TextField
            label="سبب التحديث"
            value={saveReason}
            onChangeText={(value) => {
              setSaveReason(value);
              setSaveState({ kind: 'idle' });
            }}
            placeholder="سبب تشغيلي واضح"
          />
          {saveState.kind === 'error' ? (
            <Text role="bodySm" tone="danger" align="start">{saveState.message}</Text>
          ) : null}
        </Box>
      </SectionBlock>

      <MobileStickyPrimaryAction
        label={saveState.kind === 'saving' ? 'جاري الحفظ…' : 'حفظ إعدادات التشغيل'}
        helperText={
          saveState.kind === 'saved'
            ? `تم تأكيد الحفظ من DSH: ${saveState.label}`
            : saveState.kind === 'error'
              ? saveState.message
              : 'لن تظهر حالة نجاح قبل قراءة الإصدار الجديد من DSH.'
        }
        disabled={
          saveState.kind === 'saving' ||
          !canonicalStoreId ||
          selectedDeliveryModes.length === 0 ||
          saveReason.trim().length < 3
        }
        onPress={() => void onSave()}
      />
'''
    replace_once(relative, sticky, replacement, allow_new=True)


def close_partner_hub_readback() -> None:
    relative = "services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx"
    replace_once(
        relative,
        '''import {
  fetchPartnerStoreCoverageZones,
  fetchPartnerStoreSettings,
} from "../../shared/partner/partner.api";
''',
        '''import {
  fetchPartnerStoreCoverageZones,
  fetchPartnerStoreSettings,
  type DshPartnerStoreSettings,
} from "../../shared/partner/partner.api";
''',
        allow_new=True,
    )
    replace_once(
        relative,
        '''type PartnerStoreSettingsPayload = {
  readonly deliveryModes: readonly string[];
  readonly storeOpen: boolean;
  readonly listingEnabled: boolean;
};
''',
        '''type PartnerStoreSettingsPayload = DshPartnerStoreSettings;
''',
        allow_new=True,
    )
    replace_once(
        relative,
        '''    !Array.isArray(value.deliveryModes) ||
    !value.deliveryModes.every((mode) => typeof mode === "string") ||
    typeof value.storeOpen !== "boolean" ||
    typeof value.listingEnabled !== "boolean"
''',
        '''    typeof value.storeId !== "string" ||
    typeof value.status !== "string" ||
    !Array.isArray(value.deliveryModes) ||
    !value.deliveryModes.every((mode) => typeof mode === "string") ||
    typeof value.storeOpen !== "boolean" ||
    typeof value.listingEnabled !== "boolean" ||
    !Number.isInteger(value.version) ||
    Number(value.version) < 1
''',
        allow_new=True,
    )
    replace_once(
        relative,
        '''  return {
    deliveryModes: value.deliveryModes,
    storeOpen: value.storeOpen,
    listingEnabled: value.listingEnabled,
  };
''',
        '''  return {
    storeId: value.storeId,
    status: value.status,
    deliveryModes: value.deliveryModes,
    storeOpen: value.storeOpen,
    listingEnabled: value.listingEnabled,
    version: Number(value.version),
  };
''',
        allow_new=True,
    )
    replace_once(
        relative,
        '''            serviceModes={serviceModes}
            {...(onOpenStoreScope ? { onOpenStoreScope } : {})}
''',
        '''            serviceModes={serviceModes}
            storeStatus={storeRuntime.settings.status}
            storeVersion={storeRuntime.settings.version}
            onSettingsReadback={(settings) => {
              const nextModes = mapServiceModes(settings.deliveryModes);
              setStoreRuntime({
                kind: "success",
                settings,
                serviceModes: nextModes,
                coverageZones,
              });
              const firstEnabled = nextModes.find((mode) => mode.enabled);
              setSelectedModeId(firstEnabled?.id ?? "");
            }}
            {...(onOpenStoreScope ? { onOpenStoreScope } : {})}
''',
        allow_new=True,
    )


def close_partner_guard_expectations() -> None:
    relative = "tools/guards/partner/partner-surface-truth-gate.mjs"
    text = read(relative)
    marker = 'file: "services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx"'
    index = text.find(marker)
    if index < 0:
        return
    required_start = text.find("required: [", index)
    required_end = text.find("],", required_start)
    if required_start < 0 or required_end < 0:
        return
    required_end += 2
    block = text[required_start:required_end]
    additions = [
        '"updatePartnerStoreSettings"',
        '"expectedVersion"',
        '"fetchPartnerStoreSettings"',
        '"لم يؤكد DSH إصدارًا أحدث بعد الحفظ"',
    ]
    for addition in additions:
        if addition not in block:
            block = block[:-2] + f"      {addition},\n    ],"
    write(relative, text[:required_start] + block + text[required_end:])


def remove_self() -> None:
    path = ROOT / "tools/scripts/apply-partner-ui-binding-closure.py"
    if path.exists():
        path.unlink()


close_frontend_binding_guard()
close_binding_registry()
close_partner_settings_adapter()
close_store_profile_screen()
close_partner_hub_readback()
close_partner_guard_expectations()
remove_self()
