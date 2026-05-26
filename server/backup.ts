import { db } from "./db";
import { sql } from "drizzle-orm";
import JSZip from "jszip";

export const BACKUP_MODULES: { id: string; labelEn: string; labelAr: string; tables: string[] }[] = [
  { id: "crm", labelEn: "CRM (Contacts, Deals, Pipeline)", labelAr: "إدارة العملاء (جهات الاتصال، الصفقات، خطوط المبيعات)", tables: ["contacts", "pipeline_stages", "deals", "crm_activities", "portal_requests"] },
  { id: "sales", labelEn: "Sales (Proposals & Contracts)", labelAr: "المبيعات (العروض والعقود)", tables: ["proposals", "proposal_items", "contracts", "contract_items"] },
  { id: "purchases", labelEn: "Purchases (Vendors & Orders)", labelAr: "المشتريات (الموردين والطلبات)", tables: ["vendors", "purchase_orders", "purchase_order_items"] },
  { id: "inventory", labelEn: "Inventory", labelAr: "المخزون", tables: ["warehouses", "inventory_items", "stock_movements"] },
  { id: "accounting", labelEn: "Accounting", labelAr: "المحاسبة", tables: ["chart_of_accounts", "fiscal_periods", "journal_entries", "journal_entry_lines", "invoices", "invoice_items", "payments"] },
  { id: "hr", labelEn: "HR (Employees & Departments)", labelAr: "الموارد البشرية (الموظفون والأقسام)", tables: ["departments", "positions", "employees", "employee_documents"] },
  { id: "payroll", labelEn: "Payroll", labelAr: "الرواتب", tables: ["salary_structures", "payroll_batches", "payroll_items", "employee_advances", "employee_violations"] },
  { id: "attendance", labelEn: "Attendance & Leaves", labelAr: "الحضور والإجازات", tables: ["shifts", "attendance_records", "leave_types", "leave_requests"] },
  { id: "projects", labelEn: "Projects", labelAr: "المشاريع", tables: ["projects", "project_tasks", "project_milestones", "timesheets"] },
  { id: "engineering", labelEn: "Engineering (Drawings)", labelAr: "الرسومات الهندسية", tables: ["drawings", "drawing_versions", "drawing_reviews"] },
  { id: "government", labelEn: "Government (Entities & Permits)", labelAr: "الجهات الحكومية والتراخيص", tables: ["government_entities", "permits"] },
  { id: "hse", labelEn: "HSE (Incidents & Inspections)", labelAr: "السلامة والصحة المهنية", tables: ["incidents", "inspections", "safety_trainings"] },
  { id: "equipment", labelEn: "Equipment & Assets", labelAr: "المعدات والأصول", tables: ["asset_categories", "assets", "maintenance_records"] },
  { id: "dms", labelEn: "DMS (Documents)", labelAr: "إدارة المستندات", tables: ["document_categories", "documents", "document_versions"] },
  { id: "approvals", labelEn: "Approvals", labelAr: "الموافقات", tables: ["approval_workflows", "approval_steps", "approval_requests", "approval_actions"] },
  { id: "catalog", labelEn: "Service Catalog", labelAr: "كتالوج الخدمات", tables: ["service_categories", "services"] },
  { id: "core", labelEn: "Core (Companies, Branches, Users, Roles)", labelAr: "النظام (الشركات، الفروع، المستخدمون، الأدوار)", tables: ["companies", "branches", "users", "roles", "business_activities", "activity_members", "app_data", "audit_logs", "notifications"] },
];

const SAFE_TABLE_RE = /^[a-z_][a-z0-9_]*$/;

export async function dumpTable(tableName: string): Promise<any[]> {
  if (!SAFE_TABLE_RE.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  const result = await db.execute(sql.raw(`SELECT * FROM "${tableName}"`));
  return (result as any).rows || [];
}

export async function buildModuleBackup(moduleId: string): Promise<{ filename: string; json: string; errors: Record<string, string> }> {
  const mod = BACKUP_MODULES.find((m) => m.id === moduleId);
  if (!mod) throw new Error(`Unknown module: ${moduleId}`);
  const data: Record<string, any[]> = {};
  const errors: Record<string, string> = {};
  for (const t of mod.tables) {
    try {
      data[t] = await dumpTable(t);
    } catch (e: any) {
      errors[t] = e?.message || String(e);
    }
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return {
    filename: `scapex-${moduleId}-${stamp}.json`,
    json: JSON.stringify(
      { module: moduleId, exportedAt: new Date().toISOString(), tables: data, errors },
      null,
      2,
    ),
    errors,
  };
}

export async function buildFullBackup(): Promise<{ filename: string; buffer: Buffer; errors: Record<string, string> }> {
  const zip = new JSZip();
  const summary: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const mod of BACKUP_MODULES) {
    for (const t of mod.tables) {
      try {
        const rows = await dumpTable(t);
        zip.file(`${mod.id}/${t}.json`, JSON.stringify(rows, null, 2));
        summary[t] = rows.length;
      } catch (e: any) {
        errors[t] = e?.message || String(e);
      }
    }
  }
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        product: "Scapex ERP",
        exportedAt: new Date().toISOString(),
        modules: BACKUP_MODULES.map((m) => ({ id: m.id, tables: m.tables })),
        rowCounts: summary,
        errors,
      },
      null,
      2,
    ),
  );
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return { filename: `scapex-full-backup-${stamp}.zip`, buffer, errors };
}
