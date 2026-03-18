// ─── Company Services & Activities Tree System ───────────────────────────────

export interface ServiceSpecialization {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface CompanyService {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  iconName?: string;
  specializations: ServiceSpecialization[];
}

export interface CompanyActivity {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  color: string;
  iconName: string;
  services: CompanyService[];
}

export interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
  vatNumber?: string;
  activities: CompanyActivity[];
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const COMPANIES_KEY = "scapex_companies";
const ACTIVE_COMPANY_KEY = "scapex_active_company";

// ─── Storage Functions ────────────────────────────────────────────────────────

export function getCompanies(): Company[] {
  try {
    const s = localStorage.getItem(COMPANIES_KEY);
    if (s) return JSON.parse(s) as Company[];
  } catch {}
  return getDefaultCompanies();
}

export function saveCompanies(companies: Company[]): void {
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
}

export function getActiveCompany(): Company {
  try {
    const id = localStorage.getItem(ACTIVE_COMPANY_KEY);
    const companies = getCompanies();
    if (id) {
      const found = companies.find((c) => c.id === id);
      if (found) return found;
    }
    return companies[0];
  } catch {
    return getDefaultCompanies()[0];
  }
}

export function setActiveCompany(id: string): void {
  localStorage.setItem(ACTIVE_COMPANY_KEY, id);
}

export function updateCompany(company: Company): void {
  const companies = getCompanies();
  const idx = companies.findIndex((c) => c.id === company.id);
  if (idx >= 0) companies[idx] = company;
  else companies.push(company);
  saveCompanies(companies);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Default Company Structure ───────────────────────────────────────────────

function getDefaultCompanies(): Company[] {
  return [
    {
      id: "scapex-main",
      nameAr: "شركة سكابكس للاستشارات والخدمات الهندسية",
      nameEn: "Scapex Consulting & Engineering Services",
      vatNumber: "300123456700003",
      activities: [
        {
          id: "eng-consulting",
          nameAr: "الاستشارات الهندسية",
          nameEn: "Engineering Consulting",
          descriptionAr: "تقديم الاستشارات الهندسية المتخصصة في جميع التخصصات",
          descriptionEn: "Providing specialized engineering consulting services",
          color: "blue",
          iconName: "HardHat",
          services: [
            {
              id: "design",
              nameAr: "التصميم الهندسي",
              nameEn: "Engineering Design",
              descriptionAr: "إعداد المخططات والتصاميم الهندسية",
              descriptionEn: "Preparation of engineering drawings and designs",
              iconName: "PenTool",
              specializations: [
                { id: "arch-design", nameAr: "التصميم المعماري", nameEn: "Architectural Design" },
                { id: "struct-design", nameAr: "التصميم الإنشائي", nameEn: "Structural Design" },
                { id: "mep-design", nameAr: "التصميم الكهروميكانيكي", nameEn: "MEP Design" },
                { id: "civil-design", nameAr: "التصميم المدني", nameEn: "Civil Design" },
              ],
            },
            {
              id: "supervision",
              nameAr: "الإشراف الهندسي",
              nameEn: "Engineering Supervision",
              descriptionAr: "الإشراف على تنفيذ المشاريع الهندسية",
              descriptionEn: "Supervision of engineering project execution",
              iconName: "Eye",
              specializations: [
                { id: "site-super", nameAr: "الإشراف الميداني", nameEn: "Site Supervision" },
                { id: "quality-control", nameAr: "مراقبة الجودة", nameEn: "Quality Control" },
                { id: "progress-monitor", nameAr: "متابعة التقدم", nameEn: "Progress Monitoring" },
              ],
            },
            {
              id: "surveying",
              nameAr: "الخدمات المساحية",
              nameEn: "Surveying Services",
              descriptionAr: "أعمال المساحة والتخطيط الطبوغرافي",
              descriptionEn: "Surveying and topographic planning services",
              iconName: "Map",
              specializations: [
                { id: "topo-survey", nameAr: "المساحة الطبوغرافية", nameEn: "Topographic Surveying" },
                { id: "cadastral", nameAr: "المساحة العقارية", nameEn: "Cadastral Surveying" },
                { id: "geodetic", nameAr: "المساحة الجيوديسية", nameEn: "Geodetic Surveying" },
              ],
            },
          ],
        },
        {
          id: "environmental",
          nameAr: "الخدمات البيئية",
          nameEn: "Environmental Services",
          descriptionAr: "تقييم الأثر البيئي والامتثال البيئي",
          descriptionEn: "Environmental impact assessment and compliance",
          color: "emerald",
          iconName: "Leaf",
          services: [
            {
              id: "eia",
              nameAr: "دراسات التأثير البيئي",
              nameEn: "Environmental Impact Studies",
              descriptionAr: "إعداد دراسات تقييم الأثر البيئي (EIA)",
              descriptionEn: "Environmental Impact Assessment (EIA) studies",
              specializations: [
                { id: "eia-category-a", nameAr: "دراسات الفئة أ", nameEn: "Category A Studies" },
                { id: "eia-category-b", nameAr: "دراسات الفئة ب", nameEn: "Category B Studies" },
              ],
            },
            {
              id: "waste-mgmt",
              nameAr: "إدارة النفايات",
              nameEn: "Waste Management",
              descriptionAr: "خطط وبرامج إدارة النفايات",
              descriptionEn: "Waste management plans and programs",
              specializations: [
                { id: "hazardous", nameAr: "النفايات الخطرة", nameEn: "Hazardous Waste" },
                { id: "industrial", nameAr: "النفايات الصناعية", nameEn: "Industrial Waste" },
                { id: "municipal", nameAr: "النفايات البلدية", nameEn: "Municipal Waste" },
              ],
            },
          ],
        },
        {
          id: "safety",
          nameAr: "خدمات السلامة والصحة المهنية",
          nameEn: "Safety & HSE Services",
          descriptionAr: "استشارات وخدمات السلامة المهنية",
          descriptionEn: "Occupational safety consulting and services",
          color: "amber",
          iconName: "ShieldAlert",
          services: [
            {
              id: "hse-consulting",
              nameAr: "استشارات السلامة",
              nameEn: "HSE Consulting",
              descriptionAr: "إعداد خطط السلامة وتقييم المخاطر",
              descriptionEn: "Safety plans and risk assessment",
              specializations: [
                { id: "hse-plan", nameAr: "خطط السلامة", nameEn: "HSE Plans" },
                { id: "risk-assess", nameAr: "تقييم المخاطر", nameEn: "Risk Assessment" },
                { id: "hazop", nameAr: "تحليل HAZOP", nameEn: "HAZOP Analysis" },
              ],
            },
            {
              id: "safety-field",
              nameAr: "الخدمات الميدانية للسلامة",
              nameEn: "Field Safety Services",
              descriptionAr: "توفير كوادر السلامة الميدانية",
              descriptionEn: "Field safety personnel provision",
              specializations: [
                { id: "safety-officer", nameAr: "مشرف سلامة", nameEn: "Safety Officer" },
                { id: "fire-watcher", nameAr: "مراقب حريق", nameEn: "Fire Watcher" },
                { id: "hse-coordinator", nameAr: "منسق السلامة", nameEn: "HSE Coordinator" },
              ],
            },
          ],
        },
        {
          id: "contracting",
          nameAr: "أعمال المقاولات",
          nameEn: "Contracting Works",
          descriptionAr: "تنفيذ المشاريع الإنشائية والمدنية",
          descriptionEn: "Construction and civil projects execution",
          color: "violet",
          iconName: "Building2",
          services: [
            {
              id: "civil-works",
              nameAr: "الأعمال المدنية",
              nameEn: "Civil Works",
              specializations: [
                { id: "excavation", nameAr: "أعمال الحفر والردم", nameEn: "Excavation & Backfill" },
                { id: "concrete", nameAr: "أعمال الخرسانة", nameEn: "Concrete Works" },
                { id: "masonry", nameAr: "أعمال البناء", nameEn: "Masonry Works" },
              ],
            },
            {
              id: "finishing",
              nameAr: "أعمال التشطيبات",
              nameEn: "Finishing Works",
              specializations: [
                { id: "plastering", nameAr: "البياض والدهانات", nameEn: "Plastering & Painting" },
                { id: "flooring", nameAr: "الأرضيات", nameEn: "Flooring" },
                { id: "ceilings", nameAr: "الأسقف المستعارة", nameEn: "False Ceilings" },
              ],
            },
          ],
        },
        {
          id: "metal-recycling",
          nameAr: "تدوير المعادن",
          nameEn: "Metal Recycling",
          descriptionAr: "استلام ومعالجة الخردة المعدنية",
          descriptionEn: "Metal scrap reception and processing",
          color: "teal",
          iconName: "RefreshCcw",
          services: [
            {
              id: "reception",
              nameAr: "الاستلام والفرز",
              nameEn: "Reception & Sorting",
              specializations: [
                { id: "ferrous", nameAr: "المعادن الحديدية", nameEn: "Ferrous Metals" },
                { id: "non-ferrous", nameAr: "المعادن غير الحديدية", nameEn: "Non-ferrous Metals" },
              ],
            },
          ],
        },
      ],
    },
  ];
}

// ─── Utility Functions ────────────────────────────────────────────────────────

export function findService(
  company: Company,
  activityId: string,
  serviceId: string
): CompanyService | null {
  const activity = company.activities.find((a) => a.id === activityId);
  if (!activity) return null;
  return activity.services.find((s) => s.id === serviceId) || null;
}

export function findSpecialization(
  company: Company,
  activityId: string,
  serviceId: string,
  specializationId: string
): ServiceSpecialization | null {
  const service = findService(company, activityId, serviceId);
  if (!service) return null;
  return service.specializations.find((sp) => sp.id === specializationId) || null;
}

export function getAllServicesFlat(company: Company): Array<{
  activity: CompanyActivity;
  service: CompanyService;
  specialization?: ServiceSpecialization;
}> {
  const result: Array<{
    activity: CompanyActivity;
    service: CompanyService;
    specialization?: ServiceSpecialization;
  }> = [];
  for (const activity of company.activities) {
    for (const service of activity.services) {
      if (service.specializations.length > 0) {
        for (const spec of service.specializations) {
          result.push({ activity, service, specialization: spec });
        }
      } else {
        result.push({ activity, service });
      }
    }
  }
  return result;
}
