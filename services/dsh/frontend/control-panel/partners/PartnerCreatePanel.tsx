"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { CpButton, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { usePartnerWorkspaceListController } from "../../shared/partner";
import { fetchCatalogDomains } from "../../shared/catalog/central-catalog.api";
import type { CentralCatalogDomain } from "../../shared/catalog/central-catalog.types";

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
  const [ownerActorId, setOwnerActorId] = useState("");
  const [workforcePersonId, setWorkforcePersonId] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [businessVerticalId, setBusinessVerticalId] = useState("");
  const [businessVerticals, setBusinessVerticals] = useState<readonly CentralCatalogDomain[]>([]);
  const [businessVerticalsError, setBusinessVerticalsError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const valid = legalNameAr.trim().length > 1
    && displayName.trim().length > 1
    && legalIdentityNumber.trim().length > 2
    && (ownerActorId.trim().length > 0 || workforcePersonId.trim().length > 0)
    && primaryPhone.trim().length >= 8
    && businessVerticalId.trim().length > 0;

  useEffect(() => {
    let active = true;
    void fetchCatalogDomains()
      .then((domains) => {
        if (!active) return;
        setBusinessVerticals(domains.filter((domain) => domain.isActive));
      })
      .catch(() => {
        if (active) setBusinessVerticalsError("تعذر تحميل مجالات النشاط المركزية");
      });
    return () => { active = false; };
  }, []);

  async function submit() {
    if (!valid || controller.mutationState.kind === "loading") return;
    const partner = await controller.create({
      legalNameAr: legalNameAr.trim(),
      displayName: displayName.trim(),
      legalIdentityType: "commercial_register",
      legalIdentityNumber: legalIdentityNumber.trim(),
      ownerActorId: ownerActorId.trim(),
      workforcePersonId: workforcePersonId.trim(),
      primaryPhone: primaryPhone.trim(),
      businessVerticalId: businessVerticalId.trim(),
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
      <LabeledField label="معرّف حساب المالك">
        <CpTextInput value={ownerActorId} onChange={setOwnerActorId} aria-label="Actor ID" />
      </LabeledField>
      <LabeledField label="معرّف العامل الميداني">
        <CpTextInput value={workforcePersonId} onChange={setWorkforcePersonId} aria-label="Workforce ID" />
      </LabeledField>
      <LabeledField label="رقم الجوال">
        <CpTextInput value={primaryPhone} onChange={setPrimaryPhone} aria-label="رقم الجوال" />
      </LabeledField>
      <LabeledField label="مجال نشاط المتجر">
        {businessVerticals.length > 0 ? (
          <select value={businessVerticalId} onChange={(event) => setBusinessVerticalId(event.target.value)} aria-label="مجال نشاط المتجر">
            <option value="">اختر مجال النشاط</option>
            {businessVerticals.map((domain) => <option key={domain.id} value={domain.id}>{domain.nameAr}</option>)}
          </select>
        ) : <span>{businessVerticalsError ?? "جارٍ تحميل مجالات النشاط…"}</span>}
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
