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
  usePlatformRolloutController,
  type CreatePlatformRolloutInput,
  type PlatformChangeSet,
  type PlatformControlState,
  type PlatformRollout,
} from "../../shared/platform";
import { hasControlPanelPermission } from "../../shared/session/control-panel-permissions";
import { useControlPanelSession } from "../../shared/session/control-panel-session";

export type PlatformRolloutPanelProps = {
  readonly changeSets: readonly PlatformChangeSet[];
  readonly healthState: PlatformControlState;
  readonly onChanged?: () => void | Promise<void>;
};

const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  running: "info",
  paused: "warning",
  completed: "success",
  aborted: "danger",
  rolled_back: "neutral",
  failed: "danger",
};

export function PlatformRolloutPanel({ changeSets, healthState, onChanged }: PlatformRolloutPanelProps) {
  const { state: sessionState } = useControlPanelSession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canRead = hasControlPanelPermission(identity, "platform:read");
  const canManage = hasControlPanelPermission(identity, "platform:rollouts:manage");
  const rollouts = usePlatformRolloutController(canRead);

  const eligibleChangeSets = useMemo(
    () => changeSets.filter((changeSet) =>
      changeSet.status === "applied" && changeSet.items.some((item) => item.targetType === "feature_flag"),
    ),
    [changeSets],
  );
  const [changeSetId, setChangeSetId] = useState(eligibleChangeSets[0]?.id ?? "");
  const selectedChangeSet = eligibleChangeSets.find((changeSet) => changeSet.id === changeSetId) ?? eligibleChangeSets[0] ?? null;
  const flagOptions = selectedChangeSet?.items
    .filter((item) => item.targetType === "feature_flag")
    .map((item) => ({ value: item.targetKey, label: item.targetKey })) ?? [];
  const [featureFlagKey, setFeatureFlagKey] = useState("");
  const selectedFlagKey = flagOptions.some((option) => option.value === featureFlagKey)
    ? featureFlagKey
    : flagOptions[0]?.value ?? "";
  const [stepsText, setStepsText] = useState("10,25,50,100");
  const [targetScopeText, setTargetScopeText] = useState("{}");
  const [healthGateText, setHealthGateText] = useState('{"requiredState":"OPERATIONAL"}');
  const [formError, setFormError] = useState<string | null>(null);
  const busy = rollouts.mutationState.kind === "loading";

  const refreshAffectedState = async () => {
    await onChanged?.();
  };

  const createRollout = async () => {
    setFormError(null);
    if (!selectedChangeSet || !selectedFlagKey) {
      setFormError("PLATFORM_ROLLOUT_APPLIED_FLAG_CHANGE_REQUIRED");
      return;
    }
    const steps = stepsText
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));
    if (
      steps.length === 0 ||
      steps[steps.length - 1] !== 100 ||
      steps.some((step, index) => !Number.isInteger(step) || step < 1 || step > 100 || (index > 0 && step <= steps[index - 1]))
    ) {
      setFormError("PLATFORM_ROLLOUT_STEPS_INVALID");
      return;
    }
    let targetScope: Record<string, unknown>;
    let healthGate: Record<string, unknown>;
    try {
      const parsedScope = JSON.parse(targetScopeText) as unknown;
      const parsedGate = JSON.parse(healthGateText) as unknown;
      if (!parsedScope || typeof parsedScope !== "object" || Array.isArray(parsedScope)) throw new Error("scope");
      if (!parsedGate || typeof parsedGate !== "object" || Array.isArray(parsedGate)) throw new Error("gate");
      targetScope = parsedScope as Record<string, unknown>;
      healthGate = parsedGate as Record<string, unknown>;
    } catch {
      setFormError("PLATFORM_ROLLOUT_SCOPE_OR_HEALTH_GATE_INVALID_JSON");
      return;
    }

    const input: CreatePlatformRolloutInput = {
      changeSetId: selectedChangeSet.id,
      featureFlagKey: selectedFlagKey,
      targetScope,
      steps,
      healthGate,
    };
    const succeeded = await rollouts.create(input);
    if (succeeded) await refreshAffectedState();
  };

  const runTransition = async (operation: () => Promise<boolean>) => {
    const succeeded = await operation();
    if (succeeded) await refreshAffectedState();
  };

  return (
    <View style={styles.stack}>
      <CpStatePanel
        role={healthState === "OPERATIONAL" ? "status" : "alert"}
        title={`بوابة صحة الإطلاق: ${healthState}`}
        description={
          healthState === "OPERATIONAL"
            ? "يمكن التقدم إلى الخطوة التالية. يعاد فحص الصحة قبل كل advance."
            : "إنشاء وإيقاف وإلغاء وتراجع الإطلاقات متاح حسب الصلاحية، لكن advance محجوب حتى تصبح الصحة OPERATIONAL."
        }
        code="PLATFORM_ROLLOUT_HEALTH_GATE"
      />

      {canManage ? (
        <Card>
          <View style={styles.cardContent}>
            <Text role="titleSm">إنشاء إطلاق تدريجي</Text>
            {eligibleChangeSets.length === 0 ? (
              <CpStatePanel
                role="status"
                title="لا يوجد Change Set مطبق لعلم ميزة"
                description="طبّق Change Set يحتوي feature_flag أولًا، ثم أنشئ الإطلاق من هنا."
                code="PLATFORM_ROLLOUT_CHANGE_SET_REQUIRED"
              />
            ) : (
              <View style={styles.formGrid}>
                <CpSelect
                  value={selectedChangeSet?.id ?? ""}
                  onChange={(value) => {
                    setChangeSetId(value);
                    setFeatureFlagKey("");
                  }}
                  options={eligibleChangeSets.map((changeSet) => ({ value: changeSet.id, label: changeSet.title }))}
                  aria-label="طلب التغيير المطبق"
                />
                <CpSelect
                  value={selectedFlagKey}
                  onChange={setFeatureFlagKey}
                  options={flagOptions}
                  aria-label="علم الميزة"
                />
                <CpTextInput value={stepsText} onChange={setStepsText} placeholder="10,25,50,100" aria-label="خطوات النسب" />
                <CpTextInput value={targetScopeText} onChange={setTargetScopeText} placeholder="نطاق JSON" aria-label="نطاق الاستهداف بصيغة JSON" />
                <CpTextInput value={healthGateText} onChange={setHealthGateText} placeholder="بوابة صحة JSON" aria-label="بوابة الصحة بصيغة JSON" />
                <View style={styles.actions}>
                  <CpButton onClick={() => void createRollout()} disabled={busy || !selectedChangeSet} aria-label="إنشاء إطلاق تدريجي">
                    {busy ? "جاري الحفظ…" : "إنشاء الإطلاق"}
                  </CpButton>
                </View>
              </View>
            )}
            {formError ? <CpStatePanel role="alert" title="تعذر إنشاء الإطلاق" code={formError} /> : null}
            {rollouts.mutationState.kind === "error" ? (
              <CpStatePanel role="alert" title="فشل إجراء الإطلاق" code={rollouts.mutationState.message} />
            ) : null}
            {rollouts.mutationState.kind === "success" ? (
              <CpStatePanel role="status" title="تم حفظ الإجراء وقراءة الحالة الراجعة" code={rollouts.mutationState.message} />
            ) : null}
          </View>
        </Card>
      ) : (
        <CpStatePanel
          role="status"
          title="صلاحية إدارة الإطلاق غير متاحة"
          description="يمكنك قراءة الإطلاقات فقط. تتطلب الإجراءات platform:rollouts:manage."
          code="PLATFORM_ROLLOUT_PERMISSION_REQUIRED"
        />
      )}

      {rollouts.state.kind === "loading" || rollouts.state.kind === "idle" ? (
        <CpStatePanel role="status" title="جاري تحميل الإطلاقات…" />
      ) : rollouts.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل الإطلاقات" code={rollouts.state.message}>
          <CpRetryButton onClick={() => void rollouts.reload()}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : rollouts.state.rollouts.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد إطلاقات تدريجية" code="PLATFORM_ROLLOUTS_EMPTY" />
      ) : (
        <CpTable aria-label="الإطلاقات التدريجية">
          <thead>
            <tr>
              <CpTableHeaderCell>العلم</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>النسبة</CpTableHeaderCell>
              <CpTableHeaderCell>الخطوة</CpTableHeaderCell>
              <CpTableHeaderCell>مراجعة العلم</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rollouts.state.rollouts.map((rollout) => (
              <tr key={rollout.id}>
                <CpTableCell>{rollout.featureFlagKey}</CpTableCell>
                <CpTableCell><Badge label={rollout.status} tone={STATUS_TONE[rollout.status] ?? "neutral"} /></CpTableCell>
                <CpTableCell>{rollout.currentPercentage}%</CpTableCell>
                <CpTableCell>{rollout.currentStepIndex + 1}/{rollout.steps.length}</CpTableCell>
                <CpTableCell>{rollout.flagRevision}</CpTableCell>
                <CpTableCell>
                  <RolloutActions
                    rollout={rollout}
                    canManage={canManage}
                    canAdvance={healthState === "OPERATIONAL"}
                    busy={busy}
                    onAdvance={() => void runTransition(() => rollouts.advance(rollout.id))}
                    onPause={() => void runTransition(() => rollouts.pause(rollout.id))}
                    onAbort={() => void runTransition(() => rollouts.abort(rollout.id))}
                    onRollback={() => void runTransition(() => rollouts.rollback(rollout.id))}
                  />
                </CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}
    </View>
  );
}

function RolloutActions({
  rollout,
  canManage,
  canAdvance,
  busy,
  onAdvance,
  onPause,
  onAbort,
  onRollback,
}: {
  readonly rollout: PlatformRollout;
  readonly canManage: boolean;
  readonly canAdvance: boolean;
  readonly busy: boolean;
  readonly onAdvance: () => void;
  readonly onPause: () => void;
  readonly onAbort: () => void;
  readonly onRollback: () => void;
}) {
  if (!canManage) return <Text role="caption">قراءة فقط</Text>;
  return (
    <View style={styles.actions}>
      {(rollout.status === "running" || rollout.status === "paused") ? (
        <CpButton onClick={onAdvance} disabled={busy || !canAdvance}>تقدم</CpButton>
      ) : null}
      {rollout.status === "running" ? <CpButton onClick={onPause} disabled={busy}>إيقاف مؤقت</CpButton> : null}
      {(rollout.status === "running" || rollout.status === "paused") ? (
        <CpButton onClick={onAbort} disabled={busy}>إلغاء واستعادة baseline</CpButton>
      ) : null}
      {rollout.status === "completed" ? <CpButton onClick={onRollback} disabled={busy}>تراجع كامل</CpButton> : null}
      {!["running", "paused", "completed"].includes(rollout.status) ? <Text role="caption">لا يوجد إجراء متاح</Text> : null}
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
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    alignItems: "center",
  },
});
