import { useState, useEffect } from "react";
import { Box, Text, TextField } from "@bthwani/ui-kit";
import { useServerDataSource } from "@bthwani/ui-kit";
import { createDshSessionHttpClient } from "../../shared/_kernel/dsh-http-request";

const { request } = createDshSessionHttpClient("product-picker");
export type ProductPickerProps = {
  value: string;
  onChange: (productId: string) => void;
  label?: string;
  domainId?: string; // Optional filter
};

export function ProductPicker({ value, onChange, label = "اختر المنتج المركزي (L5)", domainId }: ProductPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { items: products, isLoading, setFilter, setFilters } = useServerDataSource<any>({
    fetcher: async (params, signal) => {
      const search = params.filters.search || "";
      const domain = params.filters.domainId || "";
      if (!search) return { items: [], total: 0 };
      
      let url = `/api/dsh/admin/catalog/products?search=${encodeURIComponent(search)}&limit=${params.limit}`;
      if (domain) url += `&domainId=${encodeURIComponent(domain)}`;
      
      const res = await request<any>(url, { signal });
      if (!res.ok || !res.body) throw new Error("Failed to fetch products");
      const data = res.body;
      return { items: data.masterProducts || [], total: data.total || data.masterProducts?.length || 0 };
    },
    initialFilters: { search: query, domainId },
    limit: 10
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: query, domainId }));
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [query, domainId, setFilters]);

  return (
    <Box style={{ position: "relative", width: 300, zIndex: 10 }}>
      <Text role="label">{label}</Text>
      <TextField
        value={value || query}
        onChangeText={(val) => {
          if (value) onChange("");
          setQuery(val);
          setIsOpen(true);
        }}
        
        placeholder="ابحث باسم المنتج أو الباركود..."
      />
      {isOpen && (
        <Box style={{ position: "absolute", top: 60, left: 0, right: 0, backgroundColor: "var(--bth-colors-surfaceBase)", borderWidth: 1, borderColor: "var(--bth-colors-borderColor)", zIndex: 30, maxHeight: 250, overflow: "hidden", borderRadius: 8 }}>
          {isLoading && <Box padding={8}><Text tone="secondary">جاري البحث...</Text></Box>}
          {!isLoading && products.length === 0 && query && <Box padding={8}><Text tone="secondary">لا يوجد نتائج</Text></Box>}
          {products.map(p => (
            <div
              key={p.id}
              style={{ padding: 8, cursor: "pointer" }}
              onClick={() => {
                onChange(p.id);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <Text>{p.canonicalNameAr}</Text>
              <Text tone="secondary" role="bodySm">{p.barcode ? `باركود: ${p.barcode}` : "بدون باركود"} | {p.id}</Text>
            </div>
          ))}
        </Box>
      )}
    </Box>
  );
}
