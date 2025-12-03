"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Package, Check, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/products";

interface ProductLookupProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  loading?: boolean;
  allowManualEntry?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductLookup({
  products,
  selectedProductId,
  onSelect,
  loading = false,
  allowManualEntry = false,
  placeholder = "Search products by name or SKU...",
  disabled = false,
}: ProductLookupProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === "active");
    
    if (!searchTerm.trim()) {
      return activeProducts;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return activeProducts.filter(
      (product) =>
        product.product_name.toLowerCase().includes(lowerSearch) ||
        product.sku.toLowerCase().includes(lowerSearch)
    );
  }, [products, searchTerm]);

  // Get selected product details
  const selectedProduct = useMemo(() => {
    if (!selectedProductId || selectedProductId === "manual") return null;
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (productId: string) => {
    onSelect(productId);
    setSearchTerm("");
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect("");
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between font-normal h-10",
            !selectedProduct && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2 truncate flex-1 text-left">
            <Package className="h-4 w-4 shrink-0 opacity-50" />
            {loading ? (
              <span>Loading products...</span>
            ) : selectedProduct ? (
              <span className="truncate">
                {selectedProduct.product_name} ({selectedProduct.sku})
              </span>
            ) : selectedProductId === "manual" ? (
              <span>Manual Entry</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedProduct && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-1">
            {allowManualEntry && (
              <button
                type="button"
                onClick={() => handleSelect("manual")}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                  selectedProductId === "manual" && "bg-muted"
                )}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  {selectedProductId === "manual" && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <span className="font-medium text-muted-foreground">Manual Entry</span>
              </button>
            )}
            
            {filteredProducts.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                {searchTerm ? "No products found matching your search" : "No products available"}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product.id)}
                  className={cn(
                    "w-full flex items-start gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left",
                    selectedProductId === product.id && "bg-muted"
                  )}
                >
                  <div className="w-4 h-4 flex items-center justify-center mt-0.5 shrink-0">
                    {selectedProductId === product.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{product.product_name}</span>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {product.sku}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>${product.unit_price.toFixed(2)}</span>
                      <span>•</span>
                      <span
                        className={cn(
                          product.quantity_in_stock === 0
                            ? "text-red-500"
                            : product.reorder_level && product.quantity_in_stock <= product.reorder_level
                            ? "text-amber-500"
                            : "text-green-600"
                        )}
                      >
                        Stock: {product.quantity_in_stock}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

