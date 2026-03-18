import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

// ─── Country list ──────────────────────────────────────────────────────────────
export interface Country {
  code: string;   // dial code e.g. "+966"
  iso:  string;   // ISO-2 e.g. "SA"
  nameAr: string;
  nameEn: string;
  flag: string;   // emoji flag
}

export const COUNTRIES: Country[] = [
  { code: "+966", iso: "SA", nameAr: "السعودية",       nameEn: "Saudi Arabia",      flag: "🇸🇦" },
  { code: "+971", iso: "AE", nameAr: "الإمارات",       nameEn: "UAE",               flag: "🇦🇪" },
  { code: "+974", iso: "QA", nameAr: "قطر",            nameEn: "Qatar",             flag: "🇶🇦" },
  { code: "+965", iso: "KW", nameAr: "الكويت",         nameEn: "Kuwait",            flag: "🇰🇼" },
  { code: "+973", iso: "BH", nameAr: "البحرين",        nameEn: "Bahrain",           flag: "🇧🇭" },
  { code: "+968", iso: "OM", nameAr: "عُمان",          nameEn: "Oman",              flag: "🇴🇲" },
  { code: "+962", iso: "JO", nameAr: "الأردن",         nameEn: "Jordan",            flag: "🇯🇴" },
  { code: "+961", iso: "LB", nameAr: "لبنان",          nameEn: "Lebanon",           flag: "🇱🇧" },
  { code: "+963", iso: "SY", nameAr: "سوريا",          nameEn: "Syria",             flag: "🇸🇾" },
  { code: "+964", iso: "IQ", nameAr: "العراق",         nameEn: "Iraq",              flag: "🇮🇶" },
  { code: "+20",  iso: "EG", nameAr: "مصر",            nameEn: "Egypt",             flag: "🇪🇬" },
  { code: "+218", iso: "LY", nameAr: "ليبيا",          nameEn: "Libya",             flag: "🇱🇾" },
  { code: "+216", iso: "TN", nameAr: "تونس",           nameEn: "Tunisia",           flag: "🇹🇳" },
  { code: "+213", iso: "DZ", nameAr: "الجزائر",        nameEn: "Algeria",           flag: "🇩🇿" },
  { code: "+212", iso: "MA", nameAr: "المغرب",         nameEn: "Morocco",           flag: "🇲🇦" },
  { code: "+249", iso: "SD", nameAr: "السودان",        nameEn: "Sudan",             flag: "🇸🇩" },
  { code: "+967", iso: "YE", nameAr: "اليمن",          nameEn: "Yemen",             flag: "🇾🇪" },
  { code: "+92",  iso: "PK", nameAr: "باكستان",        nameEn: "Pakistan",          flag: "🇵🇰" },
  { code: "+91",  iso: "IN", nameAr: "الهند",          nameEn: "India",             flag: "🇮🇳" },
  { code: "+63",  iso: "PH", nameAr: "الفلبين",        nameEn: "Philippines",       flag: "🇵🇭" },
  { code: "+94",  iso: "LK", nameAr: "سريلانكا",       nameEn: "Sri Lanka",         flag: "🇱🇰" },
  { code: "+880", iso: "BD", nameAr: "بنغلاديش",       nameEn: "Bangladesh",        flag: "🇧🇩" },
  { code: "+256", iso: "UG", nameAr: "أوغندا",         nameEn: "Uganda",            flag: "🇺🇬" },
  { code: "+254", iso: "KE", nameAr: "كينيا",          nameEn: "Kenya",             flag: "🇰🇪" },
  { code: "+90",  iso: "TR", nameAr: "تركيا",          nameEn: "Turkey",            flag: "🇹🇷" },
  { code: "+98",  iso: "IR", nameAr: "إيران",          nameEn: "Iran",              flag: "🇮🇷" },
  { code: "+1",   iso: "US", nameAr: "الولايات المتحدة", nameEn: "USA",             flag: "🇺🇸" },
  { code: "+44",  iso: "GB", nameAr: "المملكة المتحدة", nameEn: "UK",              flag: "🇬🇧" },
  { code: "+33",  iso: "FR", nameAr: "فرنسا",          nameEn: "France",            flag: "🇫🇷" },
  { code: "+49",  iso: "DE", nameAr: "ألمانيا",        nameEn: "Germany",           flag: "🇩🇪" },
  { code: "+86",  iso: "CN", nameAr: "الصين",          nameEn: "China",             flag: "🇨🇳" },
  { code: "+81",  iso: "JP", nameAr: "اليابان",        nameEn: "Japan",             flag: "🇯🇵" },
  { code: "+82",  iso: "KR", nameAr: "كوريا الجنوبية", nameEn: "South Korea",      flag: "🇰🇷" },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Saudi Arabia

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Strip leading zeros from local number */
function stripLeadingZero(num: string): string {
  return num.replace(/^0+/, "");
}

/** Parse a full phone string "+966 512345678" → { country, local } */
export function parsePhone(full: string): { country: Country; local: string } {
  if (!full) return { country: DEFAULT_COUNTRY, local: "" };
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (full.startsWith(c.code)) {
      return { country: c, local: full.slice(c.code.length).trim() };
    }
  }
  return { country: DEFAULT_COUNTRY, local: full };
}

