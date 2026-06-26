"use client";

import { DshPage } from "../shell";
import { useRouter } from "next/navigation";

const SECTION_CARDS = [
  {
    section: "operations",
    title: "العمليات و Checkout",
    description: "رصد لحظي لنوايا checkout ومرجع WLT التشغيلي دون أزرار مالية.",
    accentColor: "rgb(59,123,255)",
    link: "/dsh/operations",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    section: "partners",
    title: "الشركاء والمتاجر",
    description: "مراجعة طلبات التفعيل، إدارة المتاجر، وتتبع مسار الاعتماد.",
    accentColor: "rgb(94,151,255)",
    link: "/dsh/partners",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    section: "catalogs",
    title: "اعتماد الكتالوجات",
    description: "مراجعة واعتماد تصنيفات ومنتجات الشركاء بمعايير الجودة.",
    accentColor: "rgb(255,159,67)",
    link: "/dsh/catalogs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    section: "marketing",
    title: "التسويق والاكتشاف",
    description: "إدارة البنرات والعروض والتصنيفات الترويجية للصفحة الرئيسية.",
    accentColor: "rgb(0,194,168)",
    link: "/dsh/marketing",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    ),
  },
  {
    section: "analytics",
    title: "التحليلات والتقارير",
    description: "مؤشرات الأداء التفصيلية، تقارير النمو، وتحليلات سلوك المستخدمين.",
    accentColor: "rgb(124,92,255)",
    link: "/dsh/analytics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    section: "finance",
    title: "المالية والتسويات",
    description: "مراجعة WLT والمحافظ الرقمية وتسويات الشركاء. قراءة فقط.",
    accentColor: "rgb(99,102,241)",
    link: "/dsh/finance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    section: "support",
    title: "الدعم والمساعدة",
    description: "متابعة تذاكر الدعم وإدارة الحوادث والإشعارات التشغيلية.",
    accentColor: "rgb(20,184,166)",
    link: "/dsh/support",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    section: "platform",
    title: "سياسات المنصة",
    description: "ضبط سياسات التشغيل والإشعارات والإعدادات العامة لمنصة DSH.",
    accentColor: "rgb(239,68,68)",
    link: "/dsh/platform",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    section: "administration",
    title: "الإدارة والصلاحيات",
    description: "إدارة المستخدمين والأدوار والصلاحيات. تحكم كامل في وصول الفريق.",
    accentColor: "rgb(245,158,11)",
    link: "/dsh/administration",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
] as const;

const KPIS = [
  {
    label: "متاجر نشطة",
    value: "6",
    color: "rgb(59,123,255)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "عمليات اليوم",
    value: "143",
    color: "rgb(20,184,166)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: "طلبات معلّقة",
    value: "12",
    color: "rgb(245,158,11)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    label: "حملات نشطة",
    value: "3",
    color: "rgb(124,92,255)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    ),
  },
] as const;

