"use client";

import { useState } from "react";
import {
  Button,
  Card,
  StateView,
  Text,
  TextField,
} from "@bthwani/ui-kit";
import type { usePartnerWorkspaceListController } from "../../shared/partner";

type Controller = ReturnType<typeof usePartnerWorkspaceListController>;

type Props = {
  readonly controller: Controller;
  readonly onClose: () => void;
  readonly onCreated?: (partnerId: string) => void;
};

export function PartnerCreatePanel({ controller, onClose, onCreated }: Props) {
  const [legalNameAr, setLegalNameAr] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [legalIdentityNumber, setLegalIdentityNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [category, setCategory] = useState("default");
  const [notes, setNotes] = useState("");

  const valid = legalNameAr.trim().length > 1
    && displayName.trim().length > 1
    && legalIdentityNumber.trim().length > 2
    && ownerName.trim().length > 1
    && primaryPhone.trim().length >= 8;

  async function submit() {
    if (!valid || controller.mutationState.kind === "loading") return;
    const partner = await controller.create({
      legalNameAr: legalNameAr.trim(),
      displayName: displayName.trim(),
      legalIdentityType: "commercial_register",
      legalIdentityNumber: legalIdentityNumber.trim(),
      ownerName: ownerName.trim(),
      primaryPhone: primaryPhone.trim(),
      category: category.trim() || "default",
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    if (partner) {
      onCreated?.(partner.id);
      onClose();
    }
  }

  return (
    <Card style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
      <div>
        <Text role="titleMd">إضافة شريك قانوني</Text>
        <Text role="body" tone="muted">ينشئ DSH شريكًا ومسودة متجر أولية غير منشورة ضمن المستأجر الحالي.</Text>
      </div>
      <TextField label="الاسم القانوني بالعربية" value={legalNameAr} onChangeText={setLegalNameAr} />
      <TextField label="الاسم الظاهر" value={displayName} onChangeText={setDisplayName} />
      <TextField label="رقم السجل التجاري" value={legalIdentityNumber} onChangeText={setLegalIdentityNumber} />
      <TextField label="اسم المالك" value={ownerName} onChangeText={setOwnerName} />
      <TextField label="رقم الجوال" value={primaryPhone} onChangeText={setPrimaryPhone} />
      <TextField label="الفئة: restaurant / grocery / pharmacy / bakery / default" value={category} onChangeText={setCategory} />
      <TextField label="ملاحظات" value={notes} onChangeText={setNotes} multiline />

      {controller.mutationState.kind === "error" ? (
        <StateView stateId="recoverableError" title="تعذر إنشاء الشريك" description={controller.mutationState.message} />
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button
          label={controller.mutationState.kind === "loading" ? "جاري الإنشاء…" : "إنشاء الشريك والمسودة"}
          tone="primary"
          disabled={!valid || controller.mutationState.kind === "loading"}
          onPress={() => void submit()}
        />
        <Button label="إلغاء" tone="secondary" onPress={onClose} />
      </div>
    </Card>
  );
}
