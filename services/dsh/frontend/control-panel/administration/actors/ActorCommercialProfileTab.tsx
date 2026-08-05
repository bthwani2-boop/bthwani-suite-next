import React, { useState, useEffect } from "react";
import { CpStatePanel, CpButton } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import { createDshHttpClient } from "../../../../shared/_kernel/dsh-http-request";
import type { ClientProfile } from "../../../../shared/client-profile";

const { request } = createDshHttpClient("", "dsh-administration");

export function ActorCommercialProfileTab(props: { readonly actorId: string }) {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request<{ profile: ClientProfile }>(`/dsh/administration/customers/${props.actorId}/profile`);
      setProfile(res.profile);
    } catch (err: any) {
      if (err?.status === 404) {
        setError("لم يقم هذا المستخدم بإنشاء ملف تجاري (Profile) بعد.");
      } else {
        setError(err?.message || "تعذر جلب الملف التجاري.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [props.actorId]);

  if (loading) {
    return <CpStatePanel state="loading" title="جاري التحميل..." />;
  }

  if (error || !profile) {
    return (
      <CpStatePanel 
        state="error" 
        title="تعذر تحميل الملف التجاري" 
        description={error || "الملف غير موجود"} 
        action={{ label: "إعادة المحاولة", onClick: loadProfile }}
      />
    );
  }

  return (
    <div style={{ padding: "1.5rem", background: "var(--bthwani-control-panel-surface)", borderRadius: "8px", border: "1px solid var(--bthwani-control-panel-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <Text role="headingSm">الملف التجاري (J041)</Text>
          <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>تفضيلات التسوق والإشعارات الخاصة بالعميل</Text>
        </div>
        <CpButton label="تحديث البيانات" variant="secondary" onClick={loadProfile} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div>
          <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>اللغة المفضلة</Text>
          <Text role="bodyMd">{profile.locale === "ar" ? "العربية" : "English"}</Text>
        </div>
        <div>
          <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>العملة المفضلة</Text>
          <Text role="bodyMd">{profile.currencyPreference || "غير محدد"}</Text>
        </div>
        <div>
          <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>موافقة البريد الإلكتروني</Text>
          <Text role="bodyMd" style={{ color: profile.marketingConsentEmail ? "var(--bthwani-control-panel-success)" : "var(--bthwani-control-panel-text-muted)" }}>
            {profile.marketingConsentEmail ? "مفعل" : "غير مفعل"}
          </Text>
        </div>
        <div>
          <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>موافقة الرسائل النصية</Text>
          <Text role="bodyMd" style={{ color: profile.marketingConsentSms ? "var(--bthwani-control-panel-success)" : "var(--bthwani-control-panel-text-muted)" }}>
            {profile.marketingConsentSms ? "مفعل" : "غير مفعل"}
          </Text>
        </div>
        <div>
          <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>موافقة إشعارات الهاتف</Text>
          <Text role="bodyMd" style={{ color: profile.marketingConsentPush ? "var(--bthwani-control-panel-success)" : "var(--bthwani-control-panel-text-muted)" }}>
            {profile.marketingConsentPush ? "مفعل" : "غير مفعل"}
          </Text>
        </div>
        <div>
          <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>إصدار السجل (OCC)</Text>
          <Text role="bodyMd">v{profile.version}</Text>
        </div>
      </div>
    </div>
  );
}
