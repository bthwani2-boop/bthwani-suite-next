// app-field — DshFieldOnboardingScreen
// Unified partner intake: identity, location, governed evidence, fast catalog
// setup, and operational review. All hooks stay above early returns.

import React from 'react';
import { Platform, Pressable, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Badge,
  Button,
  Text,
  Header,
  IconButton,
  StateView,
  spacing,
  radius,
  borders,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';
import { useIdentitySession } from '@bthwani/core-identity';
import { DshFieldActivationCard } from '../components/DshFieldActivationCard';
import {
  useFieldPartnerOnboardingController,
  getBasicsProfileMissingCount,
  getLocationMediaMissingCount,
  getDocumentsMissingCount,
  getCatalogSetupMissingCount,
  getAgreementReviewMissingCount,
  getFieldRequiredMissingItems,
  getRequiredPartnerDocuments,
  FIELD_ONBOARDING_STEPS,
  FIELD_ONBOARDING_STEP_LABELS,
  type FieldPartnerDraftStep,
  type FieldOnboardingController,
} from '../../shared/field-onboarding';
import { resolvePartnerOnboardingFailureState } from '../../shared/partner';
import { uploadFieldMedia } from '../../shared/media';
import { useStoreOnboardingFeeReferenceController } from '../../shared/platform';
import { OnboardingBasicsSection } from '../components/OnboardingBasicsSection';
import { OnboardingLocationSection } from '../components/OnboardingLocationSection';
import {
  OnboardingEvidenceSection,
  type EvidenceItem,
  type EvidencePickSource,
} from '../components/OnboardingEvidenceSection';
import { OnboardingAgreementSection } from '../components/OnboardingAgreementSection';

type BranchPhotoKey = 'storefrontPhotoRef' | 'interiorPhotoRef' | 'signagePhotoRef';
type GroupId = FieldPartnerDraftStep;

type PickedEvidenceFile = {
  readonly uri: string;
  readonly name: string;
  readonly mimeType: string;
};

const GROUP_ORDER: readonly GroupId[] = FIELD_ONBOARDING_STEPS;
const GROUP_LABELS: Record<GroupId, string> = FIELD_ONBOARDING_STEP_LABELS;

const PHOTO_LABELS: Record<BranchPhotoKey, string> = {
  storefrontPhotoRef: 'صورة الواجهة الخارجية للمحل',
  interiorPhotoRef: 'صورة المتجر من الداخل والرفوف',
  signagePhotoRef: 'صورة اللوحة التجارية المطابقة للترخيص',
};

function formatSavedAtTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const CHARGE_TIMING_REFERENCE_LABELS: Record<string, string> = {
  on_approval: 'عند الاعتماد',
  on_publication: 'عند النشر',
  on_first_order: 'عند أول طلب',
  manual: 'يدويًا',
};

function evidenceErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'CAMERA_PERMISSION_DENIED':
      return 'لم يتم السماح باستخدام الكاميرا. فعّل الصلاحية من إعدادات الجهاز ثم أعد المحاولة.';
    case 'LIBRARY_PERMISSION_DENIED':
      return 'لم يتم السماح بالوصول إلى الصور. فعّل الصلاحية من إعدادات الجهاز ثم أعد المحاولة.';
    case 'DOCUMENT_TYPE_NOT_RESOLVED':
      return 'تعذر تحديد نوع المستند المطلوب. أعد فتح الملف ثم حاول مرة أخرى.';
    case 'DOCUMENT_LINK_FAILED':
      return 'تم رفع الملف ولكن تعذر ربطه بملف الشريك. أعد المحاولة دون تغيير البيانات الأساسية.';
    case 'UNSUPPORTED_FILE':
      return 'نوع الملف غير مدعوم. استخدم PDF أو JPG أو PNG أو WEBP.';
    default:
      return 'تعذر رفع الملف والتحقق منه. تحقق من الاتصال والجلسة ثم أعد المحاولة.';
  }
}

export type DshFieldOnboardingScreenProps = {
  readonly controller?: FieldOnboardingController;
  readonly partnerId?: string;
  readonly onBack?: () => void;
  readonly onOpenProducts?: (partnerId: string) => void;
};

