// ─── Proposal Data Layer ────────────────────────────────────────────────────

export type ServiceType =
  | "eng_consulting"
  | "environmental"
  | "safety_consulting"
  | "safety_services"
  | "contracting"
  | "metal_recycling";

export type ProposalStatus =
  | "draft"
  | "sent"
  | "under_review"
  | "approved"
  | "rejected"
  | "converted_contract"
  | "converted_invoice";

export interface ProposalItem {
  id: string;
  descAr: string;
  descEn: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Proposal {
  id: string;
  proposalNumber: string;
  clientName: string;
  clientContact?: string;
  clientEmail?: string;
  projectName: string;
  projectDesc: string;
  serviceType: ServiceType;
  activityId?: string;
  items: ProposalItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: ProposalStatus;
  notes?: string;
  validity: number; // days
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  convertedToContractId?: string;
  convertedToInvoiceId?: string;
  createdBy: string;
}

const PROPOSALS_KEY = "scapex_proposals";

export function getProposals(): Proposal[] {
  try {
    const stored = localStorage.getItem(PROPOSALS_KEY);
    if (stored) return JSON.parse(stored) as Proposal[];
  } catch { /* ignore */ }
  return [];
}

export function saveProposals(list: Proposal[]): void {
  localStorage.setItem(PROPOSALS_KEY, JSON.stringify(list));
}

export function saveProposal(proposal: Proposal): void {
  const list = getProposals();
  const idx = list.findIndex((p) => p.id === proposal.id);
  if (idx >= 0) list[idx] = proposal;
  else list.unshift(proposal);
  saveProposals(list);
}

export function deleteProposal(id: string): void {
  saveProposals(getProposals().filter((p) => p.id !== id));
}

export function generateProposalNumber(): string {
  const year = new Date().getFullYear();
  const existing = getProposals();
  const count = existing.length + 1;
  return `PRO-${year}-${String(count).padStart(4, "0")}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Service Type Meta ───────────────────────────────────────────────────────

export const SERVICE_META: Record<ServiceType, {
  labelAr: string;
  labelEn: string;
  color: string;
  iconName: string;
  defaultValidity: number;
}> = {
  eng_consulting:    { labelAr: "استشارات هندسية",             labelEn: "Engineering Consulting",  color: "blue",    iconName: "HardHat",     defaultValidity: 30 },
  environmental:     { labelAr: "خدمات بيئية",                 labelEn: "Environmental Services",  color: "emerald", iconName: "Leaf",        defaultValidity: 30 },
  safety_consulting: { labelAr: "استشارات سلامة",              labelEn: "Safety Consulting",       color: "amber",   iconName: "ShieldAlert", defaultValidity: 30 },
  safety_services:   { labelAr: "خدمات سلامة",                 labelEn: "Safety Services",         color: "orange",  iconName: "Flame",       defaultValidity: 30 },
  contracting:       { labelAr: "مقاولات وتنفيذ",              labelEn: "Contracting & Execution", color: "violet",  iconName: "Building2",   defaultValidity: 45 },
  metal_recycling:   { labelAr: "تدوير المعادن",               labelEn: "Metal Recycling",         color: "teal",    iconName: "RefreshCcw",  defaultValidity: 30 },
};

// ─── AI Template Generator ───────────────────────────────────────────────────

export interface AITemplate {
  titleAr: string;
  titleEn: string;
  items: Omit<ProposalItem, "id">[];
  scopeAr: string;
  scopeEn: string;
  estimatedMargin: number;
}

export function generateAITemplate(
  serviceType: ServiceType,
  projectDesc: string,
  isRtl: boolean
): AITemplate {
  const templates: Record<ServiceType, AITemplate> = {
    eng_consulting: {
      titleAr: "عرض سعر – استشارات هندسية",
      titleEn: "Quotation – Engineering Consulting",
      scopeAr: `بناءً على طلبكم المتعلق بـ (${projectDesc})، نقدم لكم عرضنا الفني والمالي لتقديم خدمات الاستشارات الهندسية المتخصصة وفق أحدث المعايير والمتطلبات النظامية.`,
      scopeEn: `Based on your request regarding (${projectDesc}), we present our technical and commercial proposal for specialized engineering consulting services in accordance with the latest standards and regulatory requirements.`,
      estimatedMargin: 35,
      items: [
        { descAr: "إعداد المخططات المعمارية والإنشائية التفصيلية", descEn: "Architectural & Structural Drawings Preparation", qty: 1, unit: "مشروع / Project", unitPrice: 45000, total: 45000 },
        { descAr: "تنسيق واستخراج الموافقات الحكومية (أمانة / دفاع مدني)", descEn: "Government Approvals Coordination (Municipality / Civil Defense)", qty: 1, unit: "مشروع / Project", unitPrice: 28000, total: 28000 },
        { descAr: "الإشراف الهندسي الدوري على الموقع", descEn: "Periodic Engineering Site Supervision", qty: 12, unit: "شهر / Month", unitPrice: 6500, total: 78000 },
        { descAr: "تقرير الفحص الفني النهائي", descEn: "Final Technical Inspection Report", qty: 1, unit: "تقرير / Report", unitPrice: 8500, total: 8500 },
      ],
    },
    environmental: {
      titleAr: "عرض سعر – خدمات بيئية",
      titleEn: "Quotation – Environmental Services",
      scopeAr: `نقدم لكم خدماتنا البيئية المتكاملة لمشروع (${projectDesc}) وفق اشتراطات وزارة البيئة والمياه والزراعة والهيئة السعودية للمواصفات والمقاييس.`,
      scopeEn: `We present our integrated environmental services for the project (${projectDesc}) in accordance with MEWA requirements and SASO standards.`,
      estimatedMargin: 32,
      items: [
        { descAr: "دراسة تقييم الأثر البيئي (EIA)", descEn: "Environmental Impact Assessment Study (EIA)", qty: 1, unit: "دراسة / Study", unitPrice: 55000, total: 55000 },
        { descAr: "مخطط إدارة النفايات الخطرة", descEn: "Hazardous Waste Management Plan", qty: 1, unit: "مخطط / Plan", unitPrice: 18000, total: 18000 },
        { descAr: "رصد وقياس الانبعاثات الجوية", descEn: "Air Emissions Monitoring & Measurement", qty: 4, unit: "ربع / Quarter", unitPrice: 9500, total: 38000 },
        { descAr: "تقرير الامتثال البيئي الدوري", descEn: "Periodic Environmental Compliance Report", qty: 4, unit: "تقرير / Report", unitPrice: 5500, total: 22000 },
      ],
    },
    safety_consulting: {
      titleAr: "عرض سعر – استشارات السلامة والصحة المهنية",
      titleEn: "Quotation – Safety & HSE Consulting",
      scopeAr: `نقدم خدمات الاستشارات في السلامة والصحة المهنية لمشروع (${projectDesc}) وفق معايير OSHA والمتطلبات المحلية للهيئة العامة للصناعة.`,
      scopeEn: `We provide Safety & HSE consulting services for the project (${projectDesc}) in accordance with OSHA standards and local GPCA requirements.`,
      estimatedMargin: 38,
      items: [
        { descAr: "إعداد خطة السلامة والصحة المهنية (HSE Plan)", descEn: "HSE Plan Preparation", qty: 1, unit: "خطة / Plan", unitPrice: 22000, total: 22000 },
        { descAr: "تقييم المخاطر (Risk Assessment)", descEn: "Risk Assessment", qty: 1, unit: "تقرير / Report", unitPrice: 15000, total: 15000 },
        { descAr: "تدريب موظفي السلامة (Safety Officers)", descEn: "Safety Officers Training", qty: 1, unit: "دورة / Course", unitPrice: 12000, total: 12000 },
        { descAr: "تفتيش دوري على الموقع وإعداد التقارير", descEn: "Periodic Site Inspection & Reporting", qty: 6, unit: "شهر / Month", unitPrice: 3500, total: 21000 },
      ],
    },
    safety_services: {
      titleAr: "عرض سعر – خدمات السلامة الميدانية",
      titleEn: "Quotation – Field Safety Services",
      scopeAr: `نقدم خدماتنا الميدانية في إدارة السلامة لمشروع (${projectDesc}) مع توفير الكوادر المتخصصة والمعدات اللازمة.`,
      scopeEn: `We provide field safety management services for the project (${projectDesc}), including specialized personnel and required equipment.`,
      estimatedMargin: 28,
      items: [
        { descAr: "توفير مشرف سلامة معتمد (Safety Officer)", descEn: "Certified Safety Officer Supply", qty: 6, unit: "شهر / Month", unitPrice: 8000, total: 48000 },
        { descAr: "لوحات وإشارات السلامة", descEn: "Safety Signs & Boards", qty: 1, unit: "مجموعة / Set", unitPrice: 6500, total: 6500 },
        { descAr: "معدات الحماية الشخصية (PPE) للفريق", descEn: "Personal Protective Equipment (PPE) for Team", qty: 20, unit: "طقم / Kit", unitPrice: 850, total: 17000 },
        { descAr: "تقارير السلامة الشهرية والمخالفات", descEn: "Monthly Safety Reports & Violations", qty: 6, unit: "تقرير / Report", unitPrice: 1200, total: 7200 },
      ],
    },
    contracting: {
      titleAr: "عرض سعر – أعمال مقاولات وتنفيذ",
      titleEn: "Quotation – Contracting & Execution Works",
      scopeAr: `نقدم عرضنا لتنفيذ أعمال (${projectDesc}) شاملاً جميع مستلزمات العمل من مواد وعمالة وإشراف وفق الكميات والمواصفات المعتمدة.`,
      scopeEn: `We present our offer to execute (${projectDesc}) works including all required materials, labor, and supervision per approved quantities and specifications.`,
      estimatedMargin: 22,
      items: [
        { descAr: "أعمال الحفر والردم والتسوية", descEn: "Excavation, Backfill & Grading Works", qty: 500, unit: "م³ / m³", unitPrice: 85, total: 42500 },
        { descAr: "أعمال الخرسانة المسلحة", descEn: "Reinforced Concrete Works", qty: 200, unit: "م³ / m³", unitPrice: 550, total: 110000 },
        { descAr: "أعمال البناء والبياض", descEn: "Masonry & Plastering Works", qty: 800, unit: "م² / m²", unitPrice: 120, total: 96000 },
        { descAr: "أعمال التشطيبات والدهانات", descEn: "Finishing & Painting Works", qty: 800, unit: "م² / m²", unitPrice: 75, total: 60000 },
        { descAr: "إدارة المشروع والإشراف الهندسي", descEn: "Project Management & Engineering Supervision", qty: 1, unit: "مقطوع / Lump Sum", unitPrice: 35000, total: 35000 },
      ],
    },
    metal_recycling: {
      titleAr: "عرض سعر – خدمات تدوير المعادن",
      titleEn: "Quotation – Metal Recycling Services",
      scopeAr: `نقدم خدماتنا في مجال تدوير وإدارة المعادن لمشروع (${projectDesc}) بما يتوافق مع اشتراطات هيئة المواد البتروكيماوية السعودية ووزارة البيئة.`,
      scopeEn: `We provide metal recycling and management services for (${projectDesc}) in compliance with GPCA and Ministry of Environment requirements.`,
      estimatedMargin: 25,
      items: [
        { descAr: "استلام ومعالجة الخردة المعدنية", descEn: "Metal Scrap Reception & Processing", qty: 50, unit: "طن / Ton", unitPrice: 1200, total: 60000 },
        { descAr: "خدمات الفرز والتصنيف", descEn: "Sorting & Classification Services", qty: 50, unit: "طن / Ton", unitPrice: 350, total: 17500 },
        { descAr: "شهادات إعادة التدوير والتوثيق", descEn: "Recycling Certificates & Documentation", qty: 1, unit: "مجموعة / Set", unitPrice: 5500, total: 5500 },
        { descAr: "النقل والشحن للمنشأة", descEn: "Transportation & Delivery to Facility", qty: 10, unit: "رحلة / Trip", unitPrice: 1800, total: 18000 },
      ],
    },
  };

  return templates[serviceType];
}

// ─── Status label helper ─────────────────────────────────────────────────────

export const STATUS_META: Record<ProposalStatus, {
  labelAr: string; labelEn: string;
  color: string; bg: string; border: string;
}> = {
  draft:              { labelAr: "مسودة",           labelEn: "Draft",             color: "text-gray-600 dark:text-gray-400",       bg: "bg-gray-100 dark:bg-gray-800",          border: "border-gray-200 dark:border-gray-700" },
  sent:               { labelAr: "مُرسَل",           labelEn: "Sent",              color: "text-blue-700 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-950/30",        border: "border-blue-200 dark:border-blue-800" },
  under_review:       { labelAr: "قيد المراجعة",     labelEn: "Under Review",      color: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30",      border: "border-amber-200 dark:border-amber-800" },
  approved:           { labelAr: "معتمد",            labelEn: "Approved",          color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30",  border: "border-emerald-200 dark:border-emerald-800" },
  rejected:           { labelAr: "مرفوض",            labelEn: "Rejected",          color: "text-red-700 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/30",          border: "border-red-200 dark:border-red-800" },
  converted_contract: { labelAr: "تحوّل لعقد",       labelEn: "Converted to Contract", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800" },
  converted_invoice:  { labelAr: "تحوّل لفاتورة",    labelEn: "Converted to Invoice",  color: "text-cyan-700 dark:text-cyan-400",    bg: "bg-cyan-50 dark:bg-cyan-950/30",     border: "border-cyan-200 dark:border-cyan-800" },
};
