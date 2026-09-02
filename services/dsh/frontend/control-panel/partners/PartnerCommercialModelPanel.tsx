import { CpStatePanel, CpDescriptionList, CpDescriptionRow } from "@bthwani/control-panel/components";
import { Button, neutralScale } from "@bthwani/ui-kit";

export type PartnerCommercialModelPanelProps = {
  readonly partnerId: string;
};

export function PartnerCommercialModelPanel({ partnerId }: PartnerCommercialModelPanelProps) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ border: `1px solid ${neutralScale[200]}`, borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>النموذج التجاري الحالي</h2>
        <CpStatePanel
          role="status"
          title="توجيه معمارية الفول ستاك الموحد"
          code={`يتم احتساب النموذج التجاري مركزياً عبر منصة platform-control باستخدام المتغير VAR_PARTNER_COMMERCIAL_MODEL.\nمعرف الشريك (Entity ID): ${partnerId}`}
        />
        <CpDescriptionList>
          <CpDescriptionRow label="المعرف المرجعي للنموذج">VAR_PARTNER_COMMERCIAL_MODEL</CpDescriptionRow>
          <CpDescriptionRow label="حالة الربط مع WLT">معتمد (Obligation Handoff: PASS)</CpDescriptionRow>
          <CpDescriptionRow label="مصدر الحقيقة">core/platform-control</CpDescriptionRow>
        </CpDescriptionList>
      </section>

      <section style={{ border: `1px solid ${neutralScale[200]}`, borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>دورة حياة النموذج (تغيير مجدول)</h2>
        <p style={{ margin: 0, fontSize: 14, color: neutralScale[600] }}>
          لضمان عدم وجود تداخل (Overlap) أو تعديل رجعي (Retroactive)، يتم إدارة النماذج التجارية من خلال مقترحات مسودة
          تخضع للمراجعة والاعتماد (Maker-Checker) قبل الجدولة.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={() => window.alert("انتقل إلى قسم المنصة (Platform) لتقديم مقترح تعديل.")}>طلب تعديل النموذج</Button>
          <Button onClick={() => window.alert("انتقل إلى النظام المالي (WLT) لمشاهدة الالتزامات والتسويات.")}>عرض الالتزامات المالية</Button>
        </div>
      </section>
    </div>
  );
}
