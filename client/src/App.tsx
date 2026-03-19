import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import Users from "@/pages/Users";
import SystemAdmin from "@/pages/SystemAdmin";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "next-themes";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import CRMModule from "@/pages/modules/crm/index";
import ProjectsModule from "@/pages/modules/projects/index";
import SmartProposalModule from "@/pages/modules/smart-proposal/index";
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
import EngineeringModule from "@/pages/modules/engineering/index";
import GovernmentModule from "@/pages/modules/government/index";
import BIModule from "@/pages/modules/bi/index";
import AIControlModule from "@/pages/modules/ai-control/index";
import ServiceCatalogModule from "@/pages/modules/service-catalog/index";
import CompaniesModule from "@/pages/modules/companies/index";
import ApprovalsModule from "@/pages/modules/approvals/index";
import MobileAppModule from "@/pages/modules/mobile-app/index";
import AboutModule from "@/pages/modules/about/index";
import AuditLogModule from "@/pages/modules/audit-log/index";

function Router() {
  return (
    <Switch>
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
      <Route path="/purchases" component={PurchasesModule} />
      <Route path="/accounting" component={AccountingModule} />

      {/* Operations */}
      <Route path="/projects" component={ProjectsModule} />
      <Route path="/inventory" component={InventoryModule} />
      <Route path="/equipment" component={EquipmentModule} />

      {/* Engineering */}
      <Route path="/engineering" component={EngineeringModule} />
      <Route path="/approvals" component={ApprovalsModule} />
      <Route path="/government" component={GovernmentModule} />
      <Route path="/smart-proposal" component={SmartProposalModule} />
      <Route path="/service-catalog" component={ServiceCatalogModule} />

      {/* HR & Personnel */}
      <Route path="/hr" component={HRModule} />
      <Route path="/payroll" component={PayrollModule} />
      <Route path="/attendance" component={AttendanceModule} />
      <Route path="/hse" component={HSEModule} />
      <Route path="/mobile-app" component={MobileAppModule} />

      {/* System & Portals */}
      <Route path="/dms" component={DMSModule} />
      <Route path="/client-portal" component={ClientPortalModule} />
      <Route path="/about" component={AboutModule} />
      <ProtectedRoute path="/audit-log" component={AuditLogModule} page="audit_log" />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
