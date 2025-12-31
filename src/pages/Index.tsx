import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '@/components/Dashboard';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { AnalyticsPage } from '@/components/AnalyticsPage';
import SettingsPage from '@/components/SettingsPage';
import PrintingPage from '@/components/PrintingPage';
import { PackingPage } from '@/components/PackingPage';
import TrackingPage from '@/components/TrackingPage';
import OrdersPage from '@/components/OrdersPage';
import ShippedPage from '@/components/ShippedPage';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useBypassPackingStage } from '@/hooks/useBypassPackingStage';
import { useOrderCounts } from '@/hooks/useOrderCounts';
import { 
  Home, 
  ShoppingCart, 
  Printer, 
  Package, 
  Truck, 
  BarChart3, 
  Settings, 
  LogOut,
  Search,
  User,
  CheckCircle
} from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { bypassPackingStage } = useBypassPackingStage();
  const { counts } = useOrderCounts();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Redirect packing to tracking if bypass is enabled and user is on packing tab
  useEffect(() => {
    if (bypassPackingStage && activeTab === "packing") {
      setActiveTab("tracking");
    }
  }, [bypassPackingStage, activeTab]);

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "printing", label: "Printing", icon: Printer },
    // Conditionally include packing stage based on bypass setting
    ...(bypassPackingStage ? [] : [{ id: "packing", label: "Packing", icon: Package, badge: counts.packing }]),
    { id: "tracking", label: "Tracking", icon: Truck, badge: counts.packed },
    { id: "shipped", label: "Shipped", icon: CheckCircle, badge: counts.shipped },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  const adminItems = [
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "orders":
        return <OrdersPage />;
      case "scanner":
        return <BarcodeScanner />;
      case "printing":
        return <PrintingPage />;
      case "packing":
        // If bypass is enabled, show tracking page instead
        return bypassPackingStage ? <TrackingPage /> : <PackingPage />;
      case "tracking":
        return <TrackingPage />;
      case "shipped":
        return <ShippedPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo and Brand */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Flow Pulse OFS</h1>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {user?.user_metadata?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Administration Section */}
          <div className="mt-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              ADMINISTRATION
            </p>
            <div className="space-y-2">
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground capitalize">
                {activeTab === "dashboard" ? "Dashboard" : activeTab}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  className="pl-10 w-64"
                />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
