import React, { useState } from "react";
import { Box, Card, Text, TextField } from "@bthwani/ui-kit";
import {
  CpBadge,
  CpButton,
  CpDescriptionList,
  CpDescriptionRow,
  CpMutedInline,
  CpStatePanel,
  CpTabs,
} from "@bthwani/control-panel/components";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  useProviderActivationController,
  useWorkforceReferenceData,
  useFieldAgentListController,
  useCaptainListController,
  type EngagementStatus,
  type FieldAgent,
} from "../../shared/workforce";

export type ProviderActivationWorkspaceProps = {
  readonly providerKind: "field" | "captain";
  readonly initialActorId?: string;
  readonly entrySource: "hr" | "partners" | "operations";
  readonly onBack?: () => void;
};

const ALL_STATUS_TAB_VALUE = "__all__";
const STATUS_TABS: Array<{ label: string; value: EngagementStatus | undefined }> = [
  { label: "بانتظار التفعيل", value: "pending_activation" },
  { label: "نشط", value: "active" },
  { label: "موقوف", value: "suspended" },
  { label: "الكل", value: undefined },
];

function activationOwner(kind: "field" | "captain"): string {
  return kind === "field" ? "قسم الشراكات" : "قسم العمليات";
}

function canManageActivation(kind: "field" | "captain", source: ProviderActivationWorkspaceProps["entrySource"]): boolean {
  return (kind === "field" && source === "partners") || (kind === "captain" && source === "operations");
}

