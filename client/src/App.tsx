import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "next-themes";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import { ModulePlaceholder } from "@/pages/modules/ModulePlaceholder";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      
      {/* Core & Analytics */}
      <Route path="/ai-control">
        {() => <ModulePlaceholder moduleId="ai_control" title="AI Control Center" description="Centralized artificial intelligence insights and automated decision making." mockDataCols={['Insight ID', 'Category', 'Confidence', 'Impact', 'Status', 'Date']} />}
      </Route>
      <Route path="/bi">
        {() => <ModulePlaceholder moduleId="bi" title="BI Analytics" description="Business intelligence dashboards and custom report generation." mockDataCols={['Report Name', 'Owner', 'Last Generated', 'Views', 'Status']} />}
      </Route>
      <Route path="/companies">
        {() => <ModulePlaceholder moduleId="multi_tenant" title="Company Management" description="Multi-tenant branch and subsidiary management." mockDataCols={['Branch Name', 'Location', 'Manager', 'Employees', 'Status']} />}
      </Route>

      {/* Business & Finance */}
      <Route path="/crm">
        {() => <ModulePlaceholder moduleId="crm" title="CRM" description="Customer Relationship Management and lead tracking." mockDataCols={['Customer', 'Company', 'Email', 'Phone', 'Stage', 'Owner']} />}
      </Route>
      <Route path="/sales">
        {() => <ModulePlaceholder moduleId="sales" title="Sales" description="Quotations, sales orders, and invoicing." mockDataCols={['Order ID', 'Customer', 'Date', 'Total', 'Status']} />}
      </Route>
      <Route path="/purchases">
        {() => <ModulePlaceholder moduleId="purchases" title="Purchases" description="Purchase orders, RFQs, and vendor management." mockDataCols={['PO Number', 'Vendor', 'Order Date', 'Total Amount', 'Status']} />}
      </Route>
      <Route path="/accounting">
        {() => <ModulePlaceholder moduleId="accounting" title="Accounting" description="General ledger, chart of accounts, and financial statements." mockDataCols={['Journal Entry', 'Account', 'Partner', 'Debit', 'Credit', 'Status']} />}
      </Route>

      {/* Operations */}
      <Route path="/projects">
        {() => <ModulePlaceholder moduleId="projects" title="Project Management" description="Project planning, tasks, timesheets, and resource allocation." mockDataCols={['Project Name', 'Client', 'Manager', 'Start Date', 'Deadline', 'Progress', 'Status']} />}
      </Route>
      <Route path="/inventory">
        {() => <ModulePlaceholder moduleId="inventory" title="Inventory" description="Warehouse management, stock transfers, and valuation." mockDataCols={['Item Code', 'Product Name', 'Category', 'On Hand', 'Reserved', 'Location']} />}
      </Route>
      <Route path="/equipment">
        {() => <ModulePlaceholder moduleId="equipment" title="Equipment & Fleet" description="Machinery, vehicles, maintenance schedules, and assignments." mockDataCols={['Asset ID', 'Name', 'Category', 'Current Location', 'Next Maintenance', 'Status']} />}
      </Route>

      {/* Engineering */}
      <Route path="/engineering">
        {() => <ModulePlaceholder moduleId="engineering" title="Engineering Drawings" description="CAD file versioning, revisions, and approval workflows." mockDataCols={['Drawing No.', 'Title', 'Project', 'Version', 'Submitted By', 'Status']} />}
      </Route>
      <Route path="/approvals">
        {() => <ModulePlaceholder moduleId="approvals" title="Approvals" description="Centralized hub for all multi-level workflow approvals." mockDataCols={['Request ID', 'Type', 'Requester', 'Date Submitted', 'Current Stage', 'Action']} />}
      </Route>
      <Route path="/government">
        {() => <ModulePlaceholder moduleId="government" title="Government Entities" description="Permits, municipality interactions, and compliance tracking." mockDataCols={['Permit No.', 'Entity', 'Project', 'Issue Date', 'Expiry Date', 'Status']} />}
      </Route>
      <Route path="/smart-proposal">
        {() => <ModulePlaceholder moduleId="smart_proposal" title="Smart Proposal" description="AI-generated technical and commercial proposals." mockDataCols={['Proposal ID', 'Client', 'Project Type', 'Value', 'Generated Date', 'Status']} />}
      </Route>

      {/* HR & Personnel */}
      <Route path="/hr">
        {() => <ModulePlaceholder moduleId="hr" title="Human Resources" description="Employee directory, contracts, leave requests, and appraisals." mockDataCols={['Employee ID', 'Name', 'Department', 'Job Title', 'Manager', 'Status']} />}
      </Route>
      <Route path="/payroll">
        {() => <ModulePlaceholder moduleId="payroll" title="Payroll" description="Salary processing, deductions, bonuses, and payslips." mockDataCols={['Batch ID', 'Period', 'Total Employees', 'Total Amount', 'Processing Date', 'Status']} />}
      </Route>
      <Route path="/mobile-app">
        {() => <ModulePlaceholder moduleId="mobile_app" title="Mobile App Management" description="Configuration and access control for the site engineer mobile app." mockDataCols={['Device ID', 'User', 'App Version', 'Last Sync', 'Location', 'Status']} />}
      </Route>
      <Route path="/attendance">
        {() => <ModulePlaceholder moduleId="attendance" title="GPS Attendance" description="Geofenced time tracking and site presence monitoring." mockDataCols={['Date', 'Employee', 'Check In', 'Check Out', 'Site', 'Variance']} />}
      </Route>
      <Route path="/hse">
        {() => <ModulePlaceholder moduleId="hse" title="HSE" description="Health, Safety, and Environment incident logs and compliance." mockDataCols={['Incident ID', 'Date', 'Type', 'Severity', 'Location', 'Reported By', 'Status']} />}
      </Route>

      {/* System & Portals */}
      <Route path="/dms">
        {() => <ModulePlaceholder moduleId="dms" title="Document Management" description="Centralized document storage, indexing, and access control." mockDataCols={['Document No.', 'Title', 'Category', 'Version', 'Uploaded Date', 'Size']} />}
      </Route>
      <Route path="/client-portal">
        {() => <ModulePlaceholder moduleId="client_portal" title="Client Portal" description="External access configuration for clients and stakeholders." mockDataCols={['Portal User', 'Client Company', 'Assigned Projects', 'Last Login', 'Access Level', 'Status']} />}
      </Route>

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
