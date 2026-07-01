// app-field — FieldPartnerOnboardingScreen
// Design extracted 100% from bthwani-suite donor: DshFieldStoreOnboardingScreen.tsx
// 4-group wizard with vertical timeline, missing-count badges, escalation footer.
// Rules of Hooks: ALL hooks called unconditionally before any early return.

import React from 'react';
import { Platform, Pressable, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  Card,
  Text,
  Header,
  IconButton,
  spacing,
  radius,
  borders,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';
import { useIdentitySession, devBypassLogin } from '@bthwani/core-identity';
import { AuthLoginCard } from '../../shared/auth/AuthLoginCard';
import {
  useFieldPartnerOnboardingController,
  getBasicsProfileMissingCount,
  getLocationMediaMissingCount,
  getDocumentsMissingCount,
  getAgreementReviewMissingCount,
  getFieldRequiredMissingItems,
  type FieldOnboardingController,
} from '../../shared/field-onboarding';
import { REQUIRED_DOCUMENT_TYPES, type DshPartnerDocumentType } from '../../shared/partner';
import { StepBasicsProfile } from './StepBasicsProfile';
import { StepLocationAndPhotos } from './StepLocationAndPhotos';
import { StepDocuments } from './StepDocuments';
import { StepAgreementReview } from './StepAgreementReview';
import type { DocumentItem, DocumentKind } from './StepDocuments';

const DOCUMENT_KIND_TO_PARTNER_TYPE: Record<DocumentKind, DshPartnerDocumentType> = {
  commercial_registration: 'commercial_register',
  identity_proof: 'national_id',
};

type GroupId = 'basics_profile' | 'location_media' | 'documents' | 'agreement_review';

const GROUP_ORDER: readonly GroupId[] = [
  'basics_profile',
  'location_media',
  'documents',
  'agreement_review',
];

const GROUP_LABELS: Record<GroupId, string> = {
  basics_profile: 'البيانات الأساسية للمتجر',
  location_media: 'الموقع والصور الميدانية',
  documents: 'المستندات والتراخيص الرسمية',
  agreement_review: 'الاتفاق والمراجعة النهائية',
};

const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  commercial_registration: 'السجل التجاري',
  identity_proof: 'الهوية الوطنية للمالك',
};

export type FieldPartnerOnboardingScreenProps = {
  readonly controller?: FieldOnboardingController;
  readonly onBack?: () => void;
  readonly onUploadDocument?: (kind: DshPartnerDocumentType, partnerId?: string) => void;
  readonly onEscalate?: () => void;
  readonly onGoToProducts?: () => void;
};

