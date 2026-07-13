import React, { useState } from "react";
import { StyleSheet } from "react-native";
import {
  Box,
  borders,
  Button,
  Card,
  Text,
  TextField,
  spacing,
  radius,
  colorRoles,
  statusScale,
} from "@bthwani/ui-kit";
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
    return (
      <Card style={styles.errorCard}>
        <Text role="bodySm" tone="danger" align="center">معرف مقدم الخدمة غير محدد</Text>
      </Card>
    );
  }

  return (
    <Box style={styles.container}>
      {!isHrDetail && (
        <Card style={styles.listCard}>
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
            <Text role="bodySm" tone="muted" style={styles.errorText}>جارٍ التحميل…</Text>
          )}

          {listController.state.kind === "ready" && providersList.length === 0 && (
            <Text role="bodySm" tone="muted" style={styles.errorText}>
              لا يوجد مقدمو خدمة مطابقون — أنشئ الملف من قسم الموارد البشرية أولًا.
            </Text>
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
    <Box style={styles.tabsContainer}>
      {STATUS_TABS.map((tab) => (
        <Button
          key={tab.label}
          label={tab.label}
          tone={status === tab.value ? "primary" : "ghost"}
          onPress={() => onStatusChange(tab.value)}
        />
      ))}
    </Box>
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
    <Box>
      {providers.map((provider) => (
        <Box key={provider.actorId} style={styles.providerRow}>
          <Box style={styles.providerInfo}>
            <Text role="bodyStrong">{provider.fullNameAr}</Text>
            <Text role="caption" tone="muted">
              {provider.providerCode} ·{" "}
              {providerKind === "captain"
                ? cityLabel(provider.captainProfile?.operatingCityCode)
                : cityLabel(provider.fieldProfile?.cityCode)}{" "}
              · {ENGAGEMENT_STATUS_LABEL_AR[provider.engagementStatus as EngagementStatus]}
            </Text>
          </Box>
          <Button
            label={selectedActorId === provider.actorId ? "محدد ✓" : "اختيار"}
            tone={selectedActorId === provider.actorId ? "primary" : "secondary"}
            onPress={() => onSelect(provider.actorId)}
          />
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
      <Card style={styles.innerCard}>
        <Text role="bodySm" tone="muted" align="center">جارٍ تحميل بيانات التفعيل…</Text>
      </Card>
    );
  }

  if (error || !detail) {
    return (
      <Card style={styles.errorDetailCard}>
        <Text role="bodySm" tone="danger" align="center">
          {error || "حدث خطأ أثناء تحميل بيانات مقدم الخدمة"}
        </Text>
        {onBack && (
          <Box style={styles.backButtonContainer}>
            <Button label="رجوع" tone="ghost" onPress={onBack} />
          </Box>
        )}
      </Card>
    );
  }

  const missingReasons: string[] = [];
  if (!detail.fullNameAr) missingReasons.push("الاسم الكامل باللغة العربية مطلوب");
  if (!detail.providerCode) missingReasons.push("رقم مقدم الخدمة مطلوب");

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
    <Box style={styles.container}>
      <Card style={styles.innerCard}>
        <Box style={styles.cardHeader}>
          <Text role="titleSm" style={styles.cardTitle}>
            إدارة حالة الدخول وتفعيل التطبيق
          </Text>
          {onBack && <Button label="إلغاء التحديد" tone="ghost" onPress={onBack} />}
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
          <Text role="caption" tone="danger" style={styles.errorText}>
            {actionError}
          </Text>
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
      </Card>
    </Box>
  );
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
      <Box style={styles.dangerCard}>
        <Text role="bodySm" style={styles.dangerTitle}>
          لا يمكن إصدار كود التفعيل — الملف غير مكتمل:
        </Text>
        {missingReasons.map((reasonStr, index) => (
          <Text key={index} role="bodySm" style={styles.dangerBullet}>
            • {reasonStr}
          </Text>
        ))}
      </Box>
    );
  }

  if (!latest && !activeCode) {
    return (
      <Box style={styles.codeRow}>
        <Box style={styles.codeRowInner}>
          <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
          <Text role="body" tone="muted">لم يصدر بعد</Text>
        </Box>
        <Button
          label="إصدار كود"
          tone="primary"
          loading={actionBusy}
          disabled={actionBusy}
          onPress={onIssue}
        />
      </Box>
    );
  }

  return (
    <Box style={styles.codeContainer}>
      {activeCode ? (
        <Box style={styles.dataContainer}>
          <Box style={styles.codeRow}>
            <Box style={styles.codeRowInner}>
              <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
              <Text role="titleSm" style={styles.codeText}>{activeCode.code}</Text>
            </Box>
            <Button
              label={copied ? "نسخ ✓" : "نسخ الكود"}
              tone="secondary"
              onPress={() => onCopy(activeCode.code)}
            />
          </Box>
          <Box style={styles.dataRow}>
            <Text role="bodySm" tone="muted">الهاتف</Text>
            <Text role="bodyStrong">{activeCode.maskedPhone}</Text>
          </Box>
          <Box style={styles.dataRow}>
            <Text role="bodySm" tone="muted">ينتهي</Text>
            <Text role="bodyStrong">{formatTime(activeCode.expiresAt)}</Text>
          </Box>
          <Box style={styles.dataRow}>
            <Text role="bodySm" tone="muted">الحالة</Text>
            <Text role="bodyStrong" style={{ color: colorRoles.success }}>صالح للاستخدام</Text>
          </Box>
        </Box>
      ) : (
        latest && (
          <Box style={styles.dataContainer}>
            <Box style={styles.codeRow}>
              <Box style={styles.codeRowInner}>
                <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
                <Text role="body" tone="muted">******</Text>
              </Box>
              <Button
                label="إصدار كود جديد"
                tone="primary"
                loading={actionBusy}
                disabled={actionBusy}
                onPress={onIssue}
              />
            </Box>
            <Box style={styles.dataRow}>
              <Text role="bodySm" tone="muted">الهاتف</Text>
              <Text role="bodyStrong">{latest.maskedPhone}</Text>
            </Box>
            <Box style={styles.dataRow}>
              <Text role="bodySm" tone="muted">ينتهي</Text>
              <Text role="bodyStrong">{formatTime(latest.expiresAt)}</Text>
            </Box>
            <Box style={styles.dataRow}>
              <Text role="bodySm" tone="muted">الحالة</Text>
              <Text
                role="bodyStrong"
                style={{
                  color:
                    latest.status === "pending"
                      ? colorRoles.success
                      : latest.status === "consumed"
                      ? colorRoles.info
                      : colorRoles.textSecondary,
                }}
              >
                {latest.status === "pending"
                  ? "صالح للاستخدام"
                  : latest.status === "consumed"
                  ? "مستخدم"
                  : latest.status === "revoked"
                  ? "مبطل"
                  : latest.status === "expired"
                  ? "منتهي الصلاحية"
                  : latest.status}
              </Text>
            </Box>
          </Box>
        )
      )}

      {((latest && latest.status === "pending") || activeCode) && (
        <Box style={styles.revokeContainer}>
          <Button
            label="إبطال الكود"
            tone="danger"
            loading={actionBusy}
            disabled={actionBusy}
            onPress={onRevoke}
          />
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
    <Box style={styles.statusSection}>
      <Text role="bodyStrong" style={styles.statusTitle}>الحالة التشغيلية والارتباط</Text>
      <Box style={styles.dataRow}>
        <Text role="bodySm" tone="muted">حالة الارتباط الحالية</Text>
        <Text role="bodyStrong">{ENGAGEMENT_STATUS_LABEL_AR[engagementStatus]}</Text>
      </Box>

      <TextField
        label="سبب الإيقاف / إعادة التفعيل"
        value={reason}
        onChangeText={onChangeReason}
        placeholder="مطلوب للإيقاف، اختياري لإعادة التفعيل"
      />

      <Box style={styles.buttonRow}>
        {engagementStatus !== "suspended" && engagementStatus !== "terminated" && (
          <Button
            label="إيقاف الحساب"
            tone="danger"
            loading={actionBusy}
            disabled={actionBusy || reason.trim().length === 0}
            onPress={onSuspend}
          />
        )}
        {engagementStatus === "suspended" && (
          <Button
            label="إعادة تفعيل"
            tone="primary"
            loading={actionBusy}
            disabled={actionBusy}
            onPress={onReactivate}
          />
        )}
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  listCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  innerCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  errorCard: {
    padding: spacing[4],
  },
  errorDetailCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  backButtonContainer: {
    flexDirection: "row-reverse",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row-reverse",
    gap: spacing[2],
    flexWrap: "wrap",
  },
  providerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[2],
    borderBottomWidth: borders.hairline,
    borderBottomColor: colorRoles.borderSubtle,
  },
  providerInfo: {
    alignItems: "flex-end",
  },
  dangerCard: {
    padding: spacing[3],
    backgroundColor: statusScale.dangerSoft,
    borderColor: statusScale.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: "flex-end",
    gap: spacing[1],
  },
  dangerTitle: {
    color: statusScale.dangerStrong,
    fontWeight: "bold",
  },
  dangerBullet: {
    color: statusScale.dangerStrong,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    textAlign: "right",
    fontWeight: "bold",
  },
  codeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeRowInner: {
    flexDirection: "row-reverse",
    gap: spacing[4],
    alignItems: "center",
  },
  codeText: {
    fontFamily: "monospace",
    letterSpacing: 1,
    fontWeight: "bold",
    color: colorRoles.textPrimary,
  },
  codeContainer: {
    gap: spacing[2],
    borderBottomWidth: borders.hairline,
    borderBottomColor: colorRoles.borderSubtle,
    paddingBottom: spacing[3],
  },
  dataContainer: {
    gap: spacing[2],
  },
  dataRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  revokeContainer: {
    alignItems: "flex-end",
  },
  errorText: {
    textAlign: "right",
  },
  statusSection: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  statusTitle: {
    textAlign: "right",
  },
  buttonRow: {
    flexDirection: "row-reverse",
    gap: spacing[2],
  },
});
