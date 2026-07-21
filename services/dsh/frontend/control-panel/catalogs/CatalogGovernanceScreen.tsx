"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  CpButton,
  CpPageHeader,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { OperationsRoomFrame } from "@bthwani/control-panel/shell";
import {
  createOperatorCatalogAttribute,
  createOperatorCatalogAttributeOption,
  deleteOperatorMasterProductRelationship,
  fetchOperatorAssortmentPauses,
  fetchOperatorCatalogAttributeOptions,
  fetchOperatorCatalogAttributes,
  fetchOperatorCatalogAudit,
  fetchOperatorMasterProductAttributeValues,
  fetchOperatorMasterProductRelationships,
  pauseOperatorStoreAssortment,
  resumeOperatorStoreAssortment,
  rollbackOperatorCatalogAudit,
  upsertOperatorCatalogNodeAttributeRule,
  upsertOperatorMasterProductAttributeValue,
  upsertOperatorMasterProductRelationship,
  type AssortmentPauseState,
  type CatalogAttribute,
  type CatalogAttributeDataType,
  type CatalogAttributeOption,
  type CatalogAuditEntry,
  type MasterProductAttributeValue,
  type MasterProductRelationship,
  type MasterProductRelationshipType,
} from "../../shared/catalog";

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "1rem",
};
const panelStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
  borderRadius: "0.75rem",
  padding: "1rem",
  display: "grid",
  gap: "0.75rem",
};
const rowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" };
const selectStyle: CSSProperties = {
  minHeight: "2.5rem",
  padding: "0.4rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  background: "transparent",
  color: "inherit",
};
const codeStyle: CSSProperties = { direction: "ltr", fontFamily: "monospace", fontSize: "0.78rem" };

const ATTRIBUTE_DATA_TYPES: readonly CatalogAttributeDataType[] = [
  "text",
  "number",
  "boolean",
  "enum",
  "multi_enum",
  "measurement",
  "money",
  "date",
  "media",
];
const RELATIONSHIP_TYPES: readonly MasterProductRelationshipType[] = [
  "substitute",
  "alternative",
  "complement",
];

