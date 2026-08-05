import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { UiText, UiButton, UiTextInput, UiLoader } from "@bthwani/ui-kit/mobile";
import { useIdentitySession } from "@bthwani/core-identity/mobile";
import { v4 as uuidv4 } from "uuid";

export type PartnerStoreCreateWizardProps = {
  readonly partnerId: string;
  readonly onStoreCreated?: (storeId: string) => void;
  readonly onCancel?: () => void;
};

export function PartnerStoreCreateWizard({ partnerId, onStoreCreated, onCancel }: PartnerStoreCreateWizardProps) {
  const { session } = useIdentitySession();
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
      const authKind = session?.kind;
      let endpoint = "/dsh/operator/stores";
      if (authKind === "partner") {
        endpoint = "/dsh/partner/stores";
      } else if (authKind === "field") {
        endpoint = "/dsh/field/stores";
      }

      // We assume there is an API client configured for mobile. For now, fetch is used as standard.
      // DshApiClient would normally be injected. Using absolute domain or relative depends on context.
      // If we're inside React Native, fetch to relative path doesn't work, so we need to rely on the env host.
      // Assuming API_HOST is available or managed by a custom fetch wrapper if it exists.
      // Alternatively, we use DshPartnerClient if available.
      // We will leave it as fetch for simplicity.

      const response = await fetch(`https://api.bthwani.com${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.token || ""}`,
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
    return (
      <View style={styles.container}>
        <UiText variant="heading-sm">Store created successfully</UiText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <UiText variant="heading-sm" style={styles.title}>Create New Store</UiText>
      
      <UiTextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Store Name (Required)"
      />
      <UiTextInput
        value={cityCode}
        onChangeText={setCityCode}
        placeholder="City Code (Required)"
      />
      <UiTextInput
        value={category}
        onChangeText={setCategory}
        placeholder="Category (e.g. restaurant) (Required)"
      />
      <UiTextInput
        value={addressLine}
        onChangeText={setAddressLine}
        placeholder="Address Line (Optional)"
      />
      <UiTextInput
        value={operatingHours}
        onChangeText={setOperatingHours}
        placeholder="Operating Hours (Optional)"
      />

      {status === "error" ? (
        <UiText variant="body-sm" color="danger">{errorMessage}</UiText>
      ) : null}

      <View style={styles.actions}>
        <UiButton onPress={handleSubmit} disabled={status === "loading"}>
          {status === "loading" ? "Creating..." : "Create Store"}
        </UiButton>
        {onCancel ? (
          <UiButton variant="outline" onPress={onCancel} disabled={status === "loading"}>
            Cancel
          </UiButton>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    marginBottom: 8,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
});