export function ProviderActivationWorkspace({
  providerKind,
  initialActorId,
  entrySource,
  onBack,
}: ProviderActivationWorkspaceProps) {
  const isHrDetail = entrySource === "hr";
  const [selectedActorId, setSelectedActorId] = useState<string | undefined>(initialActorId);

  const fieldList = useFieldAgentListController("pending_activation", {
    enabled: providerKind === "field" && !isHrDetail,
  });
  const captainList = useCaptainListController("pending_activation", {
    enabled: providerKind === "captain" && !isHrDetail,
  });
  const reference = useWorkforceReferenceData();
  const controller = providerKind === "captain" ? captainList : fieldList;
  const providers: readonly FieldAgent[] = providerKind === "captain"
    ? (captainList.state.kind === "ready" ? captainList.state.captains : [])
    : (fieldList.state.kind === "ready" ? fieldList.state.fieldAgents : []);

  if (isHrDetail && !selectedActorId) {
    return <CpStatePanel role="alert" title="معرف مقدم الخدمة غير محدد" />;
  }

  return (
    <Box gap={3}>
      {!isHrDetail ? (
        <Card>
          <Box gap={3}>
            <CpTabs
              aria-label="حالة الارتباط"
              value={controller.status ?? ALL_STATUS_TAB_VALUE}
              items={STATUS_TABS.map((tab) => ({ value: tab.value ?? ALL_STATUS_TAB_VALUE, label: tab.label }))}
              onChange={(value) => {
                controller.setStatus(value === ALL_STATUS_TAB_VALUE ? undefined : value as EngagementStatus);
                setSelectedActorId(undefined);
              }}
            />
            <TextField
              label="بحث بالاسم أو رقم مقدم الخدمة"
              value={controller.query}
              onChangeText={controller.setQuery}
              placeholder={providerKind === "field" ? "مثال: FLD-000123 أو أحمد" : "مثال: CAP-000123 أو أحمد"}
            />
            {controller.state.kind === "loading" ? <CpMutedInline tight>جارٍ التحميل…</CpMutedInline> : null}
            {controller.state.kind === "error" ? <CpStatePanel role="alert" title={controller.state.message} /> : null}
            {controller.state.kind === "ready" && providers.length === 0 ? (
              <CpMutedInline tight>لا توجد ملفات مطابقة. أنشئ الملف الأولي أولًا ثم استكمل بوابة التفعيل.</CpMutedInline>
            ) : null}
            {controller.state.kind === "ready" ? (
              <Box gap={2}>
                {providers.map((provider) => (
                  <Box key={provider.actorId} layoutDirection="row" justify="space-between" align="center">
                    <Box gap={0}>
                      <Text role="bodyStrong">{provider.fullNameAr}</Text>
                      <Text role="caption" tone="muted">
                        {provider.workforceCode} · {providerKind === "captain"
                          ? reference.cityLabel(provider.captainProfile?.operatingCityCode)
                          : reference.cityLabel(provider.fieldProfile?.cityCode)} · {ENGAGEMENT_STATUS_LABEL_AR[provider.engagementStatus]}
                      </Text>
                    </Box>
                    <CpButton
                      variant={selectedActorId === provider.actorId ? "primary" : "secondary"}
                      onClick={() => setSelectedActorId(provider.actorId)}
                    >
                      {selectedActorId === provider.actorId ? "محدد ✓" : "اختيار"}
                    </CpButton>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        </Card>
      ) : null}

      {selectedActorId ? (
        <ProviderActivationWorkspaceInner
          providerKind={providerKind}
          actorId={selectedActorId}
          entrySource={entrySource}
          onBack={isHrDetail ? onBack : () => setSelectedActorId(undefined)}
          onReloadList={() => controller.reload()}
        />
      ) : null}
    </Box>
  );
}

type InnerProps = {
  readonly providerKind: "field" | "captain";
  readonly actorId: string;
  readonly entrySource: ProviderActivationWorkspaceProps["entrySource"];
  readonly onBack?: (() => void) | undefined;
  readonly onReloadList: () => void | Promise<void>;
};

function ProviderActivationWorkspaceInner({ providerKind, actorId, entrySource, onBack, onReloadList }: InnerProps) {
  const {
    loading,
    error,
    detail,
    issuedCode,
    actionBusy,
    actionError,
    issueCode,
    revokeCode,
    suspend,
    reactivate,
  } = useProviderActivationController(providerKind, actorId);
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);

  if (loading) return <CpStatePanel role="status" title="جارٍ تحميل بيانات التفعيل…" />;
  if (error || !detail) return <CpStatePanel role="alert" title={error ?? "تعذر تحميل بيانات التفعيل"} />;

  const managerAllowed = canManageActivation(providerKind, entrySource);
  const missingReasons: string[] = [];
  if (!detail.fullNameAr) missingReasons.push("الاسم الكامل مطلوب");
  if (!detail.workforceCode) missingReasons.push("رقم مقدم الخدمة مطلوب");
  if (providerKind === "field") {
    if (!detail.fieldProfile?.serviceZoneId) missingReasons.push("منطقة الخدمة مطلوبة");
  } else {
    if (!detail.captainProfile?.operatingCityCode) missingReasons.push("مدينة التشغيل مطلوبة");
    if (!detail.captainProfile?.vehicleType) missingReasons.push("نوع المركبة مطلوب");
    if (!detail.captainProfile?.vehicleIdentifier) missingReasons.push("معرف المركبة مطلوب");
    if (detail.captainProfile?.licenseStatus !== "valid") missingReasons.push("رخصة القيادة يجب أن تكون معتمدة وصالحة");
    if (detail.captainProfile?.licenseExpiresAt && new Date(detail.captainProfile.licenseExpiresAt) < new Date()) {
      missingReasons.push("رخصة القيادة منتهية الصلاحية");
    }
  }
  const isReadyToIssue = managerAllowed && detail.readyToIssue && missingReasons.length === 0;
  const latest = detail.latestActivation;

  const copyCode = async (code: string) => {
    if (typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <Box gap={3}>
        <Box layoutDirection="row" justify="space-between" align="center">
          <Text role="titleSm">إدارة التفعيل والحالة التشغيلية</Text>
          {onBack ? <CpButton variant="ghost" onClick={onBack}>رجوع</CpButton> : null}
        </Box>

        <CpDescriptionList>
          <CpDescriptionRow label="الاسم">{detail.fullNameAr}</CpDescriptionRow>
          <CpDescriptionRow label="الرقم">{detail.workforceCode}</CpDescriptionRow>
          <CpDescriptionRow label="الحالة">{ENGAGEMENT_STATUS_LABEL_AR[detail.engagementStatus]}</CpDescriptionRow>
          <CpDescriptionRow label="الجهة المخولة">{activationOwner(providerKind)}</CpDescriptionRow>
          <CpDescriptionRow label="حالة الهوية">{detail.authActive ? "نشطة" : "غير نشطة"}</CpDescriptionRow>
        </CpDescriptionList>

        {!managerAllowed ? (
          <CpStatePanel
            role="status"
            title={`هذه الشاشة للقراءة فقط. إصدار التفعيل وإدارة الإيقاف من صلاحية ${activationOwner(providerKind)}.`}
          />
        ) : null}

        {missingReasons.length > 0 ? (
          <CpStatePanel role="alert" title="المتطلبات الأساسية غير مكتملة">
            <Box gap={1}>{missingReasons.map((item) => <Text key={item} role="bodySm">• {item}</Text>)}</Box>
          </CpStatePanel>
        ) : null}

        {managerAllowed ? (
          <Box gap={2}>
            {issuedCode ? (
              <Box layoutDirection="row" justify="space-between" align="center">
                <Box gap={0}>
                  <Text role="caption" tone="muted">كود الدخول أحادي الاستخدام</Text>
                  <Text role="titleMd">{issuedCode.code}</Text>
                </Box>
                <CpButton variant="secondary" onClick={() => void copyCode(issuedCode.code)}>{copied ? "تم النسخ" : "نسخ"}</CpButton>
              </Box>
            ) : latest ? (
              <Box layoutDirection="row" justify="space-between" align="center">
                <Box gap={0}>
                  <Text role="bodyStrong">آخر كود: {latest.status}</Text>
                  <Text role="caption" tone="muted">ينتهي: {new Date(latest.expiresAt).toLocaleString("ar-YE")}</Text>
                </Box>
                <CpButton variant="danger" disabled={actionBusy} onClick={() => void revokeCode().then(onReloadList)}>إبطال الأكواد</CpButton>
              </Box>
            ) : (
              <CpMutedInline tight>لم يصدر كود دخول بعد.</CpMutedInline>
            )}

            <CpButton
              variant="primary"
              disabled={!isReadyToIssue || actionBusy}
              onClick={() => void issueCode().then(onReloadList)}
            >
              {actionBusy ? "جارٍ التنفيذ…" : "إصدار كود الدخول"}
            </CpButton>
            <CpMutedInline>
              الخادم يعيد فحص الهوية والعقد والضمين والتجهيز والضمانة المالية والتدريب والاعتماد؛ لا يمكن تجاوز البوابة من الواجهة.
            </CpMutedInline>

            <TextField label="سبب الإيقاف أو إعادة التفعيل" value={reason} onChangeText={setReason} />
            {detail.engagementStatus === "suspended" ? (
              <CpButton
                variant="primary"
                disabled={actionBusy || reason.trim().length < 3}
                onClick={() => void reactivate(reason.trim()).then((success) => { if (success) { setReason(""); void onReloadList(); } })}
              >
                إعادة التفعيل
              </CpButton>
            ) : (
              <CpButton
                variant="danger"
                disabled={actionBusy || reason.trim().length < 3}
                onClick={() => void suspend(reason.trim()).then((success) => { if (success) { setReason(""); void onReloadList(); } })}
              >
                إيقاف مقدم الخدمة
              </CpButton>
            )}
          </Box>
        ) : null}

        {actionError ? <CpStatePanel role="alert" title={actionError} /> : null}
        {latest?.status ? <CpBadge tone={latest.status === "pending" ? "success" : "neutral"}>{latest.status}</CpBadge> : null}
      </Box>
    </Card>
  );
}

export default ProviderActivationWorkspace;
