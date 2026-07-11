"use client";

import { Suspense, useState } from "react";
import { PartnersReviewQueueScreen, PartnerListScreen, FieldReadinessQueueScreen, FieldActivationScreen } from "@dsh-cp/partners";
import { useRouter } from "next/navigation";

type PartnersTab = "queue" | "all" | "field-readiness" | "field-activation";

const TABS: { id: PartnersTab; label: string }[] = [
  { id: "queue", label: "طلبات المراجعة" },
  { id: "all", label: "كل الشركاء" },
  { id: "field-readiness", label: "جاهزية الميدان" },
  { id: "field-activation", label: "تفعيل الميداني" },
];

export default function DshPartnersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<PartnersTab>("queue");

  return (
    <Suspense fallback={<div>جاري تحميل الشركاء...</div>}>
      <div dir="rtl" style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={`dsh-partners-tab-${t.id}`}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: tab === t.id ? "2px solid #1e5fff" : "1px solid #d0d5dd",
              background: tab === t.id ? "#eef3ff" : "#fff",
              fontWeight: tab === t.id ? 700 : 400,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "queue" ? (
        <PartnersReviewQueueScreen
          onOpenPartner={(partnerId) => router.push(`/dsh/partners/${partnerId}`)}
        />
      ) : tab === "all" ? (
        <PartnerListScreen
          onSelectPartner={(partnerId) => router.push(`/dsh/partners/${partnerId}`)}
        />
      ) : tab === "field-readiness" ? (
        <FieldReadinessQueueScreen />
      ) : (
        <FieldActivationScreen />
      )}
    </Suspense>
  );
}
