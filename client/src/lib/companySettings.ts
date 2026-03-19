export type TimeFormat = "24h" | "12h";
export type DateFormat = "gregorian" | "hijri" | "both";

export type FontFamily = "cairo" | "tajawal" | "ibm-plex" | "noto-kufi" | "rubik" | "inter" | "system";
export type FontSize = "small" | "medium" | "large";

export interface SystemSettings {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  fontFamily: FontFamily;
  fontSize: FontSize;
  proposalFooterAr: string;
  proposalFooterEn: string;
  invoiceFooterAr: string;
  invoiceFooterEn: string;
  letterHeaderAr: string;
  letterHeaderEn: string;
  letterFooterAr: string;
  letterFooterEn: string;
}

export const FONT_OPTIONS: { value: FontFamily; label: string; labelAr: string; family: string }[] = [
  { value: "cairo", label: "Cairo", labelAr: "Cairo — كايرو", family: "'Cairo', sans-serif" },
  { value: "tajawal", label: "Tajawal", labelAr: "Tajawal — تجول", family: "'Tajawal', sans-serif" },
  { value: "ibm-plex", label: "IBM Plex Sans Arabic", labelAr: "IBM Plex Arabic", family: "'IBM Plex Sans Arabic', sans-serif" },
  { value: "noto-kufi", label: "Noto Kufi Arabic", labelAr: "Noto Kufi — نوتو كوفي", family: "'Noto Kufi Arabic', sans-serif" },
  { value: "rubik", label: "Rubik", labelAr: "Rubik — روبيك", family: "'Rubik', sans-serif" },
  { value: "inter", label: "Inter", labelAr: "Inter — إنتر", family: "'Inter', sans-serif" },
  { value: "system", label: "System Default", labelAr: "خط النظام الافتراضي", family: "system-ui, -apple-system, sans-serif" },
];

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string; labelAr: string; css: string }[] = [
  { value: "small", label: "Small", labelAr: "صغير", css: "14px" },
  { value: "medium", label: "Medium", labelAr: "متوسط", css: "16px" },
  { value: "large", label: "Large", labelAr: "كبير", css: "18px" },
];

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  timeFormat: "12h",
  dateFormat: "both",
  fontFamily: "cairo",
  fontSize: "medium",
  proposalFooterAr: "نشكركم على ثقتكم بنا ونتطلع للعمل معكم",
  proposalFooterEn: "Thank you for your trust. We look forward to working with you.",
  invoiceFooterAr: "يرجى السداد خلال 30 يوماً من تاريخ الفاتورة",
  invoiceFooterEn: "Payment is due within 30 days from the invoice date.",
  letterHeaderAr: "",
  letterHeaderEn: "",
  letterFooterAr: "",
  letterFooterEn: "",
};

export const SYSTEM_SETTINGS_KEY = "scapex_system_settings";

export function getSystemSettings(): SystemSettings {
  try {
    const stored = localStorage.getItem(SYSTEM_SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SYSTEM_SETTINGS;
}

export function saveSystemSettings(data: SystemSettings): void {
  localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("scapex_system_settings_update"));
}

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
