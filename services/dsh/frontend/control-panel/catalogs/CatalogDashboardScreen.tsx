"use client";
import { colorRoles } from '@bthwani/ui-kit';
import { useState, useMemo } from "react";
import {
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpSearchInput,
  CpSelectableTableRow,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import { useCentralCatalogController, type ProductProposalPipelineStatus, PRODUCT_PROPOSAL_PIPELINE_METADATA } from "../../shared/catalog";

type StatusTone = "warning" | "success" | "danger" | "neutral";

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const toneColors: Record<StatusTone, { bg: string; color: string }> = {
    warning: { bg: colorRoles.surfaceBase, color: 'var(--status-warning-text, colorRoles.brandAction)' },
    success: { bg: colorRoles.surfaceBase, color: 'var(--status-success-strong, colorRoles.brandStructure)' },
    danger:  { bg: colorRoles.surfaceBase, color: 'var(--status-danger-strong, colorRoles.brandAction)' },
    neutral: { bg: 'var(--surface-muted, colorRoles.surfaceBase)', color: colorRoles.brandStructure },
  };
  const { bg, color } = toneColors[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.5rem 1rem",
        background: active ? colorRoles.brandAction : "transparent",
        color: disabled ? "#ccc" : active ? colorRoles.surfaceBase : "currentColor",
        border: active ? "none" : "1px solid color-mix(in srgb, currentColor 20%, transparent)",
        borderRadius: "0.5rem",
        fontWeight: active ? 700 : 500,
        fontSize: "0.813rem",
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

type TabId =
  | "domains"
  | "nodes_l2"
  | "nodes_l3"
  | "nodes_l4"
  | "master_products"
  | "proposals"
  | "policies"
  | "assortment"
  | "visibility";

const TABS: { id: TabId; label: string; disabled?: boolean; reason?: string }[] = [
  { id: "domains", label: "الفئات الرئيسية L1" },
  { id: "nodes_l2", label: "الفئات الفرعية L2" },
  { id: "nodes_l3", label: "التصنيفات الرئيسية L3" },
  { id: "nodes_l4", label: "التصنيفات الفرعية L4" },
  { id: "master_products", label: "المنتجات المركزية L5" },
  { id: "proposals", label: "اقتراحات المنتجات" },
  { id: "policies", label: "سياسات الفئة والمنصة" },
  { id: "assortment", label: "ربط المتاجر بالمنتجات" },
  { id: "visibility", label: "النشر والرؤية", disabled: true, reason: "متاح للقراءة والتحقق فقط" },
];

export function CatalogDashboardScreen() {
  const identity = useIdentitySession();
  const controller = useCentralCatalogController(identity.state.kind);

  const [activeTab, setActiveTab] = useState<TabId>("domains");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("store-1001");
  const [reasonByProposal, setReasonByProposal] = useState<Record<string, string>>({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [selectedProposalStatus, setSelectedProposalStatus] = useState<ProductProposalPipelineStatus>("partner-proposed");
  const [selectedAdoptedProductId, setSelectedAdoptedProductId] = useState<Record<string, string>>({});
  const [createProductInsteadOfLink, setCreateProductInsteadOfLink] = useState<Record<string, boolean>>({});

  const handleProposalDecision = async (proposalId: string, decision: "adopted" | "rejected" | "needs_fix", note: string) => {
    try {
      await controller.decideProposal(proposalId, { decision, reviewNote: note });
      alert("تم تسجيل القرار بنجاح");
    } catch (e: any) {
      alert("فشل تنفيذ القرار: " + (e.message ?? e.toString()));
    }
  };

  const handleProposalTransition = async (
    proposalId: string,
    nextStatus: ProductProposalPipelineStatus,
    note: string,
    adoptedMasterProductId?: string | null,
    createMasterProduct?: boolean,
  ) => {
    try {
      await controller.transitionProposal(proposalId, {
        nextStatus,
        note,
        adoptedMasterProductId,
        createMasterProduct,
      });
      alert("تمت ترقية حالة الاقتراح بنجاح");
      setReasonByProposal((curr) => ({ ...curr, [proposalId]: "" }));
    } catch (e: any) {
      alert("فشل ترقية حالة الاقتراح: " + (e.message ?? e.toString()));
    }
  };

  // Auth gate
  if (identity.state.kind !== "authenticated") {
    return (
      <section
        dir="rtl"
        style={{
          maxWidth: "32rem",
          margin: "4rem auto",
          display: "grid",
          gap: "1rem",
          padding: "1.5rem",
          border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
          borderRadius: "1rem",
          background: "Canvas",
        }}
      >
        <div>
          <h2 style={{ margin: 0, textAlign: "right" }}>كتالوج DSH المركزي</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            يتطلب حساب operator مصرح به لإدارة الكتالوج المركزي والسياسات.
          </p>
        </div>
        <CpTextInput
          value={username}
          onChange={setUsername}
          placeholder="اسم المستخدم"
          aria-label="اسم المستخدم"
        />
        <CpTextInput
          value={password}
          onChange={setPassword}
          placeholder="كلمة المرور"
          type="password"
          aria-label="كلمة المرور"
        />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton
            disabled={
              username.trim().length === 0 ||
              password.length < 4 ||
              identity.state.kind === "authenticating"
            }
            onClick={() => void identity.login(username.trim(), password)}
            style={{ flex: 1 }}
          >
            {identity.state.kind === "authenticating" ? "جاري التحقق..." : "تسجيل الدخول"}
          </CpButton>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            تجاوز (مطور)
          </CpButton>
        </div>
        {identity.state.kind === "error" && (
          <p role="alert" style={{ color: colorRoles.brandAction, textAlign: "right" }}>
            {identity.state.message}
          </p>
        )}
      </section>
    );
  }

  const domainsCount = controller.state.domains.items.length;
  const masterCount = controller.state.masterProducts.items.length;
  const proposalsPendingCount = controller.state.proposals.items.filter((p) =>
    ["partner-proposed", "partner-review", "marketing-review", "catalog-adopted", "catalog-approved"].includes(p.status)
  ).length;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="كتالوج DSH السيادي">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            الإدارة السيادية للفئات الرئيسية، الفئات الفرعية، التصنيفات، المنتجات المركزية، والسياسات.
          </p>

          <CpKpiStrip>
            <CpKpiCard label="الفئات الرئيسية L1" value={domainsCount} />
            <CpKpiCard label="المنتجات المركزية L5" value={masterCount} />
            <CpKpiCard label="اقتراحات بانتظار المراجعة" value={proposalsPendingCount} />
          </CpKpiStrip>
        </CpPageHeader>
      }
      stateView={
        controller.state.domains.loading ? (
          <CpStatePanel role="status" title="جاري تحميل الكتالوج المركزي..." />
        ) : null
      }
    >
      {/* Tab bar */}
      <nav
        dir="rtl"
        aria-label="تبويبات الكتالوج المركزي"
        style={{
          display: "flex",
          borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
          padding: "0 1rem 0.75rem",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <TabButton
              active={activeTab === t.id}
              disabled={t.disabled ?? false}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </TabButton>
            {t.disabled && t.reason && (
              <span style={{ fontSize: "0.65rem", opacity: 0.5, textAlign: "center" }}>
                {t.reason}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Filter and query options */}
      <CpFilterBar label="تصفية البيانات">
        {activeTab === "assortment" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.813rem" }}>معرف المتجر:</span>
            <CpTextInput
              value={selectedStoreId}
              onChange={(v) => {
                setSelectedStoreId(v);
                if (v.trim()) void controller.reloadStoreAssortment(v.trim());
              }}
              placeholder="مثال: store-1001"
            />
            <CpButton onClick={() => void controller.reloadStoreAssortment(selectedStoreId)}>
              جلب التشكيلة
            </CpButton>
          </div>
        )}
        <CpSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث..."
          wide
          aria-label="بحث في الصفحة الحالية"
        />
      </CpFilterBar>

      {/* DATA TABLES BY TAB */}
      <div style={{ marginTop: "1rem" }}>
        {activeTab === "domains" && (
          <CpTable aria-label="جدول الفئات الرئيسية">
            <thead>
              <tr dir="rtl">
                <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                <CpTableHeaderCell>الرمز السلوكي (Slug)</CpTableHeaderCell>
                <CpTableHeaderCell>الاسم العربي</CpTableHeaderCell>
                <CpTableHeaderCell>الاسم الانجليزي</CpTableHeaderCell>
                <CpTableHeaderCell>أيقونة</CpTableHeaderCell>
                <CpTableHeaderCell>يتطلب كتالوج منتجات</CpTableHeaderCell>
                <CpTableHeaderCell>الطلب اليدوي</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody dir="rtl">
              {controller.state.domains.items
                .filter((d) => d.nameAr.includes(searchQuery) || d.slug.includes(searchQuery))
                .map((d) => (
                  <tr key={d.id}>
                    <CpTableCell>{d.id}</CpTableCell>
                    <CpTableCell><code>{d.slug}</code></CpTableCell>
                    <CpTableCell>{d.nameAr}</CpTableCell>
                    <CpTableCell>{d.nameEn || "—"}</CpTableCell>
                    <CpTableCell>{d.icon || "—"}</CpTableCell>
                    <CpTableCell>{d.requiresProductCatalog ? "نعم" : "لا"}</CpTableCell>
                    <CpTableCell>{d.isManualRequest ? "نعم" : "لا"}</CpTableCell>
                    <CpTableCell>
                      <StatusBadge label={d.isActive ? "نشط" : "معطل"} tone={d.isActive ? "success" : "neutral"} />
                    </CpTableCell>
                  </tr>
                ))}
            </tbody>
          </CpTable>
        )}

        {(activeTab === "nodes_l2" || activeTab === "nodes_l3" || activeTab === "nodes_l4") && (
          <CpTable aria-label="جدول شجرة التصنيفات">
            <thead>
              <tr dir="rtl">
                <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                <CpTableHeaderCell>المستوى</CpTableHeaderCell>
                <CpTableHeaderCell>الاسم العربي</CpTableHeaderCell>
                <CpTableHeaderCell>الاسم الانجليزي</CpTableHeaderCell>
                <CpTableHeaderCell>الفئة الرئيسية L1</CpTableHeaderCell>
                <CpTableHeaderCell>يتطلب باركود</CpTableHeaderCell>
                <CpTableHeaderCell>يسمح باقتراح منتج</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody dir="rtl">
              {controller.state.nodes.items
                .filter((n) => {
                  const targetLevel =
                    activeTab === "nodes_l2"
                      ? "BUSINESS_SUBDOMAIN"
                      : activeTab === "nodes_l3"
                      ? "PRODUCT_MAIN_CLASS"
                      : "PRODUCT_SUB_CLASS";
                  return n.level === targetLevel && (n.nameAr.includes(searchQuery) || n.slug.includes(searchQuery));
                })
                .map((n) => (
                  <tr key={n.id}>
                    <CpTableCell>{n.id}</CpTableCell>
                    <CpTableCell><code>{n.level}</code></CpTableCell>
                    <CpTableCell>{n.nameAr}</CpTableCell>
                    <CpTableCell>{n.nameEn || "—"}</CpTableCell>
                    <CpTableCell>{n.domainId}</CpTableCell>
                    <CpTableCell>{n.requiresBarcode ? "نعم" : "لا"}</CpTableCell>
                    <CpTableCell>{n.allowsProductProposal ? "نعم" : "لا"}</CpTableCell>
                    <CpTableCell>
                      <StatusBadge label={n.isActive ? "نشط" : "معطل"} tone={n.isActive ? "success" : "neutral"} />
                    </CpTableCell>
                  </tr>
                ))}
            </tbody>
          </CpTable>
        )}

        {activeTab === "master_products" && (
          <CpTable aria-label="جدول المنتجات المركزية">
            <thead>
              <tr dir="rtl">
                <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                <CpTableHeaderCell>الاسم المركزي</CpTableHeaderCell>
                <CpTableHeaderCell>الاسم الانجليزي</CpTableHeaderCell>
                <CpTableHeaderCell>الماركة</CpTableHeaderCell>
                <CpTableHeaderCell>الباركود</CpTableHeaderCell>
                <CpTableHeaderCell>SKU</CpTableHeaderCell>
                <CpTableHeaderCell>الوحدة</CpTableHeaderCell>
                <CpTableHeaderCell>حالة الاعتماد</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody dir="rtl">
              {controller.state.masterProducts.items
                .filter((m) => m.canonicalNameAr.includes(searchQuery) || (m.barcode && m.barcode.includes(searchQuery)))
                .map((m) => (
                  <tr key={m.id}>
                    <CpTableCell>{m.id}</CpTableCell>
                    <CpTableCell><strong>{m.canonicalNameAr}</strong></CpTableCell>
                    <CpTableCell>{m.canonicalNameEn || "—"}</CpTableCell>
                    <CpTableCell>{m.brand || "—"}</CpTableCell>
                    <CpTableCell><code>{m.barcode || "—"}</code></CpTableCell>
                    <CpTableCell><code>{m.sku || "—"}</code></CpTableCell>
                    <CpTableCell>{m.unit}</CpTableCell>
                    <CpTableCell>
                      <StatusBadge label={m.approvalStatus} tone={m.approvalStatus === "approved" ? "success" : "warning"} />
                    </CpTableCell>
                    <CpTableCell>
                      <StatusBadge label={m.isActive ? "نشط" : "معطل"} tone={m.isActive ? "success" : "neutral"} />
                    </CpTableCell>
                  </tr>
                ))}
            </tbody>
          </CpTable>
        )}

        {activeTab === "proposals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
            {/* Horizontal Sub-tabs for pipeline stages */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", borderBottom: "1px solid color-mix(in srgb, currentColor 10%, transparent)", paddingBottom: "1rem" }}>
              {(Object.keys(PRODUCT_PROPOSAL_PIPELINE_METADATA) as ProductProposalPipelineStatus[]).map((status) => {
                const meta = PRODUCT_PROPOSAL_PIPELINE_METADATA[status];
                const count = controller.state.proposals.items.filter((p) => p.status === status).length;
                const isSelected = selectedProposalStatus === status;
                return (
                  <CpButton
                    key={status}
                    style={{
                      backgroundColor: isSelected ? colorRoles.brandAction : "transparent",
                      color: isSelected ? "white" : "currentColor",
                      border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
                      borderRadius: "0.5rem",
                      padding: "0.35rem 0.75rem",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedProposalStatus(status)}
                  >
                    {meta.labelAr} ({count})
                  </CpButton>
                );
              })}
            </div>

            <CpTable aria-label="جدول اقتراحات المنتجات">
              <thead>
                <tr dir="rtl">
                  <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                  <CpTableHeaderCell>الاسم المقترح</CpTableHeaderCell>
                  <CpTableHeaderCell>الماركة / الباركود</CpTableHeaderCell>
                  <CpTableHeaderCell>السطح المصدر</CpTableHeaderCell>
                  <CpTableHeaderCell>ملاحظة المراجعة</CpTableHeaderCell>
                  <CpTableHeaderCell>الخيارات والإجراءات السيادية</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody dir="rtl">
                {controller.state.proposals.items
                  .filter((p) => p.status === selectedProposalStatus && p.proposedNameAr.includes(searchQuery))
                  .map((p) => {
                    const note = reasonByProposal[p.id] ?? "";
                    const isCreate = createProductInsteadOfLink[p.id] ?? false;
                    const linkId = selectedAdoptedProductId[p.id] ?? "";
                    return (
                      <tr key={p.id}>
                        <CpTableCell>{p.id}</CpTableCell>
                        <CpTableCell>
                          <strong>{p.proposedNameAr}</strong>
                          {p.proposedNameEn && <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{p.proposedNameEn}</div>}
                        </CpTableCell>
                        <CpTableCell>{p.brand || "—"} / <code>{p.barcode || "—"}</code></CpTableCell>
                        <CpTableCell><code>{p.sourceSurface}</code></CpTableCell>
                        <CpTableCell>{p.reviewNote || "—"}</CpTableCell>
                        <CpTableCell style={{ verticalAlign: "middle" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: "400px" }}>
                            {/* Option inputs depending on status */}
                            {selectedProposalStatus === "marketing-review" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.5rem", background: "color-mix(in srgb, currentColor 4%, transparent)", borderRadius: "0.5rem" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={isCreate}
                                    onChange={(e) => setCreateProductInsteadOfLink((curr) => ({ ...curr, [p.id]: e.target.checked }))}
                                  />
                                  <span>إنشاء منتج مركزي جديد (Master Product)</span>
                                </label>
                                {!isCreate && (
                                  <CpTextInput
                                    value={linkId}
                                    onChange={(val) => setSelectedAdoptedProductId((curr) => ({ ...curr, [p.id]: val }))}
                                    placeholder="معرف المنتج المركزي للربط (L5 id)..."
                                    aria-label={`ربط بمنتج مركزي موجود للاقتراح ${p.id}`}
                                  />
                                )}
                              </div>
                            )}

                            <div style={{ display: "flex", gap: "0.25rem" }}>
                              {/* Reason/Note Input */}
                              <CpTextInput
                                value={note}
                                onChange={(value) => setReasonByProposal((curr) => ({ ...curr, [p.id]: value }))}
                                placeholder="ملاحظة أو سبب القرار للخطوة التالية..."
                                aria-label={`ملاحظة القرار للاقتراح ${p.id}`}
                              />

                              {/* Action Buttons based on status */}
                              {selectedProposalStatus === "partner-proposed" && (
                                <>
                                  <CpButton
                                    disabled={!note.trim()}
                                    onClick={() => handleProposalTransition(p.id, "partner-review", note)}
                                  >
                                    بدء المراجعة
                                  </CpButton>
                                  <CpButton
                                    disabled={!note.trim()}
                                    onClick={() => handleProposalTransition(p.id, "needs-fix", note)}
                                    style={{ opacity: 0.8 }}
                                  >
                                    طلب تعديل
                                  </CpButton>
                                  <CpButton
                                    disabled={!note.trim()}
                                    onClick={() => handleProposalTransition(p.id, "rejected", note)}
                                    style={{ opacity: 0.8 }}
                                  >
                                    رفض
                                  </CpButton>
                                </>
                              )}

                              {selectedProposalStatus === "partner-review" && (
                                <>
                                  <CpButton
                                    disabled={!note.trim()}
                                    onClick={() => handleProposalTransition(p.id, "marketing-review", note)}
                                  >
                                    إحالة للتسويق
                                  </CpButton>
                                  <CpButton
                                    disabled={!note.trim()}
                                    onClick={() => handleProposalTransition(p.id, "needs-fix", note)}
                                    style={{ opacity: 0.8 }}
                                  >
                                    طلب تعديل
                                  </CpButton>
                                  <CpButton
                                    disabled={!note.trim()}
                                    onClick={() => handleProposalTransition(p.id, "rejected", note)}
                                    style={{ opacity: 0.8 }}
                                  >
                                    رفض
                                  </CpButton>
                                </>
                              )}

                              {selectedProposalStatus === "marketing-review" && (
                                <>
                                  <CpButton
                                    disabled={!note.trim() || (!isCreate && !linkId.trim())}
                                    onClick={() => handleProposalTransition(p.id, "catalog-adopted", note, isCreate ? null : linkId, isCreate)}
                                  >
                                    اعتماد ودمج
                                  </CpButton>
                                  <CpButton
                                    disabled={!note.trim()}
                                    onClick={() => handleProposalTransition(p.id, "needs-fix", note)}
                                    style={{ opacity: 0.8 }}
                                  >
                                    طلب تعديل
                                  </CpButton>
                                  <CpButton
                                    disabled={!note.trim()}
                                    onClick={() => handleProposalTransition(p.id, "rejected", note)}
                                    style={{ opacity: 0.8 }}
                                  >
                                    رفض
                                  </CpButton>
                                </>
                              )}

                              {selectedProposalStatus === "catalog-adopted" && (
                                <CpButton
                                  disabled={!note.trim()}
                                  onClick={() => handleProposalTransition(p.id, "catalog-approved", note)}
                                >
                                  تفعيل واعتماد الكتالوج
                                </CpButton>
                              )}

                              {selectedProposalStatus === "catalog-approved" && (
                                <CpButton
                                  disabled={!note.trim()}
                                  onClick={() => handleProposalTransition(p.id, "client-visible", note)}
                                >
                                  نشر ورؤية للعميل
                                </CpButton>
                              )}

                              {selectedProposalStatus === "needs-fix" && (
                                <CpButton
                                  disabled={!note.trim()}
                                  onClick={() => handleProposalTransition(p.id, "partner-proposed", note)}
                                >
                                  إعادة فتح الاقتراح للمراجعة
                                </CpButton>
                              )}

                              {selectedProposalStatus === "rejected" && (
                                <CpButton
                                  disabled={!note.trim()}
                                  onClick={() => handleProposalTransition(p.id, "partner-proposed", note)}
                                >
                                  إعادة فتح الاقتراح المرفوض
                                </CpButton>
                              )}
                            </div>
                          </div>
                        </CpTableCell>
                      </tr>
                    );
                  })}
              </tbody>
            </CpTable>
          </div>
        )}

        {activeTab === "policies" && (
          <CpTable aria-label="جدول السياسات">
            <thead>
              <tr dir="rtl">
                <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                <CpTableHeaderCell>السياسة / النطاق</CpTableHeaderCell>
                <CpTableHeaderCell>عمولة المنصة</CpTableHeaderCell>
                <CpTableHeaderCell>عمولة الشريك الميداني</CpTableHeaderCell>
                <CpTableHeaderCell>رسوم الانضمام</CpTableHeaderCell>
                <CpTableHeaderCell>يسمح بصورة مخصصة</CpTableHeaderCell>
                <CpTableHeaderCell>يتطلب باركود</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody dir="rtl">
              {controller.state.policies.items.map((p) => (
                <tr key={p.id}>
                  <CpTableCell>{p.id}</CpTableCell>
                  <CpTableCell><code>{p.policyScope}</code></CpTableCell>
                  <CpTableCell>{p.platformCommissionRate * 100}%</CpTableCell>
                  <CpTableCell>{p.fieldPartnerOnboardingCommissionAmount} {p.fieldPartnerOnboardingCommissionCurrency}</CpTableCell>
                  <CpTableCell>{p.storeOnboardingFeeAmount} {p.storeOnboardingFeeCurrency}</CpTableCell>
                  <CpTableCell>{p.allowsStoreProductCustomImage ? "نعم" : "لا"}</CpTableCell>
                  <CpTableCell>{p.requiresBarcode ? "نعم" : "لا"}</CpTableCell>
                  <CpTableCell>
                    <StatusBadge label={p.isActive ? "نشط" : "معطل"} tone={p.isActive ? "success" : "neutral"} />
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}

        {activeTab === "assortment" && (
          <CpTable aria-label="جدول تشكيلة المتجر">
            <thead>
              <tr dir="rtl">
                <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                <CpTableHeaderCell>المنتج المركزي</CpTableHeaderCell>
                <CpTableHeaderCell>السعر المحلي</CpTableHeaderCell>
                <CpTableHeaderCell>التوفر</CpTableHeaderCell>
                <CpTableHeaderCell>حالة المخزون</CpTableHeaderCell>
                <CpTableHeaderCell>ملاحظة محلية</CpTableHeaderCell>
                <CpTableHeaderCell>صورة مخصصة</CpTableHeaderCell>
                <CpTableHeaderCell>حالة النشر</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody dir="rtl">
              {controller.assortment.items.map((a) => (
                <tr key={a.id}>
                  <CpTableCell>{a.id}</CpTableCell>
                  <CpTableCell>{a.masterProductId}</CpTableCell>
                  <CpTableCell>{a.unitPrice} {a.currency}</CpTableCell>
                  <CpTableCell>{a.available ? "متاح" : "غير متاح"}</CpTableCell>
                  <CpTableCell>
                    <StatusBadge
                      label={a.stockStatus}
                      tone={a.stockStatus === "in_stock" ? "success" : a.stockStatus === "low_stock" ? "warning" : "danger"}
                    />
                  </CpTableCell>
                  <CpTableCell>{a.localNote || "—"}</CpTableCell>
                  <CpTableCell>{a.customImageObjectKey || "—"}</CpTableCell>
                  <CpTableCell>
                    <StatusBadge label={a.publicationStatus} tone={a.publicationStatus === "client_visible" ? "success" : "neutral"} />
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>
    </DataTablePageFrame>
  );
}
