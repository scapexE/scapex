import { useEffect, useState } from "react";
import { initDbStorage } from "@/lib/dbStorage";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import Users from "@/pages/Users";
import SystemAdmin from "@/pages/SystemAdmin";
import { Switch, Route, Redirect } from "wouter";
import { getSystemSettings, FONT_SIZE_OPTIONS, injectCustomFontFaces, resolveFontCss } from "@/lib/companySettings";
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
import PurchasesModule from "@/pages/modules/purchases/index";
import InventoryModule from "@/pages/modules/inventory/index";
import EquipmentModule from "@/pages/modules/equipment/index";
import DMSModule from "@/pages/modules/dms/index";
import BIModule from "@/pages/modules/bi/index";
import AIControlModule from "@/pages/modules/ai-control/index";
import CompaniesModule from "@/pages/modules/companies/index";
import AboutModule from "@/pages/modules/about/index";
import AuditLogModule from "@/pages/modules/audit-log/index";
import BackupModule from "@/pages/modules/backup/index";
import Profile from "@/pages/Profile";
import PublicSurvey from "@/pages/PublicSurvey";
import SmartProposalModule from "@/pages/modules/smart-proposal/index";

function CompanySettingsRedirect() {
  return <Redirect to="/companies" />;
}

function DashboardRedirect() {
  return <Redirect to="/dashboard" />;
}

function PayrollRedirect() {
  const params = new URLSearchParams(window.location.search);
  params.set("tab", "payroll");
  return <Redirect to={`/hr?${params.toString()}`} />;
}

function AttendanceRedirect() {
  const params = new URLSearchParams(window.location.search);
  params.set("tab", "attendance");
  return <Redirect to={`/hr?${params.toString()}`} />;
}

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
      <ProtectedRoute path="/ai-control" component={AIControlModule} page="ai_control" />
      <ProtectedRoute path="/bi" component={BIModule} page="bi" />
      <ProtectedRoute path="/companies" component={CompaniesModule} page="multi_tenant" />

      {/* Business & Finance */}
      <ProtectedRoute path="/crm" component={CRMModule} page="crm" />
      <ProtectedRoute path="/sales" component={SalesModule} page="sales" />
      <ProtectedRoute path="/smart-proposal" component={SmartProposalModule} page="sales" />
      <ProtectedRoute path="/purchases" component={PurchasesModule} page="purchases" />
      <ProtectedRoute path="/accounting" component={AccountingModule} page="accounting" />

      {/* Operations */}
      <ProtectedRoute path="/projects" component={ProjectsModule} page="projects" />
      <ProtectedRoute path="/projects/:id" component={ProjectDetailPage} page="projects" />
      <ProtectedRoute path="/inventory" component={InventoryModule} page="inventory" />
      <ProtectedRoute path="/equipment" component={EquipmentModule} page="equipment" />

      {/* HR & Personnel */}
      <ProtectedRoute path="/hr" component={HRModule} page="hr" />
      <Route path="/payroll" component={PayrollRedirect} />
      <Route path="/attendance" component={AttendanceRedirect} />
      <Route path="/hse" component={DashboardRedirect} />
      <Route path="/mobile-app" component={DashboardRedirect} />

      {/* System & Portals */}
      <ProtectedRoute path="/dms" component={DMSModule} page="dms" />
      <Route path="/company-settings" component={CompanySettingsRedirect} />
      <ProtectedRoute path="/audit-log" component={AuditLogModule} page="audit_log" />
      <ProtectedRoute path="/backup" component={BackupModule} page="backup" />
      <ProtectedRoute path="/about" component={AboutModule} page="*" />
      <ProtectedRoute path="/profile" component={Profile} page="*" />

      {/* Client Portal — has its own independent auth system */}
      <Route path="/client-portal" component={ClientPortalModule} />
      <Route path="/portal" component={ClientPortalModule} />
      <Route path="/client" component={ClientPortalModule} />

      <Route component={NotFound} />
    </Switch>
  );
}

function applyFontSettings() {
  const settings = getSystemSettings();
  injectCustomFontFaces();
  const sizeOpt = FONT_SIZE_OPTIONS.find(s => s.value === settings.fontSize) || FONT_SIZE_OPTIONS[1];
  document.documentElement.style.fontFamily = resolveFontCss(settings.fontFamily);
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
