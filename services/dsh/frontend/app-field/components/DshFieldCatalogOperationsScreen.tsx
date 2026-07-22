import React from "react";
import { View } from "react-native";
import { Button, colorRoles, spacing } from "@bthwani/ui-kit";
import { DshFieldPartnerProductsScreen } from "./DshFieldPartnerProductsScreen";
import { DshFieldAssortmentPauseScreen } from "./DshFieldAssortmentPauseScreen";

export type DshFieldCatalogOperationsScreenProps = {
  readonly partnerId: string;
  readonly onBack: () => void;
};

type CatalogMode = "products" | "pauses";

export function DshFieldCatalogOperationsScreen({
  partnerId,
  onBack,
}: DshFieldCatalogOperationsScreenProps) {
  const [mode, setMode] = React.useState<CatalogMode>("products");

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <View style={{ flexDirection: "row-reverse", gap: spacing[2], padding: spacing[3] }}>
        <Button
          label="المنتجات والاقتراحات"
          tone={mode === "products" ? "primary" : "secondary"}
          size="sm"
          onPress={() => setMode("products")}
        />
        <Button
          label="الإيقاف المؤقت"
          tone={mode === "pauses" ? "primary" : "secondary"}
          size="sm"
          onPress={() => setMode("pauses")}
        />
      </View>
      {mode === "products" ? (
        <DshFieldPartnerProductsScreen partnerId={partnerId} onBack={onBack} />
      ) : (
        <DshFieldAssortmentPauseScreen partnerId={partnerId} onBack={() => setMode("products")} />
      )}
    </View>
  );
}
