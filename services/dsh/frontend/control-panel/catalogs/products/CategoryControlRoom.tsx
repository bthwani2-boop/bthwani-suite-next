"use client";
import { Button, colorRoles } from '@bthwani/ui-kit';
import { useMemo, useState } from "react";
import { CpMutedInline, CpTextInput } from "@bthwani/control-panel/components";
import type {
  CentralCatalogDomain,
  CentralCatalogNode,
  createCatalogDomain,
  createCatalogNode,
  CatalogDomainUpdateInput,
  CatalogNodeUpdateInput } from "../../../shared/catalog";

// ─── Style constants (static/layout styles reused across the tree) ───────────
const panelStyle: React.CSSProperties = {
  backgroundColor: colorRoles.surfaceBase,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  flexShrink: 0,
  minHeight: 0 };
const toggleButtonRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%" };
const toggleButtonLabelStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "6px" };
const bodyStyle: React.CSSProperties = { padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" };
const errorBoxStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "4px",
  backgroundColor: colorRoles.surfaceBase,
  border: `1px solid ${colorRoles.brandAction}`,
  fontSize: "10px",
  color: colorRoles.brandAction,
  fontWeight: 700,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center" };
const toolbarRowStyle: React.CSSProperties = { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" };
const formBoxStyle: React.CSSProperties = {
  padding: "10px",
  borderRadius: "6px",
  backgroundColor: colorRoles.surfaceBase,
  border: `1px solid ${colorRoles.brandAction}`,
  display: "flex",
  flexDirection: "column",
  gap: "8px" };
const formTitleStyle: React.CSSProperties = { fontSize: "10px", fontWeight: 800, color: colorRoles.brandAction };
const formActionsRowStyle: React.CSSProperties = { display: "flex", gap: "6px" };
const editRowStyle: React.CSSProperties = { display: "flex", gap: "0.5rem", flex: 1 };
const listColumnStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };
const childColumnStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.25rem" };
const rowContainerStyle: React.CSSProperties = { padding: "0.5rem", borderBottom: `1px solid ${colorRoles.surfaceBase}`, display: "flex", flexDirection: "column", gap: "0.5rem" };
const rowHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const rowActionsStyle: React.CSSProperties = { display: "flex", gap: "0.25rem" };
const inlineChildrenStyle: React.CSSProperties = { marginRight: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem", borderRight: `1px dashed ${colorRoles.surfaceBase}`, paddingRight: "0.5rem" };
const childRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0" };
const nameLabelStyle: React.CSSProperties = { flex: 1, textAlign: "right" };
const childLabelStyle: React.CSSProperties = { fontSize: "0.813rem", color: colorRoles.brandStructure };
const toggleButtonFullStyle: React.CSSProperties = {
  width: "100%",
  appearance: "none",
  border: "none",
  backgroundColor: colorRoles.surfaceBase,
  borderBottom: `1px solid ${colorRoles.surfaceBase}`,
  padding: "10px 14px",
  cursor: "pointer" };
const toggleTitleStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 800, color: colorRoles.brandAction };
const toggleCountStyle: React.CSSProperties = { fontSize: "9px", color: colorRoles.brandStructure };
const toggleChevronStyle: React.CSSProperties = { fontSize: "9px", color: colorRoles.brandStructure };
const errorDismissButtonStyle: React.CSSProperties = { appearance: "none", border: "none", background: "none", color: colorRoles.brandAction, cursor: "pointer", fontSize: "10px", fontWeight: 900 };

type EditingEntry = { kind: "domain" | "node"; id: string } | null;
type AddingSubUnder = string | null; // domainId
type AddingMainClassifUnder = { domainId: string; subNodeId: string } | null;
type AddingSubClassifUnder = { domainId: string; subNodeId: string; mainClassifNodeId: string } | null;

export type CategoryControlRoomProps = {
  domains: readonly CentralCatalogDomain[];
  nodes: readonly CentralCatalogNode[];
  searchQuery?: string;
  onCreateDomain: (input: Parameters<typeof createCatalogDomain>[0]) => Promise<unknown>;
  onUpdateDomain: (domainId: string, input: CatalogDomainUpdateInput) => Promise<unknown>;
  onCreateNode: (input: Parameters<typeof createCatalogNode>[0]) => Promise<unknown>;
  onUpdateNode: (nodeId: string, input: CatalogNodeUpdateInput) => Promise<unknown>;
  onMoveNode: (nodeId: string, targetParentId: string | null) => Promise<unknown>;
  onMergeNode: (nodeId: string, targetNodeId: string) => Promise<unknown>;
  onDeprecateNode: (nodeId: string) => Promise<unknown>;
  canManage: boolean;
};

function slugify(label: string): string {
  const base = label.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
  return `${base || "node"}-${Date.now().toString(36)}`;
}

export function CategoryControlRoom({
  domains,
  nodes,
  searchQuery = "",
  onCreateDomain,
  onUpdateDomain,
  onCreateNode,
  onUpdateNode,
  onMoveNode,
  onMergeNode,
  onDeprecateNode,
  canManage }: CategoryControlRoomProps) {
  const [open, setOpen] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  const [addingMainCat, setAddingMainCat] = useState(false);
  const [addingSubUnder, setAddingSubUnder] = useState<AddingSubUnder>(null);
  const [addingMainClassifUnder, setAddingMainClassifUnder] = useState<AddingMainClassifUnder>(null);
  const [addingSubClassifUnder, setAddingSubClassifUnder] = useState<AddingSubClassifUnder>(null);

  const [formLabel, setFormLabel] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");

  const [editingEntry, setEditingEntry] = useState<EditingEntry>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");

  const visibleDomains = useMemo(
    () => domains.filter((d) => !searchQuery || d.nameAr.includes(searchQuery) || d.slug.includes(searchQuery)),
    [domains, searchQuery],
  );

  const resetForms = () => {
    setAddingMainCat(false);
    setAddingSubUnder(null);
    setAddingMainClassifUnder(null);
    setAddingSubClassifUnder(null);
    setFormLabel("");
    setFormSubtitle("");
    setCatError(null);
  };

  const runMutation = async (fn: () => Promise<unknown>) => {
    if (!canManage) return;
    try {
      await fn();
      resetForms();
    } catch (e: any) {
      setCatError(e?.message ?? "فشل تنفيذ العملية");
    }
  };

  const handleAddMainCategory = () => {
    if (!formLabel.trim()) {
      setCatError("اسم الفئة مطلوب");
      return;
    }
    void runMutation(() =>
      onCreateDomain({
        slug: slugify(formLabel),
        nameAr: formLabel.trim(),
        nameEn: formSubtitle.trim() || formLabel.trim(),
        icon: "📦",
        sortOrder: domains.length,
        isActive: true,
        isClientVisible: true,
        requiresProductCatalog: false,
        isManualRequest: false }),
    );
  };

  const handleAddSubCategory = (domainId: string) => {
    if (!formLabel.trim()) {
      setCatError("اسم الفئة الفرعية مطلوب");
      return;
    }
    void runMutation(() =>
      onCreateNode({
        domainId,
        parentId: null,
        level: "BUSINESS_SUBDOMAIN",
        slug: slugify(formLabel),
        nameAr: formLabel.trim(),
        nameEn: formSubtitle.trim() || formLabel.trim(),
        icon: "📄",
        sortOrder: nodes.filter((n) => n.domainId === domainId).length,
        isActive: true,
        isClientVisible: true,
        requiresBarcode: false,
        allowsProductProposal: true,
        allowsStoreProductCustomImage: false,
        requiresCatalogReview: false,
        requiresProductCatalog: false }),
    );
  };

  const handleAddMainClassification = (domainId: string, subNodeId: string) => {
    if (!formLabel.trim()) {
      setCatError("اسم التصنيف الرئيسي مطلوب");
      return;
    }
    void runMutation(() =>
      onCreateNode({
        domainId,
        parentId: subNodeId,
        level: "PRODUCT_MAIN_CLASS",
        slug: slugify(formLabel),
        nameAr: formLabel.trim(),
        nameEn: formSubtitle.trim() || formLabel.trim(),
        icon: "🏷️",
        sortOrder: nodes.filter((n) => n.parentId === subNodeId).length,
        isActive: true,
        isClientVisible: true,
        requiresBarcode: false,
        allowsProductProposal: true,
        allowsStoreProductCustomImage: false,
        requiresCatalogReview: false,
        requiresProductCatalog: false }),
    );
  };

  const handleAddSubClassification = (domainId: string, subNodeId: string, mainClassifNodeId: string) => {
    if (!formLabel.trim()) {
      setCatError("اسم التصنيف الفرعي مطلوب");
      return;
    }
    void runMutation(() =>
      onCreateNode({
        domainId,
        parentId: mainClassifNodeId,
        level: "PRODUCT_SUB_CLASS",
        slug: slugify(formLabel),
        nameAr: formLabel.trim(),
        nameEn: formSubtitle.trim() || formLabel.trim(),
        icon: "🔖",
        sortOrder: nodes.filter((n) => n.parentId === mainClassifNodeId).length,
        isActive: true,
        isClientVisible: true,
        requiresBarcode: false,
        allowsProductProposal: true,
        allowsStoreProductCustomImage: false,
        requiresCatalogReview: false,
        requiresProductCatalog: false }),
    );
  };

  const handleToggleDomainActive = (domain: CentralCatalogDomain) => {
    void runMutation(() => onUpdateDomain(domain.id, { isActive: !domain.isActive }));
  };

  const handleToggleNodeActive = (node: CentralCatalogNode) => {
    void runMutation(() => onUpdateNode(node.id, { isActive: !node.isActive }));
  };

  const handleMoveNode = (node: CentralCatalogNode) => {
    const targetId = window.prompt("أدخل ID العقدة الأب الجديدة (أو اتركه فارغاً لجعله رئيسياً):", "");
    if (targetId === null) return;
    void runMutation(() => onMoveNode(node.id, targetId.trim() || null));
  };

  const handleMergeNode = (node: CentralCatalogNode) => {
    const targetId = window.prompt("أدخل ID العقدة التي سيتم الدمج إليها:");
    if (!targetId || !targetId.trim()) return;
    void runMutation(() => onMergeNode(node.id, targetId.trim()));
  };

  const handleDeprecateNode = (node: CentralCatalogNode) => {
    if (window.confirm(`هل أنت متأكد من إهمال العقدة ${node.nameAr}؟`)) {
      void runMutation(() => onDeprecateNode(node.id));
    }
  };

  const handleStartDomainEdit = (domain: CentralCatalogDomain) => {
    setEditingEntry({ kind: "domain", id: domain.id });
    setEditLabel(domain.nameAr);
    setEditSubtitle(domain.nameEn);
    setCatError(null);
  };

  const handleStartNodeEdit = (node: CentralCatalogNode) => {
    setEditingEntry({ kind: "node", id: node.id });
    setEditLabel(node.nameAr);
    setEditSubtitle(node.nameEn);
    setCatError(null);
  };

  const handleApplyEdit = () => {
    if (!editingEntry || !editLabel.trim()) return;
    if (editingEntry.kind === "domain") {
      void runMutation(async () => {
        await onUpdateDomain(editingEntry.id, { nameAr: editLabel.trim(), nameEn: editSubtitle.trim() || editLabel.trim() });
        setEditingEntry(null);
      });
    } else {
      void runMutation(async () => {
        await onUpdateNode(editingEntry.id, { nameAr: editLabel.trim(), nameEn: editSubtitle.trim() || editLabel.trim() });
        setEditingEntry(null);
      });
    }
  };

  return (
    <div style={panelStyle}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="تبديل وضع إدارة الفئات"
        style={{ ...toggleButtonFullStyle, ...toggleButtonRowStyle }}
      >
        <div style={toggleButtonLabelStyle}>
          <span style={toggleTitleStyle}>🏷️ هيكل الفئات والتصنيفات</span>
          <span style={toggleCountStyle}>({domains.length} فئة رئيسية • {nodes.length} تصنيف)</span>
        </div>
        <span style={toggleChevronStyle}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={bodyStyle}>
          {catError && (
            <div style={errorBoxStyle}>
              <span>{catError}</span>
              <button
                onClick={() => setCatError(null)}
                style={errorDismissButtonStyle}
              >
                &times;
              </button>
            </div>
          )}

          <div style={toolbarRowStyle}>
            {canManage ? (
              <Button
                onClick={() => {
                  resetForms();
                  setAddingMainCat(true);
                }}
              >
                + فئة رئيسية
              </Button>
            ) : <CpMutedInline>قراءة فقط — تعديل شجرة الكتالوج يتطلب catalog.taxonomy.manage.</CpMutedInline>}
          </div>

          {addingMainCat && canManage && (
            <div style={formBoxStyle}>
              <span style={formTitleStyle}>إضافة فئة رئيسية جديدة</span>
              <CpTextInput value={formLabel} onChange={setFormLabel} placeholder="اسم الفئة *" aria-label="اسم الفئة الرئيسية" />
              <CpTextInput value={formSubtitle} onChange={setFormSubtitle} placeholder="الاسم الانجليزي (اختياري)" aria-label="وصف الفئة الرئيسية" />
              <div style={formActionsRowStyle}>
                <Button onClick={handleAddMainCategory}>تأكيد</Button>
                <Button onClick={resetForms}>إلغاء</Button>
              </div>
            </div>
          )}

          <div style={listColumnStyle}>
            {visibleDomains.map((domain) => (
              <DomainRow
                key={domain.id}
                domain={domain}
                canManage={canManage}
                nodes={nodes}
                editingEntry={editingEntry}
                editLabel={editLabel}
                setEditLabel={setEditLabel}
                addingSubUnder={addingSubUnder}
                setAddingSubUnder={setAddingSubUnder}
                addingMainClassifUnder={addingMainClassifUnder}
                setAddingMainClassifUnder={setAddingMainClassifUnder}
                addingSubClassifUnder={addingSubClassifUnder}
                setAddingSubClassifUnder={setAddingSubClassifUnder}
                formLabel={formLabel}
                setFormLabel={setFormLabel}
                resetForms={resetForms}
                onToggleDomainActive={handleToggleDomainActive}
                onToggleNodeActive={handleToggleNodeActive}
                onMoveNode={handleMoveNode}
                onMergeNode={handleMergeNode}
                onDeprecateNode={handleDeprecateNode}
                onStartDomainEdit={handleStartDomainEdit}
                onStartNodeEdit={handleStartNodeEdit}
                onApplyEdit={handleApplyEdit}
                onAddSubCategory={handleAddSubCategory}
                onAddMainClassification={handleAddMainClassification}
                onAddSubClassification={handleAddSubClassification}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DomainRow({
  domain,
  canManage,
  nodes,
  editingEntry,
  editLabel,
  setEditLabel,
  addingSubUnder,
  setAddingSubUnder,
  addingMainClassifUnder,
  setAddingMainClassifUnder,
  addingSubClassifUnder,
  setAddingSubClassifUnder,
  formLabel,
  setFormLabel,
  resetForms,
  onToggleDomainActive,
  onToggleNodeActive,
  onMoveNode,
  onMergeNode,
  onDeprecateNode,
  onStartDomainEdit,
  onStartNodeEdit,
  onApplyEdit,
  onAddSubCategory,
  onAddMainClassification,
  onAddSubClassification }: {
  domain: CentralCatalogDomain;
  canManage: boolean;
  nodes: readonly CentralCatalogNode[];
  editingEntry: EditingEntry;
  editLabel: string;
  setEditLabel: (v: string) => void;
  addingSubUnder: AddingSubUnder;
  setAddingSubUnder: (v: AddingSubUnder) => void;
  addingMainClassifUnder: AddingMainClassifUnder;
  setAddingMainClassifUnder: (v: AddingMainClassifUnder) => void;
  addingSubClassifUnder: AddingSubClassifUnder;
  setAddingSubClassifUnder: (v: AddingSubClassifUnder) => void;
  formLabel: string;
  setFormLabel: (v: string) => void;
  resetForms: () => void;
  onToggleDomainActive: (domain: CentralCatalogDomain) => void;
  onToggleNodeActive: (node: CentralCatalogNode) => void;
  onMoveNode: (node: CentralCatalogNode) => void;
  onMergeNode: (node: CentralCatalogNode) => void;
  onDeprecateNode: (node: CentralCatalogNode) => void;
  onStartDomainEdit: (domain: CentralCatalogDomain) => void;
  onStartNodeEdit: (node: CentralCatalogNode) => void;
  onApplyEdit: () => void;
  onAddSubCategory: (domainId: string) => void;
  onAddMainClassification: (domainId: string, subNodeId: string) => void;
  onAddSubClassification: (domainId: string, subNodeId: string, mainClassifNodeId: string) => void;
}) {
  const isEditing = editingEntry?.kind === "domain" && editingEntry.id === domain.id;
  const isAddingSub = addingSubUnder === domain.id;
  const subNodes = nodes.filter((n) => n.domainId === domain.id && n.parentId === null && n.level === "BUSINESS_SUBDOMAIN");

  return (
    <div style={rowContainerStyle} dir="rtl">
      <div style={rowHeaderStyle}>
        {isEditing && canManage ? (
          <div style={editRowStyle}>
            <CpTextInput value={editLabel} onChange={setEditLabel} aria-label="تعديل اسم الفئة الرئيسية" />
            <Button onClick={onApplyEdit}>حفظ</Button>
          </div>
        ) : (
          <>
            <span style={nameLabelStyle}>
              📂 {domain.nameAr}{" "}
              {!domain.isActive && (
                <span style={{ color: colorRoles.brandAction, fontSize: "0.75rem" /* dynamic-exception: state-derived tone based on isActive */ }}>(معطل)</span>
              )}
            </span>
            {canManage ? <div style={rowActionsStyle}>
              <Button onClick={() => { resetForms(); setAddingSubUnder(isAddingSub ? null : domain.id); }}>+ فرعي</Button>
              <Button onClick={() => onStartDomainEdit(domain)}>تعديل</Button>
              <Button onClick={() => onToggleDomainActive(domain)}>{domain.isActive ? "إخفاء" : "إظهار"}</Button>
            </div> : null}
          </>
        )}
      </div>

      {isAddingSub && canManage && (
        <div style={formBoxStyle}>
          <CpTextInput value={formLabel} onChange={setFormLabel} placeholder="اسم الفئة الفرعية..." aria-label="اسم الفئة الفرعية" />
          <div style={formActionsRowStyle}>
            <Button onClick={() => onAddSubCategory(domain.id)}>إضافة</Button>
            <Button onClick={resetForms}>إلغاء</Button>
          </div>
        </div>
      )}

      {subNodes.length > 0 && (
        <div style={inlineChildrenStyle}>
          {subNodes.map((sub) => (
            <SubNodeRow
              key={sub.id}
              domain={domain}
              subNode={sub}
              canManage={canManage}
              nodes={nodes}
              editingEntry={editingEntry}
              editLabel={editLabel}
              setEditLabel={setEditLabel}
              addingMainClassifUnder={addingMainClassifUnder}
              setAddingMainClassifUnder={setAddingMainClassifUnder}
              addingSubClassifUnder={addingSubClassifUnder}
              setAddingSubClassifUnder={setAddingSubClassifUnder}
              formLabel={formLabel}
              setFormLabel={setFormLabel}
              resetForms={resetForms}
              onToggleNodeActive={onToggleNodeActive}
              onMoveNode={onMoveNode}
              onMergeNode={onMergeNode}
              onDeprecateNode={onDeprecateNode}
              onStartNodeEdit={onStartNodeEdit}
              onApplyEdit={onApplyEdit}
              onAddMainClassification={onAddMainClassification}
              onAddSubClassification={onAddSubClassification}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubNodeRow({
  domain,
  subNode,
  canManage,
  nodes,
  editingEntry,
  editLabel,
  setEditLabel,
  addingMainClassifUnder,
  setAddingMainClassifUnder,
  addingSubClassifUnder,
  setAddingSubClassifUnder,
  formLabel,
  setFormLabel,
  resetForms,
  onToggleNodeActive,
  onMoveNode,
  onMergeNode,
  onDeprecateNode,
  onStartNodeEdit,
  onApplyEdit,
  onAddMainClassification,
  onAddSubClassification }: {
  domain: CentralCatalogDomain;
  subNode: CentralCatalogNode;
  canManage: boolean;
  nodes: readonly CentralCatalogNode[];
  editingEntry: EditingEntry;
  editLabel: string;
  setEditLabel: (v: string) => void;
  addingMainClassifUnder: AddingMainClassifUnder;
  setAddingMainClassifUnder: (v: AddingMainClassifUnder) => void;
  addingSubClassifUnder: AddingSubClassifUnder;
  setAddingSubClassifUnder: (v: AddingSubClassifUnder) => void;
  formLabel: string;
  setFormLabel: (v: string) => void;
  resetForms: () => void;
  onToggleNodeActive: (node: CentralCatalogNode) => void;
  onMoveNode: (node: CentralCatalogNode) => void;
  onMergeNode: (node: CentralCatalogNode) => void;
  onDeprecateNode: (node: CentralCatalogNode) => void;
  onStartNodeEdit: (node: CentralCatalogNode) => void;
  onApplyEdit: () => void;
  onAddMainClassification: (domainId: string, subNodeId: string) => void;
  onAddSubClassification: (domainId: string, subNodeId: string, mainClassifNodeId: string) => void;
}) {
  const isEditing = editingEntry?.kind === "node" && editingEntry.id === subNode.id;
  const isAdding = addingMainClassifUnder?.subNodeId === subNode.id;
  const mainClassifNodes = nodes.filter((n) => n.parentId === subNode.id && n.level === "PRODUCT_MAIN_CLASS");

  return (
    <div style={childColumnStyle}>
      <div style={childRowStyle}>
        {isEditing && canManage ? (
          <div style={editRowStyle}>
            <CpTextInput value={editLabel} onChange={setEditLabel} aria-label="تعديل اسم الفئة الفرعية" />
            <Button onClick={onApplyEdit}>حفظ</Button>
          </div>
        ) : (
          <>
            <span style={childLabelStyle}>📄 {subNode.nameAr} {!subNode.isActive && "(معطل)"}</span>
            {canManage ? <div style={rowActionsStyle}>
              <Button onClick={() => { resetForms(); setAddingMainClassifUnder(isAdding ? null : { domainId: domain.id, subNodeId: subNode.id }); }}>+ تصنيف</Button>
              <Button onClick={() => onStartNodeEdit(subNode)}>تعديل</Button>
              <Button onClick={() => onToggleNodeActive(subNode)}>{subNode.isActive ? "إخفاء" : "إظهار"}</Button>
              <Button onClick={() => onMoveNode(subNode)}>نقل</Button>
              <Button onClick={() => onMergeNode(subNode)}>دمج</Button>
              <Button onClick={() => onDeprecateNode(subNode)}>إهمال</Button>
            </div> : null}
          </>
        )}
      </div>

      {isAdding && canManage && (
        <div style={formBoxStyle}>
          <CpTextInput value={formLabel} onChange={setFormLabel} placeholder="اسم التصنيف الرئيسي..." aria-label="اسم التصنيف الرئيسي" />
          <div style={formActionsRowStyle}>
            <Button onClick={() => onAddMainClassification(domain.id, subNode.id)}>إضافة</Button>
            <Button onClick={resetForms}>إلغاء</Button>
          </div>
        </div>
      )}

      {mainClassifNodes.length > 0 && (
        <div style={inlineChildrenStyle}>
          {mainClassifNodes.map((mc) => (
            <MainClassifRow
              key={mc.id}
              domain={domain}
              subNode={subNode}
              mainClassifNode={mc}
              canManage={canManage}
              nodes={nodes}
              editingEntry={editingEntry}
              editLabel={editLabel}
              setEditLabel={setEditLabel}
              addingSubClassifUnder={addingSubClassifUnder}
              setAddingSubClassifUnder={setAddingSubClassifUnder}
              formLabel={formLabel}
              setFormLabel={setFormLabel}
              resetForms={resetForms}
              onToggleNodeActive={onToggleNodeActive}
              onMoveNode={onMoveNode}
              onMergeNode={onMergeNode}
              onDeprecateNode={onDeprecateNode}
              onStartNodeEdit={onStartNodeEdit}
              onApplyEdit={onApplyEdit}
              onAddSubClassification={onAddSubClassification}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MainClassifRow({
  domain,
  subNode,
  mainClassifNode,
  canManage,
  nodes,
  editingEntry,
  editLabel,
  setEditLabel,
  addingSubClassifUnder,
  setAddingSubClassifUnder,
  formLabel,
  setFormLabel,
  resetForms,
  onToggleNodeActive,
  onMoveNode,
  onMergeNode,
  onDeprecateNode,
  onStartNodeEdit,
  onApplyEdit,
  onAddSubClassification }: {
  domain: CentralCatalogDomain;
  subNode: CentralCatalogNode;
  mainClassifNode: CentralCatalogNode;
  canManage: boolean;
  nodes: readonly CentralCatalogNode[];
  editingEntry: EditingEntry;
  editLabel: string;
  setEditLabel: (v: string) => void;
  addingSubClassifUnder: AddingSubClassifUnder;
  setAddingSubClassifUnder: (v: AddingSubClassifUnder) => void;
  formLabel: string;
  setFormLabel: (v: string) => void;
  resetForms: () => void;
  onToggleNodeActive: (node: CentralCatalogNode) => void;
  onMoveNode: (node: CentralCatalogNode) => void;
  onMergeNode: (node: CentralCatalogNode) => void;
  onDeprecateNode: (node: CentralCatalogNode) => void;
  onStartNodeEdit: (node: CentralCatalogNode) => void;
  onApplyEdit: () => void;
  onAddSubClassification: (domainId: string, subNodeId: string, mainClassifNodeId: string) => void;
}) {
  const isEditing = editingEntry?.kind === "node" && editingEntry.id === mainClassifNode.id;
  const isAdding = addingSubClassifUnder?.mainClassifNodeId === mainClassifNode.id;
  const subClassifNodes = nodes.filter((n) => n.parentId === mainClassifNode.id && n.level === "PRODUCT_SUB_CLASS");

  return (
    <div style={childColumnStyle}>
      <div style={childRowStyle}>
        {isEditing && canManage ? (
          <div style={editRowStyle}>
            <CpTextInput value={editLabel} onChange={setEditLabel} aria-label="تعديل اسم التصنيف الرئيسي" />
            <Button onClick={onApplyEdit}>حفظ</Button>
          </div>
        ) : (
          <>
            <span style={childLabelStyle}>🏷️ {mainClassifNode.nameAr} {!mainClassifNode.isActive && "(معطل)"}</span>
            {canManage ? <div style={rowActionsStyle}>
              <Button onClick={() => { resetForms(); setAddingSubClassifUnder(isAdding ? null : { domainId: domain.id, subNodeId: subNode.id, mainClassifNodeId: mainClassifNode.id }); }}>+ فرعي</Button>
              <Button onClick={() => onStartNodeEdit(mainClassifNode)}>تعديل</Button>
              <Button onClick={() => onToggleNodeActive(mainClassifNode)}>{mainClassifNode.isActive ? "إخفاء" : "إظهار"}</Button>
              <Button onClick={() => onMoveNode(mainClassifNode)}>نقل</Button>
              <Button onClick={() => onMergeNode(mainClassifNode)}>دمج</Button>
              <Button onClick={() => onDeprecateNode(mainClassifNode)}>إهمال</Button>
            </div> : null}
          </>
        )}
      </div>

      {isAdding && canManage && (
        <div style={formBoxStyle}>
          <CpTextInput value={formLabel} onChange={setFormLabel} placeholder="اسم التصنيف الفرعي..." aria-label="اسم التصنيف الفرعي" />
          <div style={formActionsRowStyle}>
            <Button onClick={() => onAddSubClassification(domain.id, subNode.id, mainClassifNode.id)}>إضافة</Button>
            <Button onClick={resetForms}>إلغاء</Button>
          </div>
        </div>
      )}

      {subClassifNodes.length > 0 && (
        <div style={inlineChildrenStyle}>
          {subClassifNodes.map((sc) => (
            <div key={sc.id} style={childRowStyle}>
              <span style={childLabelStyle}>🔖 {sc.nameAr} {!sc.isActive && "(معطل)"}</span>
              {canManage ? <div style={rowActionsStyle}>
                <Button onClick={() => onStartNodeEdit(sc)}>تعديل</Button>
                <Button onClick={() => onToggleNodeActive(sc)}>{sc.isActive ? "إخفاء" : "إظهار"}</Button>
                <Button onClick={() => onMoveNode(sc)}>نقل</Button>
                <Button onClick={() => onMergeNode(sc)}>دمج</Button>
                <Button onClick={() => onDeprecateNode(sc)}>إهمال</Button>
              </div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
