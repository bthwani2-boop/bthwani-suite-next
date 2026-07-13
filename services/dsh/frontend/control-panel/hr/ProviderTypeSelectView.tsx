"use client";

import React from "react";
import { Box, Button, Card, ScrollScreen, Text, spacing } from "@bthwani/ui-kit";
import type { ProviderKind } from "../../shared/workforce";

export function ProviderTypeSelectView(props: { readonly onBack: () => void; readonly onSelect: (kind: ProviderKind) => void }) {
  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>إضافة مقدم خدمة</Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
          اختر نوع مقدم الخدمة المراد إنشاؤه
        </Text>
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>ميداني</Text>
        <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
          تسجيل وتأهيل المتاجر ومتابعة جاهزيتها
        </Text>
        <Box style={{ alignItems: "flex-end" }}>
          <Button label="إنشاء ميداني" tone="primary" onPress={() => props.onSelect("field")} />
        </Box>
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>كابتن</Text>
        <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
          استلام وتنفيذ وتسليم الطلبات
        </Text>
        <Box style={{ alignItems: "flex-end" }}>
          <Button label="إنشاء كابتن" tone="primary" onPress={() => props.onSelect("captain")} />
        </Box>
      </Card>
    </ScrollScreen>
  );
}

export default ProviderTypeSelectView;
