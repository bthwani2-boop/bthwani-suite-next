import type { MasterProduct } from "./central-catalog.types";

export interface BulkImportRow {
  readonly barcode: string;
  readonly canonicalNameAr: string;
  readonly canonicalNameEn: string;
  readonly brand: string;
  readonly unit: string;
  readonly domainId: string;
  readonly categoryNodeId: string;
}

export interface BulkImportError {
  readonly rowIndex: number;
  readonly column: string;
  readonly error: string;
}

export function parseAndValidateCSV(csvText: string): {
  readonly rows: readonly BulkImportRow[];
  readonly errors: readonly BulkImportError[];
} {
  const lines = csvText.split(/\r?\n/);
  const rows: BulkImportRow[] = [];
  const errors: BulkImportError[] = [];

  if (lines.length <= 1) {
    return { rows: [], errors: [{ rowIndex: 0, column: "file", error: "CSV file is empty" }] };
  }

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 6) {
      errors.push({ rowIndex: i, column: "row", error: "Missing columns" });
      continue;
    }

    const [barcode, canonicalNameAr, canonicalNameEn, brand, unit, domainId, categoryNodeId] = parts;

    if (!canonicalNameAr) {
      errors.push({ rowIndex: i, column: "name_ar", error: "الاسم العربي مطلوب" });
    }
    if (!domainId) {
      errors.push({ rowIndex: i, column: "domain_id", error: "الفئة الرئيسية مطلوبة" });
    }

    rows.push({
      barcode: barcode || "",
      canonicalNameAr: canonicalNameAr || "",
      canonicalNameEn: canonicalNameEn || "",
      brand: brand || "",
      unit: unit || "unit",
      domainId: domainId || "",
      categoryNodeId: categoryNodeId || "",
    });
  }

  return { rows, errors };
}

export function exportProductsToCSV(products: readonly MasterProduct[]): string {
  const headers = "barcode,name_ar,name_en,brand,unit,domain_id,category_node_id";
  const rows = products.map(
    (p) =>
      `"${p.barcode || ""}"` +
      `,"${p.canonicalNameAr.replace(/"/g, '""')}"` +
      `,"${(p.canonicalNameEn || "").replace(/"/g, '""')}"` +
      `,"${p.brand.replace(/"/g, '""')}"` +
      `,"${p.unit}"` +
      `,"${p.domainId}"` +
      `,"${p.categoryNodeId || ""}"`
  );
  return [headers, ...rows].join("\n");
}
