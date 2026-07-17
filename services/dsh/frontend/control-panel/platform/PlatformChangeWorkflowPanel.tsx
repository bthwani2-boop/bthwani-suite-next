"use client";

import { useState } from "react";
import { Badge, Card, Text, spacing } from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import {
  CpButton,
  CpRetryButton,
  CpSelect,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import {
  usePlatformChangeWorkflowController,
  type CreatePlatformChangeSetInput,
  type PlatformChangeSet,
} from "../../shared/platform";
import { hasControlPanelPermission } from "../../shared/session/control-panel-permissions";
import { useControlPanelSession } from "../../shared/session/control-panel-session";

export type PlatformChangeWorkflowPanelProps = {
  readonly onChanged?: () => void | Promise<void>;
};

type ChangeTargetType = "variable" | "feature_flag";

const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  draft: "neutral",
  validated: "info",
  submitted: "warning",
  approved: "info",
  rejected: "danger",
  applied: "success",
  rolled_back: "neutral",
  failed: "danger",
};

export function PlatformChangeWorkflowPanel({ onChanged }: PlatformChangeWorkflowPanelProps) {
  const { state: sessionState } = useControlPanelSession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const subject = identity?.subject ?? "";
  const canRead = hasControlPanelPermission(identity, "platform:read");
  const canPropose = hasControlPanelPermission(identity, "platform:variables:propose");
  const canApprove = hasControlPanelPermission(identity, "platform:variables:approve");
  const canApply = hasControlPanelPermission(identity, "platform:variables:apply");
  const canRollback = hasControlPanelPermission(identity, "platform:variables:rollback");
  const workflow = usePlatformChangeWorkflowController(canRead);

  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [impactAssessment, setImpactAssessment] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");
  const [targetType, setTargetType] = useState<ChangeTargetType>("variable");
  const [targetKey, setTargetKey] = useState("");
  const [ownerService, setOwnerService] = useState("dsh");
  const [scopeType, setScopeType] = useState("global");
  const [scopeId, setScopeId] = useState("");
  const [valueType, setValueType] = useState("json");
  const [classification, setClassification] = useState("internal");
  const [expectedRevision, setExpectedRevision] = useState("0");
  const [proposedValue, setProposedValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const busy = workflow.mutationState.kind === "loading";

  const refreshAffectedState = async () => {
    await onChanged?.();
  };

  const resetCreateForm = () => {
    setTitle("");
    setReason("");
    setImpactAssessment("");
    setRollbackPlan("");
    setTargetKey("");
    setScopeId("");
    setExpectedRevision("0");
    setProposedValue("");
    setFormError(null);
  };

  const createChangeSet = async () => {
    setFormError(null);
    const revision = Number(expectedRevision);
    if (
      !title.trim() ||
      !reason.trim() ||
      !impactAssessment.trim() ||
      !rollbackPlan.trim() ||
      !targetKey.trim() ||
      !ownerService.trim() ||
      !Number.isInteger(revision) ||
      revision < 0
    ) {
      setFormError("PLATFORM_CHANGE_REQUIRED_FIELDS_MISSING");
      return;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(proposedValue);
    } catch {
      setFormError("PLATFORM_PROPOSED_VALUE_INVALID_JSON");
      return;
    }
    if (targetType === "feature_flag" && typeof parsedValue !== "boolean") {
      setFormError("PLATFORM_FEATURE_FLAG_VALUE_MUST_BE_BOOLEAN");
      return;
    }

    const input: CreatePlatformChangeSetInput = {
      title: title.trim(),
      reason: reason.trim(),
      impactAssessment: impactAssessment.trim(),
      rollbackPlan: rollbackPlan.trim(),
      items: [
        {
          targetType,
          targetKey: targetKey.trim(),
          ownerService: ownerService.trim(),
          scopeType: scopeType.trim() || "global",
          scopeId: scopeId.trim(),
          valueType: targetType === "feature_flag" ? "boolean" : valueType.trim() || "json",
          classification: classification.trim() || "internal",
          expectedRevision: revision,
          proposedValue: parsedValue,
        },
      ],
    };
    const succeeded = await workflow.create(input);
    if (succeeded) {
      resetCreateForm();
      await refreshAffectedState();
    }
  };

  const runTransition = async (operation: () => Promise<boolean>) => {
    const succeeded = await operation();
    if (succeeded) await refreshAffectedState();
  };

  const rejectChangeSet = async () => {
    if (!rejectTargetId || !rejectReason.trim()) return;
    const succeeded = await workflow.reject(rejectTargetId, rejectReason.trim());
    if (succeeded) {
      setRejectTargetId(null);
      setRejectReason("");
      await refreshAffectedState();
    }
  };

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.cardContent}>
          <Text role="titleSm">دورة التغيير السيادية</Text>
          <Text role="caption">
            الاقتراح والتحقق والإرسال والاعتماد والتطبيق والتراجع تمر عبر platform-control وتُسجل في PostgreSQL. لا توجد كتابة محلية أو مباشرة.
          </Text>

          {canPropose ? (
            <View style={styles.formGrid}>
              <CpTextInput value={title} onChange={setTitle} placeholder="عنوان التغيير" aria-label="عنوان التغيير" />
              <CpTextInput value={reason} onChange={setReason} placeholder="السبب" aria-label="سبب التغيير" />
              <CpTextInput value={impactAssessment} onChange={setImpactAssessment} placeholder="تقييم الأثر" aria-label="تقييم الأثر" />
              <CpTextInput value={rollbackPlan} onChange={setRollbackPlan} placeholder="خطة التراجع" aria-label="خطة التراجع" />
              <CpSelect
                value={targetType}
                onChange={(value) => setTargetType(value as ChangeTargetType)}
                options={[
                  { value: "variable", label: "متغير سيادي" },
                  { value: "feature_flag", label: "علم ميزة" },
                ]}
                aria-label="نوع الهدف"
              />
              <CpTextInput value={targetKey} onChange={setTargetKey} placeholder="المفتاح" aria-label="مفتاح الهدف" />
              <CpTextInput value={ownerService} onChange={setOwnerService} placeholder="الخدمة المالكة" aria-label="الخدمة المالكة" />
              <CpTextInput value={scopeType} onChange={setScopeType} placeholder="نوع النطاق" aria-label="نوع النطاق" />
              <CpTextInput value={scopeId} onChange={setScopeId} placeholder="معرف النطاق — اختياري" aria-label="معرف النطاق" />
              <CpTextInput value={valueType} onChange={setValueType} placeholder="نوع القيمة" aria-label="نوع القيمة" />
              <CpTextInput value={classification} onChange={setClassification} placeholder="التصنيف" aria-label="التصنيف" />
              <CpTextInput value={expectedRevision} onChange={setExpectedRevision} placeholder="المراجعة المتوقعة" aria-label="المراجعة المتوقعة" />
              <View style={styles.fullWidth}>
                <CpTextInput
                  value={proposedValue}
                  onChange={setProposedValue}
                  placeholder={targetType === "feature_flag" ? "true أو false" : "قيمة JSON مثل {\"limit\":12}"}
                  aria-label="القيمة المقترحة بصيغة JSON"
                />
              </View>
              <View style={styles.actions}>
                <CpButton onClick={() => void createChangeSet()} disabled={busy} aria-label="إنشاء طلب تغيير">
                  {busy ? "جاري التنفيذ…" : "إنشاء مسودة تغيير"}
                </CpButton>
                <CpButton onClick={resetCreateForm} disabled={busy} aria-label="مسح نموذج التغيير">
                  مسح
                </CpButton>
              </View>
            </View>
          ) : (
            <CpStatePanel
              role="status"
              title="صلاحية الاقتراح غير متاحة"
              description="يمكنك قراءة الطلبات فقط. يتطلب إنشاء الطلب platform:variables:propose."
              code="PLATFORM_PROPOSE_PERMISSION_REQUIRED"
            />
          )}

          {formError ? <CpStatePanel role="alert" title="تعذر إنشاء الطلب" code={formError} /> : null}
          {workflow.mutationState.kind === "error" ? (
            <CpStatePanel role="alert" title="فشل إجراء منصة" code={workflow.mutationState.message} />
          ) : null}
          {workflow.mutationState.kind === "success" ? (
            <CpStatePanel role="status" title="تم حفظ الإجراء وقراءة الحالة الراجعة" code={workflow.mutationState.message} />
          ) : null}
        </View>
      </Card>

      {workflow.state.kind === "loading" || workflow.state.kind === "idle" ? (
        <CpStatePanel role="status" title="جاري تحميل طلبات التغيير…" />
      ) : workflow.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل طلبات التغيير" code={workflow.state.message}>
          <CpRetryButton onClick={() => void workflow.reload()}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : workflow.state.changeSets.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد طلبات تغيير" code="PLATFORM_CHANGE_SETS_EMPTY" />
      ) : (
        <CpTable aria-label="طلبات تغيير المنصة السيادية">
          <thead>
            <tr>
              <CpTableHeaderCell>العنوان</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>المقترح</CpTableHeaderCell>
              <CpTableHeaderCell>العناصر</CpTableHeaderCell>
              <CpTableHeaderCell>المراجعة</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {workflow.state.changeSets.map((changeSet) => (
              <tr key={changeSet.id}>
                <CpTableCell>{changeSet.title}</CpTableCell>
                <CpTableCell>
                  <Badge label={changeSet.status} tone={STATUS_TONE[changeSet.status] ?? "neutral"} />
                </CpTableCell>
                <CpTableCell>{changeSet.proposerActorId}</CpTableCell>
                <CpTableCell>{changeSet.items.length}</CpTableCell>
                <CpTableCell>{changeSet.version}</CpTableCell>
                <CpTableCell>
                  <ChangeSetActions
                    changeSet={changeSet}
                    subject={subject}
                    canPropose={canPropose}
                    canApprove={canApprove}
                    canApply={canApply}
                    canRollback={canRollback}
                    busy={busy}
                    onValidate={() => void runTransition(() => workflow.validate(changeSet.id))}
                    onSubmit={() => void runTransition(() => workflow.submit(changeSet.id))}
                    onApprove={() => void runTransition(() => workflow.approve(changeSet.id))}
                    onReject={() => {
                      setRejectTargetId(changeSet.id);
                      setRejectReason("");
                    }}
                    onApply={() => void runTransition(() => workflow.apply(changeSet.id))}
                    onRollback={() => void runTransition(() => workflow.rollback(changeSet.id))}
                  />
                </CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}

      {rejectTargetId ? (
        <Card>
          <View style={styles.cardContent}>
            <Text role="titleSm">رفض طلب التغيير</Text>
            <CpTextInput value={rejectReason} onChange={setRejectReason} placeholder="سبب الرفض الإلزامي" aria-label="سبب رفض التغيير" />
            <View style={styles.actions}>
              <CpButton onClick={() => void rejectChangeSet()} disabled={busy || !rejectReason.trim()} aria-label="تأكيد رفض التغيير">
                تأكيد الرفض
              </CpButton>
              <CpButton onClick={() => { setRejectTargetId(null); setRejectReason(""); }} disabled={busy} aria-label="إلغاء رفض التغيير">
                إلغاء
              </CpButton>
            </View>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

function ChangeSetActions({
  changeSet,
  subject,
  canPropose,
  canApprove,
  canApply,
  canRollback,
  busy,
  onValidate,
  onSubmit,
  onApprove,
  onReject,
  onApply,
  onRollback,
}: {
  readonly changeSet: PlatformChangeSet;
  readonly subject: string;
  readonly canPropose: boolean;
  readonly canApprove: boolean;
  readonly canApply: boolean;
  readonly canRollback: boolean;
  readonly busy: boolean;
  readonly onValidate: () => void;
  readonly onSubmit: () => void;
  readonly onApprove: () => void;
  readonly onReject: () => void;
  readonly onApply: () => void;
  readonly onRollback: () => void;
}) {
  return (
    <View style={styles.actions}>
      {changeSet.status === "draft" && canPropose ? <CpButton onClick={onValidate} disabled={busy}>تحقق</CpButton> : null}
      {changeSet.status === "validated" && canPropose ? <CpButton onClick={onSubmit} disabled={busy}>إرسال</CpButton> : null}
      {changeSet.status === "submitted" && canApprove && changeSet.proposerActorId !== subject ? (
        <>
          <CpButton onClick={onApprove} disabled={busy}>اعتماد</CpButton>
          <CpButton onClick={onReject} disabled={busy}>رفض</CpButton>
        </>
      ) : null}
      {changeSet.status === "submitted" && canApprove && changeSet.proposerActorId === subject ? (
        <Text role="caption">لا يمكن اعتماد التغيير الذي اقترحته</Text>
      ) : null}
      {changeSet.status === "approved" && canApply ? <CpButton onClick={onApply} disabled={busy}>تطبيق</CpButton> : null}
      {changeSet.status === "applied" && canRollback ? <CpButton onClick={onRollback} disabled={busy}>تراجع</CpButton> : null}
      {!["draft", "validated", "submitted", "approved", "applied"].includes(changeSet.status) ? (
        <Text role="caption">لا يوجد إجراء متاح</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[4],
  },
  cardContent: {
    gap: spacing[3],
    padding: spacing[4],
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  fullWidth: {
    width: "100%",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    alignItems: "center",
  },
});
