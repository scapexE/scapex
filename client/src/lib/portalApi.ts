// Customer-portal API client. Uses a separate token (NOT the staff x-user-id).
const TOKEN_KEY = "scapex_portal_token";
const CONTACT_KEY = "scapex_portal_contact";

export interface PortalContact {
  id: number;
  nameAr: string | null;
  nameEn: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  organization: string | null;
  city: string | null;
  address: string | null;
  activityId: string | null;
}

export interface PortalProject {
  id: number;
  projectCode: string | null;
  nameAr: string;
  nameEn: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number | null;
  city: string | null;
  location: string | null;
  currentStageAr: string | null;
}

export interface PortalStage {
  id: number;
  titleAr: string;
  titleEn: string | null;
  status: string | null;
  progress: number | null;
  expectedStart: string | null;
  expectedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  sortOrder: number | null;
  assignee: { name: string } | null;
}

export interface PortalDocument {
  id: number;
  titleAr: string;
  titleEn: string | null;
  type: string | null;
  fileUrl: string | null;
  hasBlob: boolean;
  mimeType: string | null;
  fileSize: number | null;
  version: number | null;
  source: "staff" | "client";
  scope: "project" | "deal" | "company";
  createdAt: string | null;
}

export interface PortalClientDocument {
  id: number;
  titleAr: string;
  titleEn: string | null;
  category: string | null;
  type: string | null;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  version: number | null;
  source: "client" | "staff";
  scope: "company" | "deal";
  createdAt: string | null;
}

export interface PortalInvoice {
  id: number;
  invoiceNumber: string;
  issueDate: string | null;
  dueDate: string | null;
  total: string | null;
  paidAmount: string | null;
  currency: string | null;
  status: string | null;
}

export function getPortalToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getPortalContact(): PortalContact | null {
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    return raw ? JSON.parse(raw) as PortalContact : null;
  } catch { return null; }
}

export function setPortalSession(token: string, contact: PortalContact) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
  } catch { /* ignore */ }
}

export function clearPortalSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CONTACT_KEY);
  } catch { /* ignore */ }
}

async function portalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getPortalToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(path, { ...init, headers });
}

export async function portalLogin(nationalId: string, password: string): Promise<{ token: string; contact: PortalContact }> {
  const r = await fetch("/api/portal/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nationalId, password }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "Login failed");
  }
  const data = await r.json();
  setPortalSession(data.token, data.contact);
  return data;
}

export async function portalGetMe(): Promise<PortalContact> {
  const r = await portalFetch("/api/portal/me");
  if (!r.ok) throw new Error("Session expired");
  const j = await r.json();
  return j.contact;
}

export async function portalListProjects(): Promise<PortalProject[]> {
  const r = await portalFetch("/api/portal/projects");
  if (!r.ok) throw new Error("Failed to load projects");
  return r.json();
}

export async function portalGetProject(id: number): Promise<PortalProject> {
  const r = await portalFetch(`/api/portal/projects/${id}`);
  if (!r.ok) throw new Error("Project not found");
  return r.json();
}

export async function portalListStages(id: number): Promise<PortalStage[]> {
  const r = await portalFetch(`/api/portal/projects/${id}/stages`);
  if (!r.ok) throw new Error("Failed to load stages");
  return r.json();
}

export async function portalListDocuments(id: number): Promise<PortalDocument[]> {
  const r = await portalFetch(`/api/portal/projects/${id}/documents`);
  if (!r.ok) throw new Error("Failed to load documents");
  return r.json();
}

export async function portalListInvoices(id: number): Promise<PortalInvoice[]> {
  const r = await portalFetch(`/api/portal/projects/${id}/invoices`);
  if (!r.ok) throw new Error("Failed to load invoices");
  return r.json();
}

export async function portalListMyDocuments(): Promise<PortalClientDocument[]> {
  const r = await portalFetch("/api/portal/documents");
  if (!r.ok) throw new Error("Failed to load documents");
  return r.json();
}

export async function portalDownloadDocument(id: number): Promise<Blob> {
  const r = await portalFetch(`/api/portal/documents/${id}/file`);
  if (!r.ok) throw new Error("Failed to load file");
  return r.blob();
}

export async function portalUploadDocument(payload: {
  titleAr: string; titleEn?: string | null; fileContent: string; originalName: string; mimeType: string;
}): Promise<{ id: number }> {
  const r = await portalFetch("/api/portal/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "Upload failed");
  }
  return r.json();
}

export interface PortalProposal {
  id: number;
  proposalNumber: string;
  projectName: string | null;
  subtotal: string | null;
  vatAmount: string | null;
  total: string | null;
  currency: string | null;
  status: string | null;
  createdAt: string | null;
  clientApprovedAt: string | null;
  clientSignedBy: string | null;
}

export interface PortalMyInvoice {
  id: number;
  invoiceNumber: string;
  clientName: string | null;
  issueDate: string | null;
  dueDate: string | null;
  total: string | null;
  paidAmount: string | null;
  currency: string | null;
  status: string | null;
  createdAt: string | null;
}

export interface PortalMyContract {
  id: number;
  contractNumber: string;
  clientName: string | null;
  projectName: string | null;
  total: string | null;
  currency: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  clientSignedAt: string | null;
  clientSignedBy: string | null;
}

export async function portalListProposals(): Promise<PortalProposal[]> {
  const r = await portalFetch("/api/portal/proposals");
  if (!r.ok) return [];
  return r.json();
}

export async function portalListMyInvoices(): Promise<PortalMyInvoice[]> {
  const r = await portalFetch("/api/portal/invoices");
  if (!r.ok) return [];
  return r.json();
}

export async function portalListMyContracts(): Promise<PortalMyContract[]> {
  const r = await portalFetch("/api/portal/contracts");
  if (!r.ok) return [];
  return r.json();
}

export async function portalApproveProposal(id: number, payload: { signerName: string; signature: string }): Promise<void> {
  const r = await portalFetch(`/api/portal/proposals/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "Approval failed");
  }
}

export async function portalSignContract(id: number, payload: { signerName: string; signature: string }): Promise<void> {
  const r = await portalFetch(`/api/portal/contracts/${id}/sign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "Signing failed");
  }
}

export async function portalSubmitRequest(payload: { subject: string; message: string; projectId?: number | null }): Promise<{ id: number }> {
  const r = await portalFetch("/api/portal/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "Failed to submit request");
  }
  return r.json();
}
