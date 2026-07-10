import { dbGetItem, dbSetItem } from "@/lib/dbStorage";
export type TimeFormat = "24h" | "12h";
export type DateFormat = "gregorian" | "hijri" | "both";

export type FontFamily = "cairo" | "tajawal" | "ibm-plex" | "noto-kufi" | "rubik" | "inter" | "system" | (string & {});
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
  brandLogo: string;
  brandName: string;
  brandSubtitleAr: string;
  brandSubtitleEn: string;
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

// ---- Custom uploaded fonts -------------------------------------------------
export interface CustomFont {
  id: string;          // e.g. "custom:1710000000000"
  name: string;        // display name (file name without extension)
  family: string;      // CSS font-family name, e.g. "ScapexCustom-1710000000000"
  format: string;      // woff2 | woff | truetype | opentype
  dataUrl: string;     // base64 data URL of the font file
}

export const CUSTOM_FONTS_KEY = "scapex_custom_fonts";
// Kept quota-safe: fonts are stored as base64 in localStorage (+33% overhead)
// alongside other scapex_* data, and origins typically cap localStorage at ~5MB.
export const MAX_FONT_FILE_BYTES = 2 * 1024 * 1024; // 2MB raw (~2.7MB base64)

export function getCustomFonts(): CustomFont[] {
  try {
    const stored = dbGetItem(CUSTOM_FONTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/** Throws Error("quota") when browser storage is full. */
export function addCustomFont(font: CustomFont): void {
  const fonts = getCustomFonts().filter((f) => f.id !== font.id);
  fonts.push(font);
  try {
    dbSetItem(CUSTOM_FONTS_KEY, JSON.stringify(fonts));
  } catch (e: any) {
    if (e?.name === "QuotaExceededError" || e?.code === 22) throw new Error("quota");
    throw e;
  }
  injectCustomFontFaces();
  window.dispatchEvent(new CustomEvent("scapex_system_settings_update"));
}

export function deleteCustomFont(id: string): void {
  const fonts = getCustomFonts().filter((f) => f.id !== id);
  dbSetItem(CUSTOM_FONTS_KEY, JSON.stringify(fonts));
  injectCustomFontFaces();
  window.dispatchEvent(new CustomEvent("scapex_system_settings_update"));
}

export function fontFormatFromFileName(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "woff2": return "woff2";
    case "woff": return "woff";
    case "ttf": return "truetype";
    case "otf": return "opentype";
    default: return null;
  }
}

/** Injects @font-face rules for all uploaded fonts into a dedicated <style> tag. */
export function injectCustomFontFaces(): void {
  const STYLE_ID = "scapex-custom-fonts";
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = getCustomFonts()
    .map((f) => `@font-face { font-family: '${f.family}'; src: url(${f.dataUrl}) format('${f.format}'); font-display: swap; }`)
    .join("\n");
}

/** Built-in + uploaded fonts, for pickers. */
export function getAllFontOptions(): { value: string; label: string; labelAr: string; family: string; custom?: boolean }[] {
  return [
    ...FONT_OPTIONS,
    ...getCustomFonts().map((f) => ({
      value: f.id,
      label: f.name,
      labelAr: f.name,
      family: `'${f.family}', 'Cairo', sans-serif`,
      custom: true,
    })),
  ];
}

/** Resolves a fontFamily setting value (built-in or custom) to a CSS family string. */
export function resolveFontCss(value: string): string {
  const opt = getAllFontOptions().find((f) => f.value === value);
  return opt ? opt.family : FONT_OPTIONS[0].family;
}

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
  brandLogo: "",
  brandName: "Scapex",
  brandSubtitleAr: "منصة إدارة الأعمال الذكية",
  brandSubtitleEn: "Smart Business Management Platform",
};

export const SYSTEM_SETTINGS_KEY = "scapex_system_settings";

// Per-company system settings are stored under a company-scoped key. The plain
// global key still represents the "active/primary" company that drives the live
// UI (sidebar brand, fonts, login screen) and existing document generation.
export function systemSettingsKey(companyId?: number | string | null): string {
  return companyId != null && companyId !== ""
    ? `${SYSTEM_SETTINGS_KEY}::${companyId}`
    : SYSTEM_SETTINGS_KEY;
}

export function getSystemSettings(companyId?: number | string | null): SystemSettings {
  try {
    if (companyId != null && companyId !== "") {
      const perCompany = dbGetItem(systemSettingsKey(companyId));
      if (perCompany) return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(perCompany) };
      // Migration fallback: inherit the global settings until this company is customised.
      const global = dbGetItem(SYSTEM_SETTINGS_KEY);
      if (global) return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(global) };
      return DEFAULT_SYSTEM_SETTINGS;
    }
    const stored = dbGetItem(SYSTEM_SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SYSTEM_SETTINGS;
}

export function saveSystemSettings(
  data: SystemSettings,
  opts?: { companyId?: number | string | null; alsoGlobal?: boolean },
): void {
  const companyId = opts?.companyId;
  if (companyId != null && companyId !== "") {
    dbSetItem(systemSettingsKey(companyId), JSON.stringify(data));
    // The primary company also drives the live UI, so mirror to the global key.
    if (opts?.alsoGlobal) dbSetItem(SYSTEM_SETTINGS_KEY, JSON.stringify(data));
  } else {
    dbSetItem(SYSTEM_SETTINGS_KEY, JSON.stringify(data));
  }
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
    const stored = dbGetItem(COMPANY_STORAGE_KEY);
    if (stored) return { ...DEFAULT_ABOUT, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_ABOUT;
}

export function saveAboutData(data: AboutSettings): void {
  dbSetItem(COMPANY_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("scapex_company_update"));
}
