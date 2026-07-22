"use client";

import { useMemo, useState } from "react";
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
type DraftItem = CreatePlatformChangeSetInput["items"][number];

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

const STATUS_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "draft", label: "مسودة" },
  { value: "validated", label: "تم التحقق" },
  { value: "submitted", label: "قيد المراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "rejected", label: "مرفوض" },
  { value: "applied", label: "مطبق" },
  { value: "rolled_back", label: "تم التراجع" },
];

function jsonText(value: unknown): string {
  if (value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

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
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
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
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [applyTargetId, setApplyTargetId] = useState<string | null>(null);
  const [rollbackTargetId, setRollbackTargetId] = useState<string | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");

  const busy = workflow.mutationState.kind === "loading";
  const changeSets = workflow.state.kind === "success" ? workflow.state.changeSets : [];
  const selectedChangeSet = changeSets.find((changeSet) => changeSet.id === selectedId) ?? null;
  const filteredChangeSets = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return changeSets.filter((changeSet) => {
      if (statusFilter !== "all" && changeSet.status !== statusFilter) return false;
      if (!query) return true;
      return [changeSet.title, changeSet.reason, changeSet.proposerActorId, changeSet.id, ...changeSet.items.map((item) => item.targetKey)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [changeSets, searchText, statusFilter]);

  const refreshAffectedState = async () => {
    await onChanged?.();
  };

  const resetItemForm = () => {
    setTargetType("variable");
    setTargetKey("");
    setOwnerService("dsh");
    setScopeType("global");
    setScopeId("");
    setValueType("json");
    setClassification("internal");
    setExpectedRevision("0");
    setProposedValue("");
  };

  const resetCreateForm = () => {
    setTitle("");
    setReason("");
    setImpactAssessment("");
    setRollbackPlan("");
    setDraftItems([]);
    resetItemForm();
    setFormError(null);
  };

  const addDraftItem = () => {
    setFormError(null);
    const revision = Number(expectedRevision);
    if (!targetKey.trim() || !ownerService.trim() || !Number.isInteger(revision) || revision < 0) {
      setFormError("PLATFORM_CHANGE_ITEM_REQUIRED_FIELDS_MISSING");
      return;
    }
    if (targetType === "variable" && scopeType.trim() === "global" && scopeId.trim()) {
      setFormError("PLATFORM_GLOBAL_SCOPE_ID_MUST_BE_EMPTY");
      return;
    }
    if (targetType === "variable" && scopeType.trim() !== "global" && !scopeId.trim()) {
      setFormError("PLATFORM_NON_GLOBAL_SCOPE_ID_REQUIRED");
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
    const effectiveScopeType = targetType === "feature_flag" ? "global" : scopeType.trim() || "global";
    const effectiveScopeId = targetType === "feature_flag" ? "" : scopeId.trim();
    const identityKey = `${targetType}|${targetKey.trim()}|${effectiveScopeType}|${effectiveScopeId}`;
    if (draftItems.some((item) => `${item.targetType}|${item.targetKey}|${item.scopeType ?? "global"}|${item.scopeId ?? ""}` === identityKey)) {
      setFormError("PLATFORM_DUPLICATE_TARGET_IN_CHANGE_SET");
      return;
    }
    setDraftItems((items) => [...items, {
      targetType,
      targetKey: targetKey.trim(),
      ownerService: ownerService.trim(),
      scopeType: effectiveScopeType,
      scopeId: effectiveScopeId,
      valueType: targetType === "feature_flag" ? "boolean" : valueType.trim() || "json",
      classification: classification.trim() || "internal",
      expectedRevision: revision,
      proposedValue: parsedValue,
    }]);
    resetItemForm();
  };

  const createChangeSet = async () => {
    setFormError(null);
    if (!title.trim() || !reason.trim() || !impactAssessment.trim() || !rollbackPlan.trim() || draftItems.length === 0) {
      setFormError("PLATFORM_CHANGE_REQUIRED_FIELDS_MISSING");
      return;
    }
    const succeeded = await workflow.create({
      title: title.trim(),
      reason: reason.trim(),
      impactAssessment: impactAssessment.trim(),
      rollbackPlan: rollbackPlan.trim(),
      items: draftItems,
    });
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

  const applyChangeSet = async () => {
    if (!applyTargetId) return;
    const succeeded = await workflow.apply(applyTargetId);
    if (succeeded) {
      setApplyTargetId(null);
      await refreshAffectedState();
    }
  };

  const rollbackChangeSet = async () => {
    if (!rollbackTargetId || !rollbackReason.trim()) return;
    const succeeded = await workflow.rollback(rollbackTargetId, rollbackReason.trim());
    if (succeeded) {
      setRollbackTargetId(null);
      setRollbackReason("");
      await refreshAffectedState();
    }
  };

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.cardContent}>
          <Text role="titleSm">دورة التغيير السيادية</Text>
          <Text role="caption">
            المسودة والتحقق والإرسال والمراجعة والتطبيق والتراجع تمر عبر platform-control وتُسجل في PostgreSQL. التحقق يحجز الهدف ويلتقط حالته، ولا تُقبل الأسرار أو الكتابة المباشرة.
          </Text>
          {canPropose ? (
            <View style={styles.formGrid}>
              <CpTextInput value={title} onChange={setTitle} placeholder="عنوان التغيير" aria-label="عنوان التغيير" />
              <CpTextInput value={reason} onChange={setReason} placeholder="السبب" aria-label="سبب التغيير" />
              <CpTextInput value={impactAssessment} onChange={setImpactAssessment} placeholder="تقييم الأثر المتوقع" aria-label="تقييم الأثر" />
              <CpTextInput value={rollbackPlan} onChange={setRollbackPlan} placeholder="خطة التراجع الآمنة" aria-label="خطة التراجع" />
              <View style={styles.fullWidth}><Text role="titleSm">إضافة عنصر إلى المسودة</Text></View>
              <CpSelect value={targetType} onChange={(value) => setTargetType(value as ChangeTargetType)} options={[{ value: "variable", label: "متغير سيادي" }, { value: "feature_flag", label: "علم ميزة" }]} aria-label="نوع الهدف" />
              <CpTextInput value={targetKey} onChange={setTargetKey} placeholder="المفتاح" aria-label="مفتاح الهدف" />
              <CpTextInput value={ownerService} onChange={setOwnerService} placeholder="الخدمة المالكة" aria-label="الخدمة المالكة" />
              <CpTextInput value={scopeType} onChange={setScopeType} placeholder="نوع النطاق" aria-label="نوع النطاق" />
              <CpTextInput value={scopeId} onChange={setScopeId} placeholder="معرف النطاق" aria-label="معرف النطاق" />
              <CpTextInput value={valueType} onChange={setValueType} placeholder="نوع القيمة" aria-label="نوع القيمة" />
              <CpTextInput value={classification} onChange={setClassification} placeholder="التصنيف — يمنع secret/token" aria-label="التصنيف" />
              <CpTextInput value={expectedRevision} onChange={setExpectedRevision} placeholder="المراجعة المتوقعة" aria-label="المراجعة المتوقعة" />
              <View style={styles.fullWidth}>
                <CpTextInput value={proposedValue} onChange={setProposedValue} placeholder={targetType === "feature_flag" ? "true أو false" : "قيمة JSON مثل {\"limit\":12}"} aria-label="القيمة المقترحة بصيغة JSON" />
              </View>
              <View style={styles.actions}>
                <CpButton onClick={addDraftItem} disabled={busy}>إضافة العنصر</CpButton>
                <CpButton onClick={resetItemForm} disabled={busy}>مسح العنصر</CpButton>
              </View>
              {draftItems.length > 0 ? (
                <View style={styles.fullWidth}>
                  <Text role="titleSm">عناصر المسودة ({draftItems.length})</Text>
                  {draftItems.map((item, index) => (
                    <View key={`${item.targetType}-${item.targetKey}-${index}`} style={styles.itemSummary}>
                      <Text role="caption">{item.targetType} · {item.targetKey} · rev {item.expectedRevision} · {jsonText(item.proposedValue)}</Text>
                      <CpButton onClick={() => setDraftItems((items) => items.filter((_, itemIndex) => itemIndex !== index))} disabled={busy}>إزالة</CpButton>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.actions}>
                <CpButton onClick={() => void createChangeSet()} disabled={busy || draftItems.length === 0}>{busy ? "جاري التنفيذ…" : "إنشاء مسودة التغيير"}</CpButton>
                <CpButton onClick={resetCreateForm} disabled={busy}>مسح المسودة</CpButton>
              </View>
            </View>
          ) : (
            <CpStatePanel role="status" title="صلاحية الاقتراح غير متاحة" description="يمكنك قراءة الطلبات فقط. يتطلب إنشاء الطلب platform:variables:propose." code="PLATFORM_PROPOSE_PERMISSION_REQUIRED" />
          )}
          {formError ? <CpStatePanel role="alert" title="تعذر تجهيز الطلب" code={formError} /> : null}
          {workflow.mutationState.kind === "error" ? <CpStatePanel role="alert" title="فشل إجراء منصة" code={workflow.mutationState.message} /> : null}
          {workflow.mutationState.kind === "success" ? <CpStatePanel role="status" title="تم حفظ الإجراء وقراءة الحالة الراجعة" code={workflow.mutationState.message} /> : null}
        </View>
      </Card>

      <Card>
        <View style={styles.cardContent}>
          <Text role="titleSm">طلبات التغيير</Text>
          <View style={styles.actions}>
            <CpTextInput value={searchText} onChange={setSearchText} placeholder="بحث بالعنوان أو المفتاح أو المقترح" aria-label="بحث طلبات التغيير" />
            <CpSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} aria-label="ترشيح حالة طلب التغيير" />
            <CpRetryButton onClick={() => void workflow.reload()}>تحديث</CpRetryButton>
          </View>
          {workflow.state.kind === "loading" || workflow.state.kind === "idle" ? (
            <CpStatePanel role="status" title="جاري تحميل طلبات التغيير…" />
          ) : workflow.state.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل طلبات التغيير" code={workflow.state.message}><CpRetryButton onClick={() => void workflow.reload()}>إعادة المحاولة</CpRetryButton></CpStatePanel>
          ) : filteredChangeSets.length === 0 ? (
            <CpStatePanel role="status" title="لا توجد نتائج مطابقة" code="PLATFORM_CHANGE_SETS_EMPTY" />
          ) : (
            <CpTable aria-label="طلبات تغيير المنصة السيادية">
              <thead><tr><CpTableHeaderCell>العنوان</CpTableHeaderCell><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>المقترح</CpTableHeaderCell><CpTableHeaderCell>العناصر</CpTableHeaderCell><CpTableHeaderCell>المراجعة</CpTableHeaderCell><CpTableHeaderCell>الإجراءات</CpTableHeaderCell></tr></thead>
              <tbody>
                {filteredChangeSets.map((changeSet) => (
                  <tr key={changeSet.id}>
                    <CpTableCell>{changeSet.title}</CpTableCell>
                    <CpTableCell><Badge label={changeSet.status} tone={STATUS_TONE[changeSet.status] ?? "neutral"} /></CpTableCell>
                    <CpTableCell>{changeSet.proposerActorId}</CpTableCell>
                    <CpTableCell>{changeSet.items.length}</CpTableCell>
                    <CpTableCell>{changeSet.version}</CpTableCell>
                    <CpTableCell>
                      <View style={styles.actions}>
                        <CpButton onClick={() => setSelectedId(changeSet.id)} disabled={busy}>تفاصيل</CpButton>
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
                          onReject={() => { setRejectTargetId(changeSet.id); setRejectReason(""); }}
                          onApply={() => setApplyTargetId(changeSet.id)}
                          onRollback={() => { setRollbackTargetId(changeSet.id); setRollbackReason(""); }}
                        />
                      </View>
                    </CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          )}
        </View>
      </Card>

      {selectedChangeSet ? <ChangeSetDetails changeSet={selectedChangeSet} onClose={() => setSelectedId(null)} /> : null}

      {rejectTargetId ? (
        <Card><View style={styles.cardContent}><Text role="titleSm">رفض طلب التغيير</Text><CpTextInput value={rejectReason} onChange={setRejectReason} placeholder="سبب الرفض الإلزامي" aria-label="سبب رفض التغيير" /><View style={styles.actions}><CpButton onClick={() => void rejectChangeSet()} disabled={busy || !rejectReason.trim()}>تأكيد الرفض</CpButton><CpButton onClick={() => { setRejectTargetId(null); setRejectReason(""); }} disabled={busy}>إلغاء</CpButton></View></View></Card>
      ) : null}

      {applyTargetId ? (
        <Card><View style={styles.cardContent}><Text role="titleSm">تأكيد التطبيق الذري</Text><Text role="caption">سيعاد فحص لقطة التحقق والمراجعة قبل تطبيق جميع العناصر في معاملة واحدة. أي تعارض يلغي العملية كاملة.</Text><View style={styles.actions}><CpButton onClick={() => void applyChangeSet()} disabled={busy}>تأكيد التطبيق</CpButton><CpButton onClick={() => setApplyTargetId(null)} disabled={busy}>إلغاء</CpButton></View></View></Card>
      ) : null}

      {rollbackTargetId ? (
        <Card><View style={styles.cardContent}><Text role="titleSm">تراجع إلى النسخة الآمنة</Text><CpTextInput value={rollbackReason} onChange={setRollbackReason} placeholder="سبب التراجع الإلزامي" aria-label="سبب التراجع الإلزامي" /><Text role="caption">سيتم التحقق من المراجعة المطبقة ثم استعادة القيمة والمالك والنوع والتصنيف والحالة والاستهداف المحفوظ.</Text><View style={styles.actions}><CpButton onClick={() => void rollbackChangeSet()} disabled={busy || !rollbackReason.trim()}>تأكيد التراجع</CpButton><CpButton onClick={() => { setRollbackTargetId(null); setRollbackReason(""); }} disabled={busy}>إلغاء</CpButton></View></View></Card>
      ) : null}
    </View>
  );
}

function ChangeSetDetails({ changeSet, onClose }: { readonly changeSet: PlatformChangeSet; readonly onClose: () => void }) {
  return (
    <Card>
      <View style={styles.cardContent}>
        <View style={styles.actions}><Text role="titleSm">تفاصيل الطلب والفرق المتوقع</Text><CpButton onClick={onClose}>إغلاق التفاصيل</CpButton></View>
        <Text role="caption">المعرف: {changeSet.id}</Text>
        <Text role="caption">السبب: {changeSet.reason}</Text>
        <Text role="caption">الأثر المتوقع: {changeSet.impactAssessment}</Text>
        <Text role="caption">خطة التراجع: {changeSet.rollbackPlan}</Text>
        <Text role="caption">المقترح: {changeSet.proposerActorId} · المعتمد: {changeSet.approverActorId ?? "—"} · المطبق: {changeSet.appliedByActorId ?? "—"}</Text>
        <Text role="caption">الإنشاء: {changeSet.createdAt} · التحقق: {changeSet.validatedAt ?? "—"} · التطبيق: {changeSet.appliedAt ?? "—"}</Text>
        {changeSet.rejectionReason ? <Text role="caption">سبب الرفض: {changeSet.rejectionReason}</Text> : null}
        {changeSet.items.map((item) => (
          <View key={item.id} style={styles.detailItem}>
            <Text role="titleSm">{item.targetType} · {item.targetKey}</Text>
            <Text role="caption">المالك: {item.ownerService} · النطاق: {item.scopeType}:{item.scopeId ?? ""} · التصنيف: {item.classification}</Text>
            <Text role="caption">المراجعات: expected={item.expectedRevision} · validated={item.validatedRevision ?? "—"} · applied={item.appliedRevision ?? "—"}</Text>
            <Text role="caption">preconditionSnapshot: {jsonText(item.preconditionSnapshot)}</Text>
            <Text role="caption">proposedValue: {jsonText(item.proposedValue)}</Text>
            <Text role="caption">beforeValue: {jsonText(item.beforeValue)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function ChangeSetActions({ changeSet, subject, canPropose, canApprove, canApply, canRollback, busy, onValidate, onSubmit, onApprove, onReject, onApply, onRollback }: {
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
      {changeSet.status === "draft" && canPropose ? <CpButton onClick={onValidate} disabled={busy}>تحقق حي</CpButton> : null}
      {changeSet.status === "validated" && canPropose ? <CpButton onClick={onSubmit} disabled={busy}>إرسال</CpButton> : null}
      {changeSet.status === "submitted" && canApprove && changeSet.proposerActorId !== subject ? <><CpButton onClick={onApprove} disabled={busy}>اعتماد</CpButton><CpButton onClick={onReject} disabled={busy}>رفض</CpButton></> : null}
      {changeSet.status === "submitted" && canApprove && changeSet.proposerActorId === subject ? <Text role="caption">لا يمكنك اعتماد أو رفض التغيير الذي اقترحته</Text> : null}
      {changeSet.status === "approved" && canApply ? <CpButton onClick={onApply} disabled={busy}>تطبيق</CpButton> : null}
      {changeSet.status === "applied" && canRollback ? <CpButton onClick={onRollback} disabled={busy}>تراجع</CpButton> : null}
      {!['draft', 'validated', 'submitted', 'approved', 'applied'].includes(changeSet.status) ? <Text role="caption">لا يوجد إجراء متاح</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing[4] },
  cardContent: { gap: spacing[3], padding: spacing[4] },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[3] },
  fullWidth: { width: "100%", gap: spacing[2] },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], alignItems: "center" },
  itemSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2], padding: spacing[2] },
  detailItem: { gap: spacing[2], padding: spacing[3] },
});
