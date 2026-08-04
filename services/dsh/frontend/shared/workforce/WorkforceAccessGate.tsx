import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Button, StateView, colorRoles, spacing } from "@bthwani/ui-kit";

import type { ProviderKind } from "./workforce.types";
import { useWorkforceProfile } from "./use-workforce-profile";

type WorkforceAccessGateProps = {
  readonly expectedKind: ProviderKind;
  readonly children: ReactNode;
  readonly incompleteContent?: ReactNode;
  readonly onLogout?: () => void;
};

export function WorkforceAccessGate({
  expectedKind,
  children,
  incompleteContent,
  onLogout,
}: WorkforceAccessGateProps) {
  const workforce = useWorkforceProfile();
  const { state } = workforce;

  if (state.kind === "loading") {
    return <StateView loading title="جارٍ التحقق من الملف التشغيلي…" />;
  }

  if (state.kind === "not_provisioned") {
    return (
      <GateFrame onLogout={onLogout}>
        <StateView
          tone="warning"
          title="الملف التشغيلي غير منشأ"
          description="الهوية مفعلة، لكن لا يوجد ملف Workforce مرتبط بها. لا يمكن فتح العمليات قبل إنشاء الملف من الجهة المخولة."
          actionLabel="إعادة التحقق"
          onActionPress={() => void workforce.reload()}
        />
      </GateFrame>
    );
  }

  if (state.kind === "error") {
    return (
      <GateFrame onLogout={onLogout}>
        <StateView
          tone="danger"
          title="تعذر التحقق من الملف التشغيلي"
          description={state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void workforce.reload()}
        />
      </GateFrame>
    );
  }

  if (state.me.workforceKind !== expectedKind) {
    return (
      <GateFrame onLogout={onLogout}>
        <StateView
          tone="danger"
          title="نوع الملف لا يطابق التطبيق"
          description="هذه الجلسة مرتبطة بسطح Workforce مختلف. افتح التطبيق المخصص لنوع مقدم الخدمة المسجل."
        />
      </GateFrame>
    );
  }

  return <>{children}</>;
}

function GateFrame({
  children,
  onLogout,
}: {
  readonly children: ReactNode;
  readonly onLogout?: (() => void) | undefined;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
      {onLogout ? <Button label="تسجيل الخروج" tone="secondary" onPress={onLogout} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceBase,
  },
  content: {
    width: "100%",
  },
});
