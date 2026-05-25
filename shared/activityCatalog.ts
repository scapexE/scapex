export interface ActivityCatalogItem {
  id: string;
  nameAr: string;
  nameEn: string;
  color: string;
  icon: string;
  modules: string[];
}

export const ACTIVITY_CATALOG: ActivityCatalogItem[] = [
  {
    id: "act_eng_consulting",
    nameAr: "استشارات هندسية",
    nameEn: "Engineering Consultancy",
    color: "blue",
    icon: "HardHat",
    modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","approvals","government","smart_proposal","equipment","inventory","hr","payroll","attendance","hse","dms","mobile_app","bi"],
  },
  {
    id: "act_env_consulting",
    nameAr: "استشارات بيئية",
    nameEn: "Environmental Consultancy",
    color: "emerald",
    icon: "Leaf",
    modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","government","smart_proposal","hse","dms","hr","payroll","attendance","bi"],
  },
  {
    id: "act_safety_consulting",
    nameAr: "استشارات سلامة",
    nameEn: "Safety Consultancy",
    color: "amber",
    icon: "ShieldAlert",
    modules: ["dashboard","crm","sales","accounting","projects","government","smart_proposal","hse","dms","hr","payroll","attendance","bi"],
  },
  {
    id: "act_safety_services",
    nameAr: "خدمات سلامة",
    nameEn: "Safety Services",
    color: "orange",
    icon: "Flame",
    modules: ["dashboard","crm","sales","accounting","purchases","equipment","smart_proposal","hse","attendance","mobile_app","hr","payroll","dms"],
  },
  {
    id: "act_contracting",
    nameAr: "مقاولات",
    nameEn: "Contracting",
    color: "violet",
    icon: "Building2",
    modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","approvals","government","smart_proposal","equipment","inventory","hr","payroll","attendance","hse","dms","mobile_app","bi"],
  },
  {
    id: "act_metal_recycling",
    nameAr: "تدوير المعادن",
    nameEn: "Metal Recycling",
    color: "teal",
    icon: "RefreshCcw",
    modules: ["dashboard","crm","sales","accounting","purchases","inventory","equipment","smart_proposal","hr","payroll","attendance","hse","dms","bi"],
  },
];

export function getCatalogItem(id: string): ActivityCatalogItem | undefined {
  return ACTIVITY_CATALOG.find(c => c.id === id);
}

export function toCatalogId(activityId: string): string {
  return activityId.replace(/_c\d+$/, "");
}

export function toActivityId(catalogId: string, companyId: number): string {
  return `${catalogId}_c${companyId}`;
}
