
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  PrinterIcon, 
  BarChart3, 
  Settings, 
  LogOut,
  PackageCheck,
  Warehouse,
  TrendingUp,
  Archive
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AppSidebar = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const menuItems = [
    {
      title: "Dashboard",
      url: "dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Inventory",
      url: "inventory",
      icon: Warehouse,
    },
    {
      title: "Orders",
      url: "orders",
      icon: Package,
    },
    {
      title: "Printing",
      url: "printing",
      icon: PrinterIcon,
    },
    {
      title: "Packing",
      url: "packing",
      icon: PackageCheck,
    },
    {
      title: "Tracking",
      url: "tracking",
      icon: Truck,
    },
    {
      title: "Shipped",
      url: "shipped",
      icon: Archive,
    },
    {
      title: "Analytics",
      url: "analytics",
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: "settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Package className="h-6 w-6" />
          <span className="font-semibold">Warehouse</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.url)}
                    isActive={activeTab === item.url}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
