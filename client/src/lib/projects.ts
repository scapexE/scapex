// ─── Projects Storage Layer ──────────────────────────────────────────────────

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled" | "delayed";
export type ProjectPhase = "Approval" | "Planning" | "Design" | "Procurement" | "Construction" | "Testing" | "Handover" | "Closed";

export interface ProjectTask {
  id: string;
  titleAr: string;
  titleEn: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in_progress" | "done";
}

export interface Project {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  clientName: string;
  clientEmail?: string;
  clientContact?: string;
  location: string;
  manager: string;
  status: ProjectStatus;
  phase: ProjectPhase;
  progress: number;
  startDate: string;
  deadline: string;
  contractId?: string;
  contractNumber?: string;
  proposalId?: string;
  proposalNumber?: string;
  contractValue: number;
  currency: string;
  serviceType: string;
  description: string;
  tasks: ProjectTask[];
  createdAt: string;
  updatedAt: string;
}

const PROJECTS_KEY = "scapex_projects";

// Seed projects linked to example customers
const SEED_PROJECTS: Project[] = [
  {
    id: "seed-1",
    code: "PRJ-26-001",
    name: "Riyadh Metro Station Safety Audit",
    nameAr: "تدقيق سلامة محطة مترو الرياض",
    clientName: "Saudi Binladin Group",
    location: "الرياض",
    manager: "أحمد الغامدي",
    status: "active",
    phase: "Construction",
    progress: 65,
    startDate: "2026-01-15",
    deadline: "2026-11-20",
    contractValue: 485000,
    currency: "SAR",
    serviceType: "safety_consulting",
    description: "تدقيق شامل لمنظومة السلامة في محطات مترو الرياض",
    tasks: [],
    createdAt: "2026-01-10",
    updatedAt: "2026-03-01",
  },
  {
    id: "seed-2",
    code: "PRJ-26-002",
    name: "NEOM Environmental Impact Assessment",
    nameAr: "دراسة الأثر البيئي - نيوم",
    clientName: "NEOM Co.",
    clientEmail: "ssmith@neom.com",
    location: "تبوك",
    manager: "سارة القحطاني",
    status: "active",
    phase: "Design",
    progress: 35,
    startDate: "2026-02-01",
    deadline: "2026-12-30",
    contractValue: 720000,
    currency: "SAR",
    serviceType: "environmental",
    description: "تقييم شامل للأثر البيئي لمشاريع نيوم",
    tasks: [],
    createdAt: "2026-01-25",
    updatedAt: "2026-03-05",
  },
];

export function getProjects(): Project[] {
  try {
    const s = localStorage.getItem(PROJECTS_KEY);
    if (s) {
      const stored: Project[] = JSON.parse(s);
      // Merge seeds for clients that don't have any stored data
      const storedIds = stored.map(p => p.id);
      const missingSeeds = SEED_PROJECTS.filter(s => !storedIds.includes(s.id));
      return [...stored, ...missingSeeds];
    }
  } catch {}
  return SEED_PROJECTS;
}

export function saveProject(project: Project): void {
  const list = getProjects();
  const idx = list.findIndex(p => p.id === project.id);
  if (idx >= 0) list[idx] = { ...project, updatedAt: new Date().toISOString().split("T")[0] };
  else list.unshift({ ...project, updatedAt: new Date().toISOString().split("T")[0] });
  // Only save non-seed projects (or updated seeds) to localStorage
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

export function deleteProject(id: string): void {
  const list = getProjects().filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

export function generateProjectCode(): string {
  const year = new Date().getFullYear();
  const count = getProjects().length + 1;
  return `PRJ-${String(year).slice(2)}-${String(count).padStart(3, "0")}`;
}

/** Called automatically when a proposal is converted to a contract */
export function createProjectFromContract(params: {
  contractId: string;
  contractNumber: string;
  proposalId: string;
  proposalNumber: string;
  clientName: string;
  clientEmail?: string;
  clientContact?: string;
  projectName: string;
  serviceType: string;
  contractValue: number;
  currency: string;
  startDate: string;
  endDate: string;
}): Project {
  const project: Project = {
    id: `proj-${Date.now().toString(36)}`,
    code: generateProjectCode(),
    name: params.projectName,
    nameAr: params.projectName,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    clientContact: params.clientContact,
    location: "المملكة العربية السعودية",
    manager: JSON.parse(localStorage.getItem("user") || "{}").name || "مدير المشروع",
    status: "planning",
    phase: "Approval",
    progress: 0,
    startDate: params.startDate,
    deadline: params.endDate,
    contractId: params.contractId,
    contractNumber: params.contractNumber,
    proposalId: params.proposalId,
    proposalNumber: params.proposalNumber,
    contractValue: params.contractValue,
    currency: params.currency,
    serviceType: params.serviceType,
    description: `مشروع مرتبط بعقد رقم ${params.contractNumber} / عرض سعر رقم ${params.proposalNumber}`,
    tasks: [],
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
  };
  saveProject(project);
  return project;
}
