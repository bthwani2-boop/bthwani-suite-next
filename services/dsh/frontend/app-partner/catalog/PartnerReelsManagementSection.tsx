import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ListItem,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  fetchPartnerReels,
  pickCatalogMobileFile,
  uploadAndSubmitReel,
  validateImageFile,
  validateVideoFile,
  type AssetUploadProgress,
  type GovernedReel,
  type UploadFileSource,
} from "../../shared/catalog";

type Props = {
  readonly storeId: string;
};

const STATUS_LABELS: Record<GovernedReel["status"], string> = {
  pending_review: "بانتظار مراجعة التسويق",
  approved: "معتمد وظاهر بعد استيفاء النشر",
  rejected: "مرفوض ويحتاج تصحيحًا",
  archived: "مؤرشف",
};

function progressLabel(progress: AssetUploadProgress): string {
  switch (progress.stage) {
    case "idle": return "جاهز";
    case "signing": return "جارٍ إنشاء إذن الرفع…";
    case "uploading": return "جارٍ رفع الملف…";
    case "verifying": return "جارٍ التحقق من الملف…";
    case "linked": return "تم إرسال الفيديو للمراجعة";
    case "failed": return progress.error;
  }
}

export function PartnerReelsManagementSection({ storeId }: Props) {
  const [items, setItems] = React.useState<readonly GovernedReel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<AssetUploadProgress>({ stage: "idle" });
  const [video, setVideo] = React.useState<UploadFileSource | null>(null);
  const [poster, setPoster] = React.useState<UploadFileSource | null>(null);
  const [titleAr, setTitleAr] = React.useState("");
  const [subtitleAr, setSubtitleAr] = React.useState("");
  const [highlightAr, setHighlightAr] = React.useState("");
  const [ctaLabelAr, setCtaLabelAr] = React.useState("فتح المتجر");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchPartnerReels({ storeId, limit: 50, offset: 0 }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل فيديوهات المتجر.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const pickVideo = async () => {
    try {
      const source = await pickCatalogMobileFile("video");
      if (!source) return;
      const validation = validateVideoFile(source);
      if (validation) {
        setError(validation);
        return;
      }
      setVideo(source);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر اختيار ملف الفيديو.");
    }
  };

  const pickPoster = async () => {
    try {
      const source = await pickCatalogMobileFile("image");
      if (!source) return;
      const validation = validateImageFile(source);
      if (validation) {
        setError(validation);
        return;
      }
      setPoster(source);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر اختيار ملف الغلاف.");
    }
  };

  const submit = async () => {
    if (!video || !titleAr.trim() || submitting) {
      setError("اختر فيديو MP4 وأدخل عنوانًا عربيًا قبل الإرسال.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setProgress({ stage: "signing" });
    try {
      await uploadAndSubmitReel({
        file: video,
        ...(poster ? { posterFile: poster } : {}),
        targetType: "store",
        targetId: storeId,
        sourceStoreId: storeId,
        titleAr: titleAr.trim(),
        subtitleAr: subtitleAr.trim(),
        highlightAr: highlightAr.trim(),
        ctaLabelAr: ctaLabelAr.trim() || "فتح المتجر",
        onProgress: setProgress,
      });
      setVideo(null);
      setPoster(null);
      setTitleAr("");
      setSubtitleAr("");
      setHighlightAr("");
      setCtaLabelAr("فتح المتجر");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إرسال الفيديو للمراجعة.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text role="titleMd" align="start">فيديوهات المتجر القصيرة</Text>
      <Card>
        <View style={styles.section}>
          <Text tone="secondary" align="start">
            ارفع فيديوًا عموديًا وبوسترًا اختياريًا. لا يظهر في تطبيق العميل قبل اعتماد التسويق للفيديو والبوستر معًا.
          </Text>
          <View style={styles.fileActions}>
            <Button
              label={video ? `الفيديو: ${video.name}` : "اختيار فيديو MP4"}
              tone="secondary"
              onPress={() => void pickVideo()}
              disabled={submitting}
            />
            <Button
              label={poster ? `الغلاف: ${poster.name}` : "اختيار غلاف اختياري"}
              tone="secondary"
              onPress={() => void pickPoster()}
              disabled={submitting}
            />
          </View>
          <TextField
            label="عنوان الفيديو بالعربية"
            value={titleAr}
            onChangeText={setTitleAr}
            maxLength={160}
            disabled={submitting}
          />
          <TextField
            label="وصف مختصر"
            value={subtitleAr}
            onChangeText={setSubtitleAr}
            multiline
            numberOfLines={3}
            maxLength={500}
            disabled={submitting}
          />
          <TextField
            label="سطر إبراز"
            value={highlightAr}
            onChangeText={setHighlightAr}
            multiline
            numberOfLines={2}
            maxLength={280}
            disabled={submitting}
          />
          <TextField
            label="نص زر الانتقال"
            value={ctaLabelAr}
            onChangeText={setCtaLabelAr}
            maxLength={80}
            disabled={submitting}
          />
          <Text role="bodySm" tone={progress.stage === "failed" ? "danger" : "secondary"} align="start">
            {progressLabel(progress)}
          </Text>
          {error ? <StateView title="تعذر إكمال العملية" description={error} tone="danger" /> : null}
          <View style={styles.fileActions}>
            <Button
              label={submitting ? "جارٍ الرفع والإرسال…" : "إرسال لمراجعة التسويق"}
              tone="primary"
              loading={submitting}
              disabled={submitting || !video || !titleAr.trim()}
              onPress={() => void submit()}
            />
            <Button label="تحديث الحالات" tone="ghost" disabled={submitting} onPress={() => void load()} />
          </View>
        </View>
      </Card>

      <Card>
        {loading ? (
          <StateView title="جارٍ تحميل طلبات الفيديو…" loading />
        ) : items.length === 0 ? (
          <View style={styles.section}>
            <Text tone="secondary" align="center">لم يرسل هذا المتجر أي فيديو بعد.</Text>
          </View>
        ) : (
          items.map((item) => (
            <ListItem
              key={item.id}
              title={item.titleAr || item.titleEn || item.id}
              subtitle={item.reviewNote || `آخر تحديث: ${new Date(item.updatedAt).toLocaleString("ar")}`}
              trailing={
                <Badge
                  label={STATUS_LABELS[item.status]}
                  tone={item.status === "approved" ? "success" : item.status === "rejected" ? "warning" : "info"}
                />
              }
            />
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3] },
  section: { padding: spacing[4], gap: spacing[3] },
  fileActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
});
