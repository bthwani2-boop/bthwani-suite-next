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
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  useProviderActivationController,
  useWorkforceReferenceData,
  useFieldAgentListController,
  useCaptainListController,
} from "../../shared/workforce";
import type { EngagementStatus } from "../../shared/workforce";

type ProviderActivationWorkspaceProps = {
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

export function ProviderActivationWorkspace({
  providerKind,
  initialActorId,
  entrySource,
  onBack,
}: ProviderActivationWorkspaceProps) {
  const [selectedActorId, setSelectedActorId] = useState<string | undefined>(initialActorId);

  const isHrDetail = entrySource === "hr";

  const listControllerField = useFieldAgentListController("pending_activation", {
    enabled: providerKind === "field" && !isHrDetail,
  });
  const listControllerCaptain = useCaptainListController("pending_activation", {
    enabled: providerKind === "captain" && !isHrDetail,
  });

  const listController = providerKind === "captain" ? listControllerCaptain : listControllerField;
  const providersList = providerKind === "captain"
    ? (listControllerCaptain.state.kind === "ready" ? listControllerCaptain.state.captains : [])
    : (listControllerField.state.kind === "ready" ? listControllerField.state.fieldAgents : []);

  const reference = useWorkforceReferenceData();

  if (isHrDetail && !selectedActorId) {
    return <CpStatePanel role="alert" title="معرف مقدم الخدمة غير محدد" />;
  }

  return (
    <Box gap={3}>
      {!isHrDetail && (
        <Card>
          <Box gap={3}>
            <StatusTabs
              status={listController.status}
              onStatusChange={(status) => {
                listController.setStatus(status);
                setSelectedActorId(undefined);
              }}
            />

            <TextField
              label="بحث بالاسم أو رقم مقدم الخدمة"
              value={listController.query}
              onChangeText={(value) => {
                listController.setQuery(value);
              }}
              placeholder="مثال: FLD-000123 أو أحمد"
            />

            {listController.state.kind === "loading" && (
              <CpMutedInline tight>جارٍ التحميل…</CpMutedInline>
            )}

            {listController.state.kind === "ready" && providersList.length === 0 && (
              <CpMutedInline tight>
                لا يوجد مقدمو خدمة مطابقون — أنشئ الملف من قسم الموارد البشرية أولًا.
              </CpMutedInline>
            )}

            {listController.state.kind === "ready" && (
              <ProviderList
                providers={providersList}
                providerKind={providerKind}
                selectedActorId={selectedActorId}
                onSelect={setSelectedActorId}
                cityLabel={reference.cityLabel}
              />
            )}
          </Box>
        </Card>
      )}

      {selectedActorId && (
        <ProviderActivationWorkspaceInner
          providerKind={providerKind}
          actorId={selectedActorId}
          entrySource={entrySource}
          onBack={isHrDetail ? undefined : () => setSelectedActorId(undefined)}
          onReloadList={() => listController.reload()}
        />
      )}
    </Box>
  );
}

type StatusTabsProps = {
  readonly status: EngagementStatus | undefined;
  readonly onStatusChange: (status: EngagementStatus | undefined) => void;
};

function StatusTabs({ status, onStatusChange }: StatusTabsProps) {
  return (
    <CpTabs
      aria-label="حالة الارتباط"
      value={status ?? ALL_STATUS_TAB_VALUE}
      items={STATUS_TABS.map((tab) => ({ value: tab.value ?? ALL_STATUS_TAB_VALUE, label: tab.label }))}
      onChange={(value) => onStatusChange(value === ALL_STATUS_TAB_VALUE ? undefined : (value as EngagementStatus))}
    />
  );
}

type ProviderListProps = {
  readonly providers: readonly any[];
  readonly providerKind: "field" | "captain";
  readonly selectedActorId: string | undefined;
  readonly onSelect: (actorId: string) => void;
  readonly cityLabel: (code?: string) => string;
};

function ProviderList({ providers, providerKind, selectedActorId, onSelect, cityLabel }: ProviderListProps) {
  return (
    <Box gap={2}>
      {providers.map((provider) => (
        <Box key={provider.actorId} layoutDirection="row" justify="space-between" align="center">
          <Box gap={0}>
            <Text role="bodyStrong">{provider.fullNameAr}</Text>
            <Text role="caption" tone="muted">
              {provider.workforceCode} ·{" "}
              {providerKind === "captain"
                ? cityLabel(provider.captainProfile?.operatingCityCode)
                : cityLabel(provider.fieldProfile?.cityCode)}{" "}
              · {ENGAGEMENT_STATUS_LABEL_AR[provider.engagementStatus as EngagementStatus]}
            </Text>
          </Box>
          <CpButton
            variant={selectedActorId === provider.actorId ? "primary" : "secondary"}
            onClick={() => onSelect(provider.actorId)}
          >
            {selectedActorId === provider.actorId ? "محدد ✓" : "اختيار"}
          </CpButton>
        </Box>
      ))}
    </Box>
  );
}

type InnerProps = {
  readonly providerKind: "field" | "captain";
  readonly actorId: string;
  readonly entrySource: "hr" | "partners" | "operations";
  readonly onBack?: (() => void) | undefined;
  readonly onReloadList: () => void | Promise<void>;
};

function ProviderActivationWorkspaceInner({
  providerKind,
  actorId,
  entrySource,
  onBack,
  onReloadList,
}: InnerProps) {
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

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "—";
    return new Date(timeStr).toLocaleTimeString("ar-YE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined") {
      void navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Card>
        <CpMutedInline tight>جارٍ تحميل بيانات التفعيل…</CpMutedInline>
      </Card>
    );
  }

  if (error || !detail) {
    return (
      <Card>
        <Box gap={3}>
          <Text role="bodySm" tone="danger" align="center">
            {error || "حدث خطأ أثناء تحميل بيانات مقدم الخدمة"}
          </Text>
          {onBack && <CpButton variant="ghost" onClick={onBack}>رجوع</CpButton>}
        </Box>
      </Card>
    );
  }

  const missingReasons: string[] = [];
  if (!detail.fullNameAr) missingReasons.push("الاسم الكامل باللغة العربية مطلوب");
  if (!detail.workforceCode) missingReasons.push("رقم مقدم الخدمة مطلوب");

  if (providerKind === "field") {
    if (!detail.fieldProfile?.serviceZoneId) missingReasons.push("منطقة الخدمة مطلوبة");
    if (!detail.fieldProfile?.shiftCode) missingReasons.push("الوردية مطلوبة");
  } else if (providerKind === "captain") {
    if (!detail.captainProfile?.operatingCityCode) missingReasons.push("مدينة التشغيل مطلوبة");
    if (!detail.captainProfile?.vehicleType) missingReasons.push("نوع المركبة مطلوب");
    if (!detail.captainProfile?.vehicleIdentifier) missingReasons.push("رقم لوحة المركبة مطلوب");
    if (!detail.captainProfile?.licenseStatus || detail.captainProfile.licenseStatus !== "valid") {
      missingReasons.push("رخصة القيادة يجب أن تكون صالحة (valid)");
    } else if (detail.captainProfile.licenseExpiresAt) {
      const expireDate = new Date(detail.captainProfile.licenseExpiresAt);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      if (expireDate < currentDate) {
        missingReasons.push("رخصة القيادة منتهية الصلاحية");
      }
    }
  }

  const isReadyToIssue = detail.readyToIssue && missingReasons.length === 0;

  const latest = detail.latestActivation;
  const activeCode = issuedCode;

  return (
    <Box gap={3}>
      <Card>
        <Box gap={3}>
          <Box layoutDirection="row" justify="space-between" align="center">
            <Text role="titleSm">إدارة حالة الدخول وتفعيل التطبيق</Text>
            {onBack && <CpButton variant="ghost" onClick={onBack}>إلغاء التحديد</CpButton>}
          </Box>

          <ActivationCodeManager
            activeCode={activeCode}
            latest={latest}
            actionBusy={actionBusy}
            isReadyToIssue={isReadyToIssue}
            missingReasons={missingReasons}
            onIssue={() => void issueCode().then(onReloadList)}
            onRevoke={() => void revokeCode().then(onReloadList)}
            formatTime={formatTime}
            copied={copied}
            onCopy={handleCopy}
          />

          {actionError && (
            <Text role="caption" tone="danger">{actionError}</Text>
          )}

          <OperationalStatusManager
            engagementStatus={detail.engagementStatus}
            reason={reason}
            onChangeReason={setReason}
            actionBusy={actionBusy}
            onSuspend={() =>
              void suspend(reason.trim()).then((success) => {
                if (success) {
                  setReason("");
                  onReloadList();
                }
              })
            }
            onReactivate={() =>
              void reactivate(reason.trim()).then((success) => {
                if (success) {
                  setReason("");
                  onReloadList();
                }
              })
            }
          />
        </Box>
      </Card>
    </Box>
  );
}

