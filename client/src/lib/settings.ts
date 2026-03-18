// ─── Company / App Settings ────────────────────────────────────────────────────

export interface CompanySettings {
  companyName: string;
  companyLogoUrl: string | null;  // base64 data URL or null
  companyLogoLight: string | null; // optional light-mode variant
}

const SETTINGS_KEY = "scapex_company_settings";

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Scapex",
  companyLogoUrl: null,
  companyLogoLight: null,
};

export function getCompanySettings(): CompanySettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function saveCompanySettings(settings: Partial<CompanySettings>): void {
  const current = getCompanySettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

// Reads a File as a base64 data URL
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
