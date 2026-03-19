export interface CompanyBranch {
  id: string;
  nameAr: string;
  nameEn: string;
  city: string;
  address: string;
  phone: string;
  manager: string;
  isActive: boolean;
}

export interface AboutSettings {
  companyNameAr: string;
  companyNameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  address: string;
  addressEn: string;
  phone1: string;
  phone2: string;
  email1: string;
  email2: string;
  workingHoursAr: string;
  workingHoursEn: string;
  twitterHandle: string;
  linkedinUrl: string;
  whatsapp: string;
  website: string;
  crNumber: string;
  vatNumber: string;
  branches: CompanyBranch[];
}

export const DEFAULT_ABOUT: AboutSettings = {
  companyNameAr: "شركة سكيبكس للحلول التقنية",
  companyNameEn: "Scapex Technology Solutions",
  descriptionAr: "سكيبكس هو نظام متكامل لإدارة موارد المؤسسات (ERP) مصمم خصيصاً للسوق السعودي. يوفر النظام 22 وحدة عمل تغطي جميع احتياجات الشركات من إدارة العملاء والمبيعات والمشتريات والمحاسبة والموارد البشرية والمشاريع الهندسية والسلامة المهنية وغيرها. يتميز بدعم كامل للغتين العربية والإنجليزية مع واجهة حديثة ونظام صلاحيات متقدم.",
  descriptionEn: "Scapex is a comprehensive Enterprise Resource Planning (ERP) system designed specifically for the Saudi market. The platform provides 22 business modules covering all enterprise needs including CRM, Sales, Purchasing, Accounting, HR, Engineering Projects, HSE, and more. It features full Arabic/English bilingual support with a modern interface and advanced role-based access control.",
  address: "المملكة العربية السعودية، الرياض\nطريق الملك فهد، برج المملكة\nالطابق 25، مكتب 2510",
  addressEn: "Kingdom of Saudi Arabia, Riyadh\nKing Fahd Road, Kingdom Tower\nFloor 25, Office 2510",
  phone1: "+966 11 234 5678",
  phone2: "+966 50 123 4567",
  email1: "info@scapex.sa",
  email2: "support@scapex.sa",
  workingHoursAr: "الأحد – الخميس: 8:00 ص – 5:00 م",
  workingHoursEn: "Sun – Thu: 8:00 AM – 5:00 PM",
  twitterHandle: "@scapex_sa",
  linkedinUrl: "https://linkedin.com/company/scapex",
  whatsapp: "+966501234567",
  website: "www.scapex.sa",
  crNumber: "1010234567",
  vatNumber: "300012345600003",
  branches: [],
};

export const COMPANY_STORAGE_KEY = "scapex_about_settings";

export function getAboutData(): AboutSettings {
  try {
    const stored = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (stored) return { ...DEFAULT_ABOUT, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_ABOUT;
}

export function saveAboutData(data: AboutSettings): void {
  localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("scapex_company_update"));
}
