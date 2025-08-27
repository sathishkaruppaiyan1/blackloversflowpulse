
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./components/Dashboard";
import OrdersPage from "./components/OrdersPage";
import PackingPage from "./components/PackingPage";
import PrintingPage from "./components/PrintingPage";
import ShippedPage from "./components/ShippedPage";
import TrackingPage from "./components/TrackingPage";
import AnalyticsPage from "./components/AnalyticsPage";
import SettingsPage from "./components/SettingsPage";
import { InventoryDashboard } from "./components/inventory/InventoryDashboard";
import { ProductsPage } from "./components/inventory/ProductsPage";
import { StockMovementsPage } from "./components/inventory/StockMovementsPage";
import { ReportsPage } from "./components/inventory/ReportsPage";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <SidebarProvider>
              <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex-1">
                  {/* Global header with sidebar trigger */}
                  <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <SidebarTrigger className="ml-2" />
                  </header>
                  
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/orders" element={
                        <ProtectedRoute>
                          <OrdersPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/packing" element={
                        <ProtectedRoute>
                          <PackingPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/printing" element={
                        <ProtectedRoute>
                          <PrintingPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/shipped" element={
                        <ProtectedRoute>
                          <ShippedPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/tracking" element={
                        <ProtectedRoute>
                          <TrackingPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/analytics" element={
                        <ProtectedRoute>
                          <AnalyticsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/inventory" element={
                        <ProtectedRoute>
                          <InventoryDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/inventory/products" element={
                        <ProtectedRoute>
                          <ProductsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/inventory/movements" element={
                        <ProtectedRoute>
                          <StockMovementsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/inventory/reports" element={
                        <ProtectedRoute>
                          <ReportsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/settings" element={
                        <ProtectedRoute>
                          <SettingsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </div>
              <Toaster />
            </SidebarProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
