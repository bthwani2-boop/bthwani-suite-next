"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  CpButton,
  CpStatePanel,
  CpStateView,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { useIdentitySession } from "@bthwani/core-identity";

export type PartnerStoreCreateWizardProps = {
  readonly partnerId: string;
  readonly onStoreCreated?: (storeId: string) => void;
  readonly onCancel?: () => void;
};

export function PartnerStoreCreateWizard({ partnerId, onStoreCreated, onCancel }: PartnerStoreCreateWizardProps) {
  const { state: sessionState } = useIdentitySession();
  const [displayName, setDisplayName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [category, setCategory] = useState("default");
  const [addressLine, setAddressLine] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    if (!displayName.trim() || !cityCode.trim() || !category.trim()) {
      setErrorMessage("Please fill all required fields");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    const storeId = uuidv4();
    const idempotencyKey = storeId;

    try {
      const authKind = sessionState.kind;
      let endpoint = "/dsh/operator/stores";
      if (authKind === "partner") {
        endpoint = "/dsh/partner/stores";
      } else if (authKind === "field") {
        endpoint = "/dsh/field/stores";
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionState.token || ""}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          StoreID: storeId,
          PartnerID: partnerId,
          DisplayName: displayName,
          CityCode: cityCode,
          Category: category,
          AddressLine: addressLine,
          OperatingHours: operatingHours,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(err.message || err.code || "Failed to create store");
      }

      const data = await response.json();
      setStatus("success");
      if (onStoreCreated) {
        onStoreCreated(data.id);
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      setStatus("error");
    }
  };

  if (status === "success") {
    return <CpStatePanel role="status" title="Store created successfully" />;
  }

  return (
    <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>Create New Store</h3>
      
      <CpTextInput
        value={displayName}
        onChange={setDisplayName}
        placeholder="Store Name (Required)"
        aria-label="Store Name"
      />
      <CpTextInput
        value={cityCode}
        onChange={setCityCode}
        placeholder="City Code (Required)"
        aria-label="City Code"
      />
      <CpTextInput
        value={category}
        onChange={setCategory}
        placeholder="Category (e.g. restaurant) (Required)"
        aria-label="Category"
      />
      <CpTextInput
        value={addressLine}
        onChange={setAddressLine}
        placeholder="Address Line (Optional)"
        aria-label="Address Line"
      />
      <CpTextInput
        value={operatingHours}
        onChange={setOperatingHours}
        placeholder="Operating Hours (Optional)"
        aria-label="Operating Hours"
      />

      {status === "error" && (
        <CpStateView kind="error" title="Creation failed" code={errorMessage} />
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <CpButton onClick={handleSubmit} disabled={status === "loading"}>
          {status === "loading" ? "Creating..." : "Create Store"}
        </CpButton>
        {onCancel && (
          <CpButton onClick={onCancel} disabled={status === "loading"}>
            Cancel
          </CpButton>
        )}
      </div>
    </div>
  );
}
