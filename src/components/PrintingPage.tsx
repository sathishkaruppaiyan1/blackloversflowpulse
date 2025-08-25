
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, Package, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ShippingLabelPreview from './ShippingLabelPreview';
import { toast } from 'sonner';
import { PrintingFilters } from './PrintingFilters';
import { useWooCommerceOrders } from '@/hooks/useWooCommerceOrders';
import { WooCommerceOrder } from '@/services/wooCommerceOrderService';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CompanySettings {
  company_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
}

const PrintingPage = () => {
  const { orders, loading, fetchOrdersFromWooCommerce } = useWooCommerceOrders();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [allOrdersSelected, setAllOrdersSelected] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
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
  const { user } = useAuth();
  const [filteredOrders, setFilteredOrders] = useState<WooCommerceOrder[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginatedOrders, setPaginatedOrders] = useState<WooCommerceOrder[]>([]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Update paginated orders when filteredOrders, currentPage, or pageSize changes
  useEffect(() => {
    const paginated = filteredOrders.slice(startIndex, endIndex);
    setPaginatedOrders(paginated);
  }, [filteredOrders, currentPage, pageSize, startIndex, endIndex]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Extract unique values for filter options
  const getUniqueProducts = () => {
    const products = new Set<string>();
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          if (item.name) products.add(item.name);
        });
      }
    });
    return Array.from(products);
  };

  const getUniqueColors = () => {
    const colors = new Set<string>();
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          if (item.meta_data && Array.isArray(item.meta_data)) {
            item.meta_data.forEach((meta: any) => {
              if (meta.key && (meta.key.includes('color') || meta.key.includes('Color') || meta.key === 'pa_color')) {
                colors.add(meta.display_value || meta.value);
              }
            });
          }
        });
      }
    });
    return Array.from(colors).filter(color => color && color.trim());
  };

  const getUniqueSizes = () => {
    const sizes = new Set<string>();
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          if (item.meta_data && Array.isArray(item.meta_data)) {
            item.meta_data.forEach((meta: any) => {
              if (meta.key && (meta.key.includes('size') || meta.key.includes('Size') || meta.key === 'pa_size')) {
                sizes.add(meta.display_value || meta.value);
              }
            });
          }
        });
      }
    });
    return Array.from(sizes).filter(size => size && size.trim());
  };

  useEffect(() => {
    fetchCompanySettings();
    if (user) {
      fetchOrdersFromWooCommerce();
    }
  }, [user, fetchOrdersFromWooCommerce]);

  useEffect(() => {
    // Apply filters to orders
    let filtered = [...orders];
    
    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(filters.search.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        order.customer_phone?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Apply date filter
    if (filters.date) {
      const filterDate = new Date(filters.date);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === filterDate.toDateString();
      });
    }

    // Apply product filter
    if (filters.product !== 'all') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => item.name === filters.product)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = new Date(a.created_at).getTime();
      const bValue = new Date(b.created_at).getTime();
      return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });

    setFilteredOrders(filtered);
  }, [orders, filters, sort]);

  const fetchCompanySettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company settings:', error);
      } else if (data) {
        setCompanySettings({
          company_name: data.company_name || 'Your Company',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          country: data.country || '',
          phone: data.phone || '',
          email: data.email || ''
        });
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: any) => {
    setSort(newSort);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prevSelected) =>
      prevSelected.includes(orderId)
        ? prevSelected.filter((id) => id !== orderId)
        : [...prevSelected, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (allOrdersSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(paginatedOrders.map((order) => order.id));
    }
    setAllOrdersSelected(!allOrdersSelected);
  };

  const handlePrint = () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to print.');
      return;
    }

    // Open a new window with the ShippingLabelPreview for each selected order
    selectedOrders.forEach(async (orderId) => {
      const order = filteredOrders.find((o) => o.id === orderId);
      if (order) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const componentString = `
            <html>
              <head>
                <title>Shipping Label - Order #${order.order_number}</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: white; 
                  }
                  .container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    border: 2px solid #000; 
                    padding: 20px; 
                  }
                  .header { 
                    text-align: center; 
                    border-bottom: 2px solid #000; 
                    padding-bottom: 20px; 
                    margin-bottom: 20px; 
                  }
                  .section { 
                    margin-bottom: 20px; 
                  }
                  .section-title { 
                    font-weight: bold; 
                    font-size: 16px; 
                    margin-bottom: 10px; 
                    text-transform: uppercase; 
                  }
                  .address-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 30px; 
                  }
                  .address-box { 
                    border: 1px solid #ccc; 
                    padding: 15px; 
                    background: #f9f9f9; 
                  }
                  .product-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 10px; 
                  }
                  .product-table th, .product-table td { 
                    border: 1px solid #ccc; 
                    padding: 10px 8px; 
                    text-align: left; 
                    vertical-align: top;
                  }
                  .product-table th { 
                    background: #f0f0f0; 
                    font-weight: bold; 
                  }
                  .status-badge { 
                    display: inline-block; 
                    padding: 4px 12px; 
                    background: #007bff; 
                    color: white; 
                    border-radius: 4px; 
                    font-size: 12px; 
                    text-transform: uppercase; 
                  }
                  @media print {
                    body { -webkit-print-color-adjust: exact; }
                    .container { border: 2px solid #000; }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">SHIPPING LABEL</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Order #${order.order_number}</p>
                    <div style="margin-top: 10px;">
                      <span class="status-badge">Status: ${order.status}</span>
                    </div>
                  </div>

                  <div class="section">
                    <div class="section-title">Shipping Information</div>
                    <div class="address-grid">
                      <div>
                        <strong>FROM:</strong>
                        <div class="address-box">
                          <div><strong>${companySettings?.company_name || 'Your Company'}</strong></div>
                          <div>${companySettings?.address_line1 || 'Company Address Line 1'}</div>
                          ${companySettings?.address_line2 ? `<div>${companySettings.address_line2}</div>` : ''}
                          <div>${companySettings?.city || 'City'}, ${companySettings?.state || 'State'}, ${companySettings?.postal_code || 'PIN Code'}</div>
                          <div>${companySettings?.country || 'Country'}</div>
                          <div>Phone: ${companySettings?.phone || 'Phone Number'}</div>
                          ${companySettings?.email ? `<div>Email: ${companySettings.email}</div>` : ''}
                        </div>
                      </div>
                      <div>
                        <strong>TO:</strong>
                        <div class="address-box">
                          <div><strong>${order.customer_name}</strong></div>
                          <div>${order.shipping_address || 'Address not provided'}</div>
                          ${order.customer_phone ? `<div><strong>Phone:</strong> ${order.customer_phone}</div>` : ''}
                          ${order.customer_email ? `<div><strong>Email:</strong> ${order.customer_email}</div>` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="section">
                    <div class="section-title">Product Details</div>
                    <table class="product-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>SKU</th>
                          <th>Variation</th>
                          <th>Qty</th>
                          <th>Price (₹)</th>
                          <th>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${order.line_items && order.line_items.length > 0 ? 
                          order.line_items.map(item => {
                            const productName = item.name || 'Product Name Not Available';
                            const sku = item.sku || 'N/A';
                            const variation = item.variation_id && item.variation_id > 0 
                              ? (item.meta_data?.filter(m => m.key?.startsWith('pa_') || m.display_key?.includes('Variation'))
                                  .map(m => `${m.display_key || m.key}: ${m.display_value || m.value}`)
                                  .join(', ') || 'Standard') 
                              : 'Standard';
                            const quantity = item.quantity || 1;
                            const price = parseFloat(item.price || '0');
                            const total = parseFloat(item.total || '0');
                            
                            return `
                              <tr>
                                <td style="font-weight: bold;">${productName}</td>
                                <td>${sku}</td>
                                <td style="font-size: 11px;">${variation}</td>
                                <td style="text-align: center;">${quantity}</td>
                                <td style="text-align: right;">₹${price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: bold;">₹${total.toFixed(2)}</td>
                              </tr>
                            `;
                          }).join('') : 
                          `<tr>
                            <td colspan="6" style="text-align: center; padding: 20px;">
                              <em>${order.items} item(s) - Total: ₹${order.total.toFixed(2)}</em><br>
                              <small style="color: #666;">Product details not available</small>
                            </td>
                          </tr>`
                        }
                      </tbody>
                      <tfoot>
                        <tr style="font-weight: bold; background: #f0f0f0;">
                          <td colspan="5" style="text-align: right;">Grand Total:</td>
                          <td>₹${order.total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  ${(order.tracking_number || order.carrier) ? `
                    <div class="section">
                      <div class="section-title">Tracking Information</div>
                      <div class="address-box">
                        ${order.carrier ? `<div><strong>Carrier:</strong> ${order.carrier}</div>` : ''}
                        ${order.tracking_number ? `<div><strong>Tracking Number:</strong> ${order.tracking_number}</div>` : ''}
                      </div>
                    </div>
                  ` : ''}

                  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc;">
                    <p style="margin: 0; font-size: 12px; color: #666;">
                      Thank you for your business! Handle with care.
                    </p>
                  </div>
                </div>

                <script>
                  window.onload = function() {
                    window.print();
                    window.onafterprint = function() { 
                      window.close(); 
                    };
                  };
                </script>
              </body>
            </html>
          `;
          printWindow.document.write(componentString);
          printWindow.document.close();
        } else {
          toast.error('Failed to open print window. Please check your browser settings.');
        }
      }
    });

    setSelectedOrders([]);
    setAllOrdersSelected(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('ellipsis-start');
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('ellipsis-end');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading orders from WooCommerce...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Print Shipping Labels</CardTitle>
        </CardHeader>
        <CardContent>
          <PrintingFilters 
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            products={getUniqueProducts()}
            colors={getUniqueColors()}
            sizes={getUniqueSizes()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Orders ({filteredOrders.length})</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={fetchOrdersFromWooCommerce} 
                disabled={loading}
                variant="outline"
              >
                <Package className="w-4 h-4 mr-2" />
                Sync from WooCommerce
              </Button>
              <Button onClick={handlePrint} disabled={selectedOrders.length === 0}>
                <Printer className="w-4 h-4 mr-2" />
                Print Selected Labels ({selectedOrders.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found. {!loading && (
                <Button onClick={fetchOrdersFromWooCommerce} variant="outline" className="ml-2">
                  Sync Orders from WooCommerce
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          className="rounded text-blue-500 focus:ring-blue-500"
                          checked={allOrdersSelected}
                          onChange={handleSelectAllOrders}
                        />
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        Order #
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        Shipping Address
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        Total (₹)
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        Order Status
                      </th>
                      <th className="px-6 py-3 bg-gray-50"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="rounded text-blue-500 focus:ring-blue-500"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.customer_phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate">
                          {order.shipping_address || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {order.line_items && order.line_items.length > 0 ? (
                              <div>
                                {order.line_items.slice(0, 2).map((item, index) => (
                                  <div key={index} className="text-xs">
                                    {item.name} ({item.quantity}x)
                                    {item.sku && <span className="text-gray-500"> - {item.sku}</span>}
                                  </div>
                                ))}
                                {order.line_items.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{order.line_items.length - 2} more items
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">{order.items} items</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ₹{order.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              order.status === 'processing'
                                ? 'secondary'
                                : order.status === 'completed'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {selectedOrders.includes(order.id) && (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                  </div>
                  
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) handlePageChange(currentPage - 1);
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {generatePageNumbers().map((pageNum, index) => (
                        <PaginationItem key={index}>
                          {pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(pageNum as number);
                              }}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) handlePageChange(currentPage + 1);
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintingPage;
