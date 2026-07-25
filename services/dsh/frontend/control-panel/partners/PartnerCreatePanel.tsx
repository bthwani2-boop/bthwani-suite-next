"use client";

import { useId, useState, type ReactNode } from "react";
import { CpButton, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { usePartnerWorkspaceListController } from "../../shared/partner";

type Controller = ReturnType<typeof usePartnerWorkspaceListController>;

type Props = {
  readonly controller: Controller;
  readonly onClose: () => void;
  readonly onCreated?: (partnerId: string) => void;
};

function LabeledField({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const id = useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

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
    <section aria-label="إضافة شريك قانوني" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div>
        <strong>إضافة شريك قانوني</strong>
        <p style={{ margin: "0.25rem 0 0" }}>ينشئ DSH شريكًا ومسودة متجر أولية غير منشورة ضمن المستأجر الحالي.</p>
      </div>

      <LabeledField label="الاسم القانوني بالعربية">
        <CpTextInput value={legalNameAr} onChange={setLegalNameAr} aria-label="الاسم القانوني بالعربية" />
      </LabeledField>
      <LabeledField label="الاسم الظاهر">
        <CpTextInput value={displayName} onChange={setDisplayName} aria-label="الاسم الظاهر" />
      </LabeledField>
      <LabeledField label="رقم السجل التجاري">
        <CpTextInput value={legalIdentityNumber} onChange={setLegalIdentityNumber} aria-label="رقم السجل التجاري" />
      </LabeledField>
      <LabeledField label="اسم المالك">
        <CpTextInput value={ownerName} onChange={setOwnerName} aria-label="اسم المالك" />
      </LabeledField>
      <LabeledField label="رقم الجوال">
        <CpTextInput value={primaryPhone} onChange={setPrimaryPhone} aria-label="رقم الجوال" />
      </LabeledField>
      <LabeledField label="الفئة: restaurant / grocery / pharmacy / bakery / default">
        <CpTextInput value={category} onChange={setCategory} aria-label="الفئة" />
      </LabeledField>
      <LabeledField label="ملاحظات">
        <CpTextInput value={notes} onChange={setNotes} aria-label="ملاحظات" />
      </LabeledField>

      {controller.mutationState.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر إنشاء الشريك" description={controller.mutationState.message} />
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <CpButton
          variant="primary"
          disabled={!valid || controller.mutationState.kind === "loading"}
          onClick={() => void submit()}
        >
          {controller.mutationState.kind === "loading" ? "جاري الإنشاء…" : "إنشاء الشريك والمسودة"}
        </CpButton>
        <CpButton onClick={onClose}>إلغاء</CpButton>
      </div>
    </section>
  );
}
