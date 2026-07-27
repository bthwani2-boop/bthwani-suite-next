"use client";

import React from "react";
import { CpButton, CpMutedInline, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import { getProviderOperationalCore, patchProviderOperationalCore } from "../../shared/workforce";
import type {
  CaptainActivationCore,
  ContractReviewStatus,
  IdentityVerificationStatus,
  OperationalCoreResponse,
  ProviderKind,
  ProviderOnboardingStage,
  ReferralSourceType,
} from "../../shared/workforce";

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

type IndependentProviderKind = Extract<ProviderKind, "field" | "captain">;

type FormState = {
  referralSourceType: ReferralSourceType;
  referralSourceActorId: string;
  referralNote: string;
  guarantorFullName: string;
  guarantorRelationship: string;
  guarantorPhoneE164: string;
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
  purchasesStatus: CaptainActivationCore["mandatoryPurchasesStatus"];
  trainingStatus: CaptainActivationCore["trainingStatus"];
  accreditationStatus: CaptainActivationCore["operationsAccreditationStatus"];
};

const EMPTY_FORM: FormState = {
  referralSourceType: "direct",
  referralSourceActorId: "",
  referralNote: "",
  guarantorFullName: "",
  guarantorRelationship: "",
  guarantorPhoneE164: "",
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
  purchasesStatus: "not_required",
  trainingStatus: "pending",
  accreditationStatus: "pending",
};

export function ProviderOperationalCorePanel({ actorId, kind }: { readonly actorId: string; readonly kind: IndependentProviderKind }) {
  const [data, setData] = React.useState<OperationalCoreResponse | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

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
      referralNote: core.referralNote ?? "",
      guarantorFullName: core.guarantorFullName ?? "",
      guarantorRelationship: core.guarantorRelationship ?? "",
      guarantorPhoneE164: core.guarantorPhoneE164 ?? "",
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
      purchasesStatus: captain?.mandatoryPurchasesStatus ?? "not_required",
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

  const save = async () => {
    const normalizedGuarantee = Number(form.guaranteeAmount);
    if (kind === "captain" && (!Number.isSafeInteger(normalizedGuarantee) || normalizedGuarantee < 0)) {
      setError("قيمة الضمانة المالية يجب أن تكون عددًا صحيحًا بوحدات العملة الصغرى.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await patchProviderOperationalCore(kind, actorId, {
        referralSourceType: form.referralSourceType,
        referralSourceActorId: form.referralSourceActorId.trim(),
        referralNote: form.referralNote.trim(),
        guarantorFullName: form.guarantorFullName.trim(),
        guarantorRelationship: form.guarantorRelationship.trim(),
        guarantorPhoneE164: form.guarantorPhoneE164.trim(),
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
            classification: data?.operationalCore.captain?.classification ?? "joker",
            financialGuaranteeMinorUnits: normalizedGuarantee,
            financialGuaranteeCurrency: "YER",
            financialGuaranteeStatus: form.guaranteeStatus,
            financialGuaranteeReference: form.guaranteeReference.trim(),
            deliveryBagCustodyStatus: form.bagStatus,
            mandatoryPurchasesStatus: form.purchasesStatus,
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

  if (loading) return <CpStatePanel role="status" title="جارٍ تحميل بوابة التفعيل…" />;
  if (!data) return <CpStatePanel role="alert" title="تعذر تحميل بوابة التفعيل" description={error ?? "لا توجد بيانات قابلة للعرض."} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section title="مصدر الترشيح">
        <select value={form.referralSourceType} onChange={(event) => setField("referralSourceType", event.target.value as ReferralSourceType)} style={selectStyle}>
          {REFERRAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {(["employee", "captain", "field"] as ReferralSourceType[]).includes(form.referralSourceType) ? (
          <CpTextInput value={form.referralSourceActorId} onChange={(value) => setField("referralSourceActorId", value)} placeholder="معرف الشخص المرشّح" aria-label="معرف الشخص المرشح" />
        ) : null}
        <CpTextInput value={form.referralNote} onChange={(value) => setField("referralNote", value)} placeholder="مرجع الحملة أو ملاحظة المصدر" aria-label="ملاحظة مصدر الترشيح" />
      </Section>

      <Section title="الضمين">
        <CpTextInput value={form.guarantorFullName} onChange={(value) => setField("guarantorFullName", value)} placeholder="اسم الضمين" aria-label="اسم الضمين" />
        <CpTextInput value={form.guarantorRelationship} onChange={(value) => setField("guarantorRelationship", value)} placeholder="الصفة أو العلاقة" aria-label="صفة الضمين" />
        <CpTextInput value={form.guarantorPhoneE164} onChange={(value) => setField("guarantorPhoneE164", value)} placeholder="رقم هاتف الضمين" aria-label="هاتف الضمين" />
      </Section>

      <Section title="الهوية والعقد">
        <CpTextInput value={form.nationalIdNumber} onChange={(value) => setField("nationalIdNumber", value)} placeholder="الرقم الوطني" aria-label="الرقم الوطني" />
        <CpTextInput value={form.identityFrontMediaRef} onChange={(value) => setField("identityFrontMediaRef", value)} placeholder="مرجع صورة وجه الهوية" aria-label="صورة وجه الهوية" />
        <CpTextInput value={form.identityBackMediaRef} onChange={(value) => setField("identityBackMediaRef", value)} placeholder="مرجع صورة خلف الهوية" aria-label="صورة خلف الهوية" />
        <select value={form.identityStatus} onChange={(event) => setField("identityStatus", event.target.value as IdentityVerificationStatus)} style={selectStyle}>
          <option value="pending">الهوية قيد الاستكمال</option><option value="under_review">الهوية تحت المراجعة</option>
          <option value="approved">الهوية معتمدة</option><option value="rejected">الهوية مرفوضة</option>
          <option value="needs_resubmission">الهوية تحتاج إعادة رفع</option>
        </select>
        <CpTextInput value={form.contractMediaRef} onChange={(value) => setField("contractMediaRef", value)} placeholder="مرجع العقد المرفق" aria-label="مرجع العقد" />
        <select value={form.contractStatus} onChange={(event) => setField("contractStatus", event.target.value as ContractReviewStatus)} style={selectStyle}>
          <option value="pending">العقد قيد الاستكمال</option><option value="under_review">العقد تحت المراجعة</option>
          <option value="approved">العقد معتمد</option><option value="rejected">العقد مرفوض</option>
          <option value="needs_resubmission">العقد يحتاج إعادة رفع</option>
        </select>
      </Section>

      {kind === "captain" ? (
        <Section title="تأهيل الكابتن والضمانة المالية">
          <CpMutedInline>التصنيف الحالي: {data.operationalCore.captain?.classification ?? "joker"}. كل كابتن جديد يبدأ Joker.</CpMutedInline>
          <CpTextInput value={form.guaranteeAmount} onChange={(value) => setField("guaranteeAmount", value)} placeholder="الضمانة المالية بوحدات العملة الصغرى" aria-label="قيمة الضمانة المالية" />
          <CpTextInput value={form.guaranteeReference} onChange={(value) => setField("guaranteeReference", value)} placeholder="مرجع قيد WLT أو إيصال المراجعة" aria-label="مرجع الضمانة المالية" />
          <select value={form.guaranteeStatus} onChange={(event) => setField("guaranteeStatus", event.target.value as FormState["guaranteeStatus"])} style={selectStyle}>
            <option value="not_funded">الضمانة غير ممولة</option><option value="pending_review">الضمانة تحت المراجعة</option>
            <option value="funded">الضمانة ممولة</option><option value="released">الضمانة مفرج عنها</option><option value="forfeited">الضمانة مصادرة بقرار</option>
          </select>
          <select value={form.bagStatus} onChange={(event) => setField("bagStatus", event.target.value as FormState["bagStatus"])} style={selectStyle}>
            <option value="not_issued">حقيبة التوصيل غير مسلمة</option><option value="issued">حقيبة التوصيل مسلمة كعهدة</option>
            <option value="returned">العهدة معادة</option><option value="lost">العهدة مفقودة</option><option value="damaged">العهدة تالفة</option>
          </select>
          <select value={form.purchasesStatus} onChange={(event) => setField("purchasesStatus", event.target.value as FormState["purchasesStatus"])} style={selectStyle}>
            <option value="not_required">المشتريات غير مطلوبة بعد</option><option value="pending_payment">المشتريات بانتظار السداد</option>
            <option value="paid">المشتريات مدفوعة</option><option value="paid_and_delivered">المشتريات مدفوعة ومسلمة</option>
          </select>
          <select value={form.trainingStatus} onChange={(event) => setField("trainingStatus", event.target.value as FormState["trainingStatus"])} style={selectStyle}>
            <option value="pending">التدريب بانتظار البدء</option><option value="in_progress">التدريب جارٍ</option>
            <option value="passed">التدريب مجتاز</option><option value="failed">التدريب غير مجتاز</option>
          </select>
          <select value={form.accreditationStatus} onChange={(event) => setField("accreditationStatus", event.target.value as FormState["accreditationStatus"])} style={selectStyle}>
            <option value="pending">اعتماد العمليات معلق</option><option value="approved">معتمد من العمليات</option>
            <option value="suspended">اعتماد العمليات موقوف</option><option value="expired">اعتماد العمليات منتهي</option>
          </select>
        </Section>
      ) : null}

      <Section title="مرحلة الاستكمال">
        <select value={form.onboardingStage} onChange={(event) => setField("onboardingStage", event.target.value as ProviderOnboardingStage)} style={selectStyle}>
          <option value="basic_profile">الملف الأولي</option><option value="documents_pending">المستندات ناقصة</option>
          <option value="documents_review">مراجعة المستندات</option><option value="training_pending">التدريب</option>
          <option value={kind === "field" ? "partnerships_review" : "operations_review"}>{kind === "field" ? "مراجعة الشراكات" : "مراجعة العمليات"}</option>
          <option value="activation_ready">جاهز للتفعيل</option><option value="active">مفعّل</option>
        </select>
      </Section>

      <Section title="نتيجة بوابة التفعيل">
        {data.activationReadiness.ready ? <CpStatePanel role="status" title="جاهز لإصدار كود الدخول" /> : (
          <><CpStatePanel role="status" title="المتطلبات غير مكتملة" description={`المتبقي: ${data.activationReadiness.missing.join("، ")}`} /><CpMutedInline>فحص المتطلبات يتم في الخادم؛ تغيير الواجهة وحده لا يتجاوز البوابة.</CpMutedInline></>
        )}
      </Section>

      {error ? <CpStatePanel role="alert" title="تعذر الحفظ" description={error} /> : null}
      {success ? <CpStatePanel role="status" title={success} /> : null}
      <CpButton variant="primary" disabled={saving} onClick={() => void save()}>{saving ? "جارٍ الحفظ…" : "حفظ التقدم وإعادة فحص التفعيل"}</CpButton>
    </div>
  );
}

export default ProviderOperationalCorePanel;