export function DshFieldOnboardingScreen({
  controller: controllerProp,
  partnerId,
  onBack,
  onOpenProducts,
}: DshFieldOnboardingScreenProps = {}) {
  const identity = useIdentitySession();
  const ownController = useFieldPartnerOnboardingController();
  const controller = controllerProp ?? ownController;
  const insets = useSafeAreaInsets();
  const { state, validationErrors, updateForm, updateVisitNotes, submitDraft, switchDraft } = controller;
  const { state: feeRefState } = useStoreOnboardingFeeReferenceController(identity.state.kind);

  const [activeGroup, setActiveGroup] = React.useState<GroupId>('basics_profile');
  const [evidenceLoading, setEvidenceLoading] = React.useState<Record<string, boolean>>({});
  const [evidenceErrors, setEvidenceErrors] = React.useState<Record<string, string | undefined>>({});
  const [evidencePreviewUris, setEvidencePreviewUris] = React.useState<Record<string, string | undefined>>({});

  React.useEffect(() => {
    void switchDraft(partnerId);
  }, [partnerId, switchDraft]);

  const pickEvidenceFile = React.useCallback(async (
    source: EvidencePickSource,
    fallbackName: string,
  ): Promise<PickedEvidenceFile | null> => {
    if (source === 'document') {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return null;
      const mimeType = asset.mimeType?.trim() || '';
      if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('UNSUPPORTED_FILE');
      }
      return {
        uri: asset.uri,
        name: asset.name || `${fallbackName}-${Date.now()}`,
        mimeType,
      };
    }

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error('CAMERA_PERMISSION_DENIED');
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ['images'] });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return null;
      return {
        uri: asset.uri,
        name: asset.fileName ?? `${fallbackName}-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      };
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('LIBRARY_PERMISSION_DENIED');
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;
    return {
      uri: asset.uri,
      name: asset.fileName ?? `${fallbackName}-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    };
  }, []);

  const handlePickEvidence = React.useCallback(async (item: EvidenceItem, source: EvidencePickSource) => {
    setEvidenceErrors((current) => ({ ...current, [item.key]: undefined }));
    setEvidenceLoading((current) => ({ ...current, [item.key]: true }));
    try {
      const picked = await pickEvidenceFile(source, item.key);
      if (!picked) return;

      let ownerPartnerId = state.partnerId;
      if (!ownerPartnerId) {
        const created = await controller.ensureDraftCreated();
        if (!created) {
          setActiveGroup('basics_profile');
          return;
        }
        ownerPartnerId = created;
      }

      const mediaRef = await uploadFieldMedia(ownerPartnerId, picked);
      if (item.kind === 'document') {
        const documentSpec = getRequiredPartnerDocuments(state.form).find((candidate) => candidate.key === item.key);
        if (!documentSpec) throw new Error('DOCUMENT_TYPE_NOT_RESOLVED');
        const linked = await controller.uploadDocument(documentSpec.documentType, mediaRef, ownerPartnerId);
        if (!linked) throw new Error('DOCUMENT_LINK_FAILED');
      } else {
        updateForm({ [item.key]: mediaRef });
        controller.addEvidenceRef(mediaRef);
      }
      setEvidencePreviewUris((current) => ({ ...current, [item.key]: picked.uri }));
    } catch (error) {
      setEvidenceErrors((current) => ({ ...current, [item.key]: evidenceErrorMessage(error) }));
    } finally {
      setEvidenceLoading((current) => ({ ...current, [item.key]: false }));
    }
  }, [state.partnerId, state.form, controller, updateForm, pickEvidenceFile]);

  const openCatalogSetup = React.useCallback(async () => {
    if (!onOpenProducts) return;
    const durablePartnerId = state.partnerId ?? await controller.ensureDraftCreated();
    if (!durablePartnerId) {
      setActiveGroup('basics_profile');
      return;
    }
    onOpenProducts(durablePartnerId);
  }, [onOpenProducts, state.partnerId, controller]);

  const form = state.form;
  const activeGroupIndex = GROUP_ORDER.indexOf(activeGroup);
  const isLastGroup = activeGroupIndex === GROUP_ORDER.length - 1;
  const requiredDocuments = getRequiredPartnerDocuments(form);
  const evidenceItems: readonly EvidenceItem[] = [
    ...requiredDocuments.map((document): EvidenceItem => ({
      key: document.key,
      kind: 'document',
      label: document.label,
      status: state.uploadedDocumentTypes.includes(document.documentType) ? 'uploaded' : 'missing',
      ...(evidencePreviewUris[document.key] ? { previewUri: evidencePreviewUris[document.key] } : {}),
    })),
    ...(Object.keys(PHOTO_LABELS) as BranchPhotoKey[]).map((key): EvidenceItem => ({
      key,
      kind: 'photo',
      label: PHOTO_LABELS[key],
      status: form[key]?.trim() ? 'uploaded' : 'missing',
      ...(evidencePreviewUris[key] ? { previewUri: evidencePreviewUris[key] } : {}),
    })),
  ];
  const missingItems = getFieldRequiredMissingItems(form, state.uploadedDocumentTypes);
  const isReadyToSubmit = missingItems.length === 0;

  const groupMissingCounts: Record<GroupId, number> = {
    basics_profile: getBasicsProfileMissingCount(form),
    location_media: getLocationMediaMissingCount(form),
    evidence: getDocumentsMissingCount(state.uploadedDocumentTypes, form),
    catalog_setup: getCatalogSetupMissingCount(),
    agreement_review: getAgreementReviewMissingCount(form, state.uploadedDocumentTypes),
  };
  const visibleFailure = state.failure ? resolvePartnerOnboardingFailureState(state.failure) : null;
  const firstIncompleteGroup = GROUP_ORDER.find((groupId) => groupMissingCounts[groupId] > 0) ?? 'agreement_review';

  const recoverVisibleFailure = () => {
    if (!visibleFailure) return;
    if (visibleFailure.action === 'reload' && state.partnerId) {
      void controller.loadDraft(state.partnerId);
      return;
    }
    if (visibleFailure.action === 'retry') {
      if (activeGroup === 'agreement_review' && isReadyToSubmit && state.partnerId) {
        void controller.submitDraft();
      } else if (state.partnerId) {
        void controller.save();
      } else {
        void controller.ensureDraftCreated();
      }
      return;
    }
    if (visibleFailure.action === 'complete_requirements') {
      setActiveGroup(firstIncompleteGroup);
      return;
    }
    if (visibleFailure.action === 'sign_in') onBack?.();
  };

  const canRecoverVisibleFailure = Boolean(
    visibleFailure &&
    visibleFailure.action !== 'none' &&
    (visibleFailure.action !== 'sign_in' || onBack),
  );

  if (identity.state.kind === 'restoring' || identity.state.kind === 'unconfigured') {
    return <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }} />;
  }

  if (identity.state.kind !== 'authenticated') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }} contentContainerStyle={{ padding: spacing[4], justifyContent: 'center' }}>
        <DshFieldActivationCard
          loading={identity.state.kind === 'authenticating'}
          {...(identity.state.kind === 'error' ? { error: identity.state.message } : {})}
          onSubmit={(phone, code) => void identity.activate(phone, code)}
        />
      </ScrollView>
    );
  }

  if (state.loadStatus === 'hydrating') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="جارٍ التحميل" />
        <StateView loading tone="info" title="جارٍ تحميل ملف الشريك" description="يتم جلب أحدث حالة معتمدة من DSH." />
      </View>
    );
  }

  if (state.loadStatus === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title={visibleFailure?.title ?? 'تعذر التحميل'} />
        <StateView
          tone={visibleFailure?.tone ?? 'danger'}
          title={visibleFailure?.title ?? 'تعذر تحميل ملف الشريك'}
          description={visibleFailure?.description ?? state.loadError ?? 'تعذر تحميل بيانات ملف الشريك'}
          {...(canRecoverVisibleFailure && visibleFailure
            ? { actionLabel: visibleFailure.actionLabel, onActionPress: recoverVisibleFailure }
            : partnerId
              ? { actionLabel: 'إعادة المحاولة', onActionPress: () => void controller.loadDraft(partnerId) }
              : onBack
                ? { actionLabel: 'رجوع', onActionPress: onBack }
                : {})}
        />
      </View>
    );
  }

  if (state.isSubmitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header
          title="تم الإرسال"
          actions={onBack ? (
            <IconButton icon={<Icon name="arrow-back" mirrored />} accessibilityLabel="رجوع" tone="ghost" onPress={onBack} />
          ) : undefined}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text role="titleLg" style={{ textAlign: 'center', marginBottom: 12 }}>✓ تم إرسال ملف الشريك</Text>
          <Text role="bodySm" tone="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
            ملف الشريك أُرسِل لمراجعة قسم الشركاء في لوحة التحكم.
          </Text>
          <Text role="caption" tone="muted" style={{ fontFamily: 'monospace' }}>رقم الشريك: {state.partnerId}</Text>
          <View style={{ marginTop: 24, gap: spacing[2], width: '100%', paddingHorizontal: 24 }}>
            {onOpenProducts && state.partnerId ? (
              <Button label="إعداد منتجات المتجر" tone="secondary" onPress={() => onOpenProducts(state.partnerId!)} />
            ) : null}
            <Button label="تسجيل شريك جديد" tone="primary" onPress={controller.reset} />
          </View>
        </View>
      </View>
    );
  }

  const goToNext = async () => {
    const created = await controller.ensureDraftCreated();
    if (!created) {
      setActiveGroup('basics_profile');
      return;
    }
    if (isLastGroup) {
      if (isReadyToSubmit) void submitDraft();
      return;
    }
    setActiveGroup(GROUP_ORDER[activeGroupIndex + 1] as GroupId);
  };

  const renderGroupContent = (groupId: GroupId) => {
    if (groupId === 'basics_profile') {
      return <OnboardingBasicsSection form={form} errors={validationErrors} readOnly={false} onChange={updateForm} />;
    }
    if (groupId === 'location_media') {
      return (
        <OnboardingLocationSection
          form={form}
          errors={validationErrors}
          readOnly={false}
          onChange={updateForm}
          locationLatitude={state.locationLatitude}
          locationLongitude={state.locationLongitude}
          onLocationChange={controller.updateLocation}
        />
      );
    }
    if (groupId === 'evidence') {
      return (
        <OnboardingEvidenceSection
          items={evidenceItems}
          loadingMap={evidenceLoading}
          errorMap={evidenceErrors}
          onPick={(item, source) => void handlePickEvidence(item, source)}
        />
      );
    }
    if (groupId === 'catalog_setup') {
      return (
        <View style={{ gap: spacing[3] }}>
          <Text role="bodyStrong" style={{ textAlign: 'right' }}>الإعداد السريع لكتالوج الشريك</Text>
          <Text role="bodySm" tone="secondary" style={{ textAlign: 'right' }}>
            اختر عدة منتجات من الكتالوج المركزي، أدخل أسعارها، ثم احفظها دفعة واحدة. المنتجات غير الموجودة تُرسل كاقتراحات للمراجعة ولا تنشئ كتالوجًا محليًا.
          </Text>
          {onOpenProducts ? (
            <Button label="فتح الإعداد السريع للمنتجات" tone="primary" onPress={() => void openCatalogSetup()} />
          ) : (
            <StateView tone="warning" title="مسار المنتجات غير متاح" description="تعذر ربط شاشة المنتجات بهذه الرحلة." />
          )}
        </View>
      );
    }
    return (
      <OnboardingAgreementSection
        form={form}
        readOnly={false}
        onChange={updateForm}
        missingItems={missingItems}
        fieldNotes={state.visitNotes}
        onFieldNotesChange={updateVisitNotes}
      />
    );
  };

  const nextGroup = GROUP_ORDER[activeGroupIndex + 1];
  const nextLabel = nextGroup ? GROUP_LABELS[nextGroup] : '';

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header
        title={form.legalNameAr || 'ملف انضمام جديد'}
        actions={(
          <IconButton
            icon={<Icon name="save-outline" size={20} tone="brand" />}
            accessibilityLabel="حفظ المسودة"
            onPress={() => void controller.save()}
            tone="ghost"
            loading={state.isSaving}
          />
        )}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'flex-end', paddingHorizontal: spacing[3], gap: spacing[1] }}>
          <Text role="titleSm" style={{ textAlign: 'right', fontWeight: 'bold' }}>{form.legalNameAr || 'ملف انضمام جديد'}</Text>
          <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
            ملف موحد لجمع بيانات الشريك وموقعه وأدلته ومنتجاته خلال الزيارة نفسها.
          </Text>
          {state.lastSavedAt ? <Text role="caption" tone="success">آخر حفظ مؤكد: {formatSavedAtTime(state.lastSavedAt)}</Text> : null}
        </View>

        {feeRefState.kind === 'success' ? (
          <View style={{ padding: spacing[3], borderRadius: radius.md, borderWidth: borders.hairline, borderColor: colorRoles.borderSubtle, gap: spacing[1] }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>مرجع رسوم انضمام المتجر</Text>
            <Text role="bodySm" tone="secondary" style={{ textAlign: 'right' }}>
              {feeRefState.data.amount} {feeRefState.data.currency} — {CHARGE_TIMING_REFERENCE_LABELS[feeRefState.data.chargeTiming] ?? feeRefState.data.chargeTiming}
            </Text>
          </View>
        ) : null}

        {state.isSaving ? (
          <StateView tone="info" title="جارٍ حفظ المسودة" description="لا تغادر حتى تكتمل قراءة الحالة بعد الكتابة." />
        ) : state.isSubmitting ? (
          <StateView tone="info" title="جارٍ إرسال الملف للمراجعة" description="يتم تثبيت المسودة والأدلة ثم التحقق من الحالة." />
        ) : null}

        <View style={{ gap: spacing[2] }}>
          {GROUP_ORDER.map((groupId, index) => {
            const active = groupId === activeGroup;
            const completed = index < activeGroupIndex && groupMissingCounts[groupId] === 0;
            const missingCount = groupMissingCounts[groupId];
            return (
              <Pressable
                key={groupId}
                accessibilityRole="button"
                accessibilityLabel={`${GROUP_LABELS[groupId]}${missingCount > 0 ? `، ${missingCount} عناصر ناقصة` : ''}`}
                onPress={() => setActiveGroup(groupId)}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  padding: spacing[3],
                  borderRadius: radius.md,
                  borderWidth: active ? 2 : borders.hairline,
                  borderColor: active ? colorRoles.brandAction : colorRoles.borderSubtle,
                  backgroundColor: active ? colorRoles.brandActionSoft : colorRoles.surfaceBase,
                  gap: spacing[2],
                }}
              >
                <Icon name={completed ? 'checkmark-circle' : active ? 'radio-button-on' : 'radio-button-off'} size={20} tone={completed ? 'success' : active ? 'brand' : 'muted'} />
                <Text role="bodyStrong" style={{ flex: 1, textAlign: 'right' }}>{GROUP_LABELS[groupId]}</Text>
                {missingCount > 0 ? <Badge label={String(missingCount)} tone="warning" /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={{ padding: spacing[3], borderRadius: radius.md, borderWidth: borders.hairline, borderColor: colorRoles.borderSubtle }}>
          {renderGroupContent(activeGroup)}
        </View>

        {visibleFailure ? (
          <StateView
            tone={visibleFailure.tone}
            title={visibleFailure.title}
            description={visibleFailure.description}
            {...(canRecoverVisibleFailure ? { actionLabel: visibleFailure.actionLabel, onActionPress: recoverVisibleFailure } : {})}
          />
        ) : isLastGroup && !isReadyToSubmit ? (
          <StateView
            tone="warning"
            title="متطلبات التأهيل غير مكتملة"
            description={`العناصر الناقصة: ${missingItems.join('، ')}`}
            actionLabel="فتح أول قسم ناقص"
            onActionPress={() => setActiveGroup(firstIncompleteGroup)}
          />
        ) : null}

        <View style={{ flexDirection: 'row-reverse', gap: spacing[2], alignItems: 'center' }}>
          <Button
            label={isLastGroup ? (state.isSubmitting ? 'جارٍ الإرسال…' : 'إرسال للمراجعة') : `التالي: ${nextLabel}`}
            tone="primary"
            onPress={() => void goToNext()}
            disabled={state.isSaving || state.isSubmitting || (isLastGroup && !isReadyToSubmit)}
            fullWidth
          />
          {activeGroupIndex > 0 ? (
            <Button
              label="السابق"
              tone="ghost"
              onPress={() => setActiveGroup(GROUP_ORDER[activeGroupIndex - 1] as GroupId)}
              disabled={state.isSaving || state.isSubmitting}
              fullWidth={false}
            />
          ) : null}
        </View>

        {Platform.OS === 'web' ? <View style={{ height: insets.bottom }} /> : null}
      </ScrollView>
    </View>
  );
}
