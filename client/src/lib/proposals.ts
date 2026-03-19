import { getAboutData, getSystemSettings } from "@/lib/companySettings";

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
  introduction?: string;
  scopeAr?: string;
  scopeEn?: string;
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
  validity: number;
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

// ─── Contract Types ──────────────────────────────────────────────────────────

export interface ContractClause {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

export interface PaymentMilestone {
  id: string;
  milestoneAr: string;
  milestoneEn: string;
  percentage: number;
  amount: number;
}

export interface Contract {
  id: string;
  contractNumber: string;
  proposalId: string;
  proposalNumber: string;
  clientName: string;
  clientContact?: string;
  clientEmail?: string;
  projectName: string;
  projectDesc: string;
  serviceType: ServiceType;
  items: ProposalItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: "draft" | "active" | "completed" | "cancelled";
  clauses: ContractClause[];
  paymentSchedule: PaymentMilestone[];
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const PROPOSALS_KEY = "scapex_proposals";
const CONTRACTS_KEY = "scapex_contracts";

export function getProposals(): Proposal[] {
  try {
    const s = localStorage.getItem(PROPOSALS_KEY);
    if (s) return JSON.parse(s) as Proposal[];
  } catch {}
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
  const count = getProposals().length + 1;
  return `PRO-${year}-${String(count).padStart(4, "0")}`;
}
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getContracts(): Contract[] {
  try {
    const s = localStorage.getItem(CONTRACTS_KEY);
    if (s) return JSON.parse(s) as Contract[];
  } catch {}
  return [];
}
export function saveContract(contract: Contract): void {
  const list = getContracts();
  const idx = list.findIndex((c) => c.id === contract.id);
  if (idx >= 0) list[idx] = contract;
  else list.unshift(contract);
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(list));
}
export function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const count = getContracts().length + 1;
  return `CON-${year}-${String(count).padStart(4, "0")}`;
}

// ─── Service Meta ─────────────────────────────────────────────────────────────

export const SERVICE_META: Record<ServiceType, {
  labelAr: string; labelEn: string; color: string; iconName: string; defaultValidity: number;
  descAr: string; descEn: string;
}> = {
  eng_consulting:    { labelAr: "استشارات هندسية",   labelEn: "Engineering Consulting",  color: "blue",    iconName: "HardHat",     defaultValidity: 30, descAr: "مخططات، إشراف، استشارات هندسية متخصصة", descEn: "Drawings, supervision, specialized engineering" },
  environmental:     { labelAr: "خدمات بيئية",        labelEn: "Environmental Services",  color: "emerald", iconName: "Leaf",        defaultValidity: 30, descAr: "تقييم الأثر البيئي، الامتثال، رصد الانبعاثات", descEn: "EIA, compliance, emissions monitoring" },
  safety_consulting: { labelAr: "استشارات سلامة",     labelEn: "Safety Consulting",       color: "amber",   iconName: "ShieldAlert", defaultValidity: 30, descAr: "خطط HSE، تقييم مخاطر، OSHA", descEn: "HSE plans, risk assessment, OSHA compliance" },
  safety_services:   { labelAr: "خدمات سلامة",        labelEn: "Safety Services",         color: "orange",  iconName: "Flame",       defaultValidity: 30, descAr: "كوادر سلامة ميدانية، PPE، تقارير شهرية", descEn: "Field safety personnel, PPE, monthly reports" },
  contracting:       { labelAr: "مقاولات وتنفيذ",     labelEn: "Contracting & Execution", color: "violet",  iconName: "Building2",   defaultValidity: 45, descAr: "أعمال مدنية، خرسانة، تشطيبات، إدارة مشاريع", descEn: "Civil works, concrete, finishing, project management" },
  metal_recycling:   { labelAr: "تدوير المعادن",      labelEn: "Metal Recycling",         color: "teal",    iconName: "RefreshCcw",  defaultValidity: 30, descAr: "استلام ومعالجة وتوثيق الخردة المعدنية", descEn: "Metal scrap reception, processing & certification" },
};

// ─── Status Meta ──────────────────────────────────────────────────────────────

