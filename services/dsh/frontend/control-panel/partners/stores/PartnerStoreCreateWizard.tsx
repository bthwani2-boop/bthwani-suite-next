"use client";

import { useEffect, useState } from "react";
import {
  CpButton,
  CpStatePanel,
  CpStateView,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { createPartnerStore } from "../../../shared/partner";
import { fetchCatalogDomains } from "../../../shared/catalog/central-catalog.api";
import type { CentralCatalogDomain } from "../../../shared/catalog/central-catalog.types";

export type PartnerStoreCreateWizardProps = {
  readonly partnerId: string;
  readonly onStoreCreated?: (storeId: string) => void;
  readonly onCancel?: () => void;
};

type SubmissionStatus = "idle" | "loading" | "error" | "success";

function describeSubmissionError(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { readonly message?: unknown; readonly code?: unknown };
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message.trim();
    }
    if (typeof candidate.code === "string" && candidate.code.trim()) {
      return candidate.code.trim();
    }
  }
  return "STORE_CREATION_FAILED";
}

export function PartnerStoreCreateWizard({
  partnerId,
  onStoreCreated,
  onCancel,
}: PartnerStoreCreateWizardProps) {
  const [displayName, setDisplayName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [businessVerticalId, setBusinessVerticalId] = useState("");
  const [businessVerticals, setBusinessVerticals] = useState<readonly CentralCatalogDomain[]>([]);
  const [businessVerticalsError, setBusinessVerticalsError] = useState<string | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    void fetchCatalogDomains()
      .then((domains) => { if (active) setBusinessVerticals(domains.filter((domain) => domain.isActive)); })
      .catch(() => { if (active) setBusinessVerticalsError("تعذر تحميل مجالات النشاط المركزية"); });
    return () => { active = false; };
  }, []);

  const handleSubmit = async () => {
    const normalizedPartnerId = partnerId.trim();
    const normalizedDisplayName = displayName.trim();
    const normalizedCityCode = cityCode.trim();
    const normalizedBusinessVerticalId = businessVerticalId.trim();
    if (!normalizedPartnerId || !normalizedDisplayName || !normalizedCityCode || !normalizedBusinessVerticalId) {
      setErrorMessage("REQUIRED_STORE_FIELDS_MISSING");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    const storeId = crypto.randomUUID();
    const mutationKey = `operator-store-create:${storeId}`;

    try {
      const data = await createPartnerStore(
        "/dsh/operator/stores",
        {
          StoreID: storeId,
          PartnerID: normalizedPartnerId,
          DisplayName: normalizedDisplayName,
          CityCode: normalizedCityCode,
          Category: "",
          businessVerticalId: normalizedBusinessVerticalId,
          AddressLine: addressLine.trim(),
          OperatingHours: operatingHours.trim(),
        },
        {
          idempotencyKey: mutationKey,
          correlationId: mutationKey,
        },
      );

      setStatus("success");
      onStoreCreated?.(data.id);
    } catch (error) {
      setErrorMessage(describeSubmissionError(error));
      setStatus("error");
    }
  };

  if (status === "success") {
    return <CpStatePanel role="status" title="تم إنشاء المتجر وإرساله لمسار الجاهزية" />;
  }

  const submitting = status === "loading";
  return (
    <div style={{ display: "grid", gap: 12, padding: 16, borderRadius: 8 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>إنشاء متجر جديد</h3>

      <CpTextInput
        value={displayName}
        onChange={setDisplayName}
        placeholder="اسم المتجر (مطلوب)"
        aria-label="اسم المتجر"
        disabled={submitting}
      />
      <CpTextInput
        value={cityCode}
        onChange={setCityCode}
        placeholder="رمز المدينة (مطلوب)"
        aria-label="رمز المدينة"
        disabled={submitting}
      />
      {businessVerticals.length > 0 ? (
        <select value={businessVerticalId} onChange={(event) => setBusinessVerticalId(event.target.value)} aria-label="مجال نشاط المتجر" disabled={submitting}>
          <option value="">اختر مجال نشاط المتجر (مطلوب)</option>
          {businessVerticals.map((domain) => <option key={domain.id} value={domain.id}>{domain.nameAr}</option>)}
        </select>
      ) : <span>{businessVerticalsError ?? "جارٍ تحميل مجالات النشاط…"}</span>}
      <CpTextInput
        value={addressLine}
        onChange={setAddressLine}
        placeholder="العنوان (اختياري)"
        aria-label="العنوان"
        disabled={submitting}
      />
      <CpTextInput
        value={operatingHours}
        onChange={setOperatingHours}
        placeholder="ساعات العمل (اختياري)"
        aria-label="ساعات العمل"
        disabled={submitting}
      />

      {status === "error" ? (
        <CpStateView
          kind="error"
          title="تعذر إنشاء المتجر"
          code={errorMessage}
        />
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <CpButton onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? "جارٍ الإنشاء…" : "إنشاء المتجر"}
        </CpButton>
        {onCancel ? (
          <CpButton onClick={onCancel} disabled={submitting}>
            إلغاء
          </CpButton>
        ) : null}
      </div>
    </div>
  );
}
