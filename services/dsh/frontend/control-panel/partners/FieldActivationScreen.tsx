import React from "react";
import { ScrollScreen, Header } from "@bthwani/ui-kit";
import { ProviderActivationWorkspace } from "../shared";

export function FieldActivationScreen() {
  return (
    <ScrollScreen>
      <Header
        title="تفعيل حسابات التطبيق الميداني"
        subtitle="اختر مقدم الخدمة ثم أصدر كوده أو أوقفه أو أعد تفعيله — إضافة مقدمي الخدمة تتم من قسم الموارد البشرية."
      />
      <ProviderActivationWorkspace
        providerKind="field"
        entrySource="partners"
      />
    </ScrollScreen>
  );
}
