import { colorRoles } from '@bthwani/ui-kit';
"use client";

import React from "react";


export type CategoryControlRoomRowHandlers = {
  activeSubCategory: any | null;
  hiddenSubCategoryIds: ReadonlySet<string>;
  addingSubUnder: string | null;
  setAddingSubUnder: React.Dispatch<React.SetStateAction<string | null>>;
  addingMainClassifUnder: { mainId: string; subId: string } | null;
  setAddingMainClassifUnder: React.Dispatch<React.SetStateAction<{ mainId: string; subId: string } | null>>;
  addingSubClassifUnder: { mainId: string; subId: string; mainClassifId: string } | null;
  setAddingSubClassifUnder: React.Dispatch<React.SetStateAction<{ mainId: string; subId: string; mainClassifId: string } | null>>;
  formLabel: string;
  setFormLabel: React.Dispatch<React.SetStateAction<string>>;
  formSubtitle: string;
  setFormSubtitle: React.Dispatch<React.SetStateAction<string>>;
  editingEntry: any | null;
  setEditingEntry: React.Dispatch<React.SetStateAction<any | null>>;
  editLabel: string;
  setEditLabel: React.Dispatch<React.SetStateAction<string>>;
  editSubtitle: string;
  setEditSubtitle: React.Dispatch<React.SetStateAction<string>>;
  setCatError: React.Dispatch<React.SetStateAction<string | null>>;
  setAddingMainCat: React.Dispatch<React.SetStateAction<boolean>>;
  handleMainCategorySelect: (cat: any | null) => void;
  handleSubCategorySelect: (sub: any | null) => void;
  handleAddSubCategory: (parentId: string) => void;
  handleAddMainClassification: (mainId: string, subId: string) => void;
  handleAddSubClassification: (mainId: string, subId: string, mainClassifId: string) => void;
  handleToggleCategoryHide: (id: string) => void;
  handleToggleSubCategoryHide: (id: string) => void;
  handleDeleteNode: (type: "main" | "sub" | "mainClassif" | "subClassif", mainId: string, subId?: string, mainClassifId?: string, subClassifId?: string) => void;
  handleStartCatEdit: (type: "main" | "sub" | "mainClassif" | "subClassif", mainId: string, subId?: string, mainClassifId?: string, subClassifId?: string) => void;
  handleApplyCatEdit: () => void;
  getProductCountForCategory: (mainId: string, subId?: string) => number;
};

export type CategoryControlRoomProps = {
  categoryControlOpen: boolean;
  setCategoryControlOpen: React.Dispatch<React.SetStateAction<boolean>>;
  previewCategories: any[];
  hiddenCategoryIds: ReadonlySet<string>;
  hiddenSubCategoryIds: ReadonlySet<string>;
  activeMainCategory: any | null;
  activeSubCategory: any | null;
  catError: string | null;
  setCatError: React.Dispatch<React.SetStateAction<string | null>>;
  addingMainCat: boolean;
  setAddingMainCat: React.Dispatch<React.SetStateAction<boolean>>;
  addingSubUnder: string | null;
  setAddingSubUnder: React.Dispatch<React.SetStateAction<string | null>>;
  addingMainClassifUnder: { mainId: string; subId: string } | null;
  setAddingMainClassifUnder: React.Dispatch<React.SetStateAction<{ mainId: string; subId: string } | null>>;
  addingSubClassifUnder: { mainId: string; subId: string; mainClassifId: string } | null;
  setAddingSubClassifUnder: React.Dispatch<React.SetStateAction<{ mainId: string; subId: string; mainClassifId: string } | null>>;
  formLabel: string;
  setFormLabel: React.Dispatch<React.SetStateAction<string>>;
  formSubtitle: string;
  setFormSubtitle: React.Dispatch<React.SetStateAction<string>>;
  editingEntry: any | null;
  setEditingEntry: React.Dispatch<React.SetStateAction<any | null>>;
  editLabel: string;
  setEditLabel: React.Dispatch<React.SetStateAction<string>>;
  editSubtitle: string;
  setEditSubtitle: React.Dispatch<React.SetStateAction<string>>;
  handleMainCategorySelect: (cat: any | null) => void;
  handleSubCategorySelect: (sub: any | null) => void;
  handleAddMainCategory: () => void;
  handleAddSubCategory: (parentId: string) => void;
  handleAddMainClassification: (mainId: string, subId: string) => void;
  handleAddSubClassification: (mainId: string, subId: string, mainClassifId: string) => void;
  handleToggleCategoryHide: (id: string) => void;
  handleToggleSubCategoryHide: (id: string) => void;
  handleDeleteNode: (type: "main" | "sub" | "mainClassif" | "subClassif", mainId: string, subId?: string, mainClassifId?: string, subClassifId?: string) => void;
  handleResetCategoryPreview: () => void;
  handleStartCatEdit: (type: "main" | "sub" | "mainClassif" | "subClassif", mainId: string, subId?: string, mainClassifId?: string, subClassifId?: string) => void;
  handleApplyCatEdit: () => void;
  getProductCountForCategory: (mainId: string, subId?: string) => number;
};

