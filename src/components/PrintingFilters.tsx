
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Filter, 
  X, 
  Calendar, 
  Package, 
  Palette, 
  Ruler,
  Search
} from "lucide-react";

interface FilterProps {
  onFilterChange: (filters: any) => void;
  onSortChange: (sort: any) => void;
  products: string[];
  colors: string[];
  sizes: string[];
}

export const PrintingFilters = ({ onFilterChange, onSortChange, products, colors, sizes }: FilterProps) => {
  const [filters, setFilters] = useState({
    search: "",
    date: "",
    status: "all",
    filterType: "all",
    product: "all",
    color: "all",
    size: "all",
  });

  const [sort, setSort] = useState({
    field: "date",
    direction: "desc"
  });

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortChange = (direction: string) => {
    const newSort = { field: "date", direction };
    setSort(newSort);
    onSortChange(newSort);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      date: "",
      status: "all",
      filterType: "all",
      product: "all",
      color: "all",
      size: "all",
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.date) count++;
    if (filters.status !== "all") count++;
    if (filters.filterType !== "all") count++;
    if (filters.product !== "all") count++;
    if (filters.color !== "all") count++;
    if (filters.size !== "all") count++;
    return count;
  };

  return (
    <div className="space-y-4 border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
      {/* Search Bar */}
      <Card className="bg-gradient-to-br from-card to-muted/5 border-primary/20">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by product name, order ID, or phone number..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Smart Product & Variation Filtering */}
      <Card className="bg-gradient-to-br from-card to-muted/5 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-poppins flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Order Filters
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFiltersCount()} active
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Filter orders by type, products, variations, date, status and sort order for efficient batch processing
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filter Controls Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
            {/* Filter Type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Filter Type</Label>
              <Select value={filters.filterType} onValueChange={(value) => handleFilterChange("filterType", value)}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="contains">Contains...</SelectItem>
                  <SelectItem value="only">Only Products</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Product</Label>
              <Select value={filters.product} onValueChange={(value) => handleFilterChange("product", value)}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="Any Product" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="all">Any Product</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Color</Label>
              <Select value={filters.color} onValueChange={(value) => handleFilterChange("color", value)}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="Any Color" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="all">Any Color</SelectItem>
                  {colors.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Size Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Size</Label>
              <Select value={filters.size} onValueChange={(value) => handleFilterChange("size", value)}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="Any Size" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="all">Any Size</SelectItem>
                  {sizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Sort Order</Label>
              <Select value={sort.direction} onValueChange={handleSortChange}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="Newest First" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Date */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Order Date</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange("date", e.target.value)}
                className="border-blue-200 focus:border-blue-500"
                placeholder="dd-mm-yyyy"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 items-end">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Filter
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
