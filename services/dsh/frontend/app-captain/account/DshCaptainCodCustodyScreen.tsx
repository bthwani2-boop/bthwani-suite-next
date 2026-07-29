import React from "react";
import { StyleSheet, View } from "react-native";
import { Box, MobileScrollView, StateView, TopBar, useTheme } from "@bthwani/ui-kit";
import type { WltDshCodReference } from "../../shared/finance-wlt-link/wlt-cod/wlt-cod.api";
import {
  CaptainCodCustodyActions,
} from "../../shared/finance-wlt-link/wlt-cod/CaptainCodCustodyActions";
import { fetchDshCaptainOwnCodRecords } from "../../shared/finance-wlt-link/wlt-cod/wlt-cod.api";

type ScreenState =
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly records: readonly WltDshCodReference[] }
  | { readonly kind: "error"; readonly message: string };

export type DshCaptainCodCustodyScreenProps = {
  readonly onBack?: () => void;
  readonly embedded?: boolean;
};

export function DshCaptainCodCustodyScreen({ onBack, embedded = false }: DshCaptainCodCustodyScreenProps) {
  const theme = useTheme() as any;
  const styles = React.useMemo(
    () => StyleSheet.create({
      root: { flex: 1, backgroundColor: theme.surface },
      content: { paddingBottom: 120 },
    }),
    [theme.surface],
  );
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [state, setState] = React.useState<ScreenState>({ kind: "loading" });

  React.useEffect(() => {
    let active = true;
    setState({ kind: "loading" });
    void fetchDshCaptainOwnCodRecords().then((result) => {
      if (!active) return;
      if (result.ok) {
        setState({ kind: "loaded", records: result.data });
      } else {
        setState({ kind: "error", message: result.message ?? "تعذر تحميل عهدة COD." });
      }
    });
    return () => {
      active = false;
    };
  }, [refreshToken]);

  const refresh = React.useCallback(() => setRefreshToken((value) => value + 1), []);

  const content = (
    <Box gap={4}>
      {state.kind === "loading" ? (
        <StateView tone="info" title="جاري تحميل العهدة النقدية..." loading />
      ) : null}
      {state.kind === "error" ? (
        <StateView tone="danger" title="تعذر تحميل عهدة COD" description={state.message} actionLabel="إعادة المحاولة" onActionPress={refresh} />
      ) : null}
      {state.kind === "loaded" ? (
        <Box gap={4}>
          <CaptainCodCustodyActions records={state.records} onMutated={refresh} />
          {state.records.length === 0 ? (
            <StateView tone="success" title="لا توجد سجلات COD" description="لا توجد عهدة نقدية مرتبطة بحساب الكابتن حاليًا." />
          ) : null}
        </Box>
      ) : null}
    </Box>
  );

  if (embedded) return content;

  return (
    <View style={styles.root}>
      <TopBar title="عهدة COD والمصالحة" subtitle="التحصيل، الإثبات، التسليم والقيد المحاسبي من WLT" {...(onBack ? { onBack } : {})} />
      <MobileScrollView fill padding={4} gap={4} contentContainerStyle={styles.content}>
        {content}
      </MobileScrollView>
    </View>
  );
}
