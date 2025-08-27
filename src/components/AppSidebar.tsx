
import { useState } from "react";
import { 
  LayoutDashboard, 
  Package2, 
  Printer, 
  Truck, 
  MapPin, 
  BarChart3, 
  Settings,
  ChevronDown,
  ChevronRight,
  PackageOpen,
  Archive,
  TrendingUp,
  FileBarChart
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Orders", url: "/orders", icon: Package2 },
  { title: "Packing", url: "/packing", icon: PackageOpen },
  { title: "Printing", url: "/printing", icon: Printer },
  { title: "Shipped", url: "/shipped", icon: Truck },
  { title: "Tracking", url: "/tracking", icon: MapPin },
];

const inventoryItems = [
  { title: "Dashboard", url: "/inventory", icon: LayoutDashboard },
  { title: "Products", url: "/inventory/products", icon: Archive },
  { title: "Stock Movements", url: "/inventory/movements", icon: TrendingUp },
  { title: "Reports", url: "/inventory/reports", icon: FileBarChart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const { role } = useUserRole();
  const [inventoryExpanded, setInventoryExpanded] = useState(
    location.pathname.startsWith('/inventory')
  );

  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  const isInventoryActive = inventoryItems.some(item => isActive(item.url));

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50";

  const isStaff = role === 'staff';

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Inventory Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setInventoryExpanded(!inventoryExpanded)}
                  className={isInventoryActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}
                >
                  <Package2 className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span>Inventory</span>
                      {inventoryExpanded ? (
                        <ChevronDown className="ml-auto h-4 w-4" />
                      ) : (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </>
                  )}
                </SidebarMenuButton>
                {inventoryExpanded && !collapsed && (
                  <SidebarMenuSub>
                    {inventoryItems.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild>
                          <NavLink to={item.url} className={getNavCls}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analytics & Settings - Hidden for staff */}
        {!isStaff && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/analytics" className={getNavCls}>
                      <BarChart3 className="h-4 w-4" />
                      {!collapsed && <span>Analytics</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/settings" className={getNavCls}>
                      <Settings className="h-4 w-4" />
                      {!collapsed && <span>Settings</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Profile Section for staff */}
        {isStaff && (
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/settings" className={getNavCls}>
                      <Settings className="h-4 w-4" />
                      {!collapsed && <span>Profile</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