export function CatalogGovernanceScreen() {
  const [attributes, setAttributes] = useState<readonly CatalogAttribute[]>([]);
  const [options, setOptions] = useState<readonly CatalogAttributeOption[]>([]);
  const [attributeValues, setAttributeValues] = useState<readonly MasterProductAttributeValue[]>([]);
  const [relationships, setRelationships] = useState<readonly MasterProductRelationship[]>([]);
  const [pauses, setPauses] = useState<readonly AssortmentPauseState[]>([]);
  const [audit, setAudit] = useState<readonly CatalogAuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [attributeCode, setAttributeCode] = useState("");
  const [attributeNameAr, setAttributeNameAr] = useState("");
  const [attributeNameEn, setAttributeNameEn] = useState("");
  const [attributeDataType, setAttributeDataType] = useState<CatalogAttributeDataType>("text");
  const [selectedAttributeId, setSelectedAttributeId] = useState("");
  const [optionCode, setOptionCode] = useState("");
  const [optionLabelAr, setOptionLabelAr] = useState("");
  const [nodeId, setNodeId] = useState("");

  const [productId, setProductId] = useState("");
  const [valueAttributeId, setValueAttributeId] = useState("");
  const [valueJson, setValueJson] = useState("");
  const [targetProductId, setTargetProductId] = useState("");
  const [relationshipType, setRelationshipType] = useState<MasterProductRelationshipType>("alternative");
  const [relationshipReason, setRelationshipReason] = useState("");

  const [storeId, setStoreId] = useState("");
  const [pauseProductId, setPauseProductId] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [pausedUntil, setPausedUntil] = useState("");

  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditEntityId, setAuditEntityId] = useState("");
  const [rollbackReason, setRollbackReason] = useState("");

  const selectedAttribute = useMemo(
    () => attributes.find((item) => item.id === selectedAttributeId) ?? null,
    [attributes, selectedAttributeId],
  );

  const runMutation = useCallback(async (action: () => Promise<void>, success: string) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    const page = await fetchOperatorCatalogAudit({
      entityType: auditEntityType.trim() || undefined,
      entityId: auditEntityId.trim() || undefined,
      limit: 100,
      offset: 0,
    });
    setAudit(page.items);
    setAuditTotal(page.total);
  }, [auditEntityId, auditEntityType]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [attributeItems, auditPage] = await Promise.all([
        fetchOperatorCatalogAttributes(),
        fetchOperatorCatalogAudit({ limit: 100, offset: 0 }),
      ]);
      setAttributes(attributeItems);
      setAudit(auditPage.items);
      setAuditTotal(auditPage.total);
      if (!selectedAttributeId && attributeItems[0]) setSelectedAttributeId(attributeItems[0].id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [selectedAttributeId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!selectedAttributeId) {
      setOptions([]);
      return;
    }
    void fetchOperatorCatalogAttributeOptions(selectedAttributeId)
      .then(setOptions)
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [selectedAttributeId]);

  const loadProductGovernance = async () => {
    if (!productId.trim()) {
      setError("أدخل معرف المنتج المركزي أولاً.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [values, links] = await Promise.all([
        fetchOperatorMasterProductAttributeValues(productId.trim()),
        fetchOperatorMasterProductRelationships(productId.trim()),
      ]);
      setAttributeValues(values);
      setRelationships(links);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  };

  const loadPauses = async () => {
    if (!storeId.trim()) {
      setError("أدخل معرف المتجر أولاً.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPauses(await fetchOperatorAssortmentPauses(storeId.trim()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  };

  if (loading && attributes.length === 0 && audit.length === 0) {
    return <CpStatePanel title="جاري تحميل غرفة حوكمة الكتالوج" description="تُقرأ الحقيقة من DSH." state="loading" />;
  }

  return (
    <OperationsRoomFrame>
      <CpPageHeader
        title="غرفة حوكمة الكتالوج المركزي"
        description="خصائص المنتجات، البدائل، الإيقاف المؤقت، التدقيق والتراجع المحكوم — بلا كتالوج محلي موازٍ."
      />

      {error ? <CpStatePanel title="تعذر إكمال العملية" description={error} state="error" /> : null}
      {notice ? <CpStatePanel title="تم التنفيذ" description={notice} state="success" /> : null}

      <div style={gridStyle}>
        <section style={panelStyle}>
          <h2>خصائص المنتجات المركزية</h2>
          <CpTextInput value={attributeCode} onChange={setAttributeCode} placeholder="رمز الخاصية مثل size" />
          <CpTextInput value={attributeNameAr} onChange={setAttributeNameAr} placeholder="اسم الخاصية بالعربية" />
          <CpTextInput value={attributeNameEn} onChange={setAttributeNameEn} placeholder="Name in English" />
          <select value={attributeDataType} onChange={(event) => setAttributeDataType(event.target.value as CatalogAttributeDataType)} style={selectStyle} aria-label="نوع بيانات الخاصية">
            {ATTRIBUTE_DATA_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <CpButton disabled={saving} onClick={() => void runMutation(async () => {
            const created = await createOperatorCatalogAttribute({
              code: attributeCode.trim(),
              nameAr: attributeNameAr.trim(),
              nameEn: attributeNameEn.trim(),
              dataType: attributeDataType,
              isFilterable: true,
              isRequired: false,
              isVariantAxis: false,
              isGlobal: true,
              sortOrder: attributes.length * 10 + 10,
              isActive: true,
            });
            setAttributes((items) => [...items, created]);
            setSelectedAttributeId(created.id);
            setAttributeCode(""); setAttributeNameAr(""); setAttributeNameEn("");
          }, "تم إنشاء الخاصية المركزية.")}>إنشاء خاصية</CpButton>

          <select value={selectedAttributeId} onChange={(event) => setSelectedAttributeId(event.target.value)} style={selectStyle} aria-label="الخاصية المحددة">
            <option value="">اختر خاصية</option>
            {attributes.map((item) => <option key={item.id} value={item.id}>{item.nameAr} ({item.code})</option>)}
          </select>
          {selectedAttribute ? <div>النوع: <code>{selectedAttribute.dataType}</code> — الإصدار {selectedAttribute.version}</div> : null}
          {(selectedAttribute?.dataType === "enum" || selectedAttribute?.dataType === "multi_enum") ? (
            <>
              <CpTextInput value={optionCode} onChange={setOptionCode} placeholder="رمز الخيار" />
              <CpTextInput value={optionLabelAr} onChange={setOptionLabelAr} placeholder="اسم الخيار بالعربية" />
              <CpButton disabled={saving || !selectedAttributeId} onClick={() => void runMutation(async () => {
                const created = await createOperatorCatalogAttributeOption(selectedAttributeId, {
                  code: optionCode.trim(), labelAr: optionLabelAr.trim(), labelEn: "", sortOrder: options.length * 10 + 10, isActive: true,
                });
                setOptions((items) => [...items, created]);
                setOptionCode(""); setOptionLabelAr("");
              }, "تم إنشاء خيار الخاصية.")}>إضافة خيار</CpButton>
              <div>{options.map((item) => <span key={item.id}>[{item.labelAr}] </span>)}</div>
            </>
          ) : null}
          <CpTextInput value={nodeId} onChange={setNodeId} placeholder="معرف فئة L2-L4 لربط الخاصية" />
          <CpButton disabled={saving || !nodeId.trim() || !selectedAttributeId} onClick={() => void runMutation(async () => {
            await upsertOperatorCatalogNodeAttributeRule(nodeId.trim(), selectedAttributeId, {
              isRequired: selectedAttribute?.isRequired ?? false,
              isFilterable: selectedAttribute?.isFilterable ?? false,
              isVariantAxis: selectedAttribute?.isVariantAxis ?? false,
              sortOrder: selectedAttribute?.sortOrder ?? 0,
            });
          }, "تم ربط الخاصية بالفئة.")}>ربط الخاصية بالفئة</CpButton>
        </section>

        <section style={panelStyle}>
          <h2>قيم المنتج والبدائل</h2>
          <CpTextInput value={productId} onChange={setProductId} placeholder="معرف المنتج المركزي" />
          <CpButton disabled={loading} onClick={() => void loadProductGovernance()}>تحميل الحقيقة</CpButton>
          <CpTextInput value={valueAttributeId} onChange={setValueAttributeId} placeholder="معرف الخاصية" />
          <CpTextInput value={valueJson} onChange={setValueJson} placeholder={'قيمة JSON مثل "كبير" أو 25'} />
          <CpButton disabled={saving} onClick={() => void runMutation(async () => {
            const parsed = JSON.parse(valueJson);
            const current = attributeValues.find((item) => item.attributeId === valueAttributeId.trim());
            const saved = await upsertOperatorMasterProductAttributeValue(productId.trim(), valueAttributeId.trim(), {
              value: parsed,
              expectedVersion: current?.version,
            });
            setAttributeValues((items) => [...items.filter((item) => item.id !== saved.id), saved]);
          }, "تم حفظ قيمة الخاصية.")}>حفظ قيمة الخاصية</CpButton>
          <div>{attributeValues.map((item) => <div key={item.id}><code>{item.attributeId}</code>: {JSON.stringify(item.value)} (v{item.version})</div>)}</div>

          <CpTextInput value={targetProductId} onChange={setTargetProductId} placeholder="معرف المنتج البديل/المرتبط" />
          <select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as MasterProductRelationshipType)} style={selectStyle} aria-label="نوع علاقة المنتج">
            {RELATIONSHIP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <CpTextInput value={relationshipReason} onChange={setRelationshipReason} placeholder="سبب العلاقة" />
          <CpButton disabled={saving} onClick={() => void runMutation(async () => {
            const current = relationships.find((item) => item.targetMasterProductId === targetProductId.trim() && item.relationshipType === relationshipType);
            const saved = await upsertOperatorMasterProductRelationship(productId.trim(), {
              targetMasterProductId: targetProductId.trim(), relationshipType, priority: current?.priority ?? relationships.length,
              reason: relationshipReason.trim(), isActive: true, expectedVersion: current?.version,
            });
            setRelationships((items) => [...items.filter((item) => item.id !== saved.id), saved]);
          }, "تم حفظ علاقة المنتج.")}>حفظ البديل/العلاقة</CpButton>
          {relationships.map((item) => (
            <div key={item.id} style={rowStyle}>
              <code>{item.relationshipType}</code><span>{item.targetMasterProductId}</span><span>v{item.version}</span>
              <CpButton disabled={saving} onClick={() => void runMutation(async () => {
                await deleteOperatorMasterProductRelationship(productId.trim(), item.id, item.version);
                setRelationships((items) => items.filter((candidate) => candidate.id !== item.id));
              }, "تم حذف علاقة المنتج.")}>حذف</CpButton>
            </div>
          ))}
        </section>

        <section style={panelStyle}>
          <h2>الإيقاف المؤقت للتشكيلة</h2>
          <CpTextInput value={storeId} onChange={setStoreId} placeholder="معرف المتجر" />
          <CpButton disabled={loading} onClick={() => void loadPauses()}>تحميل حالات التشكيلة</CpButton>
          <CpTextInput value={pauseProductId} onChange={setPauseProductId} placeholder="معرف المنتج المركزي" />
          <CpTextInput value={pauseReason} onChange={setPauseReason} placeholder="سبب الإيقاف المؤقت" />
          <CpTextInput value={pausedUntil} onChange={setPausedUntil} placeholder="وقت الاستئناف ISO اختياري" />
          <CpButton disabled={saving} onClick={() => void runMutation(async () => {
            const current = pauses.find((item) => item.masterProductId === pauseProductId.trim());
            if (!current) throw new Error("حمّل التشكيلة أولاً لتثبيت expectedVersion.");
            const result = await pauseOperatorStoreAssortment(storeId.trim(), pauseProductId.trim(), {
              reason: pauseReason.trim(), pausedUntil: pausedUntil.trim() || null, expectedVersion: current.version,
            });
            setPauses((items) => [...items.filter((item) => item.masterProductId !== result.pause.masterProductId), result.pause]);
          }, "تم إيقاف المنتج مؤقتاً.")}>إيقاف مؤقت</CpButton>
          {pauses.map((item) => (
            <div key={item.assortmentId} style={rowStyle}>
              <code>{item.masterProductId}</code>
              <span>{item.paused ? `موقوف: ${item.reason}` : "يعمل"}</span>
              <span>v{item.version}</span>
              {item.paused ? <CpButton disabled={saving} onClick={() => void runMutation(async () => {
                const result = await resumeOperatorStoreAssortment(storeId.trim(), item.masterProductId, item.version);
                setPauses((items) => [...items.filter((candidate) => candidate.masterProductId !== result.pause.masterProductId), result.pause]);
              }, "تم استئناف المنتج.")}>استئناف</CpButton> : null}
            </div>
          ))}
        </section>
      </div>

      <section style={{ ...panelStyle, marginTop: "1rem" }}>
        <h2>سجل التدقيق والتراجع المحكوم ({auditTotal})</h2>
        <div style={rowStyle}>
          <CpTextInput value={auditEntityType} onChange={setAuditEntityType} placeholder="نوع الكيان" />
          <CpTextInput value={auditEntityId} onChange={setAuditEntityId} placeholder="معرف الكيان" />
          <CpTextInput value={rollbackReason} onChange={setRollbackReason} placeholder="سبب التراجع الإلزامي" />
          <CpButton disabled={loading} onClick={() => void loadAudit().catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)))}>تحديث السجل</CpButton>
        </div>
        <CpTable aria-label="سجل تدقيق الكتالوج">
          <thead><tr dir="rtl">
            <CpTableHeaderCell>الوقت</CpTableHeaderCell><CpTableHeaderCell>العملية</CpTableHeaderCell>
            <CpTableHeaderCell>الكيان</CpTableHeaderCell><CpTableHeaderCell>الفاعل</CpTableHeaderCell>
            <CpTableHeaderCell>السبب</CpTableHeaderCell><CpTableHeaderCell>التراجع</CpTableHeaderCell>
          </tr></thead>
          <tbody dir="rtl">
            {audit.map((entry) => {
              const expectedVersion = Number(entry.after?.version ?? 0);
              return <tr key={entry.id}>
                <CpTableCell>{new Date(entry.createdAt).toLocaleString("ar-YE")}</CpTableCell>
                <CpTableCell>{entry.action}</CpTableCell>
                <CpTableCell><div style={codeStyle}>{entry.entityType}<br />{entry.entityId}</div></CpTableCell>
                <CpTableCell>{entry.actorRole}: {entry.actorId}</CpTableCell>
                <CpTableCell>{entry.reason || "—"}</CpTableCell>
                <CpTableCell>{entry.action === "UPDATE" && expectedVersion > 0 ? (
                  <CpButton disabled={saving || rollbackReason.trim().length < 3} onClick={() => void runMutation(async () => {
                    await rollbackOperatorCatalogAudit(entry.id, { expectedVersion, reason: rollbackReason.trim() });
                    await loadAudit();
                  }, "تم التراجع المحكوم وسُجّل كحدث جديد.")}>تراجع إلى السابق</CpButton>
                ) : "غير قابل للتراجع"}</CpTableCell>
              </tr>;
            })}
          </tbody>
        </CpTable>
      </section>
    </OperationsRoomFrame>
  );
}