function activationStatusTone(status: string | undefined): CpBadgeTone {
  if (status === "pending") return "success";
  if (status === "consumed") return "info";
  if (status === "revoked") return "danger";
  if (status === "expired") return "warning";
  return "neutral";
}

function activationStatusLabel(status: string | undefined): string {
  if (status === "pending") return "صالح للاستخدام";
  if (status === "consumed") return "مستخدم";
  if (status === "revoked") return "مبطل";
  if (status === "expired") return "منتهي الصلاحية";
  return status ?? "—";
}

type ActivationCodeManagerProps = {
  readonly activeCode: any;
  readonly latest: any;
  readonly actionBusy: boolean;
  readonly isReadyToIssue: boolean;
  readonly missingReasons: string[];
  readonly onIssue: () => void;
  readonly onRevoke: () => void;
  readonly formatTime: (time?: string) => string;
  readonly copied: boolean;
  readonly onCopy: (code: string) => void;
};

function ActivationCodeManager({
  activeCode,
  latest,
  actionBusy,
  isReadyToIssue,
  missingReasons,
  onIssue,
  onRevoke,
  formatTime,
  copied,
  onCopy,
}: ActivationCodeManagerProps) {
  if (!isReadyToIssue) {
    return (
      <CpStatePanel role="alert" title="لا يمكن إصدار كود التفعيل — الملف غير مكتمل:">
        <Box gap={1}>
          {missingReasons.map((reasonStr, index) => (
            <Text key={index} role="bodySm">{`• ${reasonStr}`}</Text>
          ))}
        </Box>
      </CpStatePanel>
    );
  }

  if (!latest && !activeCode) {
    return (
      <Box layoutDirection="row" justify="space-between" align="center">
        <Box layoutDirection="row" gap={3} align="center">
          <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
          <Text role="body" tone="muted">لم يصدر بعد</Text>
        </Box>
        <CpButton variant="primary" disabled={actionBusy} onClick={onIssue}>
          {actionBusy ? "جارٍ الإصدار…" : "إصدار كود"}
        </CpButton>
      </Box>
    );
  }

  return (
    <Box gap={2}>
      {activeCode ? (
        <Box gap={2}>
          <Box layoutDirection="row" justify="space-between" align="center">
            <Box layoutDirection="row" gap={3} align="center">
              <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
              <Text role="titleSm">{activeCode.code}</Text>
            </Box>
            <CpButton variant="secondary" onClick={() => onCopy(activeCode.code)}>
              {copied ? "نسخ ✓" : "نسخ الكود"}
            </CpButton>
          </Box>
          <CpDescriptionList>
            <CpDescriptionRow label="الهاتف">{activeCode.maskedPhone}</CpDescriptionRow>
            <CpDescriptionRow label="ينتهي">{formatTime(activeCode.expiresAt)}</CpDescriptionRow>
            <CpDescriptionRow label="الحالة">
              <CpBadge tone="success">صالح للاستخدام</CpBadge>
            </CpDescriptionRow>
          </CpDescriptionList>
        </Box>
      ) : (
        latest && (
          <Box gap={2}>
            <Box layoutDirection="row" justify="space-between" align="center">
              <Box layoutDirection="row" gap={3} align="center">
                <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
                <Text role="body" tone="muted">******</Text>
              </Box>
              <CpButton variant="primary" disabled={actionBusy} onClick={onIssue}>
                {actionBusy ? "جارٍ الإصدار…" : "إصدار كود جديد"}
              </CpButton>
            </Box>
            <CpDescriptionList>
              <CpDescriptionRow label="الهاتف">{latest.maskedPhone}</CpDescriptionRow>
              <CpDescriptionRow label="ينتهي">{formatTime(latest.expiresAt)}</CpDescriptionRow>
              <CpDescriptionRow label="الحالة">
                <CpBadge tone={activationStatusTone(latest.status)}>{activationStatusLabel(latest.status)}</CpBadge>
              </CpDescriptionRow>
            </CpDescriptionList>
          </Box>
        )
      )}

      {((latest && latest.status === "pending") || activeCode) && (
        <Box layoutDirection="row" justify="flex-end">
          <CpButton variant="danger" disabled={actionBusy} onClick={onRevoke}>
            {actionBusy ? "جارٍ الإبطال…" : "إبطال الكود"}
          </CpButton>
        </Box>
      )}
    </Box>
  );
}

