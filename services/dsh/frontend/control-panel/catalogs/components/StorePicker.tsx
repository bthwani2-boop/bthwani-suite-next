import { useState, useEffect } from "react";
import { Box, Text, TextField } from "@bthwani/ui-kit";
import { useServerDataSource } from "@bthwani/ui-kit";

export type StorePickerProps = {
  value: string;
  onChange: (storeId: string) => void;
  label?: string;
};

export function StorePicker({ value, onChange, label = "اختر المتجر" }: StorePickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { items: stores, isLoading, setFilter } = useServerDataSource<any>({
    fetcher: async (params, signal) => {
      const search = params.filters.search || "";
      if (!search) return { items: [], total: 0 };
      
      const res = await fetch(`/api/dsh/admin/stores?search=${encodeURIComponent(search)}&limit=${params.limit}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch stores");
      const data = await res.json();
      return { items: data.stores || [], total: data.stores?.length || 0 };
    },
    initialFilters: { search: query },
    limit: 10
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilter("search", query);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [query, setFilter]);

  return (
    <Box style={{ position: "relative", width: 300, zIndex: 10 }}>
      <Text role="label">{label}</Text>
      <TextField
        value={value || query}
        onChangeText={(val) => {
          if (value) {
            onChange("");
          }
          setQuery(val);
          setIsOpen(true);
        }}
        placeholder="ابحث باسم المتجر أو المعرف..."
      />
      {isOpen && (
        <Box style={{ position: "absolute", top: 60, left: 0, right: 0, backgroundColor: "var(--bth-colors-surfaceBase)", borderWidth: 1, borderColor: "var(--bth-colors-borderColor)", zIndex: 10, maxHeight: 200, overflow: "hidden", borderRadius: 8 }}>
          {isLoading && <Box padding={8}><Text tone="secondary">جاري البحث...</Text></Box>}
          {!isLoading && stores.length === 0 && query && <Box padding={8}><Text tone="secondary">لم يتم العثور على نتائج</Text></Box>}
          {stores.map(store => (
            <div
              key={store.id}
              style={{ padding: 8, cursor: "pointer" }}
              onClick={() => {
                onChange(store.id);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <Text>{store.nameAr} ({store.id})</Text>
            </div>
          ))}
        </Box>
      )}
    </Box>
  );
}
