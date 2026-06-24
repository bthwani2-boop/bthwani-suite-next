"use client";

import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
} from "@bthwani/ui-kit/web";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  const handleSectionPress = (section: string) => {
    if (section === "dashboard") router.push("/");
    if (section === "operations") router.push("/dsh/operations");
    if (section === "partners") router.push("/dsh/partners/stores");
    if (section === "catalogs") router.push("/dsh/catalogs");
    if (section === "marketing") router.push("/dsh/marketing");
  };

  const cards = [
    {
      title: "العمليات و checkout",
      description: "متابعة نوايا checkout ومرجع WLT التشغيلي بدون أي أزرار مالية أو تسويات.",
      metric: "DSH-005 نشط",
      link: "/dsh/operations",
      buttonText: "فتح غرفة العمليات",
      color: "linear-gradient(135deg, teal, cadetblue)",
    },
    {
      title: "إدارة المتاجر",
      description: "إدارة وإعداد المتاجر، وعرض إحصائيات النشاط الحالي والتفاصيل الجغرافية.",
      metric: "6 متاجر نشطة",
      link: "/dsh/partners/stores",
      buttonText: "دخول لإدارة المتاجر",
      color: "linear-gradient(135deg, darkblue, dodgerblue)",
    },
    {
      title: "اعتماد الكتالوجات",
      description: "مراجعة واعتماد تصنيفات ومنتجات الشركاء والتأكد من مطابقة المعايير.",
      metric: "بانتظار المراجعة",
      link: "/dsh/catalogs",
      buttonText: "مراجعة الكتالوجات",
      color: "linear-gradient(135deg, saddlebrown, gold)",
    },
    {
      title: "التسويق واكتشاف الصفحة",
      description: "إدارة البنرات الإعلانية، العروض الخاصة، والتصنيفات الترويجية للصفحة الرئيسية.",
      metric: "3 أقسام نشطة",
      link: "/dsh/marketing",
      buttonText: "إدارة الترويج",
      color: "linear-gradient(135deg, darkgreen, limegreen)",
    },
  ];

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم — DSH</strong>}
          serviceLabel={<span>لوحة البيانات / الرئيسية</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={[
            { section: "dashboard", label: "الرئيسية" },
            { section: "operations", label: "العمليات" },
            { section: "partners", label: "إدارة المتاجر" },
            { section: "catalogs", label: "اعتماد الكتالوجات" },
            { section: "marketing", label: "التسويق واكتشاف الصفحة" },
          ]}
          activeSection="dashboard"
          onSectionPress={handleSectionPress}
        />
      }
      main={
        <div style={{ padding: "2rem", direction: "rtl", fontFamily: "system-ui, sans-serif" }}>
          <header style={{ marginBottom: "2.5rem" }}>
            <h1 style={{ margin: 0, fontSize: "2rem", color: "CanvasText", fontWeight: 700 }}>
              مرحباً بك في لوحة تحكم DSH 👋
            </h1>
            <p style={{ margin: "0.5rem 0 0", color: "GrayText", fontSize: "1.1rem" }}>
              اختر أحد الأقسام التالية لإدارة المتاجر والمنتجات والحملات الترويجية للمنصة.
            </p>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {cards.map((card) => (
              <div
                key={card.title}
                style={{
                  background: "Canvas",
                  border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
                  borderRadius: "1rem",
                  padding: "1.75rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "pointer",
                }}
                onClick={() => router.push(card.link)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)";
                }}
              >
                <div>
                  <div
                    style={{
                      height: "4px",
                      width: "60px",
                      background: card.color,
                      borderRadius: "2px",
                      marginBottom: "1rem",
                    }}
                  />
                  <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.35rem", color: "CanvasText", fontWeight: 600 }}>
                    {card.title}
                  </h3>
                  <p style={{ margin: "0 0 1.5rem", color: "GrayText", fontSize: "0.95rem", lineHeight: 1.5 }}>
                    {card.description}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "auto",
                    paddingTop: "1rem",
                    borderTop: "1px solid color-mix(in srgb, currentColor 6%, transparent)",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "GrayText", fontWeight: 500 }}>
                    {card.metric}
                  </span>
                  <button
                    type="button"
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: "color-mix(in srgb, currentColor 6%, Canvas)",
                      color: "CanvasText",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, currentColor 12%, Canvas)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "color-mix(in srgb, currentColor 6%, Canvas)")}
                  >
                    {card.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
