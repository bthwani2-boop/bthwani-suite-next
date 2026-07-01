// app-field — DshFieldPartnerProgressScreen
// Read-only lifecycle overview for a partner draft the field agent owns, once it
// has moved past the editable draft stage. Keeps the field agent informed of the
// whole activation flow (documents, catalog, delivery, activation, visibility)
// even though only control-panel/app-partner can act on most of these steps.
import React from 'react';
import { View, ScrollView } from 'react-native';
import {
  Badge,
  Button,
  Header,
  StateView,
  Text,
  spacing,
  radius,
  borders,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';
import {
  useFieldPartnerProgressController,
  getDshPartnerReadinessChecklist,
  DOCUMENT_TYPE_LABELS,
} from '../../shared/partner';

export type DshFieldPartnerProgressScreenProps = {
  readonly partnerId: string;
  readonly onBack: () => void;
  readonly onOpenProducts?: (partnerId: string) => void;
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  under_review: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

const DOCUMENT_STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  under_review: 'info',
  approved: 'success',
  rejected: 'danger',
};

function SectionCard({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <View
      style={{
        borderWidth: borders.hairline,
        borderColor: colorRoles.borderSubtle,
        borderRadius: radius.md,
        backgroundColor: colorRoles.surfaceBase,
        padding: spacing[4],
        gap: spacing[2],
      }}
    >
      <Text role="titleSm" style={{ fontWeight: 'bold', textAlign: 'right' }}>{title}</Text>
      {children}
    </View>
  );
}

export function DshFieldPartnerProgressScreen({ partnerId, onBack, onOpenProducts }: DshFieldPartnerProgressScreenProps) {
  const { state, statusLabel, isClientVisible, reload } = useFieldPartnerProgressController(partnerId);

  if (state.kind === 'loading' || state.kind === 'idle') {
    return <StateView loading title="جاري تحميل تقدّم ملف الشريك…" />;
  }
  if (state.kind === 'forbidden') {
    return <StateView tone="danger" title="غير مصرح" description="هذا الملف لا يخصّ حسابك." actionLabel="رجوع" onActionPress={onBack} />;
  }
  if (state.kind === 'not_found') {
    return <StateView title="الملف غير موجود" actionLabel="رجوع" onActionPress={onBack} />;
  }
  if (state.kind === 'error') {
    return <StateView tone="danger" title="تعذر التحميل" description={state.message} actionLabel="إعادة المحاولة" onActionPress={() => void reload()} />;
  }

  const { partner, readiness, documents, fieldVisits } = state;
  const lifecycle = getDshPartnerReadinessChecklist(partner.activationStatus);

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header title={partner.displayName} subtitle={statusLabel} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard title="حالة الظهور للعملاء">
          <View style={{ flexDirection: 'row-reverse', gap: spacing[2], flexWrap: 'wrap' }}>
            <Badge label={statusLabel} tone="info" />
            <Badge
              label={isClientVisible ? 'ظاهر للعملاء الآن' : 'غير ظاهر للعملاء بعد'}
              tone={isClientVisible ? 'success' : 'warning'}
            />
          </View>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            هذا الملف للاطلاع فقط — القرارات النهائية (الاعتماد، التفعيل، الظهور) من صلاحية قسم الشركاء بلوحة التحكم.
          </Text>
        </SectionCard>

        <SectionCard title="مسار التفعيل الكامل">
          {lifecycle.map((item) => (
            <View
              key={item.id}
              style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[1] }}
            >
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text role="bodySm" style={{ textAlign: 'right' }}>{item.label}</Text>
                {!item.satisfied && item.blockedReason && (
                  <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>{item.blockedReason}</Text>
                )}
              </View>
              <Icon
                name={item.satisfied ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                tone={item.satisfied ? 'success' : 'muted'}
              />
            </View>
          ))}
        </SectionCard>

        {!readiness.canActivate && readiness.blockedReason && (
          <SectionCard title="العائق الحالي">
            <Text role="bodySm" tone="danger" style={{ textAlign: 'right' }}>{readiness.blockedReason}</Text>
          </SectionCard>
        )}

        <SectionCard title={`الوثائق المرفوعة (${documents.length})`}>
          {documents.length === 0 ? (
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>لا توجد وثائق مرفوعة بعد.</Text>
          ) : (
            documents.map((doc) => (
              <View key={doc.id} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[1] }}>
                <Text role="bodySm" style={{ textAlign: 'right' }}>
                  {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                </Text>
                <Badge
                  label={DOCUMENT_STATUS_LABELS[doc.documentStatus] ?? doc.documentStatus}
                  tone={DOCUMENT_STATUS_TONE[doc.documentStatus] ?? 'info'}
                />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title={`الزيارات الميدانية (${fieldVisits.length})`}>
          {fieldVisits.length === 0 ? (
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>لا توجد زيارات مسجّلة بعد.</Text>
          ) : (
            fieldVisits.map((visit) => (
              <View key={visit.id} style={{ paddingVertical: spacing[1], alignItems: 'flex-end' }}>
                <Text role="bodySm" style={{ textAlign: 'right' }}>
                  {new Date(visit.createdAt).toLocaleString('ar-SA')}
                </Text>
                {visit.visitNotes ? (
                  <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>{visit.visitNotes}</Text>
                ) : null}
              </View>
            ))
          )}
        </SectionCard>

        {onOpenProducts && (
          <Button
            label="المنتجات التجريبية"
            tone="primary"
            onPress={() => onOpenProducts(partnerId)}
          />
        )}

        <Button label="تحديث" tone="secondary" onPress={() => void reload()} />
        <Button label="رجوع" tone="ghost" onPress={onBack} />
      </ScrollView>
    </View>
  );
}

export default DshFieldPartnerProgressScreen;
