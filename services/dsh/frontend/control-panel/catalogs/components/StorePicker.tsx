import { useState, useEffect } from "react";
import { Box, Text, TextField } from "@bthwani/ui-kit";
import { CpButton } from "@bthwani/control-panel/components";

export type StorePickerProps = {
  value: string;
  onChange: (storeId: string) => void;
  label?: string;
};

export function StorePicker({ value, onChange, label = "اختر المتجر" }: StorePickerProps) {
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.trim() === "") {
      setStores([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      setLoading(true);
      fetch(`/api/dsh/admin/stores?search=${encodeURIComponent(query)}&limit=10`)
        .then(res => res.json())
        .then(data => {
           setStores(data.stores || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <Box position="relative" width={300}>
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
        <Box 
          position="absolute" 
          top="100%" 
          left={0} 
          right={0} 
          backgroundColor="$surfaceBase" 
          borderWidth={1} 
          borderColor="$borderColor" 
          zIndex={10} 
          maxHeight={200} 
          overflow="auto"
          borderRadius="$md"
        >
          {loading && <Box padding="$2"><Text tone="secondary">جاري البحث...</Text></Box>}
          {!loading && stores.length === 0 && query && <Box padding="$2"><Text tone="secondary">لم يتم العثور على نتائج</Text></Box>}
          {stores.map(store => (
            <Box 
              key={store.id} 
              padding="$2" 
              hoverStyle={{ backgroundColor: "$surfaceInset" }}
              onPress={() => {
                onChange(store.id);
                setQuery("");
                setIsOpen(false);
              }}
              cursor="pointer"
            >
              <Text>{store.nameAr} ({store.id})</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
