// app-field — DshFieldDocumentUploadScreen
// Document upload and media key assignment screen.
import React from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import {
  Badge,
  Button,
  StateView,
  Text,
  TextField,
  Header,
  IconButton,
  spacing,
  radius,
  borders,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';
import { fieldUploadDocument } from '../../shared/partner';
import type { DshPartnerDocumentType } from '../../shared/partner';

export type DshFieldDocumentUploadScreenProps = {
  readonly storeId: string;
  readonly docKind?: DshPartnerDocumentType;
  readonly onBack: () => void;
};

const DOC_KINDS: readonly { id: DshPartnerDocumentType; label: string; description: string; icon: string }[] = [
  { id: 'commercial_register', label: 'السجل التجاري', description: 'السجل التجاري للمنشأة ساري المفعول', icon: 'document-text-outline' },
  { id: 'national_id', label: 'الهوية الوطنية للمالك', description: 'هوية المالك أو المفوّض القانوني', icon: 'person-circle-outline' },
  { id: 'lease_agreement', label: 'عقد الإيجار', description: 'عقد إيجار المحل أو صك الملكية', icon: 'home-outline' },
  { id: 'health_certificate', label: 'شهادة صحة', description: 'تراخيص البلدية وشهادة الصحة للعمالة', icon: 'shield-checkmark-outline' },
  { id: 'store_photo', label: 'صورة المتجر الرئيسية', description: 'صورة توضح تجهيزات المتجر والممرات', icon: 'image-outline' },
];

export function DshFieldDocumentUploadScreen({ storeId, docKind, onBack }: DshFieldDocumentUploadScreenProps) {
  const isRtl = true;

  const [selectedKind, setSelectedKind] = React.useState<DshPartnerDocumentType>(
    docKind ?? 'commercial_register'
  );
  const [documentRef, setDocumentRef] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Generate dummy ref for mock upload
    setDocumentRef(`media-ref-${selectedKind}-${Math.floor(Math.random() * 100000)}`);
  }, [selectedKind]);

  const handleFormSubmit = async () => {
    if (!documentRef.trim()) {
      setErrorMsg('يرجى تحديد أو إدخال رمز الوسائط (media key).');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await fieldUploadDocument(storeId, {
        documentType: selectedKind,
        mediaRef: documentRef.trim(),
        notes: 'مرفوع عبر تطبيق الميداني',
      });
      setSuccess(true);
    } catch (err: unknown) {
      setErrorMsg('تعذر رفع المستند. يرجى التحقق من اتصال الشبكة.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <StateView
        loading
        title="جاري رفع المستند..."
        description="نحن بصدد تسجيل المستند المرفق وتحديث الجاهزية."
      />
    );
  }

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="تم الرفع" />
        <StateView
          tone="success"
          title="تم إرسال المستند بنجاح"
          description={`تم تسجيل مستند الإثبات بالرمز ${documentRef} بنجاح وهو الآن بانتظار المراجعة والتدقيق.`}
          actionLabel="العودة للمتجر"
          onActionPress={onBack}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <View style={{ paddingHorizontal: spacing[4] }}>
        <Header
          title="إثبات الوثائق والصور"
          subtitle={`معرف المتجر: ${storeId}`}
          leading={
            <IconButton
              icon={<Icon name="arrow-back" size={20} tone="brand" mirrored />}
              accessibilityLabel="رجوع"
              onPress={onBack}
              tone="ghost"
            />
          }
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing[1], alignItems: 'flex-end' }}>
          <Text role="titleMd" style={{ textAlign: 'right' }}>
            سياسة المستندات والجاهزية
          </Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            الوثائق والصور المرفوعة تظل on-demand للتأكد من حماية خصوصية الشركاء.
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        <View style={{ gap: spacing[3] }}>
          <View style={{ gap: spacing[1], alignItems: 'flex-end' }}>
            <Text role="titleMd" style={{ textAlign: 'right' }}>
              نوع المستند المطلوب
            </Text>
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
              اختر نوع المرفق أو الصورة لإضافتها كإثبات.
            </Text>
          </View>
          <View style={{ gap: spacing[2] }}>
            {DOC_KINDS.map((kind) => {
              const isSelected = selectedKind === kind.id;
              return (
                <Pressable
                  key={kind.id}
                  onPress={() => setSelectedKind(kind.id)}
                  style={{
                    padding: spacing[3],
                    borderRadius: radius.md,
                    borderWidth: borders.hairline,
                    borderColor: isSelected ? colorRoles.brandAction : colorRoles.borderStrong,
                    backgroundColor: isSelected ? colorRoles.surfaceMuted : 'transparent',
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                    alignItems: 'center',
                  }}
                >
                  <Icon name={kind.icon} size={24} tone={isSelected ? 'brand' : 'muted'} />
                  <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start', marginHorizontal: 12, gap: 2 }}>
                    <Text role="bodyStrong" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                      {kind.label}
                    </Text>
                    <Text role="caption" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                      {kind.description}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: radius.sm,
                      borderWidth: borders.strong,
                      borderColor: isSelected ? colorRoles.brandAction : colorRoles.borderStrong,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: colorRoles.brandAction,
                        }}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        <View style={{ gap: spacing[3] }}>
          <View style={{ gap: spacing[1], alignItems: 'flex-end' }}>
            <Text role="titleMd" style={{ textAlign: 'right' }}>
              تفاصيل الملف المرفق
            </Text>
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
              مستندات الإثبات مسجلة بواسطة مفاتيح الوسائط الفريدة.
            </Text>
          </View>
          <TextField
            label="رمز إثبات الوسائط (Media Key)"
            value={documentRef}
            onChangeText={setDocumentRef}
            {...(errorMsg ? { error: errorMsg } : {})}
            hint="سيتم إنشاء هذا الرمز تلقائيًا لغرض المحاكاة."
          />
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        <View style={{ gap: spacing[3] }}>
          {/* KeyValueList */}
          <View style={{ gap: spacing[2], width: '100%' }}>
            {[
              { label: 'النوع المحدد', value: DOC_KINDS.find((d) => d.id === selectedKind)?.label ?? '' },
              { label: 'رمز الملف المعين', value: documentRef || '—', color: colorRoles.brandAction },
              { label: 'حالة الاعتماد الأولية', value: 'قيد الانتظار (Pending)' },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row-reverse',
                  justifyContent: 'space-between',
                  paddingVertical: spacing[2],
                  borderBottomWidth: 1,
                  borderBottomColor: colorRoles.borderSubtle,
                }}
              >
                <Text role="bodyStrong" style={{ textAlign: 'right' }}>
                  {item.label}
                </Text>
                <Text
                  role="body"
                  style={{ textAlign: 'left', ...(item.color ? { color: item.color } : {}) }}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          <Button
            label="إرسال وثيقة الإثبات"
            onPress={handleFormSubmit}
            disabled={!documentRef.trim()}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default DshFieldDocumentUploadScreen;
