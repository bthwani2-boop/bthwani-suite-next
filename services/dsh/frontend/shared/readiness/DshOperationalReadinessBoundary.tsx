import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, Text, useBThwaniAppearance } from "@bthwani/ui-kit";

type OperationalReadiness = {
  readonly ready: boolean;
};

type OperationalReadinessState<T extends OperationalReadiness> =
  | { readonly kind: "loading" }
  | { readonly kind: "decision"; readonly readiness: T }
  | { readonly kind: "unavailable" };

export type DshOperationalReadinessBoundaryProps<T extends OperationalReadiness> = {
  readonly load: () => Promise<T>;
  readonly loadingAccessibilityLabel: string;
  readonly unavailableMessage: string;
  readonly backgroundColor: string;
  readonly renderBlocked: (readiness: T, refresh: () => void) => ReactNode;
  readonly children: ReactNode;
};

export function DshOperationalReadinessBoundary<T extends OperationalReadiness>({
  load,
  loadingAccessibilityLabel,
  unavailableMessage,
  backgroundColor,
  renderBlocked,
  children,
}: DshOperationalReadinessBoundaryProps<T>) {
  const [state, setState] = useState<OperationalReadinessState<T>>({ kind: "loading" });
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = () => setRefreshToken((value) => value + 1);

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });

    void load()
      .then((readiness) => {
        if (active) setState({ kind: "decision", readiness });
      })
      .catch(() => {
        if (active) setState({ kind: "unavailable" });
      });

    return () => {
      active = false;
    };
  }, [load, refreshToken]);

  if (state.kind === "loading") {
    return (
      <View style={[styles.state, { backgroundColor }]}>
        <ActivityIndicator accessibilityLabel={loadingAccessibilityLabel} />
      </View>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <View style={[styles.state, { backgroundColor }]}>
        <Text align="center">{unavailableMessage}</Text>
        <Button label="تحديث الحالة" onPress={refresh} />
      </View>
    );
  }

  if (!state.readiness.ready) return <>{renderBlocked(state.readiness, refresh)}</>;
  return <>{children}</>;
}

export type DshReadinessRequirementListProps = {
  readonly missing: readonly string[];
  readonly messages: Readonly<Record<string, string>>;
  readonly subtitle: string;
  readonly onRefresh: () => void;
};

export function DshReadinessRequirementList({
  missing,
  messages,
  subtitle,
  onRefresh,
}: DshReadinessRequirementListProps) {
  const { tokens } = useBThwaniAppearance();

  return (
    <View style={[styles.requirements, { backgroundColor: tokens.appBackground }]}>
      <Text role="titleLg" tone="danger" align="center" style={styles.title}>
        لا يمكن بدء العمل حالياً
      </Text>
      <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>{subtitle}</Text>
      <View style={styles.reasons}>
        {missing.map((reason) => (
          <View
            key={reason}
            style={[
              styles.reasonCard,
              { backgroundColor: tokens.surface, borderColor: tokens.border },
            ]}
          >
            <Text style={[styles.reasonText, { color: tokens.textPrimary }]}>
              • {messages[reason] ?? reason}
            </Text>
          </View>
        ))}
      </View>
      <Button label="تحديث الحالة" onPress={onRefresh} />
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  requirements: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  reasons: {
    marginBottom: 32,
  },
  reasonCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 15,
  },
});
