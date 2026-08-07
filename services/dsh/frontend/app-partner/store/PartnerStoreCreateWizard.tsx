import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Crypto from "expo-crypto";
import { Button, StateView, Text, TextField, colorRoles, spacing } from "@bthwani/ui-kit";
import { useIdentitySession } from "@bthwani/core-identity";
import { createPartnerStore } from "../../shared/partner";
import { usePartnerSelfController } from "../../shared/partner/use-partner-self-controller";

export type PartnerStoreCreateWizardProps = {
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
  return "تعذر إنشاء المتجر. تحقق من البيانات وصلاحية الشريك ثم أعد المحاولة.";
}

export function PartnerStoreCreateWizard({
  onStoreCreated,
  onCancel,
}: PartnerStoreCreateWizardProps) {
  const identity = useIdentitySession();
  const self = usePartnerSelfController(identity.state.kind);
  const [displayName, setDisplayName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [category, setCategory] = useState("default");
  const [addressLine, setAddressLine] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (identity.state.kind === "restoring" || identity.state.kind === "authenticating") {
    return <StateView loading title="جاري التحقق من جلسة الشريك…" />;
  }

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        tone="warning"
        title="تسجيل الدخول مطلوب"
        description="يجب استخدام جلسة شريك صالحة قبل إنشاء فرع جديد."
      />
    );
  }

  if (self.statusState.kind === "idle" || self.statusState.kind === "loading") {
    return <StateView loading title="جاري تحميل هوية الشريك…" />;
  }

  if (self.statusState.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر تحديد هوية الشريك"
        description={self.statusState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={self.reload}
      />
    );
  }

  if (self.statusState.kind !== "success") {
    return (
      <StateView
        tone="danger"
        title="هوية الشريك غير قابلة للاستخدام"
        description="لم يعد DSH ملف شريك صريحًا لهذه الجلسة."
      />
    );
  }

  const partnerId = self.statusState.partner.id.trim();

  const handleSubmit = async () => {
    const normalizedDisplayName = displayName.trim();
    const normalizedCityCode = cityCode.trim();
    const normalizedCategory = category.trim();

    if (!partnerId || !normalizedDisplayName || !normalizedCityCode || !normalizedCategory) {
      setErrorMessage("أكمل اسم المتجر والمدينة والتصنيف، وتأكد من هوية الشريك.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    const storeId = Crypto.randomUUID();
    const mutationKey = `partner-store-create:${storeId}`;

    try {
      const data = await createPartnerStore(
        "/dsh/partner/stores",
        {
          StoreID: storeId,
          PartnerID: partnerId,
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
          ستظهر حالته في العمليات بعد اكتمال القراءة الراجعة من الخادم.
        </Text>
      </View>
    );
  }

  const submitting = status === "loading";
  return (
    <View style={styles.container}>
      <Text role="headingSm" style={styles.title}>إنشاء متجر جديد</Text>
      <Text role="bodySm" tone="muted">
        تُشتق هوية الشريك من الجلسة الحالية، ويعيد الخادم التحقق من الملكية والصلاحيات عند تنفيذ العملية.
      </Text>

      <TextField label="اسم المتجر" value={displayName} onChangeText={setDisplayName} placeholder="مطلوب" disabled={submitting} />
      <TextField label="رمز المدينة" value={cityCode} onChangeText={setCityCode} placeholder="مطلوب" autoCapitalize="characters" disabled={submitting} />
      <TextField label="التصنيف" value={category} onChangeText={setCategory} placeholder="مثال: restaurant" disabled={submitting} />
      <TextField label="العنوان" value={addressLine} onChangeText={setAddressLine} placeholder="اختياري" disabled={submitting} />
      <TextField label="ساعات العمل" value={operatingHours} onChangeText={setOperatingHours} placeholder="اختياري" disabled={submitting} />

      {status === "error" ? <Text role="bodySm" tone="danger">{errorMessage}</Text> : null}

      <View style={styles.actions}>
        <Button label="إنشاء المتجر" onPress={() => void handleSubmit()} loading={submitting} disabled={submitting} fullWidth />
        {onCancel ? <Button label="إلغاء" tone="secondary" onPress={onCancel} disabled={submitting} fullWidth /> : null}
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
