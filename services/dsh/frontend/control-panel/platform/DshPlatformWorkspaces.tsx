"use client";

import { CpStatePanel } from "@bthwani/control-panel/components";

function PlatformRuntimeUnboundState({
  title,
  source,
}: {
  readonly title: string;
  readonly source: string;
}) {
  return (
    <CpStatePanel
      role="status"
      title={title}
      description="هذه المساحة لا تعرض أرقاماً أو حالات افتراضية. يجب ربطها بمصدر Runtime سيادي قبل تمكين القراءة أو الإجراءات."
      code={source}
    />
  );
}

export function DshPlatformCanaryWorkspace() {
  return (
    <PlatformRuntimeUnboundState
      title="الإطلاق التدريجي غير مرتبط بمصدر حي"
      source="expected: platform rollout/canary runtime API"
    />
  );
}

export function DshPlatformHealthWorkspace() {
  return (
    <PlatformRuntimeUnboundState
      title="صحة الخدمات غير مرتبطة بمصدر حي"
      source="expected: real service health endpoint; no fake green status"
    />
  );
}

export function DshPlatformRollbackWorkspace() {
  return (
    <PlatformRuntimeUnboundState
      title="سجل التراجع غير مرتبط بمصدر تدقيق حي"
      source="expected: platform audit/change-history runtime API"
    />
  );
}

export function DshPlatformOverviewWorkspace() {
  return (
    <PlatformRuntimeUnboundState
      title="نظرة المنصة تحتاج ربطاً تشغيلياً"
      source="expected: platform manifest/runtime capability read model"
    />
  );
}