export default function RootPage() {
  const router = useRouter();

  return (
    <DshPage activeSection="dashboard" sectionLabel="الرئيسية">
      {
        <div
          dir="rtl"
          style={{
            padding: "1.75rem 2rem",
            fontFamily: "var(--font-arabic)",
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {/* Hero */}
          <div style={{
            background: "linear-gradient(135deg, rgb(11,17,32) 0%, rgb(17,28,56) 55%, rgb(11,22,45) 100%)",
            borderRadius: "1rem",
            padding: "1.75rem 2rem",
            position: "relative",
            overflow: "hidden",
            animation: "dsh-fade-up 0.4s var(--ease-smooth) both",
          }}>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{
                position: "absolute", top: "-60px", insetInlineEnd: "8%",
                width: "260px", height: "260px", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(59,123,255,0.15) 0%, transparent 65%)",
              }} />
              <div style={{
                position: "absolute", bottom: "-40px", insetInlineStart: "20%",
                width: "180px", height: "180px", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(124,92,255,0.1) 0%, transparent 65%)",
              }} />
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <h1 style={{
                margin: "0 0 0.375rem",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "white",
                letterSpacing: "-0.015em",
              }}>
                لوحة تحكم DSH
              </h1>
              <p style={{
                margin: "0 0 1rem",
                color: "rgba(160,185,220,0.8)",
                fontSize: "0.875rem",
                lineHeight: 1.6,
              }}>
                إشراف متكامل على جميع أقسام المنصة — من العمليات والشركاء حتى التسويق والمالية.
              </p>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[
                  { label: "النظام نشط", color: "rgb(20,184,166)" },
                  { label: "SLICE-002 مُشغَّل", color: "rgb(59,123,255)" },
                  { label: "WLT محمي", color: "rgb(124,92,255)" },
                ].map((chip) => (
                  <span key={chip.label} style={{
                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: "999px",
                    padding: "0.2rem 0.7rem",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: chip.color,
                  }}>
                    <span style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      background: chip.color,
                      boxShadow: `0 0 5px ${chip.color}`,
                      display: "inline-block", flexShrink: 0,
                    }} />
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            animation: "dsh-fade-up 0.4s var(--ease-smooth) 0.08s both",
          }}>
            {KPIS.map((kpi) => (
              <div key={kpi.label} style={{
                background: "var(--dsh-card-bg)",
                border: "1px solid var(--dsh-card-border)",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                boxShadow: "var(--dsh-card-shadow)",
              }}>
                <div style={{
                  width: "2.25rem", height: "2.25rem",
                  borderRadius: "0.5rem",
                  background: `color-mix(in srgb, ${kpi.color} 12%, transparent)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: kpi.color,
                  flexShrink: 0,
                }}>
                  {kpi.icon}
                </div>
                <div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: kpi.color, lineHeight: 1 }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: "0.73rem", color: "var(--dsh-text-muted)", fontWeight: 500, marginTop: "0.2rem" }}>
                    {kpi.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sections header */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            animation: "dsh-fade-up 0.4s var(--ease-smooth) 0.14s both",
          }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--dsh-text-primary)" }}>
              أقسام لوحة التحكم
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--dsh-card-border)" }} />
            <span style={{ fontSize: "0.72rem", color: "var(--dsh-text-muted)", fontWeight: 500 }}>
              {SECTION_CARDS.length} أقسام
            </span>
          </div>

          {/* Section cards grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
            paddingBottom: "1rem",
          }}>
            {SECTION_CARDS.map((card, i) => (
              <SectionCard
                key={card.section}
                card={card}
                delay={0.18 + i * 0.05}
                onClick={() => router.push(card.link)}
              />
            ))}
          </div>
        </div>
    }
    </DshPage>
  );
}

function SectionCard({
  card,
  delay,
  onClick,
}: {
  card: (typeof SECTION_CARDS)[number];
  delay: number;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      style={{
        background: "var(--dsh-card-bg)",
        border: "1px solid var(--dsh-card-border)",
        borderTop: `3px solid ${card.accentColor}`,
        borderRadius: "0.875rem",
        padding: "1.25rem 1.5rem",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
        boxShadow: "var(--dsh-card-shadow)",
        transition: "transform 0.2s var(--ease-spring), box-shadow 0.2s ease",
        animation: `dsh-fade-up 0.4s var(--ease-smooth) ${delay}s both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "var(--dsh-card-shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--dsh-card-shadow)";
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{
          width: "2.25rem", height: "2.25rem",
          borderRadius: "0.5rem",
          background: `color-mix(in srgb, ${card.accentColor} 12%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: card.accentColor,
          flexShrink: 0,
        }}>
          {card.icon}
        </div>

        <svg
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--dsh-text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginTop: "0.25rem", transform: "scaleX(-1)", flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Card body */}
      <div>
        <h3 style={{
          margin: "0 0 0.375rem",
          fontSize: "0.9375rem",
          fontWeight: 700,
          color: "var(--dsh-text-primary)",
          lineHeight: 1.3,
        }}>
          {card.title}
        </h3>
        <p style={{
          margin: 0,
          fontSize: "0.8125rem",
          color: "var(--dsh-text-muted)",
          lineHeight: 1.6,
        }}>
          {card.description}
        </p>
      </div>
    </div>
  );
}
