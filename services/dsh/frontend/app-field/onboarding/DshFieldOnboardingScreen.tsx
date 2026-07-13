// app-field — DshFieldOnboardingScreen
// 4-group wizard with vertical timeline, missing-count badges, escalation footer.
// Rules of Hooks: ALL hooks called unconditionally before any early return.

import React from 'react';
import { Platform, Pressable, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  Badge,
  Button,
  Text,
  Header,
  IconButton,
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
  getBankAccountMissingCount,
  getAgreementReviewMissingCount,
  getFieldRequiredMissingItems,
  FIELD_ONBOARDING_STEPS,
  FIELD_ONBOARDING_STEP_LABELS,
  type FieldPartnerDraftStep,
  type FieldOnboardingController,
} from '../../shared/field-onboarding';
import { REQUIRED_DOCUMENT_TYPES, type DshPartnerDocumentType } from '../../shared/partner';
import { uploadFieldMedia } from '../../shared/media';
import { useStoreOnboardingFeeReferenceController } from '../../shared/platform-policies';
import { OnboardingBasicsSection } from '../components/OnboardingBasicsSection';
import { OnboardingLocationSection } from '../components/OnboardingLocationSection';
import { OnboardingEvidenceSection } from '../components/OnboardingEvidenceSection';
import { OnboardingBankAccountSection } from '../components/OnboardingBankAccountSection';
import { OnboardingAgreementSection } from '../components/OnboardingAgreementSection';
import type { EvidenceItem } from '../components/OnboardingEvidenceSection';

type DocumentKind = 'commercial_registration' | 'identity_proof';
type BranchPhotoKey = 'storefrontPhotoRef' | 'interiorPhotoRef' | 'signagePhotoRef';

const DOCUMENT_KIND_TO_PARTNER_TYPE: Record<DocumentKind, DshPartnerDocumentType> = {
  commercial_registration: 'commercial_register',
  identity_proof: 'national_id',
};

type GroupId = FieldPartnerDraftStep;

const GROUP_ORDER: readonly GroupId[] = FIELD_ONBOARDING_STEPS;

const GROUP_LABELS: Record<GroupId, string> = FIELD_ONBOARDING_STEP_LABELS;

const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  commercial_registration: 'السجل التجاري',
  identity_proof: 'الهوية الوطنية للمالك',
};

const PHOTO_LABELS: Record<BranchPhotoKey, string> = {
  storefrontPhotoRef: 'صورة الواجهة الخارجية للمحل',
  interiorPhotoRef: 'صورة المتجر من الداخل والرفوف',
  signagePhotoRef: 'صورة اللوحة التجارية المطابقة للترخيص',
};

function formatSavedAtTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const CHARGE_TIMING_REFERENCE_LABELS: Record<string, string> = {
  on_approval: 'عند الاعتماد',
  on_publication: 'عند النشر',
  on_first_order: 'عند أول طلب',
  manual: 'يدويًا',
};

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

  React.useEffect(() => {
    void switchDraft(partnerId);
  }, [partnerId, switchDraft]);

  // Evidence (documents + branch photos) uses the same already-working
  // expo-image-picker module (camera + gallery) instead of expo-document-picker,
  // which isn't linked in the currently installed native build.
  const pickImage = React.useCallback(async (source: 'camera' | 'library', fallbackName: string) => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return null;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return null;
      const asset = result.assets[0];
      return { uri: asset.uri, name: asset.fileName ?? `${fallbackName}-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' };
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.fileName ?? `${fallbackName}-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' };
  }, []);

  const handlePickEvidence = React.useCallback(async (item: EvidenceItem, source: 'camera' | 'library') => {
    setEvidenceLoading((s) => ({ ...s, [item.key]: true }));
    try {
      const picked = await pickImage(source, item.key);
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
        await controller.uploadDocument(DOCUMENT_KIND_TO_PARTNER_TYPE[item.key as DocumentKind], mediaRef);
      } else {
        updateForm({ [item.key]: mediaRef });
        controller.addEvidenceRef(mediaRef);
      }
    } finally {
      setEvidenceLoading((s) => ({ ...s, [item.key]: false }));
    }
  }, [state.partnerId, controller, updateForm, pickImage]);

  // Derived values (safe — no hooks below this line)
  const form = state.form;
  const activeGroupIndex = GROUP_ORDER.indexOf(activeGroup);
  const isLastGroup = activeGroupIndex === GROUP_ORDER.length - 1;
  const evidenceItems: readonly EvidenceItem[] = [
    ...REQUIRED_DOCUMENT_TYPES.map((partnerType): EvidenceItem => {
      const kind = (Object.keys(DOCUMENT_KIND_TO_PARTNER_TYPE) as DocumentKind[]).find(
        (k) => DOCUMENT_KIND_TO_PARTNER_TYPE[k] === partnerType
      ) as DocumentKind;
      return {
        key: kind,
        kind: 'document',
        label: DOCUMENT_LABELS[kind],
        status: state.uploadedDocumentTypes.includes(partnerType) ? 'uploaded' : 'missing',
      };
    }),
    ...(Object.keys(PHOTO_LABELS) as BranchPhotoKey[]).map((key): EvidenceItem => ({
      key,
      kind: 'photo',
      label: PHOTO_LABELS[key],
      status: form[key]?.trim() ? 'uploaded' : 'missing',
      ...(form[key] ? { previewUri: form[key] } : {}),
    })),
  ];
  const missingItems = getFieldRequiredMissingItems(form, state.uploadedDocumentTypes);
  const isReadyToSubmit = missingItems.length === 0;

  const groupMissingCounts: Record<GroupId, number> = {
    basics_profile: getBasicsProfileMissingCount(form),
    location_media: getLocationMediaMissingCount(form),
    evidence: getDocumentsMissingCount(state.uploadedDocumentTypes, form),
    bank_account: getBankAccountMissingCount(form),
    agreement_review: getAgreementReviewMissingCount(form, state.uploadedDocumentTypes),
  };

  // ── Session restoring (after all hooks) ───────────────────────────────────
  if (identity.state.kind === 'restoring' || identity.state.kind === 'unconfigured') {
    return <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }} />;
  }

  // ── Auth guard (after all hooks) ─────────────────────────────────────────
  if (identity.state.kind !== 'authenticated') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}
        contentContainerStyle={{ padding: spacing[4], justifyContent: 'center' }}
      >
        <DshFieldActivationCard
          loading={identity.state.kind === 'authenticating'}
          {...(identity.state.kind === 'error' ? { error: identity.state.message } : {})}
          onSubmit={(phone, code) => void identity.activate(phone, code)}
        />
      </ScrollView>
    );
  }

  // ── Draft hydration state (after all hooks) ───────────────────────────────
  if (state.loadStatus === 'hydrating') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="جارٍ التحميل" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text role="bodyMd" tone="secondary">جارٍ تحميل بيانات ملف الشريك…</Text>
        </View>
      </View>
    );
  }

  if (state.loadStatus === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="تعذر التحميل" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: spacing[3] }}>
          <Text role="bodyMd" tone="danger" style={{ textAlign: 'center' }}>
            {state.loadError ?? 'تعذر تحميل بيانات ملف الشريك'}
          </Text>
          {partnerId && (
            <Button label="إعادة المحاولة" tone="primary" onPress={() => void controller.loadDraft(partnerId)} />
          )}
        </View>
      </View>
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
          <View style={{ marginTop: 24, gap: spacing[2], width: '100%', paddingHorizontal: 24 }}>
            {onOpenProducts && state.partnerId && (
              <Button
                label="إضافة منتجات تجريبية للمتجر"
                tone="secondary"
                onPress={() => onOpenProducts(state.partnerId!)}
              />
            )}
            <Button label="تسجيل شريك جديد" tone="primary" onPress={controller.reset} />
          </View>
        </View>
      </View>
    );
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  const goToNext = async () => {
    const created = await controller.ensureDraftCreated();
    if (!created) {
      // Free navigation via the timeline can land here without ever having
      // visited basics_profile — jump back so the real blocking errors
      // (identity/owner validation) are actually visible instead of silently
      // no-op'ing on whatever group the user happens to be viewing.
      setActiveGroup('basics_profile');
      return;
    }
    if (isLastGroup) {
      if (isReadyToSubmit) void submitDraft();
      return;
    }
    setActiveGroup(GROUP_ORDER[activeGroupIndex + 1] as GroupId);
  };

  // ── Step content renderer ─────────────────────────────────────────────────
  const renderGroupContent = (groupId: GroupId) => {
    if (groupId === 'basics_profile') {
      return (
        <OnboardingBasicsSection
          form={form}
          errors={validationErrors}
          readOnly={false}
          onChange={updateForm}
        />
      );
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
          onPick={(item, source) => void handlePickEvidence(item, source)}
        />
      );
    }
    if (groupId === 'bank_account') {
      return (
        <OnboardingBankAccountSection
          form={form}
          readOnly={false}
          onChange={updateForm}
        />
      );
    }
    if (groupId === 'agreement_review') {
      return (
        <View style={{ gap: spacing[3] }}>
          <OnboardingAgreementSection
            form={form}
            readOnly={false}
            onChange={updateForm}
            missingItems={missingItems}
            fieldNotes={state.visitNotes}
            onFieldNotesChange={updateVisitNotes}
          />
        </View>
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
            onPress={() => void controller.save()}
            tone="ghost"
            loading={state.isSaving}
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
          {state.lastSavedAt && !state.submitError && (
            <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
              {`آخر حفظ: ${formatSavedAtTime(state.lastSavedAt)}`}
            </Text>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        {/* ── Products section ── */}
        {onOpenProducts && (
          <View
            style={{
              borderWidth: borders.hairline,
              borderColor: colorRoles.borderSubtle,
              borderRadius: radius.md,
              padding: spacing[4],
              gap: spacing[2],
            }}
          >
            <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold' }}>
              قسم المنتجات
            </Text>
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
              أضف منتجات تجريبية لمتجر الشريك قبل إرسال الملف أو بعده.
            </Text>
            <Button
              label="إضافة/إدارة منتجات المتجر"
              tone="secondary"
              onPress={async () => {
                let id = state.partnerId;
                if (!id) {
                  const created = await controller.ensureDraftCreated(true);
                  if (created) id = created;
                }
                if (id) {
                  onOpenProducts(id);
                } else {
                  setActiveGroup('basics_profile');
                }
              }}
            />
          </View>
        )}

        {/* ── Store onboarding fee reference (read-only, control-panel owns the policy) ── */}
        {feeRefState.kind === 'success' && feeRefState.data.enabled && (
          <View
            style={{
              borderWidth: borders.hairline,
              borderColor: colorRoles.borderSubtle,
              borderRadius: radius.md,
              padding: spacing[4],
              gap: spacing[1],
            }}
          >
            <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold' }}>
              رسوم انضمام المتجر (مرجع)
            </Text>
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
              {`${feeRefState.data.amount} ${feeRefState.data.currency} — تُحصَّل ${
                CHARGE_TIMING_REFERENCE_LABELS[feeRefState.data.chargeTiming] ?? feeRefState.data.chargeTiming
              } من الشريك. هذا مرجع اطّلاع فقط ولا ينشئ أي حركة مالية الآن.`}
            </Text>
          </View>
        )}

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

      {state.submitError && (
        <View
          style={{
            paddingHorizontal: spacing[4],
            paddingTop: spacing[2],
            backgroundColor: colorRoles.surfaceBase,
          }}
        >
          <Text role="bodySm" tone="danger" style={{ textAlign: 'right' }}>
            {state.submitError}
          </Text>
        </View>
      )}

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
        {/* التالي / إرسال */}
        <Button
          label={isLastGroup ? (state.isSubmitting ? 'جارٍ الإرسال...' : 'إرسال للمراجعة') : `التالي: ${nextLabel}`}
          tone={isReadyToSubmit && isLastGroup ? 'success' : 'primary'}
          disabled={isLastGroup ? !isReadyToSubmit || state.isSubmitting : false}
          loading={isLastGroup && state.isSubmitting}
          onPress={() => void goToNext()}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
