
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
}

export const PrintingFilters: React.FC<PrintingFiltersProps> = ({ onFiltersChange, totalOrders }) => {
  const [filters, setFilters] = useState<FilterOptions>({
    filterType: 'contains',
    product: 'any',
    color: 'any',
    size: 'any',
    variation: 'any',
    sortOrder: 'newest',
    orderDate: undefined,
  });

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
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
            <Select 
              value={filters.product} 
              onValueChange={(value) => handleFilterChange('product', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Product</SelectItem>
                <SelectItem value="hakoba">Hakoba midi</SelectItem>
                <SelectItem value="cotton">Cotton frocks</SelectItem>
                <SelectItem value="mahe">Mahe space saree</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <Select 
              value={filters.color} 
              onValueChange={(value) => handleFilterChange('color', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any color</SelectItem>
                <SelectItem value="wine">Wine</SelectItem>
                <SelectItem value="maroon">Maroon wine</SelectItem>
                <SelectItem value="black">Black</SelectItem>
                <SelectItem value="white">White</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Size</Label>
            <Select 
              value={filters.size} 
              onValueChange={(value) => handleFilterChange('size', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any size</SelectItem>
                <SelectItem value="S">S</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="XL">XL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Variation */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Variation</Label>
            <Select 
              value={filters.variation} 
              onValueChange={(value) => handleFilterChange('variation', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Variation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Variation</SelectItem>
                <SelectItem value="750g">750g</SelectItem>
                <SelectItem value="1kg">1kg</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>
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
