"use client";

import React from "react";
import {
  CpButton,
  CpMutedInline,
  CpStatePanel,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import {
  getProviderOperationalCore,
  patchProviderOperationalCore,
} from "../../shared/workforce";
import type {
  OperationalCoreResponse,
  ProviderKind,
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

function Section(props: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 12 }}>
      <Text role="titleSm">{props.title}</Text>
      {props.children}
    </div>
  );
}

export function ProviderOperationalCorePanel(props: {
  readonly actorId: string;
  readonly kind: Extract<ProviderKind, "field" | "captain">;
}) {
  const [data, setData] = React.useState<OperationalCoreResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [referralSourceType, setReferralSourceType] = React.useState<ReferralSourceType>("direct");
  const [referralSourceActorId, setReferralSourceActorId] = React.useState("");
  const [referralNote, setReferralNote] = React.useState("");
  const [guarantorFullName, setGuarantorFullName] = React.useState("");
  const [guarantorRelationship, setGuarantorRelationship] = React.useState("");
  const [guarantorPhoneE164, setGuarantorPhoneE164] = React.useState("");
  const [nationalIdNumber, setNationalIdNumber] = React.useState("");
  const [identityFrontMediaRef, setIdentityFrontMediaRef] = React.useState("");
  const [identityBackMediaRef, setIdentityBackMediaRef] = React.useState("");
  const [identityStatus, setIdentityStatus] = React.useState("pending");
  const [contractMediaRef, setContractMediaRef] = React.useState("");
  const [contractStatus, setContractStatus] = React.useState("pending");
  const [onboardingStage, setOnboardingStage] = React.useState("basic_profile");

  const [guaranteeAmount, setGuaranteeAmount] = React.useState("0");
  const [guaranteeStatus, setGuaranteeStatus] = React.useState("not_funded");
  const [guaranteeReference, setGuaranteeReference] = React.useState("");
  const [bagStatus, setBagStatus] = React.useState("not_issued");
  const [purchasesStatus, setPurchasesStatus] = React.useState("not_required");
  const [trainingStatus, setTrainingStatus] = React.useState("pending");
  const [accreditationStatus, setAccreditationStatus] = React.useState("pending");

  const apply = React.useCallback((result: OperationalCoreResponse) => {
    const core = result.operationalCore;
    setData(result);
    setReferralSourceType(core.referralSourceType);
    setReferralSourceActorId(core.referralSourceActorId ?? "");
    setReferralNote(core.referralNote ?? "");
    setGuarantorFullName(core.guarantorFullName ?? "");
    setGuarantorRelationship(core.guarantorRelationship ?? "");
    setGuarantorPhoneE164(core.guarantorPhoneE164 ?? "");
    setNationalIdNumber(core.nationalIdNumber ?? "");
    setIdentityFrontMediaRef(core.identityFrontMediaRef ?? "");
    setIdentityBackMediaRef(core.identityBackMediaRef ?? "");
    setIdentityStatus(core.identityVerificationStatus);
    setContractMediaRef(core.contractMediaRef ?? "");
    setContractStatus(core.contractReviewStatus);
    setOnboardingStage(core.onboardingStage);
    if (core.captain) {
      setGuaranteeAmount(String(core.captain.financialGuaranteeMinorUnits));
      setGuaranteeStatus(core.captain.financialGuaranteeStatus);
      setGuaranteeReference(core.captain.financialGuaranteeReference ?? "");
      setBagStatus(core.captain.deliveryBagCustodyStatus);
      setPurchasesStatus(core.captain.mandatoryPurchasesStatus);
      setTrainingStatus(core.captain.trainingStatus);
      setAccreditationStatus(core.captain.operationsAccreditationStatus);
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      apply(await getProviderOperationalCore(props.kind, props.actorId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل نواة الملف التشغيلي");
    } finally {
      setLoading(false);
    }
  }, [apply, props.actorId, props.kind]);

  React.useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const normalizedGuarantee = Number(guaranteeAmount);
    if (props.kind === "captain" && (!Number.isSafeInteger(normalizedGuarantee) || normalizedGuarantee < 0)) {
      setError("قيمة الضمانة المالية يجب أن تكون عددًا صحيحًا بوحدات العملة الصغرى.");
      setSaving(false);
      return;
    }
    try {
      const result = await patchProviderOperationalCore(props.kind, props.actorId, {
        referralSourceType,
        referralSourceActorId: referralSourceActorId.trim(),
        referralNote: referralNote.trim(),
        guarantorFullName: guarantorFullName.trim(),
        guarantorRelationship: guarantorRelationship.trim(),
        guarantorPhoneE164: guarantorPhoneE164.trim(),
        nationalIdNumber: nationalIdNumber.trim(),
        identityFrontMediaRef: identityFrontMediaRef.trim(),
        identityBackMediaRef: identityBackMediaRef.trim(),
        identityVerificationStatus: identityStatus as never,
        contractMediaRef: contractMediaRef.trim(),
        contractReviewStatus: contractStatus as never,
        onboardingStage: onboardingStage as never,
        partnershipsApproved: props.kind === "field" && onboardingStage === "activation_ready",
        ...(props.kind === "captain" ? {
          captain: {
            classification: data?.operationalCore.captain?.classification ?? "joker",
            financialGuaranteeMinorUnits: normalizedGuarantee,
            financialGuaranteeCurrency: "YER",
            financialGuaranteeStatus: guaranteeStatus as never,
            financialGuaranteeReference: guaranteeReference.trim(),
            deliveryBagCustodyStatus: bagStatus as never,
            mandatoryPurchasesStatus: purchasesStatus as never,
            trainingStatus: trainingStatus as never,
            operationsAccreditationStatus: accreditationStatus as never,
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
  if (!data) return <CpStatePanel role="alert" title="تعذر تحميل بوابة التفعيل" description={error ?? undefined} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section title="مصدر الترشيح">
        <select value={referralSourceType} onChange={(event) => setReferralSourceType(event.target.value as ReferralSourceType)} style={selectStyle}>
          {REFERRAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {(["employee", "captain", "field"] as ReferralSourceType[]).includes(referralSourceType) ? (
          <CpTextInput value={referralSourceActorId} onChange={setReferralSourceActorId} placeholder="معرف الشخص المرشّح" aria-label="معرف الشخص المرشح" />
        ) : null}
        <CpTextInput value={referralNote} onChange={setReferralNote} placeholder="مرجع الحملة أو ملاحظة المصدر" aria-label="ملاحظة مصدر الترشيح" />
      </Section>

      <Section title="الضمين">
        <CpTextInput value={guarantorFullName} onChange={setGuarantorFullName} placeholder="اسم الضمين" aria-label="اسم الضمين" />
        <CpTextInput value={guarantorRelationship} onChange={setGuarantorRelationship} placeholder="الصفة أو العلاقة" aria-label="صفة الضمين" />
        <CpTextInput value={guarantorPhoneE164} onChange={setGuarantorPhoneE164} placeholder="رقم هاتف الضمين" aria-label="هاتف الضمين" />
      </Section>

      <Section title="الهوية والعقد">
        <CpTextInput value={nationalIdNumber} onChange={setNationalIdNumber} placeholder="الرقم الوطني" aria-label="الرقم الوطني" />
        <CpTextInput value={identityFrontMediaRef} onChange={setIdentityFrontMediaRef} placeholder="مرجع صورة وجه الهوية" aria-label="صورة وجه الهوية" />
        <CpTextInput value={identityBackMediaRef} onChange={setIdentityBackMediaRef} placeholder="مرجع صورة خلف الهوية" aria-label="صورة خلف الهوية" />
        <select value={identityStatus} onChange={(event) => setIdentityStatus(event.target.value)} style={selectStyle}>
          <option value="pending">الهوية قيد الاستكمال</option>
          <option value="under_review">الهوية تحت المراجعة</option>
          <option value="approved">الهوية معتمدة</option>
          <option value="rejected">الهوية مرفوضة</option>
          <option value="needs_resubmission">الهوية تحتاج إعادة رفع</option>
        </select>
        <CpTextInput value={contractMediaRef} onChange={setContractMediaRef} placeholder="مرجع العقد المرفق" aria-label="مرجع العقد" />
        <select value={contractStatus} onChange={(event) => setContractStatus(event.target.value)} style={selectStyle}>
          <option value="pending">العقد قيد الاستكمال</option>
          <option value="under_review">العقد تحت المراجعة</option>
          <option value="approved">العقد معتمد</option>
          <option value="rejected">العقد مرفوض</option>
          <option value="needs_resubmission">العقد يحتاج إعادة رفع</option>
        </select>
      </Section>

      {props.kind === "captain" ? (
        <Section title="تأهيل الكابتن والضمانة المالية">
          <CpMutedInline>التصنيف الحالي: {data.operationalCore.captain?.classification ?? "joker"}. كل كابتن جديد يبدأ Joker.</CpMutedInline>
          <CpTextInput value={guaranteeAmount} onChange={setGuaranteeAmount} placeholder="الضمانة المالية بوحدات العملة الصغرى" aria-label="قيمة الضمانة المالية" />
          <CpTextInput value={guaranteeReference} onChange={setGuaranteeReference} placeholder="مرجع قيد WLT أو إيصال المراجعة" aria-label="مرجع الضمانة المالية" />
          <select value={guaranteeStatus} onChange={(event) => setGuaranteeStatus(event.target.value)} style={selectStyle}>
            <option value="not_funded">الضمانة غير ممولة</option>
            <option value="pending_review">الضمانة تحت المراجعة</option>
            <option value="funded">الضمانة ممولة</option>
            <option value="released">الضمانة مفرج عنها</option>
            <option value="forfeited">الضمانة مصادرة بقرار</option>
          </select>
          <select value={bagStatus} onChange={(event) => setBagStatus(event.target.value)} style={selectStyle}>
            <option value="not_issued">حقيبة التوصيل غير مسلمة</option>
            <option value="issued">حقيبة التوصيل مسلمة كعهدة</option>
            <option value="returned">العهدة معادة</option>
            <option value="lost">العهدة مفقودة</option>
            <option value="damaged">العهدة تالفة</option>
          </select>
          <select value={purchasesStatus} onChange={(event) => setPurchasesStatus(event.target.value)} style={selectStyle}>
            <option value="not_required">المشتريات غير مطلوبة بعد</option>
            <option value="pending_payment">المشتريات بانتظار السداد</option>
            <option value="paid">المشتريات مدفوعة</option>
            <option value="paid_and_delivered">المشتريات مدفوعة ومسلمة</option>
          </select>
          <select value={trainingStatus} onChange={(event) => setTrainingStatus(event.target.value)} style={selectStyle}>
            <option value="pending">التدريب بانتظار البدء</option>
            <option value="in_progress">التدريب جارٍ</option>
            <option value="passed">التدريب مجتاز</option>
            <option value="failed">التدريب غير مجتاز</option>
          </select>
          <select value={accreditationStatus} onChange={(event) => setAccreditationStatus(event.target.value)} style={selectStyle}>
            <option value="pending">اعتماد العمليات معلق</option>
            <option value="approved">معتمد من العمليات</option>
            <option value="suspended">اعتماد العمليات موقوف</option>
            <option value="expired">اعتماد العمليات منتهي</option>
          </select>
        </Section>
      ) : null}

      <Section title="مرحلة الاستكمال">
        <select value={onboardingStage} onChange={(event) => setOnboardingStage(event.target.value)} style={selectStyle}>
          <option value="basic_profile">الملف الأولي</option>
          <option value="documents_pending">المستندات ناقصة</option>
          <option value="documents_review">مراجعة المستندات</option>
          <option value="training_pending">التدريب</option>
          <option value={props.kind === "field" ? "partnerships_review" : "operations_review"}>{props.kind === "field" ? "مراجعة الشراكات" : "مراجعة العمليات"}</option>
          <option value="activation_ready">جاهز للتفعيل</option>
          <option value="active">مفعّل</option>
        </select>
      </Section>

      <Section title="نتيجة بوابة التفعيل">
        {data.activationReadiness.ready ? (
          <CpStatePanel role="status" title="جاهز لإصدار كود الدخول" />
        ) : (
          <>
            <CpStatePanel role="status" title="المتطلبات غير مكتملة" description={`المتبقي: ${data.activationReadiness.missing.join("، ")}`} />
            <CpMutedInline>فحص المتطلبات يتم في الخادم؛ تغيير الواجهة وحده لا يتجاوز البوابة.</CpMutedInline>
          </>
        )}
      </Section>

      {error ? <CpStatePanel role="alert" title="تعذر الحفظ" description={error} /> : null}
      {success ? <CpStatePanel role="status" title={success} /> : null}
      <CpButton variant="primary" disabled={saving} onClick={() => void save()}>
        {saving ? "جارٍ الحفظ…" : "حفظ التقدم وإعادة فحص التفعيل"}
      </CpButton>
    </div>
  );
}

export default ProviderOperationalCorePanel;
