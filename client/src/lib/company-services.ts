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
  logoUrl?: string;
  logoColor?: string;
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
      nameAr: "شركة سكيب للاستشارات والخدمات الهندسية",
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
          nameAr: "خدمات السلامة",
          nameEn: "Safety Services",
          descriptionAr: "تركيب وصيانة أنظمة الإنذار والحماية من الحريق، والخدمات الميدانية والاستشارات",
          descriptionEn: "Fire alarm & protection system installation & maintenance, field safety services, and consulting",
          color: "orange",
          iconName: "Flame",
          services: [
            {
              id: "fire-alarm-install",
              nameAr: "تركيب أنظمة الإنذار والحماية من الحريق",
              nameEn: "Fire Alarm & Protection System Installation",
              descriptionAr: "توريد وتركيب كاشفات الدخان، لوحات التحكم، الرشاشات، والطفايات وفق NFPA والدفاع المدني",
              descriptionEn: "Supply & installation of smoke detectors, control panels, sprinklers, and extinguishers per NFPA and Civil Defense",
              iconName: "Flame",
              specializations: [
                { id: "smoke-detectors", nameAr: "كاشفات الدخان والحرارة", nameEn: "Smoke & Heat Detectors" },
                { id: "sprinkler", nameAr: "شبكة الرشاشات الآلية", nameEn: "Automatic Sprinkler Network" },
                { id: "facp", nameAr: "لوحات التحكم المركزية FACP", nameEn: "Fire Alarm Control Panels (FACP)" },
                { id: "suppression", nameAr: "أنظمة الإطفاء الآلي", nameEn: "Automatic Suppression Systems" },
                { id: "extinguishers", nameAr: "طفايات الحريق", nameEn: "Fire Extinguishers" },
              ],
            },
            {
              id: "fire-maintenance",
              nameAr: "عقود صيانة أنظمة الإنذار والحريق",
              nameEn: "Fire Alarm & Protection Maintenance Contracts",
              descriptionAr: "صيانة دورية ووقائية وطارئة لأنظمة الإنذار والإطفاء مع التقارير الشهرية",
              descriptionEn: "Periodic, preventive, and emergency maintenance for alarm and suppression systems with monthly reports",
              iconName: "WrenchIcon",
              specializations: [
                { id: "quarterly-maint", nameAr: "صيانة ربع سنوية", nameEn: "Quarterly Maintenance" },
                { id: "emergency-maint", nameAr: "صيانة طارئة 24/7", nameEn: "24/7 Emergency Maintenance" },
                { id: "annual-contract", nameAr: "عقد صيانة سنوي", nameEn: "Annual Maintenance Contract" },
              ],
            },
            {
              id: "installation-reports",
              nameAr: "إصدار تقارير التركيب ورخص الدفاع المدني",
              nameEn: "Installation Reports & Civil Defense Licenses",
              descriptionAr: "إعداد التقارير الفنية ومحاضر الاختبار وملفات استصدار رخص الدفاع المدني",
              descriptionEn: "Technical reports, test records, and Civil Defense license application files",
              iconName: "FileCheck",
              specializations: [
                { id: "as-built", nameAr: "رسومات كما نُفِّذ (As-Built)", nameEn: "As-Built Drawings" },
                { id: "cd-license", nameAr: "رخصة الدفاع المدني", nameEn: "Civil Defense License" },
                { id: "test-records", nameAr: "محاضر اختبار الأجهزة", nameEn: "Device Test Records" },
              ],
            },
            {
              id: "fire-equipment",
              nameAr: "توريد معدات ومستلزمات الحماية من الحريق",
              nameEn: "Fire Protection Equipment Supply",
              descriptionAr: "توريد طفايات وبكرات الحريق ولوحات الإرشاد وجميع مستلزمات السلامة",
              descriptionEn: "Fire extinguishers, hose reels, safety signage, and all fire protection supplies",
              iconName: "Package",
              specializations: [
                { id: "extinguisher-supply", nameAr: "طفايات حريق CO2 وبودرة", nameEn: "CO2 & Powder Extinguishers" },
                { id: "hose-reel", nameAr: "بكرات وخراطيم الحريق", nameEn: "Fire Hose Reels" },
                { id: "fire-signs", nameAr: "لوحات إرشادية الحريق", nameEn: "Fire Safety Signs" },
              ],
            },
            {
              id: "emergency-training",
              nameAr: "تأهيل فرق الطوارئ والإخلاء",
              nameEn: "Emergency & Evacuation Team Training",
              descriptionAr: "تدريب وتأهيل فرق الطوارئ وإجراء تدريبات الإخلاء وبرامج الوعي بالسلامة",
              descriptionEn: "Training emergency and evacuation teams, conducting fire drills, and safety awareness programs",
              iconName: "Users",
              specializations: [
                { id: "fire-drill", nameAr: "تدريب إخلاء (Fire Drill)", nameEn: "Fire Evacuation Drill" },
                { id: "first-aid", nameAr: "إسعاف أولي للطوارئ", nameEn: "Emergency First Aid" },
                { id: "hse-awareness", nameAr: "توعية سلامة للموظفين", nameEn: "Employee HSE Awareness" },
              ],
            },
            {
              id: "hse-consulting",
              nameAr: "استشارات السلامة والصحة المهنية",
              nameEn: "HSE Consulting",
              descriptionAr: "إعداد خطط السلامة وتقييم المخاطر وتقارير HAZOP",
              descriptionEn: "Safety plans, risk assessment, and HAZOP analysis",
              specializations: [
                { id: "hse-plan", nameAr: "خطط السلامة HSE", nameEn: "HSE Plans" },
                { id: "risk-assess", nameAr: "تقييم المخاطر", nameEn: "Risk Assessment" },
                { id: "hazop", nameAr: "تحليل HAZOP", nameEn: "HAZOP Analysis" },
              ],
            },
          ],
        },
        {
          id: "contracting",
          nameAr: "أعمال المقاولات",
          nameEn: "Contracting Works",
          descriptionAr: "تنفيذ مشاريع البناء والبنية التحتية والطرق وصيانتها والإنسنة والمباني الحكومية والخاصة",
          descriptionEn: "Building construction, infrastructure, roads, maintenance, humanization projects, and government/private buildings",
          color: "violet",
          iconName: "Building2",
          services: [
            {
              id: "building-construction",
              nameAr: "إنشاء المباني السكنية والتجارية",
              nameEn: "Residential & Commercial Building Construction",
              descriptionAr: "تنفيذ مشاريع المباني من الخرسانة والبناء والتشطيبات بجميع الأحجام",
              descriptionEn: "Construction of all-size buildings in concrete, masonry, and finishing",
              iconName: "Building2",
              specializations: [
                { id: "villa", nameAr: "فلل وبيوت سكنية", nameEn: "Villas & Residential Homes" },
                { id: "commercial-bldg", nameAr: "مباني تجارية وإدارية", nameEn: "Commercial & Office Buildings" },
                { id: "compound", nameAr: "مجمعات سكنية", nameEn: "Residential Compounds" },
                { id: "industrial", nameAr: "مباني صناعية ومستودعات", nameEn: "Industrial Buildings & Warehouses" },
              ],
            },
            {
              id: "government-buildings",
              nameAr: "إنشاء المباني الحكومية",
              nameEn: "Government Building Construction",
              descriptionAr: "تنفيذ مشاريع المراكز الصحية والمدارس والمراكز الأمنية والدوائر الحكومية",
              descriptionEn: "Health centers, schools, security centers, and government offices construction",
              iconName: "Landmark",
              specializations: [
                { id: "health-center", nameAr: "مراكز صحية", nameEn: "Health Centers" },
                { id: "schools", nameAr: "مدارس ومعاهد", nameEn: "Schools & Institutes" },
                { id: "security-centers", nameAr: "مراكز أمنية وشرطية", nameEn: "Security & Police Centers" },
                { id: "gov-offices", nameAr: "دوائر وجهات حكومية", nameEn: "Government Offices" },
              ],
            },
            {
              id: "road-infrastructure",
              nameAr: "مشاريع الطرق والبنية التحتية",
              nameEn: "Roads & Infrastructure Projects",
              descriptionAr: "إنشاء وتطوير الطرق والأرصفة وشبكات الصرف والإنارة والمرافق العامة",
              descriptionEn: "Construction and development of roads, sidewalks, drainage, lighting, and utilities",
              iconName: "Construction",
              specializations: [
                { id: "asphalt-roads", nameAr: "طرق أسفلتية رئيسية وفرعية", nameEn: "Main & Secondary Asphalt Roads" },
                { id: "sidewalks", nameAr: "أرصفة وممرات المشاة", nameEn: "Sidewalks & Pedestrian Paths" },
                { id: "drainage", nameAr: "شبكات صرف الأمطار", nameEn: "Stormwater Drainage Networks" },
                { id: "street-lighting", nameAr: "إنارة الطرق والميادين", nameEn: "Road & Square Lighting" },
                { id: "water-networks", nameAr: "شبكات المياه والصرف الصحي", nameEn: "Water & Sewage Networks" },
              ],
            },
            {
              id: "road-maintenance",
              nameAr: "صيانة الطرق والأرصفة",
              nameEn: "Road & Pavement Maintenance",
              descriptionAr: "إصلاح وترقيع وتجديد الطرق والأرصفة المتهالكة وإعادة الدهانات",
              descriptionEn: "Repair, patching, and renewal of deteriorated roads and sidewalks, re-marking",
              iconName: "Hammer",
              specializations: [
                { id: "pothole-repair", nameAr: "ترقيع الحفر والتشققات", nameEn: "Pothole & Crack Repair" },
                { id: "asphalt-overlay", nameAr: "فرش أسفلت تصحيحي (Overlay)", nameEn: "Asphalt Overlay" },
                { id: "road-marking", nameAr: "دهان الخطوط والإشارات", nameEn: "Road Markings & Signs" },
              ],
            },
            {
              id: "road-humanization",
              nameAr: "مشاريع إنسنة الطرق والحدائق",
              nameEn: "Road Humanization & Parks Projects",
              descriptionAr: "تحويل الطرق والأماكن العامة لبيئات إنسانية بممرات وحدائق وجلسات وإضاءة بيئية",
              descriptionEn: "Transforming roads and public spaces into human-friendly environments with walkways, parks, seating, and ambient lighting",
              iconName: "Trees",
              specializations: [
                { id: "pedestrian-paths", nameAr: "ممرات مشاة بالبلاط الطبيعي", nameEn: "Natural Stone Pedestrian Walkways" },
                { id: "parks-landscaping", nameAr: "حدائق وتنسيق مواقع", nameEn: "Parks & Landscaping" },
                { id: "outdoor-furniture", nameAr: "جلسات ومقاعد خارجية", nameEn: "Outdoor Seating & Benches" },
                { id: "ambient-lighting", nameAr: "إضاءة بيئية وحدائقية", nameEn: "Ambient & Garden Lighting" },
                { id: "visual-elements", nameAr: "عناصر بصرية وهوية عمرانية", nameEn: "Visual Elements & Urban Identity" },
                { id: "irrigation", nameAr: "نظام ري مؤتمت", nameEn: "Automated Irrigation System" },
              ],
            },
            {
              id: "infrastructure-maintenance",
              nameAr: "صيانة البنية التحتية والمرافق",
              nameEn: "Infrastructure & Utilities Maintenance",
              descriptionAr: "صيانة شاملة لشبكات المياه والكهرباء والإنارة والصرف الصحي",
              descriptionEn: "Comprehensive maintenance of water, electricity, lighting, and sewage networks",
              iconName: "Settings",
              specializations: [
                { id: "water-maint", nameAr: "صيانة شبكات المياه", nameEn: "Water Network Maintenance" },
                { id: "elec-maint", nameAr: "صيانة الكهرباء والإنارة", nameEn: "Electrical & Lighting Maintenance" },
                { id: "sewage-maint", nameAr: "صيانة شبكات الصرف الصحي", nameEn: "Sewage Network Maintenance" },
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