/** Build full phone from country + local */
export function buildPhone(country: Country, local: string): string {
  const n = stripLeadingZero(local.replace(/\s/g, ""));
  if (!n) return "";
  return `${country.code} ${n}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  value: string;                    // full phone string e.g. "+966 512345678"
  onChange: (full: string) => void; // called with full phone
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  size?: "sm" | "md";
  isRtl?: boolean;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  className,
  inputClassName,
  placeholder,
  size = "md",
  isRtl = false,
  disabled = false,
}: PhoneInputProps) {
  const parsed        = parsePhone(value);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [local, setLocal]     = useState<string>(parsed.local);
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    const p = parsePhone(value);
    setCountry(p.country);
    setLocal(p.local);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectCountry = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setSearch("");
    onChange(buildPhone(c, local));
  };

  const handleLocalChange = (val: string) => {
    // only digits and spaces
    const cleaned = val.replace(/[^\d\s]/g, "");
    setLocal(cleaned);
    onChange(buildPhone(country, cleaned));
  };

  const filtered = COUNTRIES.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nameAr.includes(search) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.includes(q)
    );
  });

  const h = size === "sm" ? "h-8 text-xs" : "h-9 text-sm";
  const ph = placeholder ?? (isRtl ? "5xxxxxxxx" : "5xxxxxxxx");

  return (
    <div className={cn("relative flex", className)} dir="ltr">
      {/* Country selector */}
      <div ref={dropRef} className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setOpen((p) => !p); setSearch(""); }}
          className={cn(
            "flex items-center gap-1 px-2 rounded-s-md border border-e-0 border-input bg-secondary/40",
            "hover:bg-secondary/70 transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
            "font-mono",
            h,
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="text-xs text-muted-foreground font-medium">{country.code}</span>
          <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute top-full start-0 z-50 mt-1 w-64 rounded-xl border border-border bg-background shadow-xl">
            {/* Search */}
            <div className="p-2 border-b border-border/60">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRtl ? "بحث..." : "Search..."}
                className="w-full h-7 px-2.5 rounded-md border border-input bg-secondary/30 text-xs outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                dir={isRtl ? "rtl" : "ltr"}
              />
            </div>
            {/* List */}
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">{isRtl ? "لا توجد نتائج" : "No results"}</p>
              )}
              {filtered.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-secondary/50 transition-colors",
                    c.iso === country.iso && "bg-primary/8 text-primary font-semibold",
                  )}
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 text-start">{isRtl ? c.nameAr : c.nameEn}</span>
                  <span className="font-mono text-muted-foreground shrink-0">{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Number input */}
      <input
        type="tel"
        dir="ltr"
        disabled={disabled}
        value={local}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder={ph}
        className={cn(
          "flex-1 rounded-e-md border border-input bg-background px-3 outline-none",
          "placeholder:text-muted-foreground font-mono",
          "focus:ring-1 focus:ring-ring focus:border-ring transition-colors",
          h,
          disabled && "opacity-50 cursor-not-allowed",
          inputClassName,
        )}
      />
    </div>
  );
}