export const STATUS_META: Record<ProposalStatus, {
  labelAr: string; labelEn: string; color: string; bg: string; border: string;
}> = {
  draft:              { labelAr: "مسودة",         labelEn: "Draft",               color: "text-gray-600 dark:text-gray-400",       bg: "bg-gray-100 dark:bg-gray-800",         border: "border-gray-200 dark:border-gray-700" },
  sent:               { labelAr: "مُرسَل",         labelEn: "Sent",                color: "text-blue-700 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800" },
  under_review:       { labelAr: "قيد المراجعة",   labelEn: "Under Review",        color: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800" },
  approved:           { labelAr: "معتمد",          labelEn: "Approved",            color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  rejected:           { labelAr: "مرفوض",          labelEn: "Rejected",            color: "text-red-700 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/30",         border: "border-red-200 dark:border-red-800" },
  converted_contract: { labelAr: "تحوّل لعقد",     labelEn: "Converted to Contract", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800" },
  converted_invoice:  { labelAr: "تحوّل لفاتورة",  labelEn: "Converted to Invoice",  color: "text-cyan-700 dark:text-cyan-400",    bg: "bg-cyan-50 dark:bg-cyan-950/30",     border: "border-cyan-200 dark:border-cyan-800" },
};

// ─── AI Templates ─────────────────────────────────────────────────────────────

export interface AITemplate {
  titleAr: string; titleEn: string;
  items: Omit<ProposalItem, "id">[];
  scopeAr: string; scopeEn: string;
  introAr: string; introEn: string;
  estimatedMargin: number;
}

export function generateAITemplate(serviceType: ServiceType, projectDesc: string, isRtl: boolean): AITemplate {
  const templates: Record<ServiceType, AITemplate> = {
    eng_consulting: {
      titleAr: "عرض سعر – استشارات هندسية", titleEn: "Quotation – Engineering Consulting",
      introAr: `يسعدنا أن نتقدم إليكم بعرض أسعارنا المتعلق بـ (${projectDesc})، ونأمل أن يلبي تطلعاتكم ويرقى إلى مستوى ثقتكم بنا. نضع بين أيديكم خبرتنا الهندسية المتخصصة في خدمة مشروعكم الكريم، مُلتزمين بأعلى معايير الجودة والدقة الفنية.`,
      introEn: `We are pleased to submit our proposal for (${projectDesc}). We place our specialized engineering expertise at the service of your esteemed project, committed to the highest standards of quality and technical precision.`,
      scopeAr: `بناءً على طلبكم المتعلق بـ (${projectDesc})، نقدم لكم عرضنا الفني والمالي لتقديم خدمات الاستشارات الهندسية المتخصصة وفق أحدث المعايير والمتطلبات النظامية في المملكة العربية السعودية.`,
      scopeEn: `Based on your request regarding (${projectDesc}), we present our technical and commercial proposal for specialized engineering consulting services in accordance with the latest standards and regulatory requirements in Saudi Arabia.`,
      estimatedMargin: 35,
      items: [
        { descAr: "إعداد المخططات المعمارية والإنشائية التفصيلية", descEn: "Architectural & Structural Drawings Preparation", qty: 1, unit: "مشروع / Project", unitPrice: 45000, total: 45000 },
        { descAr: "تنسيق واستخراج الموافقات الحكومية (أمانة / دفاع مدني)", descEn: "Government Approvals Coordination", qty: 1, unit: "مشروع / Project", unitPrice: 28000, total: 28000 },
        { descAr: "الإشراف الهندسي الدوري على الموقع", descEn: "Periodic Engineering Site Supervision", qty: 12, unit: "شهر / Month", unitPrice: 6500, total: 78000 },
        { descAr: "تقرير الفحص الفني النهائي وإعداد كتيب التشغيل", descEn: "Final Technical Inspection Report & O&M Manual", qty: 1, unit: "تقرير / Report", unitPrice: 8500, total: 8500 },
      ],
    },
    environmental: {
      titleAr: "عرض سعر – خدمات بيئية", titleEn: "Quotation – Environmental Services",
      introAr: `نتشرف بتقديم عرض أسعارنا لخدمات بيئية متكاملة لمشروع (${projectDesc}). فريقنا المتخصص جاهز لتقديم أفضل الحلول البيئية المعتمدة والمتوافقة مع اشتراطات الجهات التنظيمية في المملكة العربية السعودية.`,
      introEn: `We are honored to present our integrated environmental services proposal for (${projectDesc}). Our specialized team is ready to deliver the best accredited environmental solutions compliant with Saudi regulatory requirements.`,
      scopeAr: `نقدم لكم خدماتنا البيئية المتكاملة لمشروع (${projectDesc}) وفق اشتراطات وزارة البيئة والمياه والزراعة والهيئة السعودية للمواصفات والمقاييس SASO.`,
      scopeEn: `We present our integrated environmental services for (${projectDesc}) in accordance with MEWA requirements and SASO standards.`,
      estimatedMargin: 32,
      items: [
        { descAr: "دراسة تقييم الأثر البيئي (EIA)", descEn: "Environmental Impact Assessment Study (EIA)", qty: 1, unit: "دراسة / Study", unitPrice: 55000, total: 55000 },
        { descAr: "مخطط إدارة النفايات الخطرة وغير الخطرة", descEn: "Hazardous & Non-Hazardous Waste Management Plan", qty: 1, unit: "مخطط / Plan", unitPrice: 18000, total: 18000 },
        { descAr: "رصد وقياس الانبعاثات الجوية والضوضاء", descEn: "Air Emissions & Noise Monitoring", qty: 4, unit: "ربع / Quarter", unitPrice: 9500, total: 38000 },
        { descAr: "تقرير الامتثال البيئي الدوري", descEn: "Periodic Environmental Compliance Report", qty: 4, unit: "تقرير / Report", unitPrice: 5500, total: 22000 },
      ],
    },
    safety_consulting: {
      titleAr: "عرض سعر – استشارات السلامة والصحة المهنية", titleEn: "Quotation – Safety & HSE Consulting",
      introAr: `يسعدنا تقديم عرض أسعارنا لخدمات السلامة والصحة المهنية لمشروع (${projectDesc}). ونحرص على تزويدكم بأعلى مستوى من الكفاءة والاحترافية في مجال HSE وفق أحدث المعايير الدولية والمحلية.`,
      introEn: `We are pleased to submit our HSE consulting proposal for (${projectDesc}). We are committed to delivering the highest level of professionalism in health, safety, and environment per international and local standards.`,
      scopeAr: `نقدم خدمات الاستشارات في السلامة والصحة المهنية لمشروع (${projectDesc}) وفق معايير OSHA والمتطلبات المحلية للهيئة العامة للصناعة.`,
      scopeEn: `We provide Safety & HSE consulting services for (${projectDesc}) in accordance with OSHA standards and local GPCA requirements.`,
      estimatedMargin: 38,
      items: [
        { descAr: "إعداد خطة السلامة والصحة المهنية الشاملة (HSE Plan)", descEn: "Comprehensive HSE Plan Preparation", qty: 1, unit: "خطة / Plan", unitPrice: 22000, total: 22000 },
        { descAr: "تقييم المخاطر وتحليل HAZOP", descEn: "Risk Assessment & HAZOP Analysis", qty: 1, unit: "تقرير / Report", unitPrice: 15000, total: 15000 },
        { descAr: "تدريب وتأهيل موظفي السلامة (Safety Officers)", descEn: "Safety Officers Training & Certification", qty: 1, unit: "دورة / Course", unitPrice: 12000, total: 12000 },
        { descAr: "تفتيش دوري على الموقع وإعداد التقارير الشهرية", descEn: "Periodic Site Inspection & Monthly Reports", qty: 6, unit: "شهر / Month", unitPrice: 3500, total: 21000 },
      ],
    },
    safety_services: {
      titleAr: "عرض سعر – خدمات السلامة الميدانية", titleEn: "Quotation – Field Safety Services",
      introAr: `نقدم إليكم عرض أسعارنا للخدمات الميدانية في إدارة السلامة لمشروع (${projectDesc}). كوادرنا المعتمدون مستعدون لبدء العمل فور الموافقة لضمان بيئة عمل آمنة تمامًا وفق أعلى المعايير المهنية.`,
      introEn: `We present our field safety management services proposal for (${projectDesc}). Our certified professionals are ready to begin immediately upon approval to ensure a fully safe work environment.`,
      scopeAr: `نقدم خدماتنا الميدانية في إدارة السلامة لمشروع (${projectDesc}) مع توفير الكوادر المتخصصة المعتمدة والمعدات اللازمة.`,
      scopeEn: `We provide field safety management services for (${projectDesc}), including certified specialized personnel and required equipment.`,
      estimatedMargin: 28,
      items: [
        { descAr: "توفير مشرف سلامة معتمد (Safety Officer) NEBOSH", descEn: "Certified NEBOSH Safety Officer Supply", qty: 6, unit: "شهر / Month", unitPrice: 8000, total: 48000 },
        { descAr: "لوحات وإشارات السلامة (ثلاثية اللغات)", descEn: "Trilingual Safety Signs & Boards", qty: 1, unit: "مجموعة / Set", unitPrice: 6500, total: 6500 },
        { descAr: "معدات الحماية الشخصية (PPE) للفريق", descEn: "Personal Protective Equipment (PPE) for Team", qty: 20, unit: "طقم / Kit", unitPrice: 850, total: 17000 },
        { descAr: "تقارير السلامة الشهرية وسجلات الحوادث", descEn: "Monthly Safety Reports & Incident Logs", qty: 6, unit: "تقرير / Report", unitPrice: 1200, total: 7200 },
      ],
    },
    contracting: {
      titleAr: "عرض سعر – أعمال مقاولات وتنفيذ", titleEn: "Quotation – Contracting & Execution Works",
      introAr: `يسرنا تقديم عرض أسعارنا لتنفيذ أعمال (${projectDesc}). نُؤكد التزامنا الكامل بإنجاز المشروع وفق الجدول الزمني المحدد وبجودة عالية، معتمدين على خبرتنا الواسعة وكوادرنا الهندسية المتخصصة.`,
      introEn: `We are pleased to offer our proposal for (${projectDesc}). We confirm our full commitment to completing the project on schedule and with high quality, backed by our extensive experience and specialized engineering teams.`,
      scopeAr: `نقدم عرضنا لتنفيذ أعمال (${projectDesc}) شاملاً جميع مستلزمات العمل من مواد وعمالة وإشراف وفق الكميات والمواصفات المعتمدة.`,
      scopeEn: `We present our offer to execute (${projectDesc}) works including all required materials, labor, and supervision per approved quantities and specifications.`,
      estimatedMargin: 22,
      items: [
        { descAr: "أعمال الحفر والردم والتسوية", descEn: "Excavation, Backfill & Grading Works", qty: 500, unit: "م³ / m³", unitPrice: 85, total: 42500 },
        { descAr: "أعمال الخرسانة المسلحة", descEn: "Reinforced Concrete Works", qty: 200, unit: "م³ / m³", unitPrice: 550, total: 110000 },
        { descAr: "أعمال البناء والبياض والعزل", descEn: "Masonry, Plastering & Insulation", qty: 800, unit: "م² / m²", unitPrice: 120, total: 96000 },
        { descAr: "أعمال التشطيبات والدهانات", descEn: "Finishing & Painting Works", qty: 800, unit: "م² / m²", unitPrice: 75, total: 60000 },
        { descAr: "إدارة المشروع والإشراف الهندسي", descEn: "Project Management & Engineering Supervision", qty: 1, unit: "مقطوع / Lump Sum", unitPrice: 35000, total: 35000 },
      ],
    },
    metal_recycling: {
      titleAr: "عرض سعر – خدمات تدوير المعادن", titleEn: "Quotation – Metal Recycling Services",
      introAr: `نتشرف بتقديم عرض أسعارنا لخدمات تدوير وإدارة المعادن المتعلقة بـ (${projectDesc}). نلتزم بتقديم خدمة احترافية ومتكاملة وفق أعلى معايير البيئة والسلامة المعتمدة في المملكة العربية السعودية.`,
      introEn: `We are honored to present our metal recycling and management services proposal for (${projectDesc}). We commit to providing a professional and comprehensive service per the highest environmental and safety standards in Saudi Arabia.`,
      scopeAr: `نقدم خدماتنا في مجال تدوير وإدارة المعادن لمشروع (${projectDesc}) بما يتوافق مع اشتراطات هيئة المواد البتروكيماوية السعودية ووزارة البيئة.`,
      scopeEn: `We provide metal recycling and management services for (${projectDesc}) in compliance with GPCA and Ministry of Environment requirements.`,
      estimatedMargin: 25,
      items: [
        { descAr: "استلام ومعالجة الخردة المعدنية وتصنيفها", descEn: "Metal Scrap Reception, Processing & Classification", qty: 50, unit: "طن / Ton", unitPrice: 1200, total: 60000 },
        { descAr: "خدمات الفرز والتصنيف الآلي", descEn: "Automated Sorting & Classification Services", qty: 50, unit: "طن / Ton", unitPrice: 350, total: 17500 },
        { descAr: "شهادات إعادة التدوير والتوثيق البيئي", descEn: "Recycling Certificates & Environmental Documentation", qty: 1, unit: "مجموعة / Set", unitPrice: 5500, total: 5500 },
        { descAr: "النقل والشحن المتخصص للمنشأة", descEn: "Specialized Transportation to Facility", qty: 10, unit: "رحلة / Trip", unitPrice: 1800, total: 18000 },
      ],
    },
  };
  return templates[serviceType];
}

// ─── Price Suggestions ────────────────────────────────────────────────────────

export interface PriceSuggestion {
  avgTotal: number; minTotal: number; maxTotal: number;
  sampleCount: number;
  itemSuggestions: { descAr: string; descEn: string; avgPrice: number; unit: string }[];
}

export function getPriceSuggestions(serviceType: ServiceType): PriceSuggestion {
  const proposals = getProposals().filter((p) => p.serviceType === serviceType && p.subtotal > 0);
  if (proposals.length === 0) {
    const tpl = generateAITemplate(serviceType, "مشروع", true);
    const base = tpl.items.reduce((s, i) => s + i.total, 0);
    return {
      avgTotal: base, minTotal: Math.round(base * 0.7), maxTotal: Math.round(base * 1.4),
      sampleCount: 0,
      itemSuggestions: tpl.items.map((i) => ({ descAr: i.descAr, descEn: i.descEn, avgPrice: i.unitPrice, unit: i.unit })),
    };
  }
  const totals = proposals.map((p) => p.subtotal);
  const avgTotal = Math.round(totals.reduce((s, v) => s + v, 0) / totals.length);
  const itemMap: Record<string, { prices: number[]; unit: string; descEn: string }> = {};
  for (const p of proposals) {
    for (const item of p.items) {
      if (!itemMap[item.descAr]) itemMap[item.descAr] = { prices: [], unit: item.unit, descEn: item.descEn };
      if (item.unitPrice > 0) itemMap[item.descAr].prices.push(item.unitPrice);
    }
  }
  return {
    avgTotal, minTotal: Math.min(...totals), maxTotal: Math.max(...totals), sampleCount: proposals.length,
    itemSuggestions: Object.entries(itemMap).filter(([, v]) => v.prices.length > 0).map(([descAr, v]) => ({
      descAr, descEn: v.descEn,
      avgPrice: Math.round(v.prices.reduce((s, p) => s + p, 0) / v.prices.length),
      unit: v.unit,
    })).slice(0, 8),
  };
}

// ─── Market Benchmark & Smart Price Analysis ──────────────────────────────────

export type PriceRegion = "riyadh" | "jeddah" | "dammam" | "medina" | "abha" | "other";
export type ProjectSize  = "small" | "medium" | "large" | "mega";

interface MarketBand { low: number; mid: number; high: number; unit: string; unitAr: string; }

// Saudi market reference prices (SAR) — 2024-2025
const MARKET_REFERENCE: Record<ServiceType, {
  multipliers: Record<PriceRegion, number>;
  sizeFactors:  Record<ProjectSize, number>;
  items: Record<string, MarketBand>;
}> = {
  eng_consulting: {
    multipliers: { riyadh: 1.0, jeddah: 0.95, dammam: 0.9, medina: 0.85, abha: 0.8, other: 0.75 },
    sizeFactors:  { small: 0.6, medium: 1.0, large: 1.5, mega: 2.2 },
    items: {
      "drawings":       { low: 25000, mid: 45000, high: 75000, unit: "Project", unitAr: "مشروع" },
      "supervision":    { low: 4500,  mid: 6500,  high: 10000, unit: "Month",   unitAr: "شهر"   },
      "permits":        { low: 18000, mid: 28000, high: 45000, unit: "Project", unitAr: "مشروع" },
      "inspection":     { low: 5000,  mid: 8500,  high: 14000, unit: "Report",  unitAr: "تقرير" },
      "feasibility":    { low: 30000, mid: 55000, high: 90000, unit: "Study",   unitAr: "دراسة" },
    },
  },
  environmental: {
    multipliers: { riyadh: 1.0, jeddah: 1.05, dammam: 1.1, medina: 0.85, abha: 0.8, other: 0.75 },
    sizeFactors:  { small: 0.6, medium: 1.0, large: 1.4, mega: 2.0 },
    items: {
      "eia":            { low: 35000, mid: 55000, high: 90000, unit: "Study",   unitAr: "دراسة"  },
      "waste_plan":     { low: 12000, mid: 18000, high: 28000, unit: "Plan",    unitAr: "مخطط"   },
      "monitoring":     { low: 7000,  mid: 9500,  high: 15000, unit: "Quarter", unitAr: "ربع"    },
      "compliance":     { low: 3500,  mid: 5500,  high: 8500,  unit: "Report",  unitAr: "تقرير"  },
      "audit":          { low: 20000, mid: 32000, high: 50000, unit: "Project", unitAr: "مشروع"  },
    },
  },
  safety_consulting: {
    multipliers: { riyadh: 1.0, jeddah: 0.95, dammam: 1.05, medina: 0.85, abha: 0.8, other: 0.75 },
    sizeFactors:  { small: 0.55, medium: 1.0, large: 1.4, mega: 2.0 },
    items: {
      "hse_plan":       { low: 15000, mid: 22000, high: 35000, unit: "Plan",   unitAr: "خطة"    },
      "risk_assess":    { low: 10000, mid: 15000, high: 25000, unit: "Report", unitAr: "تقرير"  },
      "training":       { low: 8000,  mid: 12000, high: 20000, unit: "Course", unitAr: "دورة"   },
      "site_inspect":   { low: 2500,  mid: 3500,  high: 5500,  unit: "Month",  unitAr: "شهر"    },
      "hazop":          { low: 18000, mid: 28000, high: 45000, unit: "Study",  unitAr: "دراسة"  },
    },
  },
  safety_services: {
    multipliers: { riyadh: 1.0, jeddah: 0.95, dammam: 1.0, medina: 0.85, abha: 0.8, other: 0.75 },
    sizeFactors:  { small: 0.6, medium: 1.0, large: 1.3, mega: 1.8 },
    items: {
      "safety_officer": { low: 6000,  mid: 8000,  high: 12000, unit: "Month",  unitAr: "شهر"    },
      "signs":          { low: 4000,  mid: 6500,  high: 10000, unit: "Set",    unitAr: "مجموعة" },
      "ppe":            { low: 500,   mid: 850,   high: 1500,  unit: "Kit",    unitAr: "طقم"    },
      "reports":        { low: 800,   mid: 1200,  high: 2000,  unit: "Report", unitAr: "تقرير"  },
    },
  },
  contracting: {
    multipliers: { riyadh: 1.0, jeddah: 1.05, dammam: 0.95, medina: 0.9, abha: 0.85, other: 0.8 },
    sizeFactors:  { small: 0.5, medium: 1.0, large: 1.6, mega: 2.5 },
    items: {
      "excavation":     { low: 55,    mid: 85,    high: 140,   unit: "m³",     unitAr: "م³"    },
      "concrete":       { low: 400,   mid: 550,   high: 750,   unit: "m³",     unitAr: "م³"    },
      "masonry":        { low: 80,    mid: 120,   high: 180,   unit: "m²",     unitAr: "م²"    },
      "finishing":      { low: 50,    mid: 75,    high: 120,   unit: "m²",     unitAr: "م²"    },
      "pm":             { low: 20000, mid: 35000, high: 60000, unit: "Project", unitAr: "مشروع" },
    },
  },
  metal_recycling: {
    multipliers: { riyadh: 1.0, jeddah: 1.0, dammam: 1.1, medina: 0.85, abha: 0.8, other: 0.75 },
    sizeFactors:  { small: 0.6, medium: 1.0, large: 1.4, mega: 2.0 },
    items: {
      "processing":     { low: 800,   mid: 1200,  high: 1800,  unit: "Ton",    unitAr: "طن"    },
      "sorting":        { low: 250,   mid: 350,   high: 500,   unit: "Ton",    unitAr: "طن"    },
      "certification":  { low: 3500,  mid: 5500,  high: 8500,  unit: "Set",    unitAr: "مجموعة" },
      "transport":      { low: 1200,  mid: 1800,  high: 2800,  unit: "Trip",   unitAr: "رحلة"  },
    },
  },
};

export type PriceLevel = "low" | "fair" | "high" | "unknown";

export interface PriceAnalysisItem {
  descAr: string; descEn: string;
  unitPrice: number; total: number;
  level: PriceLevel;
  marketLow: number; marketMid: number; marketHigh: number;
  suggestionAr: string; suggestionEn: string;
}

export interface ProposalPriceAnalysis {
  items: PriceAnalysisItem[];
  totalLevel: PriceLevel;
  competitiveScore: number; // 0-100
  marketMin: number; marketMax: number; marketMid: number;
  summaryAr: string; summaryEn: string;
  region: PriceRegion;
  projectSize: ProjectSize;
}

function detectPriceLevel(price: number, low: number, mid: number, high: number): PriceLevel {
  if (price <= 0) return "unknown";
  if (price < low * 0.85) return "low";
  if (price > high * 1.15) return "high";
  return "fair";
}

export function analyzeProposalPrices(
  proposal: Proposal,
  region: PriceRegion = "riyadh",
  size: ProjectSize   = "medium",
): ProposalPriceAnalysis {
  const ref    = MARKET_REFERENCE[proposal.serviceType];
  const mult   = ref.multipliers[region];
  const factor = ref.sizeFactors[size];
  const bands  = Object.values(ref.items);
  const mLow   = Math.round(bands.reduce((s, b) => s + b.low, 0) * mult * factor);
  const mMid   = Math.round(bands.reduce((s, b) => s + b.mid, 0) * mult * factor);
  const mHigh  = Math.round(bands.reduce((s, b) => s + b.high, 0) * mult * factor);

  const analyzedItems: PriceAnalysisItem[] = proposal.items.map((item) => {
    // try to match against known items
    const allBands = Object.values(ref.items);
    // pick the closest band based on price magnitude
    const sorted = [...allBands].sort((a, b) => Math.abs(a.mid - item.unitPrice) - Math.abs(b.mid - item.unitPrice));
    const best   = sorted[0] ?? { low: item.unitPrice * 0.7, mid: item.unitPrice, high: item.unitPrice * 1.4 };
    const adjLow  = Math.round(best.low  * mult * factor);
    const adjMid  = Math.round(best.mid  * mult * factor);
    const adjHigh = Math.round(best.high * mult * factor);
    const level   = detectPriceLevel(item.unitPrice, adjLow, adjMid, adjHigh);
    const suggestionAr = level === "low"
      ? `السعر منخفض — المتوسط السوقي ${adjMid.toLocaleString()} ر.س. فكّر في رفع السعر لتغطية التكاليف.`
      : level === "high"
      ? `السعر مرتفع — المتوسط السوقي ${adjMid.toLocaleString()} ر.س. قد يُضعف تنافسية العرض.`
      : `السعر تنافسي ضمن نطاق السوق (${adjLow.toLocaleString()} — ${adjHigh.toLocaleString()} ر.س).`;
    const suggestionEn = level === "low"
      ? `Price is low — market avg SAR ${adjMid.toLocaleString()}. Consider raising to cover costs.`
      : level === "high"
      ? `Price is high — market avg SAR ${adjMid.toLocaleString()}. May reduce competitiveness.`
      : `Competitive price within market range (SAR ${adjLow.toLocaleString()} — ${adjHigh.toLocaleString()}).`;
    return { descAr: item.descAr, descEn: item.descEn, unitPrice: item.unitPrice, total: item.total, level, marketLow: adjLow, marketMid: adjMid, marketHigh: adjHigh, suggestionAr, suggestionEn };
  });

  const fairCount = analyzedItems.filter((i) => i.level === "fair").length;
  const score = analyzedItems.length > 0 ? Math.round((fairCount / analyzedItems.length) * 100) : 0;
  const totalLevel = proposal.subtotal < mLow * 0.85 ? "low" : proposal.subtotal > mHigh * 1.15 ? "high" : "fair";
  const summaryAr = totalLevel === "fair"
    ? `إجمالي العرض (${proposal.subtotal.toLocaleString()} ر.س) تنافسي ضمن النطاق السوقي لمنطقة ${region === "riyadh" ? "الرياض" : region === "jeddah" ? "جدة" : region === "dammam" ? "الدمام" : "السوق السعودي"}.`
    : totalLevel === "low"
    ? `إجمالي العرض (${proposal.subtotal.toLocaleString()} ر.س) أقل من متوسط السوق. تحقق من تغطية التكاليف الفعلية.`
    : `إجمالي العرض (${proposal.subtotal.toLocaleString()} ر.س) أعلى من المتوسط. تأكد من تبرير الأسعار للعميل.`;
  const summaryEn = totalLevel === "fair"
    ? `Total (SAR ${proposal.subtotal.toLocaleString()}) is competitive for ${region} market.`
    : totalLevel === "low"
    ? `Total (SAR ${proposal.subtotal.toLocaleString()}) is below market average. Check cost coverage.`
    : `Total (SAR ${proposal.subtotal.toLocaleString()}) is above average. Justify pricing to client.`;
  return { items: analyzedItems, totalLevel, competitiveScore: score, marketMin: mLow, marketMax: mHigh, marketMid: mMid, summaryAr, summaryEn, region, projectSize: size };
}

export function getSmartPricing(
  serviceType: ServiceType,
  region: PriceRegion,
  size: ProjectSize,
): AITemplate {
  const ref    = MARKET_REFERENCE[serviceType];
  const mult   = ref.multipliers[region];
  const factor = ref.sizeFactors[size];
  const base   = generateAITemplate(serviceType, "المشروع", true);
  return {
    ...base,
    items: base.items.map((item) => {
      const adjusted = Math.round(item.unitPrice * mult * factor);
      return { ...item, unitPrice: adjusted, total: Math.round(adjusted * item.qty) };
    }),
  };
}

export const REGION_META: Record<PriceRegion, { labelAr: string; labelEn: string }> = {
  riyadh: { labelAr: "الرياض",   labelEn: "Riyadh"   },
  jeddah: { labelAr: "جدة",      labelEn: "Jeddah"   },
  dammam: { labelAr: "الدمام",   labelEn: "Dammam"   },
  medina: { labelAr: "المدينة",  labelEn: "Madinah"  },
  abha:   { labelAr: "أبها",     labelEn: "Abha"     },
  other:  { labelAr: "مدينة أخرى", labelEn: "Other" },
};

export const SIZE_META: Record<ProjectSize, { labelAr: string; labelEn: string; descAr: string; descEn: string }> = {
  small:  { labelAr: "صغير",  labelEn: "Small",  descAr: "أقل من 500 ألف ر.س",     descEn: "Below SAR 500K"   },
  medium: { labelAr: "متوسط", labelEn: "Medium", descAr: "500 ألف – 2 مليون ر.س", descEn: "SAR 500K – 2M"   },
  large:  { labelAr: "كبير",  labelEn: "Large",  descAr: "2 مليون – 10 ملايين ر.س", descEn: "SAR 2M – 10M" },
  mega:   { labelAr: "ضخم",   labelEn: "Mega",   descAr: "أكثر من 10 ملايين ر.س",  descEn: "Above SAR 10M"   },
};

// ─── Contract Generation ──────────────────────────────────────────────────────

function buildClauses(serviceType: ServiceType, projectName: string, total: number): ContractClause[] {
  const fmt = total.toLocaleString();
  return [
    {
      id: "1", titleAr: "المادة الأولى: تعريفات وتفسير", titleEn: "Article 1: Definitions and Interpretation",
      bodyAr: `في هذا العقد، تُحمل الألفاظ التالية المعاني المبينة قرين كل منها:\n• "الشركة": شركة سكابكس للاستشارات والخدمات الهندسية\n• "العميل": الطرف الثاني الموقّع على هذا العقد\n• "المشروع": "${projectName}"\n• "نطاق العمل": الخدمات المفصلة في الجدول المرفق`,
      bodyEn: `In this Contract, the following terms shall have the meanings assigned:\n• "Company": Scapex Consulting & Engineering Services\n• "Client": The second party signatory\n• "Project": "${projectName}"\n• "Scope of Work": Services detailed in the attached Schedule`,
    },
    {
      id: "2", titleAr: "المادة الثانية: نطاق العمل والخدمات", titleEn: "Article 2: Scope of Work and Services",
      bodyAr: `تتعهد الشركة بتقديم الخدمات المنصوص عليها في الجدول المرفق لمشروع "${projectName}" وفق المعايير والمتطلبات النظامية المعمول بها في المملكة العربية السعودية. يشمل نطاق العمل جميع البنود المفصلة في جدول الكميات والأسعار المرفق.`,
      bodyEn: `The Company undertakes to provide services specified in the attached Schedule for "${projectName}", in accordance with applicable standards and regulatory requirements in Saudi Arabia. The scope includes all items in the attached Bill of Quantities.`,
    },
    {
      id: "3", titleAr: "المادة الثالثة: القيمة الإجمالية للعقد", titleEn: "Article 3: Total Contract Value",
      bodyAr: `تبلغ القيمة الإجمالية لهذا العقد (${fmt} ريال سعودي) شاملاً ضريبة القيمة المضافة بنسبة 15%. تُسدَّد القيمة وفق جدول الدفعات المُرفق. تُعدّ المدفوعات المتأخرة أكثر من 30 يوماً خاضعة لغرامة تأخير 2% شهرياً.`,
      bodyEn: `The total contract value is (SAR ${fmt}) inclusive of 15% VAT, paid per the attached Payment Schedule. Payments delayed beyond 30 days incur a 2% monthly delay penalty.`,
    },
    {
      id: "4", titleAr: "المادة الرابعة: مدة العقد والجدول الزمني", titleEn: "Article 4: Contract Duration and Timeline",
      bodyAr: `تبدأ مدة التنفيذ من تاريخ التوقيع واستلام دفعة التعبئة. أي تمديد ناجم عن ظروف قاهرة أو تأخير من جانب العميل لا يُعدّ إخلالاً من جانب الشركة. يُرفق جدول زمني تفصيلي بعد إبرام العقد خلال 5 أيام عمل.`,
      bodyEn: `Execution begins from signature date and receipt of mobilization payment. Extensions due to force majeure or Client delays do not constitute breach by the Company. A detailed timeline shall be attached within 5 business days of signing.`,
    },
    {
      id: "5", titleAr: "المادة الخامسة: التزامات الطرفين", titleEn: "Article 5: Obligations of Both Parties",
      bodyAr: `التزامات الشركة:\n• تنفيذ الأعمال وفق المعايير المهنية المعتمدة\n• تخصيص كوادر مؤهلة ومعتمدة للمشروع\n• تقديم تقارير دورية للعميل\n• الحفاظ على سرية المعلومات\n\nالتزامات العميل:\n• توفير الوثائق المطلوبة في الوقت المناسب\n• سداد الدفعات في مواعيدها\n• تيسير الوصول إلى الموقع عند الحاجة`,
      bodyEn: `Company Obligations:\n• Execute works to approved professional standards\n• Assign qualified certified personnel\n• Provide periodic progress reports\n• Maintain confidentiality\n\nClient Obligations:\n• Provide required documents timely\n• Make payments on schedule\n• Facilitate site access when needed`,
    },
    {
      id: "6", titleAr: "المادة السادسة: السرية وحقوق الملكية الفكرية", titleEn: "Article 6: Confidentiality and Intellectual Property",
      bodyAr: `تتعهد الشركة بالمحافظة على سرية جميع معلومات وبيانات العميل. جميع الرسومات والتقارير والمستندات الناتجة تعود ملكيتها للعميل عند اكتمال السداد الكامل.`,
      bodyEn: `The Company maintains confidentiality of all Client information. All resulting drawings, reports and documents become Client property upon full payment completion.`,
    },
    {
      id: "7", titleAr: "المادة السابعة: حل النزاعات والقانون المنظم", titleEn: "Article 7: Dispute Resolution and Governing Law",
      bodyAr: `في حال نشوء أي نزاع، يسعى الطرفان أولاً للتسوية الودية. فإن تعذّر ذلك، يُحال النزاع للتحكيم وفق نظام التحكيم السعودي م/34. يخضع هذا العقد لأحكام نظام الشركات السعودي ونظام العمل.`,
      bodyEn: `Disputes shall first be resolved amicably. If not possible, referral to arbitration per Saudi Arbitration System M/34. This Contract is governed by Saudi Company Law and Labor Law.`,
    },
    {
      id: "8", titleAr: "المادة الثامنة: إنهاء العقد", titleEn: "Article 8: Contract Termination",
      bodyAr: `يحق لأي طرف إنهاء العقد في حال الإخلال الجوهري بشروطه مع إخطار خطي بـ 30 يوماً، أو الإفلاس، أو باتفاق الطرفين كتابياً. تُستحق المبالغ المقابلة للأعمال المنجزة فعلياً حتى تاريخ الإنهاء.`,
      bodyEn: `Either party may terminate upon material breach with 30-day written notice, bankruptcy, or mutual written agreement. Amounts for work actually completed to the termination date remain due.`,
    },
  ];
}

function buildPaymentSchedule(serviceType: ServiceType, total: number): PaymentMilestone[] {
  const s: Record<ServiceType, PaymentMilestone[]> = {
    eng_consulting: [
      { id: "1", milestoneAr: "دفعة التعبئة (عند توقيع العقد)", milestoneEn: "Mobilization (Upon Signing)", percentage: 25, amount: Math.round(total * 0.25) },
      { id: "2", milestoneAr: "إنجاز 50% من الأعمال", milestoneEn: "50% Work Completion", percentage: 35, amount: Math.round(total * 0.35) },
      { id: "3", milestoneAr: "إنجاز 85% من الأعمال", milestoneEn: "85% Work Completion", percentage: 30, amount: Math.round(total * 0.30) },
      { id: "4", milestoneAr: "التسليم النهائي واعتماد المخرجات", milestoneEn: "Final Delivery & Approval", percentage: 10, amount: Math.round(total * 0.10) },
    ],
    environmental: [
      { id: "1", milestoneAr: "دفعة التعبئة (عند توقيع العقد)", milestoneEn: "Mobilization (Upon Signing)", percentage: 30, amount: Math.round(total * 0.30) },
      { id: "2", milestoneAr: "تسليم المسودة الأولية للدراسة", milestoneEn: "Initial Study Draft Delivery", percentage: 40, amount: Math.round(total * 0.40) },
      { id: "3", milestoneAr: "التسليم النهائي والاعتماد الحكومي", milestoneEn: "Final Delivery & Government Approval", percentage: 30, amount: Math.round(total * 0.30) },
    ],
    safety_consulting: [
      { id: "1", milestoneAr: "دفعة التعبئة (عند توقيع العقد)", milestoneEn: "Mobilization (Upon Signing)", percentage: 30, amount: Math.round(total * 0.30) },
      { id: "2", milestoneAr: "تقديم خطة السلامة وتقييم المخاطر", milestoneEn: "HSE Plan & Risk Assessment Delivery", percentage: 40, amount: Math.round(total * 0.40) },
      { id: "3", milestoneAr: "إنهاء التدريبات والتسليم النهائي", milestoneEn: "Training Completion & Final Delivery", percentage: 30, amount: Math.round(total * 0.30) },
    ],
    safety_services: [
      { id: "1", milestoneAr: "دفعة مقدمة (الشهر الأول)", milestoneEn: "Advance Payment (First Month)", percentage: 20, amount: Math.round(total * 0.20) },
      { id: "2", milestoneAr: "دفعة ربع سنوية (الأشهر 2-4)", milestoneEn: "Quarterly Payment (Months 2-4)", percentage: 40, amount: Math.round(total * 0.40) },
      { id: "3", milestoneAr: "الدفعة النهائية (الأشهر 5-6)", milestoneEn: "Final Payment (Months 5-6)", percentage: 40, amount: Math.round(total * 0.40) },
    ],
    contracting: [
      { id: "1", milestoneAr: "دفعة التعبئة (عند توقيع العقد)", milestoneEn: "Mobilization (Upon Signing)", percentage: 20, amount: Math.round(total * 0.20) },
      { id: "2", milestoneAr: "إنجاز 30% من الأعمال المدنية", milestoneEn: "30% Civil Works Completion", percentage: 25, amount: Math.round(total * 0.25) },
      { id: "3", milestoneAr: "إنجاز 60% من الأعمال", milestoneEn: "60% Works Completion", percentage: 30, amount: Math.round(total * 0.30) },
      { id: "4", milestoneAr: "إنجاز 90% من الأعمال", milestoneEn: "90% Works Completion", percentage: 20, amount: Math.round(total * 0.20) },
      { id: "5", milestoneAr: "الاستلام الابتدائي والشهادات", milestoneEn: "Provisional Acceptance & Certificates", percentage: 5, amount: Math.round(total * 0.05) },
    ],
    metal_recycling: [
      { id: "1", milestoneAr: "دفعة عند استلام الشحنة الأولى", milestoneEn: "Payment Upon First Batch Receipt", percentage: 40, amount: Math.round(total * 0.40) },
      { id: "2", milestoneAr: "دفعة عند اكتمال المعالجة", milestoneEn: "Payment Upon Processing Completion", percentage: 40, amount: Math.round(total * 0.40) },
      { id: "3", milestoneAr: "دفعة عند تسليم الشهادات البيئية", milestoneEn: "Payment Upon Environmental Certificate Delivery", percentage: 20, amount: Math.round(total * 0.20) },
    ],
  };
  return s[serviceType];
}

export function generateContractFromProposal(proposal: Proposal): Contract {
  const now = new Date();
  const startDate = now.toISOString().split("T")[0];
  const endDate = new Date(now.setMonth(now.getMonth() + 6)).toISOString().split("T")[0];
  return {
    id: generateId(),
    contractNumber: generateContractNumber(),
    proposalId: proposal.id,
    proposalNumber: proposal.proposalNumber,
    clientName: proposal.clientName,
    clientContact: proposal.clientContact,
    clientEmail: proposal.clientEmail,
    projectName: proposal.projectName,
    projectDesc: proposal.projectDesc,
    serviceType: proposal.serviceType,
    items: proposal.items,
    subtotal: proposal.subtotal,
    vatRate: proposal.vatRate,
    vatAmount: proposal.vatAmount,
    total: proposal.total,
    currency: proposal.currency,
    status: "draft",
    clauses: buildClauses(proposal.serviceType, proposal.projectName, proposal.total),
    paymentSchedule: buildPaymentSchedule(proposal.serviceType, proposal.total),
    startDate,
    endDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: proposal.createdBy,
  };
}

// ─── PDF Print ────────────────────────────────────────────────────────────────

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');`;
const BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Noto Sans Arabic', Arial, sans-serif; font-size:13px; color:#1a202c; }
  .page { max-width:900px; margin:0 auto; padding:36px; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .page { padding:20px; } }
`;

export function printProposal(proposal: Proposal, isRtl: boolean): void {
  const dir = isRtl ? "rtl" : "ltr";
  const svc = SERVICE_META[proposal.serviceType];
  const fmt = (n: number) => n.toLocaleString();
  const date = new Date(proposal.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const validUntil = new Date(new Date(proposal.createdAt).getTime() + proposal.validity * 86400000)
    .toLocaleDateString(isRtl ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  // ── Company data: getAboutData() is the single source of truth ──
  const aboutData = getAboutData();
  const coNameAr   = aboutData.companyNameAr || "شركة سكيب للاستشارات والخدمات الهندسية";
  const coNameEn   = aboutData.companyNameEn || "Scapex Consulting & Engineering Services";
  const coVat      = aboutData.vatNumber || "300123456700003";
  let coLogoUrl  = "";
  let coLogoColor = "#1e40af";
  let coLogoChar  = coNameEn?.charAt(0)?.toUpperCase() || "S";
  try {
    const raw = localStorage.getItem("scapex_companies");
    if (raw) {
      const companies = JSON.parse(raw) as Array<{id:string;logoUrl?:string;logoColor?:string;nameEn?:string}>;
      const activeId = localStorage.getItem("scapex_active_company");
      const co = activeId ? companies.find((c) => c.id === activeId) : companies[0];
      if (co) {
        coLogoUrl   = co.logoUrl   || "";
        coLogoColor = co.logoColor || "#1e40af";
        coLogoChar  = co.nameEn?.charAt(0)?.toUpperCase() || coLogoChar;
      }
    }
  } catch {}

  // ── Build logo HTML ───────────────────────────────────────────────────────
  const logoHtml = coLogoUrl
    ? `<img src="${coLogoUrl}" style="width:64px;height:64px;object-fit:contain;border-radius:10px;display:block;" />`
    : `<div style="background:${coLogoColor};color:white;width:64px;height:64px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${coLogoChar}</div>`;

  const rows = proposal.items.map((item, i) => `
    <tr>
      <td class="tc bd">${i + 1}</td>
      <td class="bd" style="padding:8px 6px;">${isRtl ? item.descAr : item.descEn}</td>
      <td class="tc bd">${item.qty}</td>
      <td class="tc bd" style="font-size:11px;">${item.unit}</td>
      <td class="tr bd mono">${fmt(item.unitPrice)}</td>
      <td class="tr bd mono fw">${fmt(item.total)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="${isRtl ? "ar" : "en"}" dir="${dir}"><head><meta charset="UTF-8"/>
<title>${proposal.proposalNumber}</title>
<style>
${FONT_IMPORT}${BASE_CSS}
.header { display:flex; flex-direction:row; align-items:flex-start; margin-bottom:10px; gap:16px; }
.header-logo { flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.logo { background:#1e40af; color:white; width:64px; height:64px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:bold; box-shadow:0 2px 6px rgba(30,64,175,0.2); }
.header-name { flex:1; text-align:right; direction:rtl; }
.co-name-ar { font-size:19px; font-weight:700; color:#1a202c; line-height:1.25; }
.co-name-en { font-size:13px; font-weight:500; color:#4a5568; line-height:1.25; margin-top:2px; }
.co-vat { font-size:9px; color:#94a3b8; margin-top:4px; }
.divider { border:none; border-top:2px solid #1e40af; margin:10px 0; }
.doc-num-block { direction:ltr; text-align:left; margin-bottom:6px; }
.doc-num { font-size:12px; font-weight:700; color:#1e40af; font-family:monospace; }
.doc-date { font-size:12px; font-weight:700; color:#1e40af; font-family:monospace; margin-top:2px; }
.doc-title { text-align:center; font-size:16px; font-weight:700; color:#1a202c; margin-bottom:8px; }
.intro-box { background:#f0f7ff; ${isRtl ? "border-right:4px solid #1e40af; border-radius:0 6px 6px 0;" : "border-left:4px solid #1e40af; border-radius:6px 0 0 6px;"} padding:8px 14px; font-size:12px; line-height:1.7; color:#1e3a5f; margin-bottom:8px; }
.sec-title { font-size:11px; font-weight:700; color:#1e40af; margin-bottom:4px; padding-bottom:2px; border-bottom:1px solid #bfdbfe; letter-spacing:0.4px; }
.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px; }
.info-item label { font-size:9px; color:#64748b; display:block; }
.info-item span { font-size:12px; font-weight:500; }
.scope-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; padding:8px; font-size:12px; line-height:1.7; margin-bottom:8px; }
table { width:100%; border-collapse:collapse; margin-bottom:12px; }
thead th { background:#1e40af; color:white; padding:8px 5px; font-size:11px; font-weight:600; border:1px solid #1e40af; }
tbody tr:nth-child(even) { background:#f8fafc; }
tfoot td { background:#f1f5f9; font-weight:600; padding:6px 5px; }
.total-row td { background:#1e40af !important; color:white !important; font-size:14px; font-weight:700; }
.bd { border:1px solid #e2e8f0; padding:6px 5px; }
.tc { text-align:center; } .tr { text-align:${isRtl ? "left" : "right"}; } .mono { font-family:monospace; } .fw { font-weight:bold; }
.bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
.valid-box { background:#ecfdf5; border:1px solid #a7f3d0; border-radius:5px; padding:9px; font-size:11px; color:#065f46; }
.notes-box { background:#fffbeb; border:1px solid #fde68a; border-radius:5px; padding:9px; font-size:11px; color:#92400e; }
.footer-info { margin-top:20px; padding:12px 16px; border-top:2px solid #1e40af; background:#f8fafc; border-radius:0 0 6px 6px; }
.footer-info-grid { display:flex; justify-content:center; gap:28px; flex-wrap:wrap; }
.footer-info-item { display:flex; align-items:center; gap:5px; font-size:10px; color:#374151; }
.footer-info-item strong { font-weight:600; }
.footer { margin-top:8px; text-align:center; font-size:9px; color:#94a3b8; }
</style></head><body>
<div class="page">
<!-- الهيدر: dir=ltr دائماً لضمان الشعار في اليسار الفيزيائي -->
<div class="header" dir="ltr">
  <div class="header-logo">
    ${logoHtml}
  </div>
  <div class="header-name" dir="${dir}">
    ${isRtl ? `
      <div class="co-name-ar">${coNameAr}</div>
      <div class="co-name-en">${coNameEn}</div>
    ` : `
      <div class="co-name-en">${coNameEn}</div>
      <div class="co-name-ar">${coNameAr}</div>
    `}
    <div class="co-vat">${isRtl ? `الرقم الضريبي: ${coVat}` : `VAT No: ${coVat}`}</div>
  </div>
</div>
<hr class="divider"/>
<!-- رقم العرض والتاريخ: dir=ltr لضمان أنه في اليسار الفيزيائي دائماً -->
<div class="doc-num-block" dir="ltr">
  <div class="doc-num">${proposal.proposalNumber}</div>
  <div class="doc-date">${isRtl ? "التاريخ:" : "Date:"} ${date}</div>
</div>
<div class="doc-title" dir="${dir}">${isRtl ? `عرض سعر ${svc.labelAr}` : `QUOTATION ${svc.labelEn}`}</div>
<div class="sec-title">${isRtl ? "معلومات العميل والمشروع" : "CLIENT & PROJECT INFORMATION"}</div>

<div class="info-grid">
  <div class="info-item"><label>${isRtl ? "اسم العميل / الجهة" : "Client / Entity"}</label><span>${proposal.clientName}</span></div>
  <div class="info-item"><label>${isRtl ? "اسم المشروع" : "Project Name"}</label><span>${proposal.projectName}</span></div>
  ${proposal.clientContact ? `<div class="info-item"><label>${isRtl ? "التواصل" : "Contact"}</label><span dir="ltr">${proposal.clientContact}</span></div>` : ""}
  ${proposal.clientEmail ? `<div class="info-item"><label>${isRtl ? "البريد الإلكتروني" : "Email"}</label><span dir="ltr">${proposal.clientEmail}</span></div>` : ""}
</div>
${(() => {
  const introText = (proposal.introduction || "").trim();
  const scopeText = (proposal.projectDesc || "").trim();
  if (introText && scopeText) {
    return `<div class="intro-box">${introText}</div>
<div class="sec-title">${isRtl ? "نطاق العمل" : "SCOPE OF WORK"}</div>
<div class="scope-box">${scopeText}</div>`;
  } else if (introText) {
    return `<div class="intro-box">${introText}</div>`;
  } else if (scopeText) {
    return `<div class="intro-box">${scopeText}</div>`;
  }
  return "";
})()}
<div class="sec-title">${isRtl ? "جدول الكميات والأسعار" : "BILL OF QUANTITIES & PRICES"}</div>
<table>
<thead><tr>
  <th style="width:36px;">${isRtl ? "م" : "#"}</th>
  <th>${isRtl ? "وصف البند" : "Item Description"}</th>
  <th style="width:54px;">${isRtl ? "الكمية" : "Qty"}</th>
  <th style="width:80px;">${isRtl ? "الوحدة" : "Unit"}</th>
  <th style="width:100px;">${isRtl ? "سعر الوحدة" : "Unit Price"}</th>
  <th style="width:110px;">${isRtl ? "الإجمالي (ر.س)" : "Total (SAR)"}</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot>
  <tr><td colspan="5" style="text-align:${isRtl ? "end" : "end"};padding:8px;border:1px solid #e2e8f0;">${isRtl ? "المجموع قبل الضريبة:" : "Subtotal:"}</td><td class="tr bd mono">${fmt(proposal.subtotal)}</td></tr>
  <tr><td colspan="5" style="text-align:end;padding:6px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;">${isRtl ? `ضريبة القيمة المضافة (${proposal.vatRate}%):` : `VAT (${proposal.vatRate}%):`}</td><td class="tr bd mono" style="font-size:11px;color:#64748b;">${fmt(proposal.vatAmount)}</td></tr>
  <tr class="total-row"><td colspan="5" style="text-align:end;padding:10px;border:1px solid #1e40af;">${isRtl ? "الإجمالي الكلي شامل الضريبة:" : "Grand Total incl. VAT:"}</td><td style="text-align:end;padding:10px;font-family:monospace;border:1px solid #1e40af;">${fmt(proposal.total)} ${proposal.currency}</td></tr>
</tfoot>
</table>
<div class="bottom-grid">
  <div class="valid-box"><strong>${isRtl ? "صلاحية العرض:" : "Validity:"}</strong><br/>${isRtl ? `${proposal.validity} يوماً (حتى ${validUntil})` : `${proposal.validity} days (until ${validUntil})`}</div>
  ${proposal.notes ? `<div class="notes-box"><strong>${isRtl ? "ملاحظات:" : "Notes:"}</strong><br/>${proposal.notes}</div>` : "<div></div>"}
</div>
${(() => {
  const about = getAboutData();
  const sysCfg = getSystemSettings();
  const addr = isRtl ? (about.address || "").split("\n").join(" — ") : (about.addressEn || "").split("\n").join(" — ");
  const email = about.email1 || "info@scapex.sa";
  const web = about.website || "www.scapex.sa";
  const phone = about.phone1 || "";
  const customFooter = isRtl ? sysCfg.proposalFooterAr : sysCfg.proposalFooterEn;
  return `<div class="footer-info"><div class="footer-info-grid">
  ${addr ? `<div class="footer-info-item"><strong>📍</strong> ${addr}</div>` : ""}
  ${phone ? `<div class="footer-info-item"><strong>📞</strong> ${phone}</div>` : ""}
  <div class="footer-info-item"><strong>✉</strong> ${email}</div>
  <div class="footer-info-item"><strong>🌐</strong> ${web}</div>
</div>${customFooter ? `<div style="text-align:center;margin-top:8px;font-size:10px;color:#4a5568;font-style:italic;">${customFooter}</div>` : ""}</div>`;
})()}
<div class="footer">${isRtl ? `تم إنشاء هذا العرض من منصة Scapex الذكية لإدارة الأعمال` : `Generated from Scapex Smart Business Management Platform`}</div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

export function printContract(contract: Contract, isRtl: boolean): void {
  const dir = isRtl ? "rtl" : "ltr";
  const svc = SERVICE_META[contract.serviceType];
  const fmt = (n: number) => n.toLocaleString();
  const date = new Date(contract.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  // ── Read active company data ──────────────────────────────────────────────
  let cNameAr = "شركة سكيب للاستشارات والخدمات الهندسية";
  let cNameEn = "Scapex Consulting & Engineering Services";
  let cVat    = "300123456700003";
  let cLogoUrl = ""; let cLogoColor = "#1e40af"; let cLogoChar = "S";
  try {
    const raw = localStorage.getItem("scapex_companies");
    if (raw) {
      const cos = JSON.parse(raw) as Array<{id:string;nameAr:string;nameEn:string;vatNumber?:string;logoUrl?:string;logoColor?:string}>;
      const aid = localStorage.getItem("scapex_active_company");
      const co  = aid ? cos.find((c) => c.id === aid) : cos[0];
      if (co) { cNameAr = co.nameAr; cNameEn = co.nameEn; cVat = co.vatNumber||cVat; cLogoUrl = co.logoUrl||""; cLogoColor = co.logoColor||"#1e40af"; cLogoChar = co.nameEn?.charAt(0)?.toUpperCase()||"S"; }
    }
  } catch {}
  const cLogoHtml = cLogoUrl
    ? `<img src="${cLogoUrl}" style="width:48px;height:48px;object-fit:contain;border-radius:8px;" />`
    : `<div style="background:${cLogoColor};color:white;width:48px;height:48px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;">${cLogoChar}</div>`;

  const clausesHtml = contract.clauses.map((c) => `
    <div style="margin-bottom:16px;padding:14px;background:#f8fafc;border-radius:8px;border-${isRtl ? "right" : "left"}:4px solid #1e40af;">
      <div style="font-weight:700;color:#1e40af;margin-bottom:6px;font-size:13px;">${isRtl ? c.titleAr : c.titleEn}</div>
      <div style="font-size:12px;line-height:1.9;color:#374151;white-space:pre-line;">${isRtl ? c.bodyAr : c.bodyEn}</div>
    </div>`).join("");

  const payRows = contract.paymentSchedule.map((m, i) => `
    <tr>
      <td style="text-align:center;padding:8px 6px;border:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:8px 6px;border:1px solid #e2e8f0;">${isRtl ? m.milestoneAr : m.milestoneEn}</td>
      <td style="text-align:center;padding:8px 6px;border:1px solid #e2e8f0;">${m.percentage}%</td>
      <td style="text-align:${isRtl ? "left" : "right"};padding:8px 6px;border:1px solid #e2e8f0;font-family:monospace;font-weight:bold;">${fmt(m.amount)} ${contract.currency}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="${isRtl ? "ar" : "en"}" dir="${dir}"><head><meta charset="UTF-8"/>
<title>${contract.contractNumber}</title>
<style>
${FONT_IMPORT}${BASE_CSS}
.header { text-align:center; margin-bottom:28px; padding-bottom:18px; border-bottom:3px solid #1e40af; }
.logo-row { display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:10px; }
.logo { background:#1e40af; color:white; width:44px; height:44px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold; }
.parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
.party { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; }
.party-lbl { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; font-weight:600; }
.party-name { font-size:14px; font-weight:700; }
.sec-title { font-size:13px; font-weight:700; color:#1e40af; margin-bottom:12px; padding:7px 12px; background:#eff6ff; border-radius:6px; border-${isRtl ? "right" : "left"}:4px solid #1e40af; }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
thead th { background:#1e40af; color:white; padding:9px 6px; font-size:11px; font-weight:600; }
tbody tr:nth-child(even) { background:#f8fafc; }
.sig-grid { display:grid; grid-template-columns:1fr 1fr; gap:60px; margin-top:44px; }
.sig-box { text-align:center; }
.sig-line { border-bottom:2px solid #374151; height:60px; margin-bottom:10px; }
.footer { margin-top:24px; padding-top:10px; border-top:1px solid #e2e8f0; text-align:center; font-size:10px; color:#94a3b8; }
</style></head><body>
<div class="page">
<div class="header">
  <div class="logo-row">
    ${cLogoHtml}
    <div style="text-align:${isRtl ? "right" : "left"}">
      <div style="font-size:16px;font-weight:700;color:#1a202c;">${isRtl ? cNameAr : cNameEn}</div>
      <div style="font-size:11px;color:#4a5568;">${isRtl ? cNameEn : cNameAr}</div>
      <div style="font-size:9px;color:#94a3b8;margin-top:2px;">${isRtl ? `الرقم الضريبي: ${cVat}` : `VAT No: ${cVat}`}</div>
    </div>
  </div>
  <div style="font-size:20px;font-weight:700;color:#1e40af;margin-bottom:4px;">${isRtl ? "عقد تقديم خدمات" : "SERVICE CONTRACT"}</div>
  <div style="font-size:13px;color:#374151;">${isRtl ? svc.labelAr : svc.labelEn}</div>
  <div style="font-size:14px;font-weight:600;color:#374151;margin-top:6px;">${isRtl ? "رقم العقد:" : "Contract No:"} ${contract.contractNumber}</div>
  <div style="font-size:12px;font-weight:700;color:#1e40af;font-family:monospace;margin-top:3px;">${isRtl ? "التاريخ:" : "Date:"} ${date}</div>
</div>
<div class="sec-title">${isRtl ? "أطراف العقد" : "CONTRACT PARTIES"}</div>
<div class="parties">
  <div class="party">
    <div class="party-lbl">${isRtl ? "الطرف الأول — مقدم الخدمة" : "First Party — Service Provider"}</div>
    <div class="party-name">Scapex</div>
    <div style="font-size:12px;color:#374151;margin-top:4px;">${isRtl ? "شركة سكابكس للاستشارات والخدمات الهندسية" : "Scapex Consulting & Engineering Services"}</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px;">${isRtl ? "الرقم الضريبي: 300123456700003" : "VAT: 300123456700003"}</div>
  </div>
  <div class="party">
    <div class="party-lbl">${isRtl ? "الطرف الثاني — العميل" : "Second Party — Client"}</div>
    <div class="party-name">${contract.clientName}</div>
    ${contract.clientContact ? `<div style="font-size:12px;color:#374151;margin-top:4px;">${contract.clientContact}</div>` : ""}
    ${contract.clientEmail ? `<div style="font-size:11px;color:#64748b;margin-top:2px;" dir="ltr">${contract.clientEmail}</div>` : ""}
  </div>
</div>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px;line-height:2;">
  <strong>${isRtl ? "موضوع العقد:" : "Subject:"}</strong> ${contract.projectName}<br/>
  <strong>${isRtl ? "القيمة الإجمالية:" : "Total Value:"}</strong> ${fmt(contract.total)} ${contract.currency} ${isRtl ? "(شاملاً ضريبة القيمة المضافة 15%)" : "(incl. 15% VAT)"}<br/>
  <strong>${isRtl ? "تاريخ البدء:" : "Start Date:"}</strong> ${contract.startDate} &nbsp;|&nbsp; <strong>${isRtl ? "تاريخ الانتهاء:" : "End Date:"}</strong> ${contract.endDate}<br/>
  <strong>${isRtl ? "مرجع عرض السعر:" : "Proposal Ref:"}</strong> ${contract.proposalNumber}
</div>
<div class="sec-title">${isRtl ? "بنود العقد" : "CONTRACT ARTICLES"}</div>
${clausesHtml}
<div class="sec-title" style="margin-top:20px;">${isRtl ? "جدول الدفعات" : "PAYMENT SCHEDULE"}</div>
<table>
<thead><tr>
  <th style="width:40px;">${isRtl ? "م" : "#"}</th>
  <th>${isRtl ? "المرحلة / الاستحقاق" : "Milestone / Due"}</th>
  <th style="width:80px;">${isRtl ? "النسبة" : "Percentage"}</th>
  <th style="width:140px;">${isRtl ? "المبلغ" : "Amount"}</th>
</tr></thead>
<tbody>${payRows}</tbody>
</table>
<div class="sig-grid">
  <div class="sig-box"><div class="sig-line"></div><div style="font-weight:700;font-size:13px;">${isRtl ? "الطرف الأول — Scapex" : "First Party — Scapex"}</div><div style="font-size:10px;color:#64748b;margin-top:4px;">${isRtl ? "التوقيع والختم والتاريخ" : "Signature, Stamp & Date"}</div></div>
  <div class="sig-box"><div class="sig-line"></div><div style="font-weight:700;font-size:13px;">${isRtl ? "الطرف الثاني —" : "Second Party —"} ${contract.clientName}</div><div style="font-size:10px;color:#64748b;margin-top:4px;">${isRtl ? "التوقيع والختم والتاريخ" : "Signature, Stamp & Date"}</div></div>
</div>
<div class="footer">${isRtl ? `هذا العقد مرتبط بعرض السعر ${contract.proposalNumber} | أُنشئ من منصة سكابكس الذكية` : `Contract linked to Proposal ${contract.proposalNumber} | Generated by Scapex Smart Platform`}</div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}
