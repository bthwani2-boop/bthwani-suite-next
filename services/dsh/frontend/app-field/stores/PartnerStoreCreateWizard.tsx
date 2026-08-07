import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Crypto from "expo-crypto";
import { Button, Text, TextField, colorRoles, spacing } from "@bthwani/ui-kit";
import { createPartnerStore } from "../../shared/partner";

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
      return `تعذر إنشاء المتجر (${candidate.code.trim()}).`;
    }
  }
  return "تعذر إنشاء المتجر. تحقق من البيانات والتكليف ثم أعد المحاولة.";
}

export function PartnerStoreCreateWizard({
  partnerId,
  onStoreCreated,
  onCancel,
}: PartnerStoreCreateWizardProps) {
  const [displayName, setDisplayName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [category, setCategory] = useState("default");
  const [addressLine, setAddressLine] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    const normalizedPartnerId = partnerId.trim();
    const normalizedDisplayName = displayName.trim();
    const normalizedCityCode = cityCode.trim();
    const normalizedCategory = category.trim();

    if (!normalizedPartnerId || !normalizedDisplayName || !normalizedCityCode || !normalizedCategory) {
      setErrorMessage("أكمل اسم المتجر والمدينة والتصنيف، وتأكد من ارتباط المهمة بالشريك الصحيح.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    const storeId = Crypto.randomUUID();
    const mutationKey = `field-store-create:${storeId}`;

    try {
      const data = await createPartnerStore(
        "/dsh/field/stores",
        {
          StoreID: storeId,
          PartnerID: normalizedPartnerId,
          DisplayName: normalizedDisplayName,
          CityCode: normalizedCityCode,
          Category: normalizedCategory,
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
    return (
      <View style={styles.container} accessibilityLiveRegion="polite">
        <Text role="headingSm">تم إنشاء المتجر وإرساله إلى مسار الجاهزية.</Text>
        <Text role="bodySm" tone="muted">
          ستظهر حالته في العمليات والشريك بعد اكتمال القراءة الراجعة من الخادم.
        </Text>
      </View>
    );
  }

  const submitting = status === "loading";
  return (
    <View style={styles.container}>
      <Text role="headingSm" style={styles.title}>إنشاء متجر للشريك</Text>
      <Text role="bodySm" tone="muted">
        تُرسل العملية حصريًا عبر مسار الميداني، ويعيد الخادم التحقق من التكليف والصلاحيات.
      </Text>

      <TextField
        label="اسم المتجر"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="مطلوب"
        disabled={submitting}
      />
      <TextField
        label="رمز المدينة"
        value={cityCode}
        onChangeText={setCityCode}
        placeholder="مطلوب"
        autoCapitalize="characters"
        disabled={submitting}
      />
      <TextField
        label="التصنيف"
        value={category}
        onChangeText={setCategory}
        placeholder="مثال: restaurant"
        disabled={submitting}
      />
      <TextField
        label="العنوان"
        value={addressLine}
        onChangeText={setAddressLine}
        placeholder="اختياري"
        disabled={submitting}
      />
      <TextField
        label="ساعات العمل"
        value={operatingHours}
        onChangeText={setOperatingHours}
        placeholder="اختياري"
        disabled={submitting}
      />

      {status === "error" ? (
        <Text role="bodySm" tone="danger">
          {errorMessage}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="إنشاء المتجر"
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={submitting}
          fullWidth
          accessibilityLabel="إنشاء متجر الشريك"
        />
        {onCancel ? (
          <Button
            label="إلغاء"
            tone="secondary"
            onPress={onCancel}
            disabled={submitting}
            fullWidth
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colorRoles.surfaceBase,
  },
  title: {
    marginBottom: spacing[1],
    textAlign: "right",
  },
  actions: {
    marginTop: spacing[2],
    gap: spacing[2],
  },
});