export function FieldPartnerOnboardingScreen({
  controller: controllerProp,
  onBack,
  onUploadDocument,
  onEscalate,
  onGoToProducts,
}: FieldPartnerOnboardingScreenProps = {}) {
  const identity = useIdentitySession();
  const ownController = useFieldPartnerOnboardingController();
  const controller = controllerProp ?? ownController;
  const insets = useSafeAreaInsets();
  const { state, validationErrors, updateForm, updateVisitNotes, submitDraft } = controller;

  const [activeGroup, setActiveGroup] = React.useState<GroupId>('basics_profile');
  const [fieldNotes, setFieldNotes] = React.useState('');
  const [docLoading] = React.useState<Record<string, boolean>>({});

  // Derived values (safe — no hooks below this line)
  const form = state.form;
  const activeGroupIndex = GROUP_ORDER.indexOf(activeGroup);
  const isLastGroup = activeGroupIndex === GROUP_ORDER.length - 1;
  const documents: readonly DocumentItem[] = REQUIRED_DOCUMENT_TYPES.map((partnerType) => {
    const kind = (Object.keys(DOCUMENT_KIND_TO_PARTNER_TYPE) as DocumentKind[]).find(
      (k) => DOCUMENT_KIND_TO_PARTNER_TYPE[k] === partnerType
    ) as DocumentKind;
    const uploaded = state.uploadedDocumentTypes.includes(partnerType);
    return {
      id: kind,
      label: DOCUMENT_LABELS[kind],
      required: true,
      status: uploaded ? 'uploaded' : 'missing',
      referenceLabel: uploaded ? 'تم رفع المستند' : 'لا يوجد مرجع مرفوع بعد',
    };
  });
  const missingItems = getFieldRequiredMissingItems(form, state.uploadedDocumentTypes);
  const canSubmit = !!state.partnerId && missingItems.length === 0;

  const groupMissingCounts: Record<GroupId, number> = {
    basics_profile: getBasicsProfileMissingCount(form),
    location_media: getLocationMediaMissingCount(form),
    documents: getDocumentsMissingCount(state.uploadedDocumentTypes),
    agreement_review: getAgreementReviewMissingCount(form, state.uploadedDocumentTypes),
  };

  // ── Auth guard (after all hooks) ─────────────────────────────────────────
  if (identity.state.kind !== 'authenticated') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}
        contentContainerStyle={{ padding: spacing[4], justifyContent: 'center' }}
      >
        <AuthLoginCard
          title="تسجيل دخول الموظف الميداني"
          subtitle="سجّل دخولك لإضافة شريك جديد."
          loading={identity.state.kind === 'authenticating'}
          {...(identity.state.kind === 'error' ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
          onDevBypass={() => devBypassLogin('field')}
        />
      </ScrollView>
    );
  }

  // ── Success state (after all hooks) ──────────────────────────────────────
  if (state.isSubmitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="تم الإرسال" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text role="titleLg" style={{ textAlign: 'center', marginBottom: 12 }}>
            ✓ تم إرسال ملف الشريك
          </Text>
          <Text role="bodySm" tone="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
            ملف الشريك أُرسِل لمراجعة قسم الشركاء في لوحة التحكم.
          </Text>
          <Text role="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
            رقم الشريك: {state.partnerId}
          </Text>
          <View style={{ marginTop: 24 }}>
            <Button label="تسجيل شريك جديد" tone="primary" onPress={controller.reset} />
          </View>
        </View>
      </View>
    );
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  const goToNext = async () => {
    if (activeGroup === 'basics_profile') {
      const created = await controller.ensureDraftCreated();
      if (!created) return;
    }
    if (isLastGroup) {
      if (canSubmit) void submitDraft();
      return;
    }
    setActiveGroup(GROUP_ORDER[activeGroupIndex + 1] as GroupId);
  };

  // ── Step content renderer ─────────────────────────────────────────────────
  const renderGroupContent = (groupId: GroupId) => {
    if (groupId === 'basics_profile') {
      return (
        <StepBasicsProfile
          form={form}
          errors={validationErrors}
          readOnly={false}
          onChange={updateForm}
        />
      );
    }
    if (groupId === 'location_media') {
      return (
        <StepLocationAndPhotos
          form={form}
          errors={validationErrors}
          readOnly={false}
          onChange={updateForm}
          cameraLoading={docLoading}
          isNativePickerAvailable={false}
          onPickPhoto={() => undefined}
          locationLatitude={state.locationLatitude}
          locationLongitude={state.locationLongitude}
          onLocationChange={controller.updateLocation}
        />
      );
    }
    if (groupId === 'documents') {
      return (
        <StepDocuments
          documents={documents}
          loadingMap={docLoading}
          onUploadDocument={(kind) => onUploadDocument?.(DOCUMENT_KIND_TO_PARTNER_TYPE[kind], state.partnerId ?? undefined)}
        />
      );
    }
    if (groupId === 'agreement_review') {
      return (
        <StepAgreementReview
          form={form}
          readOnly={false}
          onChange={updateForm}
          missingItems={missingItems}
          fieldNotes={fieldNotes}
          onFieldNotesChange={(v) => {
            setFieldNotes(v);
            updateVisitNotes(v);
          }}
        />
      );
    }
    return null;
  };

  const nextGroup = GROUP_ORDER[activeGroupIndex + 1];
  const nextLabel = nextGroup ? GROUP_LABELS[nextGroup] : '';

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header
        title={form.legalNameAr || 'ملف انضمام جديد'}
        actions={
          <IconButton
            icon={<Icon name="save-outline" size={20} tone="brand" />}
            accessibilityLabel="حفظ المسودة"
            onPress={() => void controller.nextStep()}
            tone="ghost"
          />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'flex-end', paddingHorizontal: spacing[3], gap: spacing[1] }}>
          <Text role="titleSm" style={{ textAlign: 'right', fontWeight: 'bold' }}>
            {form.legalNameAr || 'ملف انضمام جديد'}
          </Text>
          <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
            الملف الميداني الموحد لجمع وثائق وإحداثيات الشريك.
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        {/* ── Products Warning Banner ── */}
        <Card
          style={{
            backgroundColor: colorRoles.surfaceWarm,
            borderWidth: 1,
            borderColor: colorRoles.warning,
            borderRadius: radius.md,
            padding: spacing[3],
          }}
        >
          <View style={{ gap: spacing[1], alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[2] }}>
              <Icon name="alert-circle-outline" size={20} tone="warning" />
              <Text role="bodyStrong" style={{ color: colorRoles.warning, textAlign: 'right', fontWeight: 'bold' }}>
                بانتظار رفع المنتجات الابتدائية
              </Text>
            </View>
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right', marginTop: spacing[1] }}>
              تم استكمال البيانات الأساسية والتراخيص، ولكن المتجر لا يعتبر جاهزاً للتفعيل حتى يتم رفع المنتجات الابتدائية للكتالوج.
            </Text>
            <Button
              label="رفع المنتجات الابتدائية الآن"
              tone="primary"
              size="sm"
              onPress={() => onGoToProducts?.()}
              style={{ marginTop: spacing[2], alignSelf: 'flex-start' }}
            />
          </View>
        </Card>

        {/* ── Vertical timeline accordion ── */}
        <View style={{ gap: spacing[2] }}>
          {GROUP_ORDER.map((groupId, index) => {
            const isActive = activeGroup === groupId;
            const groupMissing = groupMissingCounts[groupId];
            const isComplete = groupMissing === 0;

            return (
              <View
                key={groupId}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'stretch',
                }}
              >
                {/* Timeline column */}
                <View style={{ alignItems: 'center', width: 48 }}>
                  <Pressable
                    onPress={() => setActiveGroup(groupId)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: radius.round,
                      backgroundColor: isComplete
                        ? colorRoles.success
                        : isActive
                        ? colorRoles.brandAction
                        : colorRoles.surfaceMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isActive ? 0 : borders.hairline,
                      borderColor: isComplete ? colorRoles.success : colorRoles.borderStrong,
                      zIndex: 2,
                    }}
                  >
                    {isComplete ? (
                      <Icon name="checkmark" size={14} color={colorRoles.surfaceBase} />
                    ) : (
                      <Text
                        role="caption"
                        style={{
                          fontWeight: 'bold',
                          color: isActive ? colorRoles.surfaceBase : colorRoles.textMuted,
                        }}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </Pressable>
                  {index < GROUP_ORDER.length - 1 && (
                    <View
                      style={{
                        width: 2,
                        flex: 1,
                        backgroundColor: colorRoles.borderSubtle,
                        marginVertical: 4,
                        zIndex: 1,
                      }}
                    />
                  )}
                </View>

                {/* Content column */}
                <View style={{ flex: 1 }}>
                  {/* Group header row — tap to expand */}
                  <Pressable
                    onPress={() => setActiveGroup(groupId)}
                    style={{
                      paddingVertical: spacing[3],
                      paddingHorizontal: spacing[2],
                      flexDirection: 'row-reverse',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      role="bodyStrong"
                      style={{
                        fontWeight: 'bold',
                        color: isActive ? colorRoles.brandAction : colorRoles.textPrimary,
                      }}
                    >
                      {GROUP_LABELS[groupId]}
                    </Text>

                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[1] }}>
                      {groupMissing > 0 ? (
                        <Badge label={`${groupMissing} نواقص`} tone="warning" />
                      ) : (
                        <Badge label="مكتمل" tone="success" />
                      )}
                      <Icon
                        name={isActive ? 'chevron-down' : 'chevron-back'}
                        size={16}
                        tone="muted"
                        mirrored
                      />
                    </View>
                  </Pressable>

                  {/* Group body (visible only when active) */}
                  {isActive && (
                    <View
                      style={{
                        paddingBottom: spacing[4],
                        paddingHorizontal: spacing[2],
                        borderBottomWidth: 1,
                        borderBottomColor: colorRoles.borderSubtle,
                      }}
                    >
                      {renderGroupContent(groupId)}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Footer actions ── */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing[3],
          borderTopWidth: 1,
          borderTopColor: colorRoles.borderSubtle,
          backgroundColor: colorRoles.surfaceBase,
          padding: spacing[3],
          paddingBottom: spacing[3] + insets.bottom,
        }}
      >
        {/* تصعيد عائق */}
        <Pressable
          onPress={() => onEscalate?.()}
          style={{
            flex: 1,
            backgroundColor: colorRoles.surfaceBase,
            borderColor: colorRoles.brandAction,
            borderWidth: 1,
            borderRadius: radius.md,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text role="bodyStrong" style={{ color: colorRoles.brandAction, fontWeight: 'bold' }}>
            تصعيد عائق
          </Text>
        </Pressable>

        {/* التالي / إرسال */}
        <Button
          label={isLastGroup ? 'إرسال للمراجعة' : `التالي: ${nextLabel}`}
          tone={canSubmit && isLastGroup ? 'success' : 'primary'}
          disabled={isLastGroup ? !canSubmit : false}
          onPress={() => void goToNext()}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}