type OperationalStatusManagerProps = {
  readonly engagementStatus: EngagementStatus;
  readonly reason: string;
  readonly onChangeReason: (text: string) => void;
  readonly actionBusy: boolean;
  readonly onSuspend: () => void;
  readonly onReactivate: () => void;
};

function OperationalStatusManager({
  engagementStatus,
  reason,
  onChangeReason,
  actionBusy,
  onSuspend,
  onReactivate,
}: OperationalStatusManagerProps) {
  return (
    <Box gap={3}>
      <Text role="bodyStrong">الحالة التشغيلية والارتباط</Text>
      <CpDescriptionList>
        <CpDescriptionRow label="حالة الارتباط الحالية">
          {ENGAGEMENT_STATUS_LABEL_AR[engagementStatus]}
        </CpDescriptionRow>
      </CpDescriptionList>

      <TextField
        label="سبب الإيقاف / إعادة التفعيل"
        value={reason}
        onChangeText={onChangeReason}
        placeholder="مطلوب للإيقاف، اختياري لإعادة التفعيل"
      />

      <Box layoutDirection="row" gap={2}>
        {engagementStatus !== "suspended" && engagementStatus !== "terminated" && (
          <CpButton
            variant="danger"
            disabled={actionBusy || reason.trim().length === 0}
            onClick={onSuspend}
          >
            {actionBusy ? "جارٍ التنفيذ…" : "إيقاف الحساب"}
          </CpButton>
        )}
        {engagementStatus === "suspended" && (
          <CpButton variant="primary" disabled={actionBusy} onClick={onReactivate}>
            {actionBusy ? "جارٍ التنفيذ…" : "إعادة تفعيل"}
          </CpButton>
        )}
      </Box>
    </Box>
  );
}
