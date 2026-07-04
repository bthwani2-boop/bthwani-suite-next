"use client";
import { colorRoles } from '@bthwani/ui-kit';
import React from "react";
import {
  CpButton,
} from "@bthwani/control-panel/components";
import { useLoyaltyController } from "../../../shared/marketing";
import { NotBackedNotice } from "./NotBackedNotice";

export function BenefitsSubscriptionsCommandDeck() {
  const loyalty = useLoyaltyController();

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: colorRoles.brandAction, fontSize: "1.15rem" }}>إدارة برنامج الولاء ونظام الاشتراكات</h3>

      {!loyalty.isBackedByApi && <NotBackedNotice reason={loyalty.persistenceDisabledReason} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontWeight: 700 }}>مضاعف نقاط الولاء (Points Multiplier)</h4>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem" }}>المضاعف الحالي:</span>
            <strong style={{ fontSize: "1.25rem", color: colorRoles.brandAction }}>{loyalty.pointMultiplier}x</strong>
            <CpButton onClick={() => loyalty.updateMultiplier(1.5)} disabled={!loyalty.isBackedByApi}>1.5x</CpButton>
            <CpButton onClick={() => loyalty.updateMultiplier(2.0)} disabled={!loyalty.isBackedByApi}>2.0x (مضاعف عطلة)</CpButton>
          </div>
          <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.5rem" }}>المضاعف يتحكم في سرعة اكتساب النقاط للكباتن والعملاء على الطلبات المؤهلة.</p>
        </div>

        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontWeight: 700 }}>مستويات وتصنيفات الولاء</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {loyalty.tiers.map((tier) => (
              <div key={tier.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid colorRoles.surfaceBase", paddingBottom: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>{tier.name}</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>الحد الأدنى للنقاط: {tier.minimumPoints} نقطة</span>
                <CpButton onClick={() => loyalty.updateTierPoints(tier.name, tier.minimumPoints + 100)} disabled={!loyalty.isBackedByApi} style={{ padding: "0.2rem 0.5rem" }}>+100</CpButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
