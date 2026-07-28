"use client";

import React from "react";
import { CpButton, CpMutedInline, CpStatePanel, CpStateView, CpTextInput } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import { fetchPartners } from "../../shared/partner/partner.api";
import {
  getProviderOperationalCore,
  listCaptains,
  listEmployees,
  listFieldAgents,
  patchProviderOperationalCore,
} from "../../shared/workforce";
import type {
  CaptainActivationCore,
  ContractReviewStatus,
  IdentityVerificationStatus,
  OperationalCoreResponse,
  ProviderKind,
  ProviderOnboardingStage,
  ReferralSourceType,
} from "../../shared/workforce";
import { uploadProviderMedia } from "../../shared/media/field-document-media";

const REFERRAL_OPTIONS: Array<{ value: ReferralSourceType; label: string }> = [
  { value: "employee", label: "موظف" },
  { value: "captain", label: "كابتن" },
  { value: "field", label: "ميداني" },
  { value: "partner", label: "شريك" },
  { value: "advertisement", label: "إعلان" },
  { value: "social_media", label: "وسائل التواصل" },
  { value: "public_referral", label: "إحالة عامة" },
  { value: "direct", label: "تقديم مباشر" },
  { value: "other", label: "أخرى" },
];

const selectStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--bthwani-control-panel-border)",
  background: "var(--bthwani-control-panel-surface)",
  color: "var(--bthwani-control-panel-text)",
};

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 12 }}>
      <Text role="titleSm">{title}</Text>
      {children}
    </div>
  );
}

