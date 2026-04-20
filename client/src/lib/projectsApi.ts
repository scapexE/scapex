import { scopedFetch, apiRequest } from "@/lib/queryClient";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled" | "delayed";
export type StageStatus = "pending" | "in_progress" | "completed" | "blocked" | "cancelled";

export interface ApiProject {
  id: number;
  companyId: number | null;
  branchId: number | null;
  projectCode: string | null;
  nameAr: string;
  nameEn: string | null;
  description: string | null;
  clientName: string | null;
  contactId: number | null;
  contractId: number | null;
  serviceType: string | null;
  managerId: string | null;
  status: ProjectStatus;
  priority: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: string | null;
  spent: string | null;
  progress: number | null;
  location: string | null;
  city: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  activityId: string | null;
}

export interface ApiStage {
  id: number;
  projectId: number;
  titleAr: string;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  assignedTo: string | null;
  expectedStart: string | null;
  expectedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  dueDate: string | null;
  status: StageStatus;
  progress: number | null;
  notes: string | null;
  sortOrder: number | null;
  completedAt: string | null;
  createdAt: string | null;
  activityId: string | null;
}

export async function listProjects(params?: { status?: string; contactId?: number; managerId?: string; activityId?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.contactId) qs.set("contactId", String(params.contactId));
  if (params?.managerId) qs.set("managerId", params.managerId);
  if (params?.activityId) qs.set("activityId", params.activityId);
  const url = qs.toString() ? `/api/projects?${qs}` : "/api/projects";
  const r = await scopedFetch(url);
  if (!r.ok) throw new Error(`Failed to load projects: ${r.status}`);
  return (await r.json()) as ApiProject[];
}

export async function getProject(id: number) {
  const r = await scopedFetch(`/api/projects/${id}`);
  if (!r.ok) throw new Error(`Failed to load project: ${r.status}`);
  return (await r.json()) as ApiProject;
}

export async function createProject(body: Partial<ApiProject>) {
  const r = await apiRequest("POST", "/api/projects", body);
  return (await r.json()) as ApiProject;
}

export async function updateProject(id: number, body: Partial<ApiProject>) {
  const r = await apiRequest("PATCH", `/api/projects/${id}`, body);
  return (await r.json()) as ApiProject;
}

export async function deleteProject(id: number) {
  const r = await apiRequest("DELETE", `/api/projects/${id}`);
  return r.ok;
}

export async function listStages(projectId: number) {
  const r = await scopedFetch(`/api/projects/${projectId}/stages`);
  if (!r.ok) throw new Error(`Failed to load stages: ${r.status}`);
  return (await r.json()) as ApiStage[];
}

export async function createStage(projectId: number, body: Partial<ApiStage>) {
  const r = await apiRequest("POST", `/api/projects/${projectId}/stages`, body);
  return (await r.json()) as ApiStage;
}

export async function updateStage(id: number, body: Partial<ApiStage>) {
  const r = await apiRequest("PATCH", `/api/stages/${id}`, body);
  return (await r.json()) as ApiStage;
}

export async function deleteStage(id: number) {
  const r = await apiRequest("DELETE", `/api/stages/${id}`);
  return r.ok;
}

export const PROJECT_STATUS_LABELS_AR: Record<string, string> = {
  active: "نشط",
  planning: "تخطيط",
  delayed: "متأخر",
  on_hold: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export const PROJECT_STATUS_LABELS_EN: Record<string, string> = {
  active: "Active",
  planning: "Planning",
  delayed: "Delayed",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STAGE_STATUS_LABELS_AR: Record<string, string> = {
  pending: "بانتظار البدء",
  in_progress: "قيد التنفيذ",
  completed: "مكتملة",
  blocked: "معلّقة",
  cancelled: "ملغاة",
};

export const STAGE_STATUS_LABELS_EN: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

// ─────── Project documents (DMS link) ────────────────────────────
export interface ApiProjectDocument {
  id: number;
  projectId: number | null;
  titleAr: string;
  titleEn: string | null;
  type: string | null;
  fileUrl: string | null;
  description: string | null;
  uploadedBy: string | null;
  createdAt: string | null;
}

export async function listProjectDocuments(projectId: number) {
  const r = await scopedFetch(`/api/projects/${projectId}/documents`);
  if (!r.ok) throw new Error(`Failed to load documents: ${r.status}`);
  return (await r.json()) as ApiProjectDocument[];
}
export async function createProjectDocument(projectId: number, body: Partial<ApiProjectDocument>) {
  const r = await apiRequest("POST", `/api/projects/${projectId}/documents`, body);
  return (await r.json()) as ApiProjectDocument;
}
export async function deleteProjectDocument(id: number) {
  const r = await apiRequest("DELETE", `/api/project-documents/${id}`);
  return r.ok;
}

// ─────── Project invoices ────────────────────────────────────────
export interface ApiProjectInvoice {
  id: number;
  invoiceNumber: string;
  type: string | null;
  status: string | null;
  issueDate: string | null;
  dueDate: string | null;
  subtotal: string | null;
  vatAmount: string | null;
  total: string | null;
  paidAmount: string | null;
  currency: string | null;
}

export async function listProjectInvoices(projectId: number) {
  const r = await scopedFetch(`/api/projects/${projectId}/invoices`);
  if (!r.ok) throw new Error(`Failed to load invoices: ${r.status}`);
  return (await r.json()) as ApiProjectInvoice[];
}

export interface CreateProjectInvoiceInput {
  total: number;
  paidAmount?: number;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  status?: string;
  invoiceNumber?: string;
}

export async function createProjectInvoice(projectId: number, input: CreateProjectInvoiceInput) {
  const r = await scopedFetch(`/api/projects/${projectId}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`Failed to create invoice: ${r.status}`);
  return (await r.json()) as ApiProjectInvoice;
}

/** Default stage template applied to new projects when no custom stages provided. */
export const DEFAULT_PROJECT_STAGES: Array<{ titleAr: string; titleEn: string }> = [
  { titleAr: "عرض السعر", titleEn: "Proposal" },
  { titleAr: "العقد", titleEn: "Contract" },
  { titleAr: "التصميم", titleEn: "Design" },
  { titleAr: "التنفيذ", titleEn: "Execution" },
  { titleAr: "التسليم", titleEn: "Handover" },
];
