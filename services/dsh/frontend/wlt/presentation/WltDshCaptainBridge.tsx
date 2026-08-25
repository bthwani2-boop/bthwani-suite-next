import React from "react";
import { Pressable, View } from "react-native";
import {
  Box,
  Icon,
  MobileScrollView,
  StateView,
  Text,
  TopBar,
  useTheme,
} from "@bthwani/ui-kit";

interface ActionStripProps {
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  readonly expanded: boolean;
  readonly onPress: () => void;
  readonly children?: React.ReactNode;
}

function ActionStrip({ icon, title, subtitle, expanded, onPress, children }: ActionStripProps) {
  const theme = useTheme() as any;
  return (
    <View style={{ width: "100%" }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }: { readonly pressed: boolean }) => ({
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 16,
          paddingHorizontal: 16,
          backgroundColor: pressed ? theme.surfaceInset : "transparent",
        })}
      >
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, flex: 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.brandSurface, justifyContent: "center", alignItems: "center" }}>
            <Icon name={icon as any} tone="brand" size={18} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
            <Text role="bodyStrong" style={{ color: theme.text }}>{title}</Text>
            <Text role="bodySm" numberOfLines={1} style={{ color: theme.textMuted }}>{subtitle}</Text>
          </View>
        </View>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} tone="muted" size={18} />
      </Pressable>
      {expanded && children ? <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View> : null}
    </View>
  );
}

export type WltDshCaptainBridgeProps = {
  readonly section?: string;
  readonly onBack?: () => void;
  readonly dshClientId?: string | null;
};

export function WltDshCaptainBridge({ section = "earnings", onBack }: WltDshCaptainBridgeProps) {
  const theme = useTheme() as any;
  const [expandedSection, setExpandedSection] = React.useState<string | null>(section);
  const toggle = (value: string) => setExpandedSection((current) => current === value ? null : value);

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar variant="primary" title="مالية الكابتن" {...(onBack ? { onBack } : {})} />
      <MobileScrollView fill padding={0} gap={0} contentContainerStyle={{ paddingBottom: 120 }}>
        <ActionStrip
          icon="trending-up-outline"
          title="الأرباح"
          subtitle="تُقرأ من عمولات WLT المعتمدة"
          expanded={expandedSection === "earnings"}
          onPress={() => toggle("earnings")}
        >
          <Box gap={3} style={{ paddingVertical: 8 }}>
            <StateView
              tone="info"
              title="مرجع الأرباح التجميعي للكابتن غير متاح بعد"
              description="تُعرض العمولة المعتمدة لكل طلب من مصدر WLT دون إنشاء ذمة نقدية محلية."
            />
          </Box>
        </ActionStrip>
        <ActionStrip
          icon="sync-outline"
          title="التسوية"
          subtitle="تُدار عبر عمليات WLT المعتمدة"
          expanded={expandedSection === "settlement"}
          onPress={() => toggle("settlement")}
        >
          <Box gap={3} style={{ paddingVertical: 8 }}>
            <StateView
              tone="info"
              title="تسوية الكابتن غير متاحة بعد"
              description="لا تُنشئ واجهة الكابتن أي قيد مالي محلي؛ المرجع الحاكم هو WLT."
            />
          </Box>
        </ActionStrip>
      </MobileScrollView>
    </View>
  );
}

export default WltDshCaptainBridge;
