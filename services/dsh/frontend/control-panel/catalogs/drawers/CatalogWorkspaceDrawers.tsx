"use client";
import { colorRoles } from '@bthwani/ui-kit';
import React, { useState } from "react";
import { opsTheme } from "../../../shared/operations";
import { CpButton, CpTextInput } from "@bthwani/control-panel/components";

// ─── TYPES & RESOLVERS ────────────────────────────────────────────────────────

export type CatalogWorkspaceId =
  | "item-detail"
  | "identity-governance"
  | "duplicate-resolution"
  | "visibility-policy"
  | "partner-handoff"
  | "media-governance"
  | "quick-entry-drafts"
  | "taxonomy-governance"
  | "bulk-operations"
  | "audit-trail"
  | "publication-readiness"
  | "adoption-queue";

export type CatalogWorkspaceState = {
  workspace: CatalogWorkspaceId;
  productId?: string;
  partnerId?: string;
  partnerLabel?: string;
};

export type DuplicatePair = {
  sourceId: string;
  candidateId: string;
  reason: string;
  conflictFields: string[];
};

export type CatalogWorkspaceRouterProps = {
  workspaceState: CatalogWorkspaceState | null;
  products: readonly any[];
  selectedProductIds: readonly string[];
  onClose: () => void;
  onProposal: (proposal: any) => void;
};

const mediaPolicyLabel: Record<string, string> = {
  "catalog-owned-media": "مركزي (الكتالوج)",
  "partner-owned-exception": "استثناء شريك",
  "partner-proposed-review": "مقترح للمراجعة",
  "marketing-enhancement-required": "يحتاج تسويق",
};

const catalogApprovalStageLabel: Record<string, string> = {
  "catalog-draft": "مسودة الكتالوج",
  "catalog-approved": "معتمد في الكتالوج",
  "partner-proposed": "مقترح من الشريك",
  "partner-review": "مراجعة الشركاء",
  "marketing-review": "مراجعة التسويق",
  "catalog-adopted": "مُعتمد ومُدمج",
  "client-visible": "ظاهر للعميل",
};

// ─── WORKSPACE ROUTER ─────────────────────────────────────────────────────────

export function CatalogWorkspaceRouter({
  workspaceState,
  products,
  selectedProductIds,
  onClose,
  onProposal,
}: CatalogWorkspaceRouterProps) {
  if (!workspaceState) return null;

  const { workspace, productId } = workspaceState;

  let drawerContent: React.ReactNode = null;

  switch (workspace) {
    case "item-detail": {
      const p = products.find((pr) => pr.id === productId);
      if (p) {
        drawerContent = <CatalogItemDetailWorkspace product={p} onClose={onClose} onProposal={onProposal} />;
      }
      break;
    }
    case "duplicate-resolution": {
      drawerContent = <CatalogDuplicateResolutionWorkspace products={products} onClose={onClose} onProposal={onProposal} />;
    }
    break;
    case "identity-governance": {
      drawerContent = <CatalogIdentityGovernanceWorkspace products={products} onClose={onClose} onProposal={onProposal} />;
    }
    break;
    case "visibility-policy": {
      const p = products.find((pr) => pr.id === productId) ?? products[0];
      if (p) {
        drawerContent = <CatalogVisibilityPolicyWorkspace product={p} onClose={onClose} onProposal={onProposal} />;
      }
      break;
    }
    case "partner-handoff": {
      drawerContent = <CatalogPartnerHandoffWorkspace workspaceState={workspaceState} products={products} onClose={onClose} onProposal={onProposal} />;
    }
    break;
    case "media-governance": {
      drawerContent = <CatalogMediaGovernanceWorkspace products={products} onClose={onClose} onProposal={onProposal} />;
    }
    break;
    case "quick-entry-drafts": {
      drawerContent = <CatalogQuickEntryDraftWorkspace onClose={onClose} onProposal={onProposal} />;
    }
    break;
    case "taxonomy-governance": {
      drawerContent = <CatalogTaxonomyGovernanceWorkspace onClose={onClose} onProposal={onProposal} />;
    }
    break;
    case "bulk-operations": {
      drawerContent = <CatalogBulkOperationsWorkspace selectedProductIds={selectedProductIds} onClose={onClose} onProposal={onProposal} />;
    }
    break;
    case "audit-trail": {
      drawerContent = <CatalogAuditTrailWorkspace productId={productId} onClose={onClose} />;
    }
    break;
    case "publication-readiness": {
      drawerContent = <CatalogPublicationReadinessMatrix products={products} onClose={onClose} />;
    }
    break;
    case "adoption-queue": {
      drawerContent = <CatalogAdoptionQueueWorkspace products={products} onClose={onClose} onProposal={onProposal} />;
    }
    break;
    default:
      break;
  }

  if (!drawerContent) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
        }}
      />
      {/* Content wrapper */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "34rem",
          height: "100%",
          backgroundColor: "var(--surface-raised, colorRoles.surfaceBase)",
          borderLeft: `1px solid ${opsTheme.line}`,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}} />
        {drawerContent}
      </div>
    </div>
  );
}

