import React from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Button,
  StateView,
  Text,
  TopBar,
  colorRoles,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import type { DshMediaAsset } from "../../shared/media/dsh-media-api.client";
import {
  listPartnerProductMedia,
  unlinkPartnerProductMedia,
  uploadPartnerProductMedia,
} from "../../shared/catalog";

export type ProductMediaScreenProps = Readonly<{
  productId: string;
  /** The store assortment owns the custom image; product identity remains central. */
  storeId: string;
  /** Retained for route compatibility. Authentication comes from the Identity session. */
  partnerId?: string;
  onBack?: () => void;
}>;

type ScreenState =
  | "loading"
  | "idle"
  | "picking"
  | "uploading"
  | "deleting"
  | "error"
  | "offline"
  | "storage_unavailable";

type PickedImage = {
  readonly body: Blob;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSizeBytes: number;
};

function isOfflineError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (
    (error as { readonly kind?: string }).kind === "offline" ||
    (error as { readonly kind?: string }).kind === "network"
  );
}

function isStorageUnavailableError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && (error as { readonly status?: number }).status === 503) {
    return true;
  }
  return error instanceof Error && error.message.includes("_503");
}

function mediaStatusLabel(status: string | undefined): string {
  switch (status) {
    case "approved":
      return "معتمدة وتصلح للنشر";
    case "pending_review":
      return "بانتظار مراجعة DAM";
    case "uploaded":
      return "اكتمل الرفع ويجري التحقق";
    case "rejected":
      return "مرفوضة";
    case "archived":
      return "مؤرشفة";
    default:
      return status?.trim() || "حالة غير معروفة";
  }
}

function mediaMeta(asset: DshMediaAsset): string {
  const parts = [asset.mime_type, asset.file_size_bytes ? `${Math.round(asset.file_size_bytes / 1024)} KB` : ""]
    .filter(Boolean);
  return parts.join(" · ");
}

async function pickWebImage(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    let settled = false;
    const finish = (value: PickedImage | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", handleWindowFocus);
      resolve(value);
    };
    const readSelected = () => {
      const file = input.files?.[0];
      finish(file
        ? {
            body: file,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSizeBytes: file.size,
          }
        : null);
    };
    const handleWindowFocus = () => setTimeout(readSelected, 0);

    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = readSelected;
    window.addEventListener("focus", handleWindowFocus, { once: true });
    input.click();
  });
}

async function pickNativeImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("يلزم السماح بالوصول إلى معرض الصور.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  });
  const selected = result.canceled ? undefined : result.assets[0];
  if (!selected) return null;

  const sourceResponse = await globalThis.fetch(selected.uri);
  if (!sourceResponse.ok) {
    throw new Error(`PARTNER_PRODUCT_MEDIA_SOURCE_READ_FAILED_${sourceResponse.status}`);
  }
  const body = await sourceResponse.blob();
  return {
    body,
    fileName: selected.fileName || `partner-product-image-${Date.now()}.jpg`,
    mimeType: selected.mimeType || body.type || "application/octet-stream",
    fileSizeBytes: selected.fileSize ?? body.size,
  };
}

