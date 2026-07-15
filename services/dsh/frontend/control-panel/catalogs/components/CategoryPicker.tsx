import { useState, useMemo } from "react";
import { Box, Text, TextField } from "@bthwani/ui-kit";
import type { CentralCatalogDomain, CentralCatalogNode } from "../../../shared/catalog";

export type CategoryPickerProps = {
  value: string; // The selected node ID or domain ID
  onChange: (id: string, type: "domain" | "node") => void;
  domains: readonly CentralCatalogDomain[];
  nodes: readonly CentralCatalogNode[];
  label?: string;
};

export function CategoryPicker({ value, onChange, domains, nodes, label = "اختر الفئة / التصنيف" }: CategoryPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(() => {
    const q = query.toLowerCase();
    const result: { id: string; name: string; type: "domain" | "node"; path: string }[] = [];
    
    // Add domains
    for (const d of domains) {
      if (d.nameAr.toLowerCase().includes(q)) {
        result.push({ id: d.id, name: d.nameAr, type: "domain", path: d.nameAr });
      }
    }
    
    // Add nodes
    for (const n of nodes) {
      if (n.nameAr.toLowerCase().includes(q)) {
        const domain = domains.find(d => d.id === n.domainId);
        result.push({ id: n.id, name: n.nameAr, type: "node", path: `${domain?.nameAr || "مجهول"} > ${n.nameAr}` });
      }
    }
    
    return result.slice(0, 15); // limit to 15
  }, [query, domains, nodes]);

  const selectedItem = useMemo(() => {
    if (!value) return null;
    const d = domains.find(x => x.id === value);
    if (d) return { ...d, type: "domain" as const };
    const n = nodes.find(x => x.id === value);
    if (n) return { ...n, type: "node" as const };
    return null;
  }, [value, domains, nodes]);

  return (
    <Box style={{ position: "relative", width: 300, zIndex: 10 }}>
      <Text role="label">{label}</Text>
      <TextField
        value={query || (selectedItem ? (selectedItem.nameAr + (selectedItem.type === "domain" ? " (فئة)" : " (تصنيف)")) : value)}
        onChangeText={(val) => {
          if (value) onChange("", "domain");
          setQuery(val);
          setIsOpen(true);
        }}
        
        placeholder="ابحث عن فئة أو تصنيف..."
      />
      {isOpen && (
        <Box style={{ position: "absolute", top: 60, left: 0, right: 0, backgroundColor: "white", borderWidth: 1, borderColor: "#ccc", zIndex: 20, maxHeight: 250, overflow: "hidden", borderRadius: 8 }}>
          {options.length === 0 && (
            <Box padding={8}><Text tone="secondary">لا يوجد نتائج</Text></Box>
          )}
          {options.map(opt => (
            <div
              key={opt.id}
              style={{ padding: 8, cursor: "pointer" }}
              onClick={() => {
                onChange(opt.id, opt.type);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <Text>{opt.name}</Text>
              <Text tone="secondary" role="bodySm">{opt.path}</Text>
            </div>
          ))}
        </Box>
      )}
    </Box>
  );
}
