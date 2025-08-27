
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon, Filter, X, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { WooCommerceOrder } from '@/services/wooCommerceOrderService';

interface FilterOptions {
  filterType: string;
  product: string;
  color: string;
  size: string;
  variation: string;
  sortOrder: string;
  orderDate: Date | undefined;
}

interface PrintingFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  totalOrders: number;
  orders: WooCommerceOrder[];
}

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export const PrintingFilters: React.FC<PrintingFiltersProps> = ({ onFiltersChange, totalOrders, orders }) => {
  const [filters, setFilters] = useState<FilterOptions>({
    filterType: 'contains',
    product: 'any',
    color: 'any',
    size: 'any',
    variation: 'any',
    sortOrder: 'newest',
    orderDate: undefined,
  });

  // Dropdown open states
  const [openDropdowns, setOpenDropdowns] = useState({
    product: false,
    color: false,
    size: false,
    variation: false,
  });

  // Dynamic filter options based on actual order data
  const [filterOptions, setFilterOptions] = useState<{
    products: FilterOption[];
    colors: FilterOption[];
    sizes: FilterOption[];
    variations: FilterOption[];
  }>({
    products: [],
    colors: [],
    sizes: [],
    variations: [],
  });

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDropdownToggle = (dropdown: keyof typeof openDropdowns) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

  const handleDropdownClose = (dropdown: keyof typeof openDropdowns) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdown]: false
    }));
  };

  const clearFilters = () => {
    const clearedFilters: FilterOptions = {
      filterType: 'contains',
      product: 'any',
      color: 'any',
      size: 'any',
      variation: 'any',
      sortOrder: 'newest',
      orderDate: undefined,
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const applyFilters = () => {
    onFiltersChange(filters);
  };

  // Extract unique filter options from orders data
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const productMap = new Map<string, number>();
    const colorMap = new Map<string, number>();
    const sizeMap = new Map<string, number>();
    const variationMap = new Map<string, number>();

    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach((item: any) => {
          // Extract product names
          if (item.name) {
            const product = item.name.toLowerCase();
            productMap.set(product, (productMap.get(product) || 0) + 1);
          }

          // Extract colors
          if (item.color) {
            const color = item.color.toLowerCase();
            colorMap.set(color, (colorMap.get(color) || 0) + 1);
          }

          // Extract sizes
          if (item.size) {
            const size = item.size.toUpperCase();
            sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
          }

          // Extract variations (weight, material, etc.)
          if (item.weight) {
            const variation = item.weight.toLowerCase();
            variationMap.set(variation, (variationMap.get(variation) || 0) + 1);
          }
          if (item.material) {
            const variation = item.material.toLowerCase();
            variationMap.set(variation, (variationMap.get(variation) || 0) + 1);
          }
          if (item.brand) {
            const variation = item.brand.toLowerCase();
            variationMap.set(variation, (variationMap.get(variation) || 0) + 1);
          }
          if (item.meta_data && Array.isArray(item.meta_data)) {
            item.meta_data.forEach((meta: any) => {
              if (meta.display_value && meta.display_value !== item.name) {
                const variation = meta.display_value.toLowerCase();
                variationMap.set(variation, (variationMap.get(variation) || 0) + 1);
              }
            });
          }
        });
      }
    });

    // Convert maps to sorted arrays
    const products: FilterOption[] = [{ value: 'any', label: 'Any Product', count: orders.length }]
      .concat(Array.from(productMap.entries())
        .map(([value, count]) => ({ 
          value, 
          label: value.charAt(0).toUpperCase() + value.slice(1), 
          count 
        }))
        .sort((a, b) => b.count - a.count));

    const colors: FilterOption[] = [{ value: 'any', label: 'Any Color', count: orders.length }]
      .concat(Array.from(colorMap.entries())
        .map(([value, count]) => ({ 
          value, 
          label: value.charAt(0).toUpperCase() + value.slice(1), 
          count 
        }))
        .sort((a, b) => b.count - a.count));

    const sizes: FilterOption[] = [{ value: 'any', label: 'Any Size', count: orders.length }]
      .concat(Array.from(sizeMap.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => {
          const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
          const aIndex = sizeOrder.indexOf(a.value);
          const bIndex = sizeOrder.indexOf(b.value);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.value.localeCompare(b.value);
        }));

    const variations: FilterOption[] = [{ value: 'any', label: 'Any Variation', count: orders.length }]
      .concat(Array.from(variationMap.entries())
        .map(([value, count]) => ({ 
          value, 
          label: value.charAt(0).toUpperCase() + value.slice(1), 
          count 
        }))
        .sort((a, b) => b.count - a.count));

    setFilterOptions({
      products,
      colors,
      sizes,
      variations
    });
  }, [orders]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Smart Product & Variation Filtering
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Filter orders by products, variations, date and sort order for efficient batch processing
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          {/* Filter Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filter Type</Label>
            <Select 
              value={filters.filterType} 
              onValueChange={(value) => handleFilterChange('filterType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains...</SelectItem>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="starts">Starts with</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Product</Label>
            <Popover open={openDropdowns.product} onOpenChange={() => handleDropdownToggle('product')}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDropdowns.product}
                  className="w-full justify-between"
                >
                  {filters.product === 'any' 
                    ? 'Any Product'
                    : filterOptions.products.find(p => p.value === filters.product)?.label || filters.product
                  }
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search products..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {filterOptions.products.map((product) => (
                        <CommandItem
                          key={product.value}
                          value={product.value}
                          onSelect={() => {
                            handleFilterChange('product', product.value);
                            handleDropdownClose('product');
                          }}
                        >
                          {product.label}
                          {product.count && product.count > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">({product.count})</span>
                          )}
                          <Check
                            className={cn(
                              "ml-2 h-4 w-4",
                              filters.product === product.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <Popover open={openDropdowns.color} onOpenChange={() => handleDropdownToggle('color')}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDropdowns.color}
                  className="w-full justify-between"
                >
                  {filters.color === 'any' 
                    ? 'Any Color'
                    : filterOptions.colors.find(c => c.value === filters.color)?.label || filters.color
                  }
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search colors..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No color found.</CommandEmpty>
                    <CommandGroup>
                      {filterOptions.colors.map((color) => (
                        <CommandItem
                          key={color.value}
                          value={color.value}
                          onSelect={() => {
                            handleFilterChange('color', color.value);
                            handleDropdownClose('color');
                          }}
                        >
                          {color.label}
                          {color.count && color.count > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">({color.count})</span>
                          )}
                          <Check
                            className={cn(
                              "ml-2 h-4 w-4",
                              filters.color === color.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Size</Label>
            <Popover open={openDropdowns.size} onOpenChange={() => handleDropdownToggle('size')}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDropdowns.size}
                  className="w-full justify-between"
                >
                  {filters.size === 'any' 
                    ? 'Any Size'
                    : filterOptions.sizes.find(s => s.value === filters.size)?.label || filters.size
                  }
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search sizes..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No size found.</CommandEmpty>
                    <CommandGroup>
                      {filterOptions.sizes.map((size) => (
                        <CommandItem
                          key={size.value}
                          value={size.value}
                          onSelect={() => {
                            handleFilterChange('size', size.value);
                            handleDropdownClose('size');
                          }}
                        >
                          {size.label}
                          {size.count && size.count > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">({size.count})</span>
                          )}
                          <Check
                            className={cn(
                              "ml-2 h-4 w-4",
                              filters.size === size.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Variation */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Variation</Label>
            <Popover open={openDropdowns.variation} onOpenChange={() => handleDropdownToggle('variation')}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDropdowns.variation}
                  className="w-full justify-between"
                >
                  {filters.variation === 'any' 
                    ? 'Any Variation'
                    : filterOptions.variations.find(v => v.value === filters.variation)?.label || filters.variation
                  }
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search variations..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No variation found.</CommandEmpty>
                    <CommandGroup>
                      {filterOptions.variations.map((variation) => (
                        <CommandItem
                          key={variation.value}
                          value={variation.value}
                          onSelect={() => {
                            handleFilterChange('variation', variation.value);
                            handleDropdownClose('variation');
                          }}
                        >
                          {variation.label}
                          {variation.count && variation.count > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">({variation.count})</span>
                          )}
                          <Check
                            className={cn(
                              "ml-2 h-4 w-4",
                              filters.variation === variation.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sort Order</Label>
            <Select 
              value={filters.sortOrder} 
              onValueChange={(value) => handleFilterChange('sortOrder', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount_high">Amount High to Low</SelectItem>
                <SelectItem value="amount_low">Amount Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Order Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.orderDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.orderDate ? format(filters.orderDate, "dd-MM-yyyy") : "dd-mm-yyyy"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.orderDate}
                  onSelect={(date) => handleFilterChange('orderDate', date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700">
            Filter
          </Button>
          <Button onClick={clearFilters} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