// ─── DRAWERS IMPLEMENTATIONS ──────────────────────────────────────────────────

function DrawerHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div
      dir="rtl"
      style={{
        padding: "1.25rem 1.5rem",
        borderBottom: `1px solid ${opsTheme.line}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ textAlign: "right" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: opsTheme.text }}>{title}</h2>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: opsTheme.textMuted }}>{subtitle}</p>
      </div>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          fontSize: "1.5rem",
          cursor: "pointer",
          color: opsTheme.textMuted,
        }}
      >
        &times;
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1rem", background: opsTheme.surfaceInset, borderRadius: "0.5rem" }}>
      <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, borderBottom: `1px solid ${opsTheme.line}`, paddingBottom: "0.25rem", color: opsTheme.brand }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
      <span style={{ color: opsTheme.textMuted }}>{label}</span>
      <strong style={{ color: color || opsTheme.text }}>{value}</strong>
    </div>
  );
}

// 1. Item Detail Drawer
export function CatalogItemDetailWorkspace({ product, onClose, onProposal }: { product: any; onClose: () => void; onProposal: (p: any) => void }) {
  const [result, setResult] = useState<string | null>(null);

  const handleRequestFix = () => {
    setResult("تم تسجيل طلب تصحيح محلياً للكتالوج");
    onProposal({
      type: "edit-product",
      productId: product.id,
      label: `تصحيح منتج: ${product.name}`,
      note: "طلب تصحيح من المشغل",
    });
  };

  return (
    <>
      <DrawerHeader title={product.name} subtitle="تفاصيل عنصر الكتالوج" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <Section title="الهوية">
          <InfoRow label="الاسم" value={product.name} />
          <InfoRow label="SKU" value={product.sku || "—"} />
          <InfoRow label="الباركود" value={product.barcode || "—"} />
          <InfoRow label="المرحلة" value={catalogApprovalStageLabel[product.approvalStage] || product.approvalStage} color={opsTheme.brand} />
          <InfoRow label="السعر" value={`${product.priceReference || product.price || 0} ر.س`} />
        </Section>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
          <CpButton onClick={handleRequestFix} style={{ flex: 1 }}>طلب تعديل</CpButton>
          <CpButton onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إغلاق</CpButton>
        </div>
      </div>
    </>
  );
}

// 2. Duplicate Resolution Drawer
export function CatalogDuplicateResolutionWorkspace({ products, onClose, onProposal }: { products: readonly any[]; onClose: () => void; onProposal: (p: any) => void }) {
  const [result, setResult] = useState<string | null>(null);

  const handleResolve = () => {
    setResult("تم إرسال قرار حل التكرار للمراجعة");
    onProposal({
      type: "conflict-resolution",
      label: "حل تكرار المنتجات",
      note: "دمج العناصر المتكررة",
    });
  };

  return (
    <>
      <DrawerHeader title="حل المنتجات المتكررة" subtitle="تحديد المنتجات المتشابهة ودمجها" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <p style={{ fontSize: "0.813rem", color: opsTheme.textMuted }}>مقارنة ودمج العناصر المتشابهة لتجنب تكرار الكتالوج:</p>
        <Section title="العناصر المتشابهة">
          {products.slice(0, 2).map((p, i) => (
            <div key={p.id} style={{ padding: "0.5rem", borderBottom: i === 0 ? `1px solid ${opsTheme.line}` : "none", fontSize: "0.813rem" }}>
              <strong>{p.name}</strong>
              <div>SKU: {p.sku || "—"} | السعر: {p.price || 0} ر.س</div>
            </div>
          ))}
        </Section>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
          <CpButton onClick={handleResolve} style={{ flex: 1 }}>دمج وحل التكرار</CpButton>
          <CpButton onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إغلاق</CpButton>
        </div>
      </div>
    </>
  );
}

// 3. Identity Governance Drawer
export function CatalogIdentityGovernanceWorkspace({ products, onClose, onProposal }: { products: readonly any[]; onClose: () => void; onProposal: (p: any) => void }) {
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleSave = () => {
    setResult("تم تحديث الباركود والـ GTIN بنجاح");
    onProposal({
      type: "barcode-reservation",
      label: "حجز باركود جديد",
      note: `تخصيص باركود يدوي: ${barcode}`,
    });
  };

  return (
    <>
      <DrawerHeader title="حوكمة الهوية والرموز" subtitle="تعديل وتدقيق الباركود وGTIN" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <Section title="تعديل باركود يدوي">
          <label style={{ fontSize: "0.813rem", fontWeight: 600 }}>الباركود الجديد (GTIN-13):</label>
          <CpTextInput value={barcode} onChange={setBarcode} placeholder="أدخل رقم الباركود..." aria-label="أدخل رقم الباركود" />
        </Section>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
          <CpButton onClick={handleSave} style={{ flex: 1 }}>حفظ التغييرات</CpButton>
          <CpButton onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إلغاء</CpButton>
        </div>
      </div>
    </>
  );
}

// 4. Visibility Policy Drawer
export function CatalogVisibilityPolicyWorkspace({ product, onClose, onProposal }: { product: any; onClose: () => void; onProposal: (p: any) => void }) {
  const [result, setResult] = useState<string | null>(null);

  const handleUpdate = (stage: string) => {
    setResult(`تم تحديث مرحلة الرؤية إلى: ${stage}`);
    onProposal({
      type: "visibility-change",
      productId: product.id,
      label: `تغيير رؤية منتج: ${product.name}`,
      note: `المرحلة الجديدة: ${stage}`,
    });
  };

  return (
    <>
      <DrawerHeader title="سياسة رؤية المنتج" subtitle="بوابات الظهور والنشر للعملاء" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <Section title="الحالة الحالية">
          <InfoRow label="اسم المنتج" value={product.name} />
          <InfoRow label="مرحلة الاعتماد الحالية" value={catalogApprovalStageLabel[product.approvalStage] || product.approvalStage} color={opsTheme.brand} />
        </Section>
        <Section title="تغيير مرحلة النشر">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <CpButton onClick={() => handleUpdate("client-visible")}>نشر للعميل مباشرة (client-visible)</CpButton>
            <CpButton onClick={() => handleUpdate("catalog-adopted")}>اعتماد في الكتالوج فقط (catalog-adopted)</CpButton>
            <CpButton onClick={() => handleUpdate("marketing-review")}>إرسال لمراجعة التسويق (marketing-review)</CpButton>
          </div>
        </Section>
        <CpButton onClick={onClose} style={{ marginTop: "auto", background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إغلاق</CpButton>
      </div>
    </>
  );
}

// 5. Partner Handoff Drawer
export function CatalogPartnerHandoffWorkspace({ workspaceState, products, onClose, onProposal }: { workspaceState: any; products: readonly any[]; onClose: () => void; onProposal: (p: any) => void }) {
  const [result, setResult] = useState<string | null>(null);

  const handleApprove = () => {
    setResult("تمت الموافقة على تسليم الشريك للكتالوج");
    onProposal({
      type: "create-product",
      label: "اعتماد تسليم الشريك",
      note: `الشريك: ${workspaceState.partnerLabel || "شريك"}`,
    });
  };

  return (
    <>
      <DrawerHeader title="تسليم الكتالوج من الشريك" subtitle="مراجعة المنتجات المستلمة من الشركاء" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <Section title="بيانات التسليم">
          <InfoRow label="معرف الشريك" value={workspaceState.partnerId || "partner-001"} />
          <InfoRow label="اسم الشريك" value={workspaceState.partnerLabel || "شريك افتراضي"} />
          <InfoRow label="إجمالي المنتجات المستلمة" value={String(products.length)} />
        </Section>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
          <CpButton onClick={handleApprove} style={{ flex: 1 }}>موافقة واعتماد التسليم</CpButton>
          <CpButton onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إغلاق</CpButton>
        </div>
      </div>
    </>
  );
}

// 6. Media Governance Drawer
export function CatalogMediaGovernanceWorkspace({ products, onClose, onProposal }: { products: readonly any[]; onClose: () => void; onProposal: (p: any) => void }) {
  const [result, setResult] = useState<string | null>(null);

  const handleAudit = () => {
    setResult("تم تحديث سياسة الصور والوسائط للمنتجات المحددة");
    onProposal({
      type: "media-policy-change",
      label: "تدقيق سياسة الميديا",
      note: "موافقة جماعية على جودة الصور",
    });
  };

  return (
    <>
      <DrawerHeader title="حوكمة الصور والوسائط" subtitle="مراجعة وتدقيق صور المنتجات ومطابقتها للشروط" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <p style={{ fontSize: "0.813rem", color: opsTheme.textMuted }}>تأكد من أن جميع صور المنتجات ذات جودة عالية وخالية من الشعارات المائية المخالفة:</p>
        <Section title="المنتجات المحددة للمراجعة">
          {products.slice(0, 3).map((p) => (
            <InfoRow key={p.id} label={p.name} value={mediaPolicyLabel[p.mediaPolicy] || "غير محدد"} />
          ))}
        </Section>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
          <CpButton onClick={handleAudit} style={{ flex: 1 }}>اعتماد جودة الميديا</CpButton>
          <CpButton onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إلغاء</CpButton>
        </div>
      </div>
    </>
  );
}

// 7. Quick Entry Draft Drawer
export function CatalogQuickEntryDraftWorkspace({ onClose, onProposal }: { onClose: () => void; onProposal: (p: any) => void }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    setResult("تم إنشاء مسودة المنتج بنجاح");
    onProposal({
      type: "create-product",
      label: `إنشاء منتج: ${name}`,
      note: `SKU: ${sku} | السعر: ${price} ر.س`,
    });
  };

  return (
    <>
      <DrawerHeader title="إدخال مسودة سريعة" subtitle="إضافة منتج جديد للكتالوج بسرعة" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <Section title="بيانات المنتج الجديد">
          <label style={{ fontSize: "0.813rem", fontWeight: 600 }}>اسم المنتج *</label>
          <CpTextInput value={name} onChange={setName} placeholder="مثال: حليب المراعي 1 لتر" aria-label="اسم المنتج" />

          <label style={{ fontSize: "0.813rem", fontWeight: 600 }}>رمز SKU</label>
          <CpTextInput value={sku} onChange={setSku} placeholder="مثال: SKU-MILK-001" aria-label="رمز SKU" />

          <label style={{ fontSize: "0.813rem", fontWeight: 600 }}>السعر الأساسي</label>
          <CpTextInput value={price} onChange={setPrice} placeholder="مثال: 5.50" aria-label="السعر الأساسي" />
        </Section>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
          <CpButton onClick={handleCreate} disabled={!name.trim()} style={{ flex: 1 }}>إنشاء مسودة</CpButton>
          <CpButton onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إلغاء</CpButton>
        </div>
      </div>
    </>
  );
}

// 8. Taxonomy Governance Drawer
export function CatalogTaxonomyGovernanceWorkspace({ onClose, onProposal }: { onClose: () => void; onProposal: (p: any) => void }) {
  const [catName, setCatName] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleAdd = () => {
    if (!catName.trim()) return;
    setResult("تم تسجيل مقترح إضافة فئة جديدة");
    onProposal({
      type: "category-change",
      label: `إضافة فئة: ${catName}`,
      note: "طلب هيكلة فئة جديدة",
    });
  };

  return (
    <>
      <DrawerHeader title="إدارة هيكل الفئات" subtitle="تعديل وتوسيع شجرة الفئات والتصنيفات" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <Section title="إضافة فئة جديدة">
          <label style={{ fontSize: "0.813rem", fontWeight: 600 }}>اسم الفئة المقترحة *</label>
          <CpTextInput value={catName} onChange={setCatName} placeholder="مثال: المشروبات الغازية" aria-label="اسم الفئة" />
        </Section>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
          <CpButton onClick={handleAdd} disabled={!catName.trim()} style={{ flex: 1 }}>اقتراح الفئة</CpButton>
          <CpButton onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إلغاء</CpButton>
        </div>
      </div>
    </>
  );
}

// 9. Bulk Operations Drawer
export function CatalogBulkOperationsWorkspace({ selectedProductIds, onClose, onProposal }: { selectedProductIds: readonly string[]; onClose: () => void; onProposal: (p: any) => void }) {
  const [result, setResult] = useState<string | null>(null);

  const handleBulkAction = (action: string) => {
    setResult(`تم تطبيق الإجراء الجماعي (${action}) على المنتجات المحددة`);
    onProposal({
      type: "bulk-approve",
      productIds: selectedProductIds,
      label: `إجراء جماعي: ${action}`,
      note: `تأثير على ${selectedProductIds.length} منتج`,
    });
  };

  return (
    <>
      <DrawerHeader title="العمليات الجماعية" subtitle="تطبيق تعديلات على عناصر متعددة دفعة واحدة" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <p style={{ fontSize: "0.813rem", color: opsTheme.textMuted }}>إجمالي المنتجات المحددة حالياً: {selectedProductIds.length}</p>
        <Section title="الخطوات السريعة المتاحة">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <CpButton onClick={() => handleBulkAction("تفعيل")} disabled={selectedProductIds.length === 0}>تفعيل جماعي</CpButton>
            <CpButton onClick={() => handleBulkAction("تعطيل")} disabled={selectedProductIds.length === 0}>تعطيل جماعي</CpButton>
            <CpButton onClick={() => handleBulkAction("طلب صور")} disabled={selectedProductIds.length === 0}>طلب مراجعة الصور جماعياً</CpButton>
          </div>
        </Section>
        <CpButton onClick={onClose} style={{ marginTop: "auto", background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إغلاق</CpButton>
      </div>
    </>
  );
}

// 10. Audit Trail Drawer
export function CatalogAuditTrailWorkspace({ productId, onClose }: { productId?: string; onClose: () => void }) {
  return (
    <>
      <DrawerHeader title="سجل التغييرات والتدقيق" subtitle="مراقبة حوكمة المنتج وسوابق القرارات" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        <p style={{ fontSize: "0.813rem", color: opsTheme.textMuted }}>المنتج: {productId || "عام"}</p>
        <Section title="سجل الأحداث الأخيرة (محاكاة)">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.75rem" }}>
            <div style={{ paddingBottom: "0.5rem", borderBottom: `1px dashed ${opsTheme.line}` }}>
              <div><strong>تعديل السعر المرجعي</strong> - بواسطة المشغل (operator)</div>
              <span style={{ color: opsTheme.textMuted }}>منذ ساعتين · تذكرة #TKT-821</span>
            </div>
            <div style={{ paddingBottom: "0.5rem", borderBottom: `1px dashed ${opsTheme.line}` }}>
              <div><strong>اعتماد سياسة الصور</strong> - تلقائي من النظام</div>
              <span style={{ color: opsTheme.textMuted }}>منذ يوم واحد · سياسة مركزي</span>
            </div>
            <div>
              <div><strong>رفع مسودة المنتج</strong> - بواسطة شريك متجر النور</div>
              <span style={{ color: opsTheme.textMuted }}>منذ 3 أيام · استيراد تلقائي</span>
            </div>
          </div>
        </Section>
        <CpButton onClick={onClose} style={{ marginTop: "auto", background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إغلاق</CpButton>
      </div>
    </>
  );
}

// 11. Publication Readiness Matrix Drawer
export function CatalogPublicationReadinessMatrix({ products, onClose }: { products: readonly any[]; onClose: () => void }) {
  return (
    <>
      <DrawerHeader title="مصفوفة جاهزية النشر" subtitle="بوابات العبور والجودة قبل عرض المنتج للعميل" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        <Section title="بوابات الجودة">
          <InfoRow label="اعتماد الفئات" value="مكتمل (100%)" color={opsTheme.success} />
          <InfoRow label="سلامة الباركود" value="مراجعة (92%)" color={opsTheme.warning} />
          <InfoRow label="سياسة الصور" value="مكتمل (100%)" color={opsTheme.success} />
          <InfoRow label="أنماط التوصيل" value="شغالة (100%)" color={opsTheme.success} />
        </Section>
        <CpButton onClick={onClose} style={{ marginTop: "auto", background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إغلاق</CpButton>
      </div>
    </>
  );
}

// 12. Adoption Queue Drawer
export function CatalogAdoptionQueueWorkspace({ products, onClose, onProposal }: { products: readonly any[]; onClose: () => void; onProposal: (p: any) => void }) {
  const [result, setResult] = useState<string | null>(null);

  const handleAdopt = () => {
    setResult("تم إرسال المنتجات المعتمدة إلى طابور التبني النهائي");
    onProposal({
      type: "bulk-send-marketing",
      label: "تبني المنتجات في الكتالوج",
      note: "تحويل المنتجات من مرحلة مراجعة التسويق إلى التبني المدمج",
    });
  };

  return (
    <>
      <DrawerHeader title="طابور التبني النهائي" subtitle="اعتماد وتسجيل التبني لتفعيل الرؤية" onClose={onClose} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
        {result && <div style={{ padding: "0.75rem", background: opsTheme.successSurface, border: `1px solid ${opsTheme.success}`, color: opsTheme.success, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}
        <Section title="منتجات بانتظار التبني">
          {products.slice(0, 3).map((p) => (
            <InfoRow key={p.id} label={p.name} value={catalogApprovalStageLabel[p.approvalStage] || p.approvalStage} />
          ))}
        </Section>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
          <CpButton onClick={handleAdopt} style={{ flex: 1 }}>اعتماد وتبني العناصر</CpButton>
          <CpButton onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${opsTheme.line}`, color: opsTheme.text }}>إغلاق</CpButton>
        </div>
      </div>
    </>
  );
}