export function ProductMediaScreen({
  productId,
  storeId,
  onBack,
}: ProductMediaScreenProps) {
  const [screenState, setScreenState] = React.useState<ScreenState>("loading");
  const [assets, setAssets] = React.useState<readonly DshMediaAsset[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const loadAssets = React.useCallback(async () => {
    setScreenState("loading");
    setErrorMessage(null);
    try {
      const items = await listPartnerProductMedia(storeId, productId);
      setAssets(items);
      setScreenState("idle");
    } catch (error) {
      if (isOfflineError(error)) {
        setScreenState("offline");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "تعذر تحميل صورة المتجر للمنتج.");
        setScreenState("error");
      }
    }
  }, [productId, storeId]);

  React.useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const handleUpload = React.useCallback(async () => {
    setScreenState("picking");
    setErrorMessage(null);
    try {
      const selected = Platform.OS === "web" ? await pickWebImage() : await pickNativeImage();
      if (!selected) {
        setScreenState("idle");
        return;
      }

      setScreenState("uploading");
      setUploadProgress(15);
      await uploadPartnerProductMedia({
        storeId,
        productId,
        fileName: selected.fileName,
        body: selected.body,
        mimeType: selected.mimeType,
        fileSizeBytes: selected.fileSizeBytes,
        altAr: `صورة متجر للمنتج ${productId}`,
      });
      setUploadProgress(100);
      await loadAssets();
    } catch (error) {
      if (isOfflineError(error)) {
        setScreenState("offline");
      } else if (isStorageUnavailableError(error)) {
        setScreenState("storage_unavailable");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "فشل رفع الصورة.");
        setScreenState("error");
      }
    }
  }, [loadAssets, productId, storeId]);

  const handleUnlink = React.useCallback(async (assetId: string) => {
    setScreenState("deleting");
    setErrorMessage(null);
    try {
      await unlinkPartnerProductMedia(storeId, productId, assetId);
      await loadAssets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "تعذر إزالة صورة المتجر.");
      setScreenState("error");
    }
  }, [loadAssets, productId, storeId]);

  const busy = screenState === "picking" || screenState === "uploading" || screenState === "deleting";

  return (
    <View style={styles.screen}>
      <TopBar
        title="صورة المتجر للمنتج"
        subtitle="Store assortment override"
        {...(onBack ? { onBack } : {})}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <Text role="bodyStrong" align="start">حدود الملكية</Text>
          <Text role="bodySm" tone="muted" align="start">
            هذه الشاشة لا تعدّل صورة المنتج المركزي. الصورة تخص تشكيلة هذا المتجر فقط، ولا تصبح ظاهرة للعملاء قبل اعتماد DAM وسياسة الفئة.
          </Text>
        </View>

        {screenState === "loading" ? <StateView loading title="جاري تحميل الحقيقة من DSH…" /> : null}
        {screenState === "offline" ? (
          <StateView
            tone="danger"
            title="لا يوجد اتصال"
            description="تعذر الوصول إلى DSH."
            actionLabel="إعادة المحاولة"
            onActionPress={loadAssets}
          />
        ) : null}
        {screenState === "storage_unavailable" ? (
          <StateView
            tone="danger"
            title="تخزين الوسائط غير متاح"
            description="تعذر الوصول إلى مخزن الوسائط المحكوم. لم يُنشأ رابط نشر محلي بديل."
            actionLabel="إعادة المحاولة"
            onActionPress={() => void handleUpload()}
          />
        ) : null}
        {screenState === "error" ? (
          <StateView
            tone="danger"
            title="تعذر إكمال العملية"
            description={errorMessage ?? "خطأ غير معروف"}
            actionLabel="إعادة تحميل الحقيقة"
            onActionPress={loadAssets}
          />
        ) : null}

        {busy ? (
          <View style={styles.progressBox}>
            <ActivityIndicator />
            <Text role="bodySm" align="center">
              {screenState === "uploading" ? `جاري الرفع والتحقق ${uploadProgress}%` : screenState === "deleting" ? "جاري إزالة الرابط…" : "جاري اختيار الصورة…"}
            </Text>
          </View>
        ) : null}

        {!busy && screenState !== "loading" ? (
          <Button
            label="رفع صورة متجر جديدة"
            tone="primary"
            onPress={() => void handleUpload()}
          />
        ) : null}

        {assets.length === 0 && screenState === "idle" ? (
          <StateView
            title="لا توجد صورة متجر مرتبطة"
            description="ستبقى صورة المنتج المركزية هي المرجع؛ رفع صورة متجر يتطلب وجود المنتج في تشكيلة المتجر أولًا."
          />
        ) : null}

        {assets.map((asset) => (
          <View key={asset.id} style={styles.assetCard}>
            {asset.url ? (
              <Image source={{ uri: asset.url }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={styles.pendingPreview}>
                <Text role="bodyStrong" align="center">لا يوجد رابط عام قبل الاعتماد</Text>
              </View>
            )}
            <View style={styles.assetDetails}>
              <Text role="bodyStrong" align="start">{mediaStatusLabel(asset.status)}</Text>
              <Text role="caption" tone="muted" align="start">{mediaMeta(asset) || asset.id}</Text>
              <Text role="caption" tone="muted" align="start">Asset: {asset.id}</Text>
              <Button
                label="إزالة صورة المتجر"
                tone="danger"
                size="sm"
                disabled={busy}
                onPress={() => void handleUnlink(asset.id)}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[12],
    gap: spacing[3],
  },
  notice: {
    padding: spacing[4],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
  },
  progressBox: {
    padding: spacing[4],
    gap: spacing[2],
    alignItems: "center",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
  },
  assetCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
  },
  preview: {
    width: "100%",
    height: 220,
  },
  pendingPreview: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceMuted,
  },
  assetDetails: {
    padding: spacing[3],
    gap: spacing[2],
  },
});
