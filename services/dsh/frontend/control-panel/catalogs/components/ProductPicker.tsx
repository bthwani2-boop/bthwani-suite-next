import { useState, useEffect } from "react";
import { Box, Text, TextField } from "@bthwani/ui-kit";
import { useServerDataSource } from "@bthwani/ui-kit/src/components/DataTable/useServerDataSource";

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
      
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
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
    <Box position="relative" width={300}>
      <Text role="label">{label}</Text>
      <TextField
        value={value || query}
        onChangeText={(val) => {
          if (value) onChange("");
          setQuery(val);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="ابحث باسم المنتج أو الباركود..."
      />
      {isOpen && (
        <Box 
          position="absolute" top="100%" left={0} right={0} 
          backgroundColor="$surfaceBase" borderWidth={1} borderColor="$borderColor" 
          zIndex={30} maxHeight={250} overflow="auto" borderRadius="$md"
        >
          {isLoading && <Box padding="$2"><Text tone="secondary">جاري البحث...</Text></Box>}
          {!isLoading && products.length === 0 && query && <Box padding="$2"><Text tone="secondary">لا يوجد نتائج</Text></Box>}
          {products.map(p => (
            <Box 
              key={p.id} padding="$2" hoverStyle={{ backgroundColor: "$surfaceInset" }} cursor="pointer"
              onPress={() => {
                onChange(p.id);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <Text>{p.canonicalNameAr}</Text>
              <Text tone="secondary" size="sm">{p.barcode ? `باركود: ${p.barcode}` : "بدون باركود"} | {p.id}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
