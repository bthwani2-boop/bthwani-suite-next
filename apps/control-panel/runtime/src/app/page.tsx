"use client";

import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
} from "../shell";
import { useRouter } from "next/navigation";

/* ── Section cards data ─────────────────────────────────────── */
const SECTION_CARDS = [
  {
    section: "operations",
    title: "العمليات و Checkout",
    description: "متابعة نوايا checkout ومرجع WLT التشغيلي. رصد لحظي للطلبات دون أزرار مالية.",
    metric: "نشط",
    metricLabel: "DSH-005",
    metricColor: "rgb(0, 194, 168)",
    link: "/dsh/operations",
    buttonText: "فتح غرفة العمليات",
    gradient: "linear-gradient(135deg, rgb(15, 45, 90) 0%, rgb(26, 64, 128) 100%)",
    iconColor: "rgb(59, 123, 255)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    section: "partners",
    title: "الشركاء والمتاجر",
    description: "إدارة وإعداد المتاجر والشركاء، إحصائيات النشاط، والتفاصيل الجغرافية.",
    metric: "6",
    metricLabel: "متاجر نشطة",
    metricColor: "rgb(94, 151, 255)",
    link: "/dsh/partners",
    buttonText: "إدارة الشركاء",
    gradient: "linear-gradient(135deg, rgb(26, 58, 92) 0%, rgb(15, 40, 71) 100%)",
    iconColor: "rgb(94, 151, 255)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    section: "catalogs",
    title: "اعتماد الكتالوجات",
    description: "مراجعة واعتماد تصنيفات ومنتجات الشركاء والتأكد من مطابقة معايير الجودة.",
    metric: "بانتظار المراجعة",
    metricLabel: "طلبات معلّقة",
    metricColor: "rgb(255, 159, 67)",
    link: "/dsh/catalogs",
    buttonText: "مراجعة الكتالوجات",
    gradient: "linear-gradient(135deg, rgb(61, 32, 0) 0%, rgb(92, 53, 0) 100%)",
    iconColor: "rgb(255, 159, 67)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    section: "marketing",
    title: "التسويق واكتشاف الصفحة",
    description: "إدارة البنرات الإعلانية، العروض الخاصة، والتصنيفات الترويجية للصفحة الرئيسية.",
    metric: "3",
    metricLabel: "أقسام نشطة",
    metricColor: "rgb(0, 194, 168)",
    link: "/dsh/marketing",
    buttonText: "إدارة الترويج",
    gradient: "linear-gradient(135deg, rgb(0, 61, 53) 0%, rgb(0, 82, 68) 100%)",
    iconColor: "rgb(0, 194, 168)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    ),
  },
  {
    section: "finance",
    title: "المالية والتسويات",
    description: "مراجعة WLT والمحافظ الرقمية وتسويات الشركاء. قراءة فقط مع حماية مالية كاملة.",
    metric: "محمي",
    metricLabel: "قراءة فقط",
    metricColor: "rgb(124, 92, 255)",
    link: "/dsh/finance",
    buttonText: "عرض التقارير المالية",
    gradient: "linear-gradient(135deg, rgb(30, 10, 74) 0%, rgb(45, 21, 102) 100%)",
    iconColor: "rgb(124, 92, 255)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    section: "support",
    title: "الدعم والمساعدة",
    description: "متابعة تذاكر الدعم، إدارة الحوادث، وإعدادات الإشعارات التشغيلية للمنصة.",
    metric: "نشط",
    metricLabel: "مركز الدعم",
    metricColor: "rgb(0, 194, 168)",
    link: "/dsh/support",
    buttonText: "فتح مركز الدعم",
    gradient: "linear-gradient(135deg, rgb(0, 61, 53) 0%, rgb(0, 92, 78) 100%)",
    iconColor: "rgb(0, 194, 168)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    section: "platform",
    title: "سياسات المنصة",
    description: "ضبط سياسات التشغيل، الإشعارات، والإعدادات العامة لمنصة DSH.",
    metric: "مُفعّل",
    metricLabel: "السياسات",
    metricColor: "rgb(255, 107, 107)",
    link: "/dsh/platform",
    buttonText: "إدارة السياسات",
    gradient: "linear-gradient(135deg, rgb(61, 10, 10) 0%, rgb(92, 16, 16) 100%)",
    iconColor: "rgb(255, 107, 107)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    section: "administration",
    title: "الإدارة والصلاحيات",
    description: "إدارة المستخدمين، الأدوار، والصلاحيات. تحكم كامل في وصول فريق التشغيل.",
    metric: "آمن",
    metricLabel: "الصلاحيات",
    metricColor: "rgb(243, 156, 18)",
    link: "/dsh/administration",
    buttonText: "إدارة الصلاحيات",
    gradient: "linear-gradient(135deg, rgb(61, 43, 0) 0%, rgb(92, 64, 0) 100%)",
    iconColor: "rgb(243, 156, 18)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
] as const;

/* ── KPI strip data ─────────────────────────────────────────── */
const KPIS = [
  { label: "متاجر نشطة",    value: "6",   icon: "🏪", color: "rgb(59, 123, 255)" },
  { label: "عمليات اليوم",  value: "143", icon: "⚡", color: "rgb(0, 194, 168)" },
  { label: "طلبات معلّقة", value: "12",  icon: "📋", color: "rgb(255, 159, 67)" },
  { label: "حملات نشطة",   value: "3",   icon: "📣", color: "rgb(124, 92, 255)" },
] as const;

/* ── Dashboard Page ─────────────────────────────────────────── */
export default function RootPage() {
  const router = useRouter();
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>الرئيسية</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="dashboard"
          onSectionPress={handleSectionPress}
        />
      }
      main={
        <div
          dir="rtl"
          style={{
            padding: "2rem",
            fontFamily: "var(--font-arabic, 'Cairo', sans-serif)",
            minHeight: "100%",
          }}
        >
          {/* ── Hero Header ─────────────────────────────────── */}
          <header
            style={{
              background: "linear-gradient(135deg, rgb(13, 20, 37) 0%, rgb(30, 45, 85) 60%, rgb(13, 26, 58) 100%)",
              borderRadius: "1.25rem",
              padding: "2rem 2.25rem",
              marginBottom: "1.75rem",
              position: "relative",
              overflow: "hidden",
              animation: "dsh-fade-up 0.45s var(--ease-smooth) both",
            }}
          >
            {/* Decorative glow orbs */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
              <div style={{
                position: "absolute", top: "-40px", insetInlineEnd: "5%",
                width: "220px", height: "220px", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(59,123,255,0.18) 0%, transparent 70%)",
              }} />
              <div style={{
                position: "absolute", bottom: "-30px", insetInlineStart: "15%",
                width: "160px", height: "160px", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0,194,168,0.12) 0%, transparent 70%)",
              }} />
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.75rem" }}>👋</span>
                <h1 style={{
                  margin: 0,
                  fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                  fontWeight: 800,
                  color: "rgb(255, 255, 255)",
                  letterSpacing: "-0.01em",
                }}>
                  مرحباً بك في لوحة تحكم DSH
                </h1>
              </div>
              <p style={{
                margin: 0,
                color: "rgba(168,191,223,0.85)",
                fontSize: "0.95rem",
                maxWidth: "600px",
                lineHeight: 1.6,
              }}>
                لوحة إدارية متكاملة تتيح لك الإشراف على جميع أقسام المنصة — من العمليات والمتاجر حتى التسويق والمالية.
              </p>

              {/* Quick status chips */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
                {[
                  { label: "النظام نشط", color: "rgb(0, 194, 168)" },
                  { label: "DSH-005 مُشغَّل", color: "rgb(59, 123, 255)" },
                  { label: "WLT متصل", color: "rgb(124, 92, 255)" },
                ].map((chip) => (
                  <span key={chip.label} style={{
                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    background: "rgba(255,255,255,0.08)",
                    border: `1px solid ${chip.color.replace("rgb", "rgba").replace(")", ", 0.25)")}`,
                    borderRadius: "999px",
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: chip.color,
                  }}>
                    <span style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      background: chip.color, display: "inline-block",
                      boxShadow: `0 0 6px ${chip.color}`,
                    }} />
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
          </header>

          {/* ── KPI Strip ───────────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            marginBottom: "1.75rem",
          }}>
            {KPIS.map((kpi, i) => (
              <div
                key={kpi.label}
                style={{
                  background: "var(--card-bg, rgb(255, 255, 255))",
                  border: "1px solid var(--card-border, rgb(226, 232, 243))",
                  borderRadius: "0.875rem",
                  padding: "1.1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  boxShadow: "var(--card-shadow)",
                  animation: `dsh-fade-up 0.4s var(--ease-smooth) ${i * 0.07}s both`,
                }}
              >
                <div style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "0.625rem",
                  background: `${kpi.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.2rem", flexShrink: 0,
                }}>
                  {kpi.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: "1.5rem", fontWeight: 800,
                    color: kpi.color, lineHeight: 1,
                  }}>
                    {kpi.value}
                  </div>
                  <div style={{
                    fontSize: "0.75rem", color: "var(--text-secondary, rgb(90, 106, 133))",
                    fontWeight: 500, marginTop: "0.2rem",
                  }}>
                    {kpi.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Section title ───────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            marginBottom: "1.25rem",
            animation: "dsh-fade-up 0.4s var(--ease-smooth) 0.2s both",
          }}>
            <h2 style={{
              margin: 0, fontSize: "1rem", fontWeight: 700,
              color: "var(--text-primary, rgb(13, 20, 37))",
            }}>
              أقسام لوحة التحكم
            </h2>
            <div style={{
              flex: 1, height: "1px",
              background: "var(--card-border, rgb(226, 232, 243))",
            }} />
            <span style={{
              fontSize: "0.75rem", color: "var(--text-muted, rgb(138, 155, 187))",
              fontWeight: 500,
            }}>
              {SECTION_CARDS.length} أقسام
            </span>
          </div>

          {/* ── Section Cards Grid ───────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}>
            {SECTION_CARDS.map((card, i) => (
              <SectionCard
                key={card.section}
                card={card}
                delay={0.25 + i * 0.06}
                onClick={() => router.push(card.link)}
              />
            ))}
          </div>
        </div>
      }
    />
  );
}

/* ── Section Card Component ─────────────────────────────────── */
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
        background: "var(--card-bg, rgb(255, 255, 255))",
        border: "1px solid var(--card-border, rgb(226, 232, 243))",
        borderRadius: "1rem",
        overflow: "hidden",
        boxShadow: "var(--card-shadow)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.22s var(--ease-spring), box-shadow 0.22s ease",
        animation: `dsh-fade-up 0.4s var(--ease-smooth) ${delay}s both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.boxShadow = "var(--card-shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--card-shadow)";
      }}
    >
      {/* Dark gradient header with icon */}
      <div style={{
        background: card.gradient,
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
      }}>
        <div>
          <h3 style={{
            margin: "0 0 0.35rem",
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "rgb(255, 255, 255)",
            lineHeight: 1.3,
          }}>
            {card.title}
          </h3>
          {/* Metric badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              fontSize: "0.75rem", fontWeight: 700,
              color: card.metricColor,
            }}>
              {card.metric}
            </span>
            <span style={{ fontSize: "0.72rem", color: "rgba(168,191,223,0.7)" }}>
              {card.metricLabel}
            </span>
          </div>
        </div>

        {/* Icon */}
        <div style={{
          color: card.iconColor,
          background: `${card.iconColor}1A`,
          borderRadius: "0.625rem",
          padding: "0.5rem",
          flexShrink: 0,
        }}>
          {card.icon}
        </div>
      </div>

      {/* White description + button footer */}
      <div style={{ padding: "1rem 1.5rem 1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
        <p style={{
          margin: "0 0 1rem",
          fontSize: "0.875rem",
          color: "var(--text-secondary, rgb(90, 106, 133))",
          lineHeight: 1.6,
          flex: 1,
        }}>
          {card.description}
        </p>

        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            padding: "0.55rem 1.1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: `linear-gradient(135deg, ${card.iconColor} 0%, ${card.iconColor}CC 100%)`,
            color: "rgb(255, 255, 255)",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-arabic, 'Cairo', sans-serif)",
            transition: "opacity 0.15s ease, transform 0.15s ease",
            alignSelf: "flex-start",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(0.98)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          {card.buttonText}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "scaleX(-1)" }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}


