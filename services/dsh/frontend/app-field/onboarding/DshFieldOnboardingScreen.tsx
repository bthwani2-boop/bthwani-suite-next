// app-field — DshFieldOnboardingScreen
// Unified partner intake: identity, location, governed evidence, fast catalog
// setup, and operational review. All hooks stay above early returns.

import React from 'react';
import { Platform, Pressable, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  TextField,
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
import {
  getDshDocumentPickerAdapter,
  getDshImagePickerAdapter,
} from '../../shared/mobile-capabilities';
import {
  addFieldOnboardingMessage,
  clearOnboardingCollaborationMessageAttempt,
  getFieldOnboardingCollaboration,
  getOrCreateOnboardingCollaborationMessageAttempt,
  markFieldOnboardingRead,
  type OnboardingCollaborationView,
} from '../../shared/field-assignment';
import { formatWltMoney } from '@bthwani/dsh/wlt';
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
  readonly assignmentPrefill?: { readonly id: string; readonly storeNameHint: string; readonly phoneHint?: string; readonly addressHint?: string; readonly locationLatitude?: number; readonly locationLongitude?: number };
  readonly onBack?: () => void;
  readonly onOpenProducts?: (partnerId: string) => void;
};

export function DshFieldOnboardingScreen({
  controller: controllerProp,
  partnerId,
  assignmentPrefill,
  onBack,
  onOpenProducts,
}: DshFieldOnboardingScreenProps = {}) {
  const identity = useIdentitySession();
  const ownController = useFieldPartnerOnboardingController();
  const controller = controllerProp ?? ownController;
  const insets = useSafeAreaInsets();
  const { state, validationErrors, updateForm, updateVisitNotes, updateLocation, submitDraft, switchDraft, businessVerticals, businessVerticalsError } = controller;
  const { state: feeRefState } = useStoreOnboardingFeeReferenceController(identity.state.kind);

  const [activeGroup, setActiveGroup] = React.useState<GroupId>('basics_profile');
  const [evidenceLoading, setEvidenceLoading] = React.useState<Record<string, boolean>>({});
  const [evidenceErrors, setEvidenceErrors] = React.useState<Record<string, string | undefined>>({});
  const [evidencePreviewUris, setEvidencePreviewUris] = React.useState<Record<string, string | undefined>>({});
  const [collaboration, setCollaboration] = React.useState<OnboardingCollaborationView | null>(null);
  const [collaborationBody, setCollaborationBody] = React.useState('');
  const [collaborationLoading, setCollaborationLoading] = React.useState(false);
  const [collaborationSubmitting, setCollaborationSubmitting] = React.useState(false);
  const [collaborationError, setCollaborationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void switchDraft(partnerId).then(() => {
      if (partnerId || !assignmentPrefill) return;
      updateForm({
        legalNameAr: assignmentPrefill.storeNameHint,
        displayName: assignmentPrefill.storeNameHint,
        primaryPhone: assignmentPrefill.phoneHint ?? '',
        addressLine: assignmentPrefill.addressHint ?? '',
        notes: `مرجع إسناد DSH: ${assignmentPrefill.id}`,
      });
      if (assignmentPrefill.locationLatitude !== undefined && assignmentPrefill.locationLongitude !== undefined) {
        updateLocation(assignmentPrefill.locationLatitude, assignmentPrefill.locationLongitude);
      }
    });
  }, [assignmentPrefill, partnerId, switchDraft, updateForm, updateLocation]);

  const reloadCollaboration = React.useCallback(async () => {
    if (!partnerId || !assignmentPrefill?.id) {
      setCollaboration(null);
      return;
    }
    setCollaborationLoading(true);
    setCollaborationError(null);
    try {
      const next = await getFieldOnboardingCollaboration(partnerId, assignmentPrefill.id);
      setCollaboration(next);
      if (next.unreadCount > 0) await markFieldOnboardingRead(partnerId, next.thread.id, next.messages[next.messages.length - 1]?.sequenceNumber ?? 0);
    } catch (cause) {
      setCollaborationError(cause instanceof Error ? cause.message : 'تعذر تحميل سجل المتابعة');
    } finally {
      setCollaborationLoading(false);
    }
  }, [assignmentPrefill?.id, partnerId]);

  React.useEffect(() => { void reloadCollaboration(); }, [reloadCollaboration]);

  const sendCollaborationMessage = React.useCallback(async () => {
    if (!partnerId || !assignmentPrefill?.id || !collaborationBody.trim()) return;
    const actorId = identity.state.kind === 'authenticated' ? identity.state.identity.subject : null;
    if (!actorId) {
      setCollaborationError('انتهت جلسة الهوية. سجّل الدخول ثم أعد المحاولة.');
      return;
    }
    setCollaborationSubmitting(true);
    setCollaborationError(null);
    try {
      const attemptIntent = {
        surface: 'app-field' as const,
        actorId,
        partnerId,
        assignmentId: assignmentPrefill.id,
        body: collaborationBody,
      };
      const attempt = await getOrCreateOnboardingCollaborationMessageAttempt(attemptIntent);
      const message = await addFieldOnboardingMessage(partnerId, {
        body: collaborationBody.trim(),
        clientMessageId: attempt.clientMessageId,
      }, assignmentPrefill.id);
      if (message.clientMessageId !== attempt.clientMessageId || message.body !== collaborationBody.trim()) {
        throw new Error('لم تحفظ القراءة المرجعية هوية رسالة المتابعة ومحتواها كما أُرسلا.');
      }
      await clearOnboardingCollaborationMessageAttempt(attemptIntent, attempt.signature);
      setCollaborationBody('');
      await reloadCollaboration();
    } catch (cause) {
      setCollaborationError(cause instanceof Error ? cause.message : 'تعذر إرسال الرد');
    } finally {
      setCollaborationSubmitting(false);
    }
  }, [assignmentPrefill?.id, collaborationBody, identity.state, partnerId, reloadCollaboration]);

  const pickEvidenceFile = React.useCallback(async (
    source: EvidencePickSource,
    fallbackName: string,
  ): Promise<PickedEvidenceFile | null> => {
    if (source === 'document') {
      const result = await getDshDocumentPickerAdapter().getDocument({
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
      const picker = getDshImagePickerAdapter();
      const permission = await picker.requestCameraPermissions();
      if (!permission.granted) throw new Error('CAMERA_PERMISSION_DENIED');
      const result = await picker.launchCamera({ quality: 0.8, mediaTypes: ['images'] });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return null;
      return {
        uri: asset.uri,
        name: asset.fileName ?? `${fallbackName}-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      };
    }

    const picker = getDshImagePickerAdapter();
    const permission = await picker.requestMediaLibraryPermissions();
    if (!permission.granted) throw new Error('LIBRARY_PERMISSION_DENIED');
    const result = await picker.launchImageLibrary({ quality: 0.8, mediaTypes: ['images'] });
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
        const created = await controller.ensureDraftCreated(assignmentPrefill?.id);
        if (!created) {
          setActiveGroup('basics_profile');
          return;
        }
        ownerPartnerId = created;
      }

      const mediaRef = await uploadFieldMedia(ownerPartnerId, picked, {
        kind: item.kind === 'document' ? 'legal_document' : 'visit_evidence',
      });
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
    const durablePartnerId = state.partnerId ?? await controller.ensureDraftCreated(assignmentPrefill?.id);
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
        void controller.ensureDraftCreated(assignmentPrefill?.id);
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
    const created = await controller.ensureDraftCreated(assignmentPrefill?.id);
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
      return <OnboardingBasicsSection form={form} errors={validationErrors} readOnly={false} onChange={updateForm} businessVerticals={businessVerticals} businessVerticalsError={businessVerticalsError} />;
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
              {formatWltMoney(feeRefState.data.amountMinorUnits, feeRefState.data.currency)} — {CHARGE_TIMING_REFERENCE_LABELS[feeRefState.data.chargeTiming] ?? feeRefState.data.chargeTiming}
            </Text>
          </View>
        ) : null}

        {assignmentPrefill?.id && partnerId ? (
          <View style={{ padding: spacing[3], borderRadius: radius.md, borderWidth: borders.hairline, borderColor: colorRoles.borderSubtle, backgroundColor: colorRoles.surfaceBase, gap: spacing[2] }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>متابعة مرتبطة بالمسودة</Text>
            <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>تظهر هنا ملاحظات فريق المراجعة لهذه المهمة فقط، وتبقى مرتبطة بالمسودة ولا تتحول إلى محادثة عامة.</Text>
            {collaborationLoading ? <Text role="caption" tone="muted">جارٍ تحميل الملاحظات…</Text> : null}
            {collaboration?.messages.map((message) => (
              <View key={message.id} style={{ padding: spacing[2], borderRadius: radius.sm, backgroundColor: message.senderSurface === 'control-panel' ? colorRoles.brandActionSoft : colorRoles.surfaceBase, gap: spacing[1] }}>
                <Text role="bodySm" style={{ textAlign: 'right' }}>{message.body}</Text>
                <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>{message.senderSurface === 'control-panel' ? 'فريق المراجعة' : 'أنت'} · {new Date(message.createdAt).toLocaleString('ar-YE')}</Text>
              </View>
            ))}
            {collaboration && collaboration.messages.length === 0 ? <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>لا توجد ملاحظات بعد.</Text> : null}
            <TextField label="رد على فريق المراجعة" value={collaborationBody} onChangeText={setCollaborationBody} placeholder="اكتب ردًا مرتبطًا بهذه المسودة" multiline />
            <Button label={collaborationSubmitting ? 'جارٍ الإرسال…' : 'إرسال الرد'} tone="primary" onPress={() => void sendCollaborationMessage()} disabled={collaborationSubmitting || collaborationBody.trim().length === 0} />
            {collaborationError ? <Text role="caption" tone="danger" style={{ textAlign: 'right' }}>{collaborationError}</Text> : null}
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