function MediaUploadField({
  value,
  onChange,
  placeholder,
  actorId,
  kind,
  accept = "image/*",
  onUploadError,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly actorId: string;
  readonly kind: IndependentProviderKind;
  readonly accept?: string;
  readonly onUploadError: (msg: string) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const pickFile = () => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      const objectUrl = URL.createObjectURL(file);
      try {
        const mediaRef = await uploadProviderMedia(actorId, kind, {
          uri: objectUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        onChange(mediaRef);
      } catch {
        onUploadError("تعذر رفع الملف — حاول مجدداً");
      } finally {
        URL.revokeObjectURL(objectUrl);
        setBusy(false);
      }
    };
    input.click();
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <CpTextInput value={value} onChange={onChange} placeholder={placeholder} aria-label={placeholder} />
      </div>
      <CpButton variant="secondary" disabled={busy} onClick={() => void pickFile()}>
        {busy ? "جارٍ الرفع…" : "رفع وثيقة"}
      </CpButton>
    </div>
  );
}

type IndependentProviderKind = Extract<ProviderKind, "field" | "captain">;

type FormState = {
  referralSourceType: ReferralSourceType;
  referralSourceActorId: string;
  referralPartnerId: string;
  referralChannel: string;
  referralNote: string;
  guarantorFullName: string;
  guarantorRelationship: string;
  guarantorPhoneE164: string;
  guarantorPhoneVerified: boolean;
  nationalIdNumber: string;
  identityFrontMediaRef: string;
  identityBackMediaRef: string;
  identityStatus: IdentityVerificationStatus;
  contractMediaRef: string;
  contractStatus: ContractReviewStatus;
  onboardingStage: ProviderOnboardingStage;
  guaranteeAmount: string;
  guaranteeStatus: CaptainActivationCore["financialGuaranteeStatus"];
  guaranteeReference: string;
  bagStatus: CaptainActivationCore["deliveryBagCustodyStatus"];
  bagReference: string;
  purchasesStatus: CaptainActivationCore["mandatoryPurchasesStatus"];
  purchasesReference: string;
  trainingStatus: CaptainActivationCore["trainingStatus"];
  accreditationStatus: CaptainActivationCore["operationsAccreditationStatus"];
};

type ReferralPersonOption = {
  readonly actorId: string;
  readonly label: string;
};

type ReferralPartnerOption = {
  readonly partnerId: string;
  readonly label: string;
};

const EMPTY_FORM: FormState = {
  referralSourceType: "direct",
  referralSourceActorId: "",
  referralPartnerId: "",
  referralChannel: "",
  referralNote: "",
  guarantorFullName: "",
  guarantorRelationship: "",
  guarantorPhoneE164: "",
  guarantorPhoneVerified: false,
  nationalIdNumber: "",
  identityFrontMediaRef: "",
  identityBackMediaRef: "",
  identityStatus: "pending",
  contractMediaRef: "",
  contractStatus: "pending",
  onboardingStage: "basic_profile",
  guaranteeAmount: "0",
  guaranteeStatus: "not_funded",
  guaranteeReference: "",
  bagStatus: "not_issued",
  bagReference: "",
  purchasesStatus: "not_required",
  purchasesReference: "",
  trainingStatus: "pending",
  accreditationStatus: "pending",
};

function activationEvidenceError(form: FormState, kind: IndependentProviderKind): string | null {
  const activationStage = form.onboardingStage === "activation_ready" || form.onboardingStage === "active";
  if (activationStage) {
    if (!form.guarantorPhoneVerified) return "يجب توثيق التحقق من هاتف الضمين قبل الجاهزية للتفعيل.";
    if (["employee", "captain", "field"].includes(form.referralSourceType) && form.referralSourceActorId.trim() === "") {
      return "مصدر الترشيح المحدد يحتاج اختيار الشخص من السجل الفعلي.";
    }
    if (form.referralSourceType === "partner" && form.referralPartnerId.trim() === "") {
      return "ترشيح الشريك يحتاج اختيار الشريك من السجل الفعلي.";
    }
    if (["advertisement", "social_media"].includes(form.referralSourceType) && form.referralChannel.trim() === "") {
      return "مصدر الإعلان أو وسائل التواصل يحتاج قناة أو مرجع حملة.";
    }
    if (form.referralSourceType === "other" && form.referralNote.trim() === "") {
      return "مصدر الترشيح الآخر يحتاج ملاحظة توضيحية.";
    }
  }
  if (kind === "captain") {
    const guaranteeAmount = Number(form.guaranteeAmount);
    if (!Number.isSafeInteger(guaranteeAmount) || guaranteeAmount < 0) {
      return "قيمة الضمانة المالية يجب أن تكون عددًا صحيحًا بوحدات العملة الصغرى.";
    }
    if (form.guaranteeStatus === "funded" && (guaranteeAmount <= 0 || form.guaranteeReference.trim() === "")) {
      return "الضمانة الممولة تحتاج مبلغًا موجبًا ومرجع قراءة أو قيد من WLT.";
    }
    if (form.bagStatus === "issued" && form.bagReference.trim() === "") {
      return "تسليم حقيبة التوصيل كعهدة يحتاج مرجع محضر العهدة.";
    }
    if (form.purchasesStatus === "paid_and_delivered" && form.purchasesReference.trim() === "") {
      return "المشتريات المدفوعة والمسلمة تحتاج مرجع فاتورة أو تسليم.";
    }
  }
  return null;
}

export function ProviderOperationalCorePanel({ actorId, kind }: { readonly actorId: string; readonly kind: IndependentProviderKind }) {
  const [data, setData] = React.useState<OperationalCoreResponse | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [referralPeople, setReferralPeople] = React.useState<readonly ReferralPersonOption[]>([]);
  const [referralPartners, setReferralPartners] = React.useState<readonly ReferralPartnerOption[]>([]);
  const [referralLoading, setReferralLoading] = React.useState(false);
  const [referralError, setReferralError] = React.useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const apply = React.useCallback((result: OperationalCoreResponse) => {
    const core = result.operationalCore;
    const captain = core.captain;
    setData(result);
    setForm({
      referralSourceType: core.referralSourceType,
      referralSourceActorId: core.referralSourceActorId ?? "",
      referralPartnerId: core.referralPartnerId ?? "",
      referralChannel: core.referralChannel ?? "",
      referralNote: core.referralNote ?? "",
      guarantorFullName: core.guarantorFullName ?? "",
      guarantorRelationship: core.guarantorRelationship ?? "",
      guarantorPhoneE164: core.guarantorPhoneE164 ?? "",
      guarantorPhoneVerified: Boolean(core.guarantorPhoneVerifiedAt),
      nationalIdNumber: core.nationalIdNumber ?? "",
      identityFrontMediaRef: core.identityFrontMediaRef ?? "",
      identityBackMediaRef: core.identityBackMediaRef ?? "",
      identityStatus: core.identityVerificationStatus,
      contractMediaRef: core.contractMediaRef ?? "",
      contractStatus: core.contractReviewStatus,
      onboardingStage: core.onboardingStage,
      guaranteeAmount: String(captain?.financialGuaranteeMinorUnits ?? 0),
      guaranteeStatus: captain?.financialGuaranteeStatus ?? "not_funded",
      guaranteeReference: captain?.financialGuaranteeReference ?? "",
      bagStatus: captain?.deliveryBagCustodyStatus ?? "not_issued",
      bagReference: captain?.deliveryBagCustodyReference ?? "",
      purchasesStatus: captain?.mandatoryPurchasesStatus ?? "not_required",
      purchasesReference: captain?.mandatoryPurchasesReference ?? "",
      trainingStatus: captain?.trainingStatus ?? "pending",
      accreditationStatus: captain?.operationsAccreditationStatus ?? "pending",
    });
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      apply(await getProviderOperationalCore(kind, actorId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل نواة الملف التشغيلي");
    } finally {
      setLoading(false);
    }
  }, [actorId, apply, kind]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    const sourceType = form.referralSourceType;
    if (!["employee", "captain", "field", "partner"].includes(sourceType)) {
      setReferralPeople([]);
      setReferralPartners([]);
      setReferralError(null);
      return;
    }
    let cancelled = false;
    setReferralLoading(true);
    setReferralError(null);
    const loadOptions = async () => {
      if (sourceType === "partner") {
        const result = await fetchPartners({ limit: 100 });
        if (!cancelled) {
          setReferralPartners(result.partners.map((partner) => ({
            partnerId: partner.id,
            label: `${partner.displayName || partner.legalNameAr} · ${partner.category || "بلا فئة"}`,
          })));
          setReferralPeople([]);
        }
        return;
      }
      const people = sourceType === "employee"
        ? await listEmployees({ status: "active", limit: 100 })
        : sourceType === "captain"
          ? await listCaptains({ status: "active", limit: 100 })
          : await listFieldAgents({ status: "active", limit: 100 });
      if (!cancelled) {
        setReferralPeople(people.map((person) => ({
          actorId: person.actorId,
          label: `${person.fullNameAr} · ${person.workforceCode}`,
        })));
        setReferralPartners([]);
      }
    };
    void loadOptions()
      .catch((cause) => {
        if (!cancelled) setReferralError(cause instanceof Error ? cause.message : "تعذر تحميل سجل المرشحين");
      })
      .finally(() => {
        if (!cancelled) setReferralLoading(false);
      });
    return () => { cancelled = true; };
  }, [form.referralSourceType]);

  const changeReferralSource = (value: ReferralSourceType) => {
    setForm((current) => ({
      ...current,
      referralSourceType: value,
      referralSourceActorId: ["employee", "captain", "field"].includes(value) ? current.referralSourceActorId : "",
      referralPartnerId: value === "partner" ? current.referralPartnerId : "",
    }));
  };

  const save = async () => {
    const validationError = activationEvidenceError(form, kind);
    if (validationError) {
      setError(validationError);
      return;
    }
    const normalizedGuarantee = Number(form.guaranteeAmount);
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await patchProviderOperationalCore(kind, actorId, {
        referralSourceType: form.referralSourceType,
        referralSourceActorId: form.referralSourceActorId.trim(),
        referralPartnerId: form.referralPartnerId.trim(),
        referralChannel: form.referralChannel.trim(),
        referralNote: form.referralNote.trim(),
        guarantorFullName: form.guarantorFullName.trim(),
        guarantorRelationship: form.guarantorRelationship.trim(),
        guarantorPhoneE164: form.guarantorPhoneE164.trim(),
        guarantorPhoneVerified: form.guarantorPhoneVerified,
        nationalIdNumber: form.nationalIdNumber.trim(),
        identityFrontMediaRef: form.identityFrontMediaRef.trim(),
        identityBackMediaRef: form.identityBackMediaRef.trim(),
        identityVerificationStatus: form.identityStatus,
        contractMediaRef: form.contractMediaRef.trim(),
        contractReviewStatus: form.contractStatus,
        onboardingStage: form.onboardingStage,
        partnershipsApproved: kind === "field" && form.onboardingStage === "activation_ready",
        ...(kind === "captain" ? {
          captain: {
            financialGuaranteeMinorUnits: normalizedGuarantee,
            financialGuaranteeCurrency: "YER",
            financialGuaranteeStatus: form.guaranteeStatus,
            financialGuaranteeReference: form.guaranteeReference.trim(),
            deliveryBagCustodyStatus: form.bagStatus,
            deliveryBagCustodyReference: form.bagReference.trim(),
            mandatoryPurchasesStatus: form.purchasesStatus,
            mandatoryPurchasesReference: form.purchasesReference.trim(),
            trainingStatus: form.trainingStatus,
            operationsAccreditationStatus: form.accreditationStatus,
          },
        } : {}),
      });
      apply(result);
      setSuccess(result.activationReadiness.ready ? "اكتملت بوابة التفعيل." : "حُفظ التقدم وما زالت متطلبات ناقصة.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ نواة الملف التشغيلي");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CpStateView kind="loading" title="جارٍ تحميل بوابة التفعيل…" />;
  if (!data) return <CpStatePanel role="alert" title="تعذر تحميل بوابة التفعيل" description={error ?? "لا توجد بيانات قابلة للعرض."} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section title="مصدر الترشيح">
        <select value={form.referralSourceType} onChange={(event) => changeReferralSource(event.target.value as ReferralSourceType)} style={selectStyle} aria-label="مصدر الترشيح">
          {REFERRAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {(["employee", "captain", "field"] as ReferralSourceType[]).includes(form.referralSourceType) ? (
          <select value={form.referralSourceActorId} onChange={(event) => setField("referralSourceActorId", event.target.value)} style={selectStyle} aria-label="الشخص المرشح" disabled={referralLoading}>
            <option value="">{referralLoading ? "جارٍ تحميل السجل…" : "اختر الشخص من السجل"}</option>
            {referralPeople.map((option) => <option key={option.actorId} value={option.actorId}>{option.label}</option>)}
          </select>
        ) : null}
        {form.referralSourceType === "partner" ? (
          <select value={form.referralPartnerId} onChange={(event) => setField("referralPartnerId", event.target.value)} style={selectStyle} aria-label="الشريك المرشح" disabled={referralLoading}>
            <option value="">{referralLoading ? "جارٍ تحميل الشركاء…" : "اختر الشريك من السجل"}</option>
            {referralPartners.map((option) => <option key={option.partnerId} value={option.partnerId}>{option.label}</option>)}
          </select>
        ) : null}
        {referralError ? <CpStatePanel role="alert" title="تعذر تحميل سجل الترشيح" description={referralError} /> : null}
        {(["advertisement", "social_media"] as ReferralSourceType[]).includes(form.referralSourceType) ? (
          <CpTextInput value={form.referralChannel} onChange={(value) => setField("referralChannel", value)} placeholder="قناة الإعلان أو مرجع الحملة" aria-label="قناة الترشيح" />
        ) : null}
        <CpTextInput value={form.referralNote} onChange={(value) => setField("referralNote", value)} placeholder="ملاحظة المصدر عند الحاجة" aria-label="ملاحظة مصدر الترشيح" />
      </Section>

      <Section title="الضمين">
        <CpTextInput value={form.guarantorFullName} onChange={(value) => setField("guarantorFullName", value)} placeholder="اسم الضمين" aria-label="اسم الضمين" />
        <CpTextInput value={form.guarantorRelationship} onChange={(value) => setField("guarantorRelationship", value)} placeholder="الصفة أو العلاقة" aria-label="صفة الضمين" />
        <CpTextInput value={form.guarantorPhoneE164} onChange={(value) => setField("guarantorPhoneE164", value)} placeholder="رقم هاتف الضمين" aria-label="هاتف الضمين" />
        <select value={String(form.guarantorPhoneVerified)} onChange={(event) => setField("guarantorPhoneVerified", event.target.value === "true")} style={selectStyle} aria-label="حالة تحقق هاتف الضمين">
          <option value="false">هاتف الضمين غير متحقق</option>
          <option value="true">تم التحقق من هاتف الضمين</option>
        </select>
      </Section>

      <Section title="الهوية والعقد">
        <CpTextInput value={form.nationalIdNumber} onChange={(value) => setField("nationalIdNumber", value)} placeholder="الرقم الوطني" aria-label="الرقم الوطني" />
        <MediaUploadField value={form.identityFrontMediaRef} onChange={(value) => setField("identityFrontMediaRef", value)} placeholder="مرجع صورة وجه الهوية" actorId={actorId} kind={kind} onUploadError={setError} />
        <MediaUploadField value={form.identityBackMediaRef} onChange={(value) => setField("identityBackMediaRef", value)} placeholder="مرجع صورة خلف الهوية" actorId={actorId} kind={kind} onUploadError={setError} />
        <select value={form.identityStatus} onChange={(event) => setField("identityStatus", event.target.value as IdentityVerificationStatus)} style={selectStyle} aria-label="حالة مراجعة الهوية">
          <option value="pending">الهوية قيد الاستكمال</option><option value="under_review">الهوية تحت المراجعة</option>
          <option value="approved">الهوية معتمدة</option><option value="rejected">الهوية مرفوضة</option>
          <option value="needs_resubmission">الهوية تحتاج إعادة رفع</option><option value="expired">الهوية منتهية</option>
        </select>
        <MediaUploadField value={form.contractMediaRef} onChange={(value) => setField("contractMediaRef", value)} placeholder="مرجع العقد المرفق" actorId={actorId} kind={kind} accept="image/*,application/pdf" onUploadError={setError} />
        <select value={form.contractStatus} onChange={(event) => setField("contractStatus", event.target.value as ContractReviewStatus)} style={selectStyle} aria-label="حالة مراجعة العقد">
          <option value="pending">العقد قيد الاستكمال</option><option value="under_review">العقد تحت المراجعة</option>
          <option value="approved">العقد معتمد</option><option value="rejected">العقد مرفوض</option>
          <option value="needs_resubmission">العقد يحتاج إعادة رفع</option>
        </select>
      </Section>

      {kind === "captain" ? (
        <Section title="تأهيل الكابتن والضمانة المالية">
          <CpMutedInline>التصنيف الحالي: {data.operationalCore.captain?.classification ?? "joker"}. الانتقال إلى Basic يتم من قرار مستقل مدعوم بالأدلة.</CpMutedInline>
          <CpTextInput value={form.guaranteeAmount} onChange={(value) => setField("guaranteeAmount", value)} placeholder="الضمانة المالية بوحدات العملة الصغرى" aria-label="قيمة الضمانة المالية" />
          <CpTextInput value={form.guaranteeReference} onChange={(value) => setField("guaranteeReference", value)} placeholder="مرجع قراءة أو قيد WLT" aria-label="مرجع الضمانة المالية" />
          <select value={form.guaranteeStatus} onChange={(event) => setField("guaranteeStatus", event.target.value as FormState["guaranteeStatus"])} style={selectStyle} aria-label="حالة الضمانة المالية">
            <option value="not_funded">الضمانة غير ممولة</option><option value="pending_review">الضمانة تحت المراجعة</option>
            <option value="funded">الضمانة ممولة</option><option value="released">الضمانة مفرج عنها</option><option value="forfeited">الضمانة مصادرة بقرار</option>
          </select>
          <select value={form.bagStatus} onChange={(event) => setField("bagStatus", event.target.value as FormState["bagStatus"])} style={selectStyle} aria-label="حالة عهدة الحقيبة">
            <option value="not_issued">حقيبة التوصيل غير مسلمة</option><option value="issued">حقيبة التوصيل مسلمة كعهدة</option>
            <option value="returned">العهدة معادة</option><option value="lost">العهدة مفقودة</option><option value="damaged">العهدة تالفة</option>
          </select>
          <CpTextInput value={form.bagReference} onChange={(value) => setField("bagReference", value)} placeholder="مرجع محضر عهدة حقيبة التوصيل" aria-label="مرجع عهدة الحقيبة" />
          <select value={form.purchasesStatus} onChange={(event) => setField("purchasesStatus", event.target.value as FormState["purchasesStatus"])} style={selectStyle} aria-label="حالة المشتريات الإلزامية">
            <option value="not_required">المشتريات غير مطلوبة بعد</option><option value="pending_payment">المشتريات بانتظار السداد</option>
            <option value="paid">المشتريات مدفوعة</option><option value="paid_and_delivered">المشتريات مدفوعة ومسلمة</option><option value="cancelled">المشتريات ملغاة</option>
          </select>
          <CpTextInput value={form.purchasesReference} onChange={(value) => setField("purchasesReference", value)} placeholder="مرجع الفاتورة أو التسليم" aria-label="مرجع المشتريات" />
          <select value={form.trainingStatus} onChange={(event) => setField("trainingStatus", event.target.value as FormState["trainingStatus"])} style={selectStyle} aria-label="حالة التدريب">
            <option value="pending">التدريب بانتظار البدء</option><option value="in_progress">التدريب جارٍ</option>
            <option value="passed">التدريب مجتاز</option><option value="failed">التدريب غير مجتاز</option>
          </select>
          <select value={form.accreditationStatus} onChange={(event) => setField("accreditationStatus", event.target.value as FormState["accreditationStatus"])} style={selectStyle} aria-label="اعتماد العمليات">
            <option value="pending">اعتماد العمليات معلق</option><option value="approved">معتمد من العمليات</option>
            <option value="suspended">اعتماد العمليات موقوف</option><option value="expired">اعتماد العمليات منتهي</option>
          </select>
        </Section>
      ) : null}

      <Section title="مرحلة الاستكمال">
        <select value={form.onboardingStage} onChange={(event) => setField("onboardingStage", event.target.value as ProviderOnboardingStage)} style={selectStyle} aria-label="مرحلة استكمال الملف">
          <option value="basic_profile">الملف الأولي</option><option value="documents_pending">المستندات ناقصة</option>
          <option value="documents_review">مراجعة المستندات</option><option value="training_pending">التدريب</option>
          <option value={kind === "field" ? "partnerships_review" : "operations_review"}>{kind === "field" ? "مراجعة الشراكات" : "مراجعة العمليات"}</option>
          <option value="activation_ready">جاهز للتفعيل</option><option value="active">مفعّل</option>
        </select>
      </Section>

      <Section title="نتيجة بوابة التفعيل">
        {data.activationReadiness.ready ? <CpStatePanel role="status" title="جاهز لإصدار كود الدخول" /> : (
          <><CpStatePanel role="status" title="المتطلبات غير مكتملة" description={`المتبقي: ${data.activationReadiness.missing.join("، ")}`} /><CpMutedInline>فحص المتطلبات يتم في الخادم وقاعدة البيانات؛ تغيير الواجهة وحده لا يتجاوز البوابة.</CpMutedInline></>
        )}
      </Section>

      {error ? <CpStatePanel role="alert" title="تعذر الحفظ" description={error} /> : null}
      {success ? <CpStatePanel role="status" title={success} /> : null}
      <CpButton variant="primary" disabled={saving} onClick={() => void save()}>{saving ? "جارٍ الحفظ…" : "حفظ التقدم وإعادة فحص التفعيل"}</CpButton>
    </div>
  );
}

export default ProviderOperationalCorePanel;
