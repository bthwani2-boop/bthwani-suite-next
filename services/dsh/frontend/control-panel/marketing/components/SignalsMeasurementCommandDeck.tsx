"use client";
import { colorRoles } from '@bthwani/ui-kit';
import { useVisibilityGatesController } from "../../../shared/marketing";
import { NotBackedNotice } from "./NotBackedNotice";

export function SignalsMeasurementCommandDeck() {
  const gates = useVisibilityGatesController();
  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: colorRoles.brandAction, fontSize: "1.15rem" }}>بوابة قياس إشارات ورضا العملاء والشركاء</h3>
      {gates.errorMessage && <NotBackedNotice reason={gates.errorMessage} />}
      <div style={{ background: colorRoles.surfaceBase, padding: "1rem", borderRadius: "0.5rem" }}>
        <p style={{ margin: 0, fontSize: "0.813rem" }}>إشارات القياس الفورية مبنية على تحليلات الطلبات والتوصيل التشغيلية في DSH.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ padding: "1rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.5rem", background: "white" }}>
          <h4 style={{ margin: "0 0 0.5rem", color: colorRoles.brandStructure }}>مؤشرات الطلبات الفورية</h4>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>نسبة الطلبات المكتملة:</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colorRoles.brandStructure }}>{gates.metrics.completedOrdersRate}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>إجمالي الطلبات:</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{gates.metrics.totalOrders}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "1rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.5rem", background: "white" }}>
          <h4 style={{ margin: "0 0 0.5rem", color: colorRoles.brandStructure }}>أداء الكباتن التشغيلي</h4>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>نسبة الالتزام بالوقت:</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colorRoles.brandAction }}>{gates.metrics.deliveryCompletionRate}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>طلبات التوصيل المرفوضة:</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colorRoles.brandAction }}>{gates.metrics.declinedAssignments}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