export function CategoryControlRoom({
  categoryControlOpen,
  setCategoryControlOpen,
  previewCategories,
  hiddenCategoryIds,
  hiddenSubCategoryIds,
  activeMainCategory,
  activeSubCategory,
  catError,
  setCatError,
  addingMainCat,
  setAddingMainCat,
  addingSubUnder,
  setAddingSubUnder,
  addingMainClassifUnder,
  setAddingMainClassifUnder,
  addingSubClassifUnder,
  setAddingSubClassifUnder,
  formLabel,
  setFormLabel,
  formSubtitle,
  setFormSubtitle,
  editingEntry,
  setEditingEntry,
  editLabel,
  setEditLabel,
  editSubtitle,
  setEditSubtitle,
  handleMainCategorySelect,
  handleSubCategorySelect,
  handleAddMainCategory,
  handleAddSubCategory,
  handleAddMainClassification,
  handleAddSubClassification,
  handleToggleCategoryHide,
  handleToggleSubCategoryHide,
  handleDeleteNode,
  handleResetCategoryPreview,
  handleStartCatEdit,
  handleApplyCatEdit,
  getProductCountForCategory,
}: CategoryControlRoomProps) {
  const rowHandlers: CategoryControlRoomRowHandlers = {
    activeSubCategory,
    hiddenSubCategoryIds,
    addingSubUnder,
    setAddingSubUnder,
    addingMainClassifUnder,
    setAddingMainClassifUnder,
    addingSubClassifUnder,
    setAddingSubClassifUnder,
    formLabel,
    setFormLabel,
    formSubtitle,
    setFormSubtitle,
    editingEntry,
    setEditingEntry,
    editLabel,
    setEditLabel,
    editSubtitle,
    setEditSubtitle,
    setCatError,
    setAddingMainCat,
    handleMainCategorySelect,
    handleSubCategorySelect,
    handleAddSubCategory,
    handleAddMainClassification,
    handleAddSubClassification,
    handleToggleCategoryHide,
    handleToggleSubCategoryHide,
    handleDeleteNode,
    handleStartCatEdit,
    handleApplyCatEdit,
    getProductCountForCategory,
  };

  return (
    <div style={{ backgroundColor: colorRoles.surfaceBase, display: "flex", flexDirection: "column", height: "100%", flexShrink: 0, minHeight: 0 }}>
      <button
        onClick={() => setCategoryControlOpen((v) => !v)}
        aria-label="تبديل وضع إدارة الفئات"
        style={{
          width: "100%",
          appearance: "none",
          border: "none",
          backgroundColor: categoryControlOpen ? colorRoles.surfaceBase : colorRoles.surfaceBase,
          borderBottom: `1px solid ${colorRoles.surfaceBase}`,
          padding: "10px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: colorRoles.brandAction }}>🏷️ هيكل الفئات والتصنيفات</span>
          <span style={{ fontSize: "9px", color: colorRoles.brandAction, fontWeight: 700 }}>• معاينة</span>
          <span style={{ fontSize: "9px", color: colorRoles.brandStructure }}>
            ({previewCategories.length} فئة • {hiddenCategoryIds.size > 0 ? `${hiddenCategoryIds.size} مخفي` : "نشط"})
          </span>
        </div>
        <span style={{ fontSize: "9px", color: colorRoles.brandStructure }}>{categoryControlOpen ? "▲" : "▼"}</span>
      </button>

      {categoryControlOpen && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
          {catError && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: "4px",
                backgroundColor: colorRoles.surfaceBase,
                border: `1px solid ${colorRoles.brandAction}`,
                fontSize: "10px",
                color: colorRoles.brandAction,
                fontWeight: 700,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{catError}</span>
              <button
                onClick={() => setCatError(null)}
                style={{ appearance: "none", border: "none", background: "none", color: colorRoles.brandAction, cursor: "pointer", fontSize: "10px", fontWeight: 900 }}
              >
                &times;
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setAddingMainCat(true);
                setAddingSubUnder(null);
                setEditingEntry(null);
                setFormLabel("");
                setFormSubtitle("");
                setCatError(null);
              }}
              style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, border: `1px solid ${colorRoles.brandAction}`, cursor: "pointer", backgroundColor: colorRoles.surfaceBase, color: colorRoles.brandAction }}
            >
              + فئة رئيسية
            </button>
            <button
              onClick={handleResetCategoryPreview}
              style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, border: `1px solid ${colorRoles.brandAction}`, cursor: "pointer", backgroundColor: "transparent", color: colorRoles.brandAction }}
            >
              ↺ إعادة ضبط المعاينة
            </button>
          </div>

          {addingMainCat && (
            <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: colorRoles.surfaceBase, border: `1px solid ${colorRoles.brandAction}`, display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: colorRoles.brandAction }}>إضافة فئة رئيسية جديدة</span>
              <input
                aria-label="اسم الفئة الرئيسية"
                type="text"
                placeholder="اسم الفئة *"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                autoFocus
                style={{ padding: "6px 8px", borderRadius: "4px", fontSize: "11px", border: `1px solid ${colorRoles.surfaceBase}`, backgroundColor: colorRoles.surfaceBase, color: colorRoles.brandStructure, outline: "none", textAlign: "right" }}
              />
              <input
                aria-label="وصف الفئة الرئيسية"
                type="text"
                placeholder="وصف مختصر (اختياري)"
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: "4px", fontSize: "11px", border: `1px solid ${colorRoles.surfaceBase}`, backgroundColor: colorRoles.surfaceBase, color: colorRoles.brandStructure, outline: "none", textAlign: "right" }}
              />
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={handleAddMainCategory}
                  style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, border: "none", backgroundColor: colorRoles.brandAction, color: colorRoles.surfaceBase, cursor: "pointer" }}
                >
                  تأكيد
                </button>
                <button
                  onClick={() => {
                    setAddingMainCat(false);
                    setFormLabel("");
                    setFormSubtitle("");
                    setCatError(null);
                  }}
                  style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, border: `1px solid ${colorRoles.surfaceBase}`, backgroundColor: "transparent", color: colorRoles.brandStructure, cursor: "pointer" }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {previewCategories.map((cat) => (
              <CategoryControlRoomRow
                key={cat.id}
                cat={cat}
                isHidden={hiddenCategoryIds.has(cat.id)}
                isSelectedMain={activeMainCategory?.id === cat.id}
                handlers={rowHandlers}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryControlRoomRow({
  cat,
  isHidden,
  isSelectedMain,
  handlers,
}: {
  cat: any;
  isHidden: boolean;
  isSelectedMain: boolean;
  handlers: CategoryControlRoomRowHandlers;
}) {
  const isEditing = handlers.editingEntry?.type === "main" && handlers.editingEntry.mainId === cat.id;
  const isAddingSub = handlers.addingSubUnder === cat.id;

  return (
    <div style={{ padding: "0.5rem", borderBottom: `1px solid ${colorRoles.surfaceBase}`, display: "flex", flexDirection: "column", gap: "0.5rem" }} dir="rtl">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isEditing ? (
          <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
            <input
              type="text"
              value={handlers.editLabel}
              onChange={(e) => handlers.setEditLabel(e.target.value)}
              style={{ padding: "4px", borderRadius: "4px", border: `1px solid ${colorRoles.surfaceBase}`, flex: 1, textAlign: "right" }}
            />
            <button onClick={handlers.handleApplyCatEdit} style={{ padding: "4px 8px", backgroundColor: colorRoles.brandAction, color: colorRoles.surfaceBase, border: "none", borderRadius: "4px", cursor: "pointer" }}>حفظ</button>
            <button onClick={() => handlers.setEditingEntry(null)} style={{ padding: "4px 8px", border: `1px solid ${colorRoles.surfaceBase}`, backgroundColor: "transparent", color: colorRoles.brandStructure, borderRadius: "4px", cursor: "pointer" }}>إلغاء</button>
          </div>
        ) : (
          <>
            <button
              onClick={() => handlers.handleMainCategorySelect(isSelectedMain ? null : cat)}
              style={{ background: "none", border: "none", fontWeight: isSelectedMain ? 700 : 500, color: colorRoles.brandStructure, cursor: "pointer", flex: 1, textAlign: "right" }}
            >
              📂 {cat.name} {isHidden && <span style={{ color: colorRoles.brandAction, fontSize: "0.75rem" }}>(مخفي)</span>}
            </button>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button onClick={() => handlers.setAddingSubUnder(isAddingSub ? null : cat.id)} style={{ padding: "2px 6px", fontSize: "0.75rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "4px", cursor: "pointer", background: "none", color: colorRoles.brandStructure }}>+ فرعي</button>
              <button onClick={() => handlers.handleStartCatEdit("main", cat.id)} style={{ padding: "2px 6px", fontSize: "0.75rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "4px", cursor: "pointer", background: "none", color: colorRoles.brandStructure }}>تعديل</button>
              <button onClick={() => handlers.handleToggleCategoryHide(cat.id)} style={{ padding: "2px 6px", fontSize: "0.75rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "4px", cursor: "pointer", background: "none", color: colorRoles.brandStructure }}>{isHidden ? "إظهار" : "إخفاء"}</button>
            </div>
          </>
        )}
      </div>

      {isAddingSub && (
        <div style={{ padding: "0.5rem", background: colorRoles.surfaceBase, border: `1px solid ${colorRoles.brandAction}`, borderRadius: "4px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="اسم الفئة الفرعية..."
            value={handlers.formLabel}
            onChange={(e) => handlers.setFormLabel(e.target.value)}
            style={{ padding: "4px", borderRadius: "4px", border: `1px solid ${colorRoles.surfaceBase}`, textAlign: "right" }}
          />
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button onClick={() => handlers.handleAddSubCategory(cat.id)} style={{ padding: "4px 8px", backgroundColor: colorRoles.brandAction, color: colorRoles.surfaceBase, border: "none", borderRadius: "4px", cursor: "pointer" }}>إضافة</button>
            <button onClick={() => handlers.setAddingSubUnder(null)} style={{ padding: "4px 8px", border: `1px solid ${colorRoles.surfaceBase}`, backgroundColor: "transparent", color: colorRoles.brandStructure, borderRadius: "4px", cursor: "pointer" }}>إلغاء</button>
          </div>
        </div>
      )}

      {cat.subCategories && cat.subCategories.length > 0 && (
        <div style={{ marginRight: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem", borderRight: `1px dashed ${colorRoles.surfaceBase}`, paddingRight: "0.5rem" }}>
          {cat.subCategories.map((sub: any) => (
            <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0" }}>
              <span style={{ fontSize: "0.813rem", color: colorRoles.brandStructure }}>📄 {sub.name}</span>
              <button
                onClick={() => {
                  if (confirm("هل أنت متأكد من حذف هذه الفئة الفرعية؟")) {
                    handlers.handleDeleteNode("sub", cat.id, sub.id);
                  }
                }}
                style={{ padding: "1px 4px", fontSize: "0.7rem", color: colorRoles.brandAction, border: "none", background: "none", cursor: "pointer" }}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
