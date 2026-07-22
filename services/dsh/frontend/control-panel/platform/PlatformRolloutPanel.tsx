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
  fetchPlatformRolloutRecovery,
  usePlatformRolloutController,
  type CreatePlatformRolloutInput,
  type PlatformChangeSet,
  type PlatformControlState,
  type PlatformRollout,
  type PlatformRolloutRecoveryGuide,
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

const TARGET_SCOPE_KEYS = new Set(["audience", "audienceIds", "city", "regions", "surface", "surfaces"]);
const TARGET_SCOPE_ARRAY_KEYS = new Set(["audienceIds", "regions", "surfaces"]);

function hasGovernedTargetScope(scope: Record<string, unknown>): boolean {
  const entries = Object.entries(scope);
  if (entries.length === 0 || entries.some(([key]) => !TARGET_SCOPE_KEYS.has(key))) return false;
  return entries.some(([key, value]) => {
    if (TARGET_SCOPE_ARRAY_KEYS.has(key)) {
      return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.trim().length > 0);
    }
    return typeof value === "string" && value.trim().length > 0;
  });
}

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
  const [targetScopeText, setTargetScopeText] = useState('{"surfaces":["app-client"],"regions":["sanaa"]}');
  const [healthGateText, setHealthGateText] = useState('{"requiredState":"OPERATIONAL"}');
  const [formError, setFormError] = useState<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<
    | { readonly kind: "idle" }
    | { readonly kind: "loading"; readonly rolloutId: string }
    | { readonly kind: "success"; readonly recovery: PlatformRolloutRecoveryGuide }
    | { readonly kind: "error"; readonly message: string }
  >({ kind: "idle" });
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
      steps.some((step, index) => !Number.isInteger(step) || step < 1 || step > 100 || (index > 0 && step <= steps[index - 1]!))
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
    if (!hasGovernedTargetScope(targetScope)) {
      setFormError("PLATFORM_ROLLOUT_TARGET_SCOPE_INVALID");
      return;
    }
    if (healthGate.requiredState !== "OPERATIONAL") {
      setFormError("PLATFORM_ROLLOUT_HEALTH_GATE_REQUIRED_STATE_INVALID");
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

  const loadRecovery = async (rolloutId: string) => {
    setRecoveryState({ kind: "loading", rolloutId });
    try {
      const response = await fetchPlatformRolloutRecovery(rolloutId);
      setRecoveryState({ kind: "success", recovery: response.recovery });
    } catch (error) {
      const candidate = error as { code?: string; message?: string } | undefined;
      setRecoveryState({ kind: "error", message: candidate?.code ?? candidate?.message ?? "PLATFORM_ROLLOUT_RECOVERY_UNAVAILABLE" });
    }
  };

  return (
    <View style={styles.stack}>
      <CpStatePanel
        role={healthState === "OPERATIONAL" ? "status" : "alert"}
        title={`بوابة صحة الإطلاق: ${healthState}`}
        description={
          healthState === "OPERATIONAL"
            ? "يمكن الاستئناف أو التقدم حسب الحالة. يعاد فحص الصحة قبل كل انتقال يؤثر في الإطلاق."
            : "التقدم والاستئناف محجوبان حتى تصبح الصحة OPERATIONAL. يبقى الإيقاف والإلغاء والتراجع متاحًا حسب الحالة والصلاحية."
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
                <CpTextInput value={targetScopeText} onChange={setTargetScopeText} placeholder='{"surfaces":["app-client"],"regions":["sanaa"]}' aria-label="نطاق الاستهداف بصيغة JSON" />
                <CpTextInput value={healthGateText} onChange={setHealthGateText} placeholder='{"requiredState":"OPERATIONAL"}' aria-label="بوابة الصحة بصيغة JSON" />
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
              <CpTableHeaderCell>النطاق</CpTableHeaderCell>
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
                <CpTableCell><Text role="caption">{JSON.stringify(rollout.targetScope)}</Text></CpTableCell>
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
                    onResume={() => void runTransition(() => rollouts.resume(rollout.id))}
                    onAbort={() => void runTransition(() => rollouts.abort(rollout.id))}
                    onRollback={() => void runTransition(() => rollouts.rollback(rollout.id))}
                    onRecovery={() => void loadRecovery(rollout.id)}
                  />
                </CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}

      {recoveryState.kind === "loading" ? (
        <CpStatePanel role="status" title="جاري تحميل دليل الاستعادة…" code={recoveryState.rolloutId} />
      ) : recoveryState.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل دليل الاستعادة" code={recoveryState.message} />
      ) : recoveryState.kind === "success" ? (
        <Card>
          <View style={styles.cardContent}>
            <Text role="titleSm">دليل الاستعادة: {recoveryState.recovery.featureFlagKey}</Text>
            <Text role="body">الإجراء المقترح: {recoveryState.recovery.recommendedAction}</Text>
            <Text role="body">خطة التراجع المعتمدة: {recoveryState.recovery.rollbackPlan}</Text>
            {recoveryState.recovery.recoverySteps.map((step) => <Text key={step} role="body">• {step}</Text>)}
          </View>
        </Card>
      ) : null}
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
  onResume,
  onAbort,
  onRollback,
  onRecovery,
}: {
  readonly rollout: PlatformRollout;
  readonly canManage: boolean;
  readonly canAdvance: boolean;
  readonly busy: boolean;
  readonly onAdvance: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onAbort: () => void;
  readonly onRollback: () => void;
  readonly onRecovery: () => void;
}) {
  if (!canManage) return <CpButton onClick={onRecovery}>دليل الاستعادة</CpButton>;
  return (
    <View style={styles.actions}>
      {rollout.status === "running" ? (
        <CpButton onClick={onAdvance} disabled={busy || !canAdvance}>تقدم</CpButton>
      ) : null}
      {rollout.status === "running" ? <CpButton onClick={onPause} disabled={busy}>إيقاف مؤقت</CpButton> : null}
      {rollout.status === "paused" ? <CpButton onClick={onResume} disabled={busy || !canAdvance}>استئناف دون تغيير النسبة</CpButton> : null}
      {(rollout.status === "running" || rollout.status === "paused") ? (
        <CpButton onClick={onAbort} disabled={busy}>إلغاء واستعادة baseline</CpButton>
      ) : null}
      {rollout.status === "completed" ? <CpButton onClick={onRollback} disabled={busy}>تراجع كامل</CpButton> : null}
      <CpButton onClick={onRecovery} disabled={busy}>دليل الاستعادة</CpButton>
      {!['running', 'paused', 'completed'].includes(rollout.status) ? <Text role="caption">الاستعادة مكتملة أو تتطلب مراجعة</Text> : null}
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
