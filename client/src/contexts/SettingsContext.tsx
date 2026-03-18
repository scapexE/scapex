import { createContext, useContext, useState, type ReactNode } from "react";
import {
  type CompanySettings,
  getCompanySettings, saveCompanySettings,
} from "@/lib/settings";

interface SettingsContextValue {
  settings: CompanySettings;
  updateSettings: (patch: Partial<CompanySettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(() => getCompanySettings());

  const updateSettings = (patch: Partial<CompanySettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    saveCompanySettings(patch);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
