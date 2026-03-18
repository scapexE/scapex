import { sql } from "drizzle-orm";
import {
  pgTable, text, varchar, integer, boolean, timestamp,
  numeric, date, jsonb, serial, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// CORE / SYSTEM TABLES
// ═══════════════════════════════════════════════════════════════════════════════

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  vatNumber: varchar("vat_number", { length: 20 }),
  crNumber: varchar("cr_number", { length: 20 }),
  logoUrl: text("logo_url"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("SA"),
  phone: varchar("phone", { length: 20 }),
  email: text("email"),
  website: text("website"),
  settings: jsonb("settings"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  city: text("city"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  managerName: text("manager_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: integer("company_id").references(() => companies.id),
  branchId: integer("branch_id").references(() => branches.id),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  role: text("role").default("viewer"),
  permissions: jsonb("permissions").default([]),
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  permissions: jsonb("permissions").default([]),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  module: text("module"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  userId: varchar("user_id").references(() => users.id),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  message: text("message"),
  type: text("type").default("info"),
  module: text("module"),
  entityId: text("entity_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRM TABLES
// ═══════════════════════════════════════════════════════════════════════════════

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar"),
  nameEn: text("name_en"),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 20 }),
  organization: text("organization"),
  position: text("position"),
  type: text("type").default("customer"),
  source: text("source"),
  address: text("address"),
  city: text("city"),
  notes: text("notes"),
  tags: jsonb("tags").default([]),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  color: text("color").default("blue"),
  sortOrder: integer("sort_order").default(0),
  probability: integer("probability").default(0),
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id").references(() => contacts.id),
  stageId: integer("stage_id").references(() => pipelineStages.id),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  value: numeric("value", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 5 }).default("SAR"),
  probability: integer("probability").default(0),
  expectedClose: date("expected_close"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  source: text("source"),
  notes: text("notes"),
  status: text("status").default("open"),
  lostReason: text("lost_reason"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id").references(() => contacts.id),
  dealId: integer("deal_id").references(() => deals.id),
  type: text("type").notNull(),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SALES / PROPOSALS / CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  proposalNumber: varchar("proposal_number", { length: 30 }).notNull(),
  contactId: integer("contact_id").references(() => contacts.id),
  clientName: text("client_name").notNull(),
  clientContact: text("client_contact"),
  clientEmail: text("client_email"),
  projectName: text("project_name"),
  projectDesc: text("project_desc"),
  introduction: text("introduction"),
  scopeAr: text("scope_ar"),
  scopeEn: text("scope_en"),
  serviceType: text("service_type"),
  subServiceId: text("sub_service_id"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).default("0"),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("15"),
  vatAmount: numeric("vat_amount", { precision: 14, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 5 }).default("SAR"),
  status: text("status").default("draft"),
  validity: integer("validity").default(30),
  notes: text("notes"),
  terms: text("terms"),
  aiGenerated: boolean("ai_generated").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proposalItems = pgTable("proposal_items", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull().references(() => proposals.id),
  descAr: text("desc_ar"),
  descEn: text("desc_en"),
  qty: numeric("qty", { precision: 12, scale: 3 }).default("1"),
  unit: text("unit"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").default(0),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contractNumber: varchar("contract_number", { length: 30 }).notNull(),
  proposalId: integer("proposal_id").references(() => proposals.id),
  contactId: integer("contact_id").references(() => contacts.id),
  clientName: text("client_name").notNull(),
  projectName: text("project_name"),
  serviceType: text("service_type"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).default("0"),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("15"),
  vatAmount: numeric("vat_amount", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 5 }).default("SAR"),
  status: text("status").default("active"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  terms: text("terms"),
  signedAt: timestamp("signed_at"),
  signedBy: text("signed_by"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractItems = pgTable("contract_items", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  descAr: text("desc_ar"),
  descEn: text("desc_en"),
  qty: numeric("qty", { precision: 12, scale: 3 }).default("1"),
  unit: text("unit"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").default(0),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASES
// ═══════════════════════════════════════════════════════════════════════════════

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  vatNumber: varchar("vat_number", { length: 20 }),
  address: text("address"),
  city: text("city"),
  category: text("category"),
  paymentTerms: text("payment_terms"),
  bankName: text("bank_name"),
  iban: varchar("iban", { length: 34 }),
  rating: integer("rating").default(0),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  poNumber: varchar("po_number", { length: 30 }).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id),
  projectId: integer("project_id"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).default("0"),
  vatAmount: numeric("vat_amount", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 5 }).default("SAR"),
  status: text("status").default("draft"),
  deliveryDate: date("delivery_date"),
  terms: text("terms"),
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrders.id),
  descAr: text("desc_ar"),
  descEn: text("desc_en"),
  qty: numeric("qty", { precision: 12, scale: 3 }).default("1"),
  unit: text("unit"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).default("0"),
  receivedQty: numeric("received_qty", { precision: 12, scale: 3 }).default("0"),
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  branchId: integer("branch_id").references(() => branches.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  location: text("location"),
  managerId: varchar("manager_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  sku: varchar("sku", { length: 50 }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  category: text("category"),
  unit: text("unit"),
  currentQty: numeric("current_qty", { precision: 12, scale: 3 }).default("0"),
  minQty: numeric("min_qty", { precision: 12, scale: 3 }).default("0"),
  maxQty: numeric("max_qty", { precision: 12, scale: 3 }),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).default("0"),
  totalValue: numeric("total_value", { precision: 14, scale: 2 }).default("0"),
  lastRestocked: timestamp("last_restocked"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  itemId: integer("item_id").notNull().references(() => inventoryItems.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  type: text("type").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNTING
// ═══════════════════════════════════════════════════════════════════════════════

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  code: varchar("code", { length: 20 }).notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  type: text("type").notNull(),
  parentId: integer("parent_id"),
  balance: numeric("balance", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 5 }).default("SAR"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fiscalPeriods = pgTable("fiscal_periods", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar"),
  nameEn: text("name_en"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  entryNumber: varchar("entry_number", { length: 30 }),
  fiscalPeriodId: integer("fiscal_period_id").references(() => fiscalPeriods.id),
  date: date("date").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  reference: text("reference"),
  status: text("status").default("draft"),
  totalDebit: numeric("total_debit", { precision: 14, scale: 2 }).default("0"),
  totalCredit: numeric("total_credit", { precision: 14, scale: 2 }).default("0"),
  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => journalEntries.id),
  accountId: integer("account_id").references(() => chartOfAccounts.id),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  debit: numeric("debit", { precision: 14, scale: 2 }).default("0"),
  credit: numeric("credit", { precision: 14, scale: 2 }).default("0"),
  costCenter: text("cost_center"),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  invoiceNumber: varchar("invoice_number", { length: 30 }).notNull(),
  type: text("type").default("sales"),
  contactId: integer("contact_id").references(() => contacts.id),
  contractId: integer("contract_id").references(() => contracts.id),
  clientName: text("client_name"),
  issueDate: date("issue_date"),
  dueDate: date("due_date"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).default("0"),
  vatAmount: numeric("vat_amount", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).default("0"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 5 }).default("SAR"),
  status: text("status").default("draft"),
  notes: text("notes"),
  zatcaQr: text("zatca_qr"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  descAr: text("desc_ar"),
  descEn: text("desc_en"),
  qty: numeric("qty", { precision: 12, scale: 3 }).default("1"),
  unit: text("unit"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).default("0"),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  paymentNumber: varchar("payment_number", { length: 30 }),
  type: text("type").default("received"),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  contactId: integer("contact_id").references(() => contacts.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 5 }).default("SAR"),
  method: text("method"),
  reference: text("reference"),
  date: date("date"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// HR
// ═══════════════════════════════════════════════════════════════════════════════

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  branchId: integer("branch_id").references(() => branches.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  managerId: varchar("manager_id").references(() => users.id),
  parentId: integer("parent_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  departmentId: integer("department_id").references(() => departments.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  gradeLevel: text("grade_level"),
  minSalary: numeric("min_salary", { precision: 12, scale: 2 }),
  maxSalary: numeric("max_salary", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").default(true),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  branchId: integer("branch_id").references(() => branches.id),
  departmentId: integer("department_id").references(() => departments.id),
  positionId: integer("position_id").references(() => positions.id),
  userId: varchar("user_id").references(() => users.id),
  employeeNumber: varchar("employee_number", { length: 20 }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  nationalId: varchar("national_id", { length: 15 }),
  nationality: text("nationality"),
  gender: text("gender"),
  dateOfBirth: date("date_of_birth"),
  joinDate: date("join_date"),
  phone: varchar("phone", { length: 20 }),
  email: text("email"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }),
  housingAllowance: numeric("housing_allowance", { precision: 12, scale: 2 }),
  transportAllowance: numeric("transport_allowance", { precision: 12, scale: 2 }),
  otherAllowance: numeric("other_allowance", { precision: 12, scale: 2 }),
  bankName: text("bank_name"),
  iban: varchar("iban", { length: 34 }),
  gosiNumber: varchar("gosi_number", { length: 20 }),
  status: text("status").default("active"),
  endDate: date("end_date"),
  endReason: text("end_reason"),
  profilePhoto: text("profile_photo"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  type: text("type").notNull(),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  documentNumber: varchar("document_number", { length: 50 }),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYROLL
// ═══════════════════════════════════════════════════════════════════════════════

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  components: jsonb("components").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollBatches = pgTable("payroll_batches", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  branchId: integer("branch_id").references(() => branches.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: text("status").default("draft"),
  totalGross: numeric("total_gross", { precision: 14, scale: 2 }).default("0"),
  totalDeductions: numeric("total_deductions", { precision: 14, scale: 2 }).default("0"),
  totalNet: numeric("total_net", { precision: 14, scale: 2 }).default("0"),
  employeeCount: integer("employee_count").default(0),
  approvedBy: varchar("approved_by").references(() => users.id),
  paidAt: timestamp("paid_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollItems = pgTable("payroll_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => payrollBatches.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).default("0"),
  allowances: numeric("allowances", { precision: 12, scale: 2 }).default("0"),
  overtime: numeric("overtime", { precision: 12, scale: 2 }).default("0"),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).default("0"),
  gosiEmployee: numeric("gosi_employee", { precision: 12, scale: 2 }).default("0"),
  gosiCompany: numeric("gosi_company", { precision: 12, scale: 2 }).default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  workingHours: numeric("working_hours", { precision: 4, scale: 1 }),
  isDefault: boolean("is_default").default(false),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  date: date("date").notNull(),
  shiftId: integer("shift_id").references(() => shifts.id),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  workedHours: numeric("worked_hours", { precision: 5, scale: 2 }),
  overtimeHours: numeric("overtime_hours", { precision: 5, scale: 2 }),
  status: text("status").default("present"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  maxDays: integer("max_days"),
  isPaid: boolean("is_paid").default(true),
  color: text("color").default("blue"),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  days: integer("days").notNull(),
  reason: text("reason"),
  status: text("status").default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  branchId: integer("branch_id").references(() => branches.id),
  projectCode: varchar("project_code", { length: 30 }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  clientName: text("client_name"),
  contactId: integer("contact_id").references(() => contacts.id),
  contractId: integer("contract_id").references(() => contracts.id),
  serviceType: text("service_type"),
  managerId: varchar("manager_id").references(() => users.id),
  status: text("status").default("active"),
  priority: text("priority").default("medium"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 14, scale: 2 }),
  spent: numeric("spent", { precision: 14, scale: 2 }).default("0"),
  progress: integer("progress").default(0),
  location: text("location"),
  city: text("city"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  parentId: integer("parent_id"),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  description: text("description"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  status: text("status").default("todo"),
  priority: text("priority").default("medium"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  estimatedHours: numeric("estimated_hours", { precision: 8, scale: 1 }),
  actualHours: numeric("actual_hours", { precision: 8, scale: 1 }),
  progress: integer("progress").default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  status: text("status").default("pending"),
  sortOrder: integer("sort_order").default(0),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  employeeId: integer("employee_id").references(() => employees.id),
  projectId: integer("project_id").references(() => projects.id),
  taskId: integer("task_id").references(() => projectTasks.id),
  date: date("date").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  billable: boolean("billable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEERING
// ═══════════════════════════════════════════════════════════════════════════════

export const drawings = pgTable("drawings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  projectId: integer("project_id").references(() => projects.id),
  drawingNumber: varchar("drawing_number", { length: 30 }),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  type: text("type"),
  discipline: text("discipline"),
  revision: varchar("revision", { length: 10 }).default("A"),
  status: text("status").default("draft"),
  scale: text("scale"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const drawingVersions = pgTable("drawing_versions", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id").notNull().references(() => drawings.id),
  revision: varchar("revision", { length: 10 }),
  fileUrl: text("file_url"),
  changeDescription: text("change_description"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drawingReviews = pgTable("drawing_reviews", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id").notNull().references(() => drawings.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  status: text("status").default("pending"),
  comments: text("comments"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNMENT ENTITIES
// ═══════════════════════════════════════════════════════════════════════════════

export const governmentEntities = pgTable("government_entities", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  type: text("type"),
  contactPerson: text("contact_person"),
  phone: varchar("phone", { length: 20 }),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const permits = pgTable("permits", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  entityId: integer("entity_id").references(() => governmentEntities.id),
  projectId: integer("project_id").references(() => projects.id),
  permitNumber: varchar("permit_number", { length: 50 }),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  type: text("type"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  status: text("status").default("active"),
  fees: numeric("fees", { precision: 12, scale: 2 }),
  fileUrl: text("file_url"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// HSE
// ═══════════════════════════════════════════════════════════════════════════════

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  projectId: integer("project_id").references(() => projects.id),
  incidentNumber: varchar("incident_number", { length: 30 }),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  type: text("type"),
  severity: text("severity").default("low"),
  date: date("date"),
  location: text("location"),
  description: text("description"),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action"),
  status: text("status").default("open"),
  reportedBy: varchar("reported_by").references(() => users.id),
  investigatedBy: varchar("investigated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  projectId: integer("project_id").references(() => projects.id),
  inspectionNumber: varchar("inspection_number", { length: 30 }),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  type: text("type"),
  date: date("date"),
  location: text("location"),
  score: integer("score"),
  status: text("status").default("scheduled"),
  findings: text("findings"),
  recommendations: text("recommendations"),
  inspectorId: varchar("inspector_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const safetyTrainings = pgTable("safety_trainings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  type: text("type"),
  date: date("date"),
  duration: integer("duration"),
  trainerId: varchar("trainer_id").references(() => users.id),
  location: text("location"),
  attendeesCount: integer("attendees_count").default(0),
  attendees: jsonb("attendees").default([]),
  status: text("status").default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// EQUIPMENT & FLEET
// ═══════════════════════════════════════════════════════════════════════════════

export const assetCategories = pgTable("asset_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  type: text("type"),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  categoryId: integer("category_id").references(() => assetCategories.id),
  assetCode: varchar("asset_code", { length: 30 }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  brand: text("brand"),
  model: text("model"),
  serialNumber: varchar("serial_number", { length: 50 }),
  plateNumber: varchar("plate_number", { length: 20 }),
  purchaseDate: date("purchase_date"),
  purchaseCost: numeric("purchase_cost", { precision: 14, scale: 2 }),
  currentValue: numeric("current_value", { precision: 14, scale: 2 }),
  location: text("location"),
  projectId: integer("project_id").references(() => projects.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  status: text("status").default("available"),
  condition: text("condition").default("good"),
  lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date"),
  insuranceExpiry: date("insurance_expiry"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id),
  type: text("type").default("preventive"),
  date: date("date"),
  description: text("description"),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  vendor: text("vendor"),
  technician: text("technician"),
  nextDate: date("next_date"),
  status: text("status").default("completed"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const documentCategories = pgTable("document_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  parentId: integer("parent_id"),
  color: text("color"),
  icon: text("icon"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  categoryId: integer("category_id").references(() => documentCategories.id),
  projectId: integer("project_id").references(() => projects.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  type: text("type"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  version: integer("version").default(1),
  accessLevel: text("access_level").default("internal"),
  tags: jsonb("tags").default([]),
  description: text("description"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  version: integer("version").notNull(),
  fileUrl: text("file_url"),
  changeLog: text("change_log"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVALS WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════

export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  module: text("module").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const approvalSteps = pgTable("approval_steps", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull().references(() => approvalWorkflows.id),
  stepOrder: integer("step_order").notNull(),
  nameAr: text("name_ar"),
  nameEn: text("name_en"),
  approverId: varchar("approver_id").references(() => users.id),
  approverRole: text("approver_role"),
  isRequired: boolean("is_required").default(true),
});

export const approvalRequests = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  workflowId: integer("workflow_id").references(() => approvalWorkflows.id),
  module: text("module").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  currentStep: integer("current_step").default(1),
  status: text("status").default("pending"),
  requestedBy: varchar("requested_by").references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const approvalActions = pgTable("approval_actions", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => approvalRequests.id),
  stepId: integer("step_id").references(() => approvalSteps.id),
  action: text("action").notNull(),
  approverId: varchar("approver_id").references(() => users.id),
  comments: text("comments"),
  actionAt: timestamp("action_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  serviceType: text("service_type").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  descAr: text("desc_ar"),
  descEn: text("desc_en"),
  icon: text("icon"),
  color: text("color"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => serviceCategories.id),
  companyId: integer("company_id").references(() => companies.id),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  descAr: text("desc_ar"),
  descEn: text("desc_en"),
  estimatedPrice: numeric("estimated_price", { precision: 14, scale: 2 }),
  estimatedMargin: integer("estimated_margin"),
  templateItems: jsonb("template_items").default([]),
  tags: jsonb("tags").default([]),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS & TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export const insertAssetSchema = createInsertSchema(assets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;
