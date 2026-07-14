import { useState, useEffect } from "react";
import { Box, Text, TextField } from "@bthwani/ui-kit";

export type ProductPickerProps = {
  value: string;
  onChange: (productId: string) => void;
  label?: string;
  domainId?: string; // Optional filter
};

export function ProductPicker({ value, onChange, label = "اختر المنتج المركزي (L5)", domainId }: ProductPickerProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.trim() === "") {
      setProducts([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      setLoading(true);
      let url = `/api/dsh/admin/catalog/products?search=${encodeURIComponent(query)}&limit=10`;
      if (domainId) url += `&domainId=${encodeURIComponent(domainId)}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
           setProducts(data.masterProducts || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query, domainId]);

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
          {loading && <Box padding="$2"><Text tone="secondary">جاري البحث...</Text></Box>}
          {!loading && products.length === 0 && query && <Box padding="$2"><Text tone="secondary">لا يوجد نتائج</Text></Box>}
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
