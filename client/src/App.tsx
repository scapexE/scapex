import { useEffect, useState } from "react";
import { initDbStorage } from "@/lib/dbStorage";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import Users from "@/pages/Users";
import SystemAdmin from "@/pages/SystemAdmin";
import { Switch, Route } from "wouter";
import { getSystemSettings, FONT_OPTIONS, FONT_SIZE_OPTIONS } from "@/lib/companySettings";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "next-themes";
import { BusinessActivityProvider } from "@/contexts/BusinessActivityContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ActiveRoleProvider } from "@/contexts/ActiveRoleContext";
import { dbGetItem } from "@/lib/dbStorage";
import type { SystemUser } from "@/lib/permissions";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import CRMModule from "@/pages/modules/crm/index";
import ProjectsModule from "@/pages/modules/projects/index";
import ProjectDetailPage from "@/pages/modules/projects/detail";
import SalesModule from "@/pages/modules/sales/index";
import AccountingModule from "@/pages/modules/accounting/index";
import ClientPortalModule from "@/pages/modules/client-portal/index";
import HRModule from "@/pages/modules/hr/index";
import PayrollModule from "@/pages/modules/payroll/index";
import AttendanceModule from "@/pages/modules/attendance/index";
import PurchasesModule from "@/pages/modules/purchases/index";
import InventoryModule from "@/pages/modules/inventory/index";
import EquipmentModule from "@/pages/modules/equipment/index";
import HSEModule from "@/pages/modules/hse/index";
import DMSModule from "@/pages/modules/dms/index";
import BIModule from "@/pages/modules/bi/index";
import AIControlModule from "@/pages/modules/ai-control/index";
import CompaniesModule from "@/pages/modules/companies/index";
import MobileAppModule from "@/pages/modules/mobile-app/index";
import AboutModule from "@/pages/modules/about/index";
import AuditLogModule from "@/pages/modules/audit-log/index";
import CompanySettingsModule from "@/pages/modules/company-settings/index";
import BackupModule from "@/pages/modules/backup/index";
import Profile from "@/pages/Profile";
import PublicSurvey from "@/pages/PublicSurvey";
import SmartProposalModule from "@/pages/modules/smart-proposal/index";

function Router() {
  return (
    <Switch>
      {/* Public customer-facing survey — no auth required */}
      <Route path="/survey/:token" component={PublicSurvey} />

      <Route path="/" component={Login} />

      <ProtectedRoute path="/dashboard" component={Dashboard} page="dashboard" />
      <ProtectedRoute path="/users" component={Users} page="users" />
      <ProtectedRoute path="/system-admin" component={SystemAdmin} page="system_admin" />

      {/* Core & Analytics */}
      <Route path="/ai-control" component={AIControlModule} />
      <Route path="/bi" component={BIModule} />
      <Route path="/companies" component={CompaniesModule} />

      {/* Business & Finance */}
      <Route path="/crm" component={CRMModule} />
      <Route path="/sales" component={SalesModule} />
      <Route path="/smart-proposal" component={SmartProposalModule} />
      <Route path="/purchases" component={PurchasesModule} />
      <Route path="/accounting" component={AccountingModule} />

      {/* Operations */}
      <Route path="/projects" component={ProjectsModule} />
      <Route path="/projects/:id" component={ProjectDetailPage} />
      <Route path="/inventory" component={InventoryModule} />
      <Route path="/equipment" component={EquipmentModule} />

      {/* HR & Personnel */}
      <Route path="/hr" component={HRModule} />
      <Route path="/payroll" component={PayrollModule} />
      <Route path="/attendance" component={AttendanceModule} />
      <Route path="/hse" component={HSEModule} />
      <Route path="/mobile-app" component={MobileAppModule} />

      {/* System & Portals */}
      <Route path="/dms" component={DMSModule} />
      <Route path="/client-portal" component={ClientPortalModule} />
      <Route path="/portal" component={ClientPortalModule} />
      <Route path="/client" component={ClientPortalModule} />
      <Route path="/company-settings" component={CompanySettingsModule} />
      <Route path="/about" component={AboutModule} />
      <ProtectedRoute path="/audit-log" component={AuditLogModule} page="audit_log" />
      <ProtectedRoute path="/backup" component={BackupModule} page="backup" />
      <Route path="/profile" component={Profile} />

      <Route component={NotFound} />
    </Switch>
  );
}

function applyFontSettings() {
  const settings = getSystemSettings();
  const fontOpt = FONT_OPTIONS.find(f => f.value === settings.fontFamily) || FONT_OPTIONS[0];
  const sizeOpt = FONT_SIZE_OPTIONS.find(s => s.value === settings.fontSize) || FONT_SIZE_OPTIONS[1];
  document.documentElement.style.fontFamily = fontOpt.family;
  document.documentElement.style.fontSize = sizeOpt.css;
}

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDbStorage().then(() => {
      applyFontSettings();
      setReady(true);
    });
    const handler = () => applyFontSettings();
    window.addEventListener("scapex_system_settings_update", handler);
    return () => window.removeEventListener("scapex_system_settings_update", handler);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // currentUser is read here so BusinessActivityProvider lives at the app
  // root — pages that call useActivityScope() in their function body
  // (e.g. /crm, /projects) need it available BEFORE MainLayout renders.
  // We re-read on every render so login/logout takes effect immediately.
  const currentUser: SystemUser | null = (() => {
    try { return JSON.parse(dbGetItem("user") || "null"); } catch { return null; }
  })();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <SettingsProvider>
              <BusinessActivityProvider currentUser={currentUser}>
                <ActiveRoleProvider>
                  <Toaster />
                  <Router />
                </ActiveRoleProvider>
              </BusinessActivityProvider>
            </SettingsProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
