"use client";

import React from "react";
import { CpButton, CpMutedInline, CpPageHeader } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import type { ProviderKind } from "../../shared/workforce";

export function ProviderTypeSelectView(props: { readonly onBack: () => void; readonly onSelect: (kind: ProviderKind) => void }) {
  return (
    <EditorPageFrame
      header={
        <CpPageHeader title="إضافة مقدم خدمة">
          <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <CpMutedInline>اختر نوع مقدم الخدمة المراد إنشاؤه</CpMutedInline>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Text role="titleSm">ميداني</Text>
          <CpMutedInline>تسجيل وتأهيل المتاجر ومتابعة جاهزيتها</CpMutedInline>
          <CpButton variant="primary" onClick={() => props.onSelect("field")}>إنشاء ميداني</CpButton>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Text role="titleSm">كابتن</Text>
          <CpMutedInline>استلام وتنفيذ وتسليم الطلبات</CpMutedInline>
          <CpButton variant="primary" onClick={() => props.onSelect("captain")}>إنشاء كابتن</CpButton>
        </div>
      </div>
    </EditorPageFrame>
  );
}

export default ProviderTypeSelectView;
