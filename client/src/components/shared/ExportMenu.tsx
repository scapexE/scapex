import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, FileType, Printer, ChevronDown } from "lucide-react";
import { exportToCSV, exportToXLSX, exportToPDF, printTable, type ExportColumn } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

export interface ExportMenuProps<T> {
  title: string;
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  disabled?: boolean;
}

export function ExportMenu<T>({
  title, filename, columns, data,
  size = "sm", variant = "outline", className, disabled,
}: ExportMenuProps<T>) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const disabled2 = disabled || data.length === 0;
  const items: { id: string; labelAr: string; labelEn: string; icon: any; onClick: () => void; color: string }[] = [
    { id: "pdf", labelAr: "تصدير PDF", labelEn: "Export PDF", icon: FileType, color: "text-red-600 dark:text-red-400",
      onClick: () => { exportToPDF(title, columns, data, isRtl); setOpen(false); } },
    { id: "xlsx", labelAr: "تصدير Excel", labelEn: "Export Excel", icon: FileSpreadsheet, color: "text-emerald-600 dark:text-emerald-400",
      onClick: () => { exportToXLSX(filename, columns, data); setOpen(false); } },
    { id: "csv", labelAr: "تصدير CSV", labelEn: "Export CSV", icon: FileText, color: "text-blue-600 dark:text-blue-400",
      onClick: () => { exportToCSV(filename, columns, data); setOpen(false); } },
    { id: "print", labelAr: "طباعة", labelEn: "Print", icon: Printer, color: "text-foreground",
      onClick: () => { printTable(title, columns, data, isRtl); setOpen(false); } },
  ];

  return (
    <div ref={wrapRef} className={cn("relative inline-block", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled2}
        onClick={() => setOpen((v) => !v)}
        data-testid="button-export-menu"
        className="gap-1.5"
      >
        <Download className="w-4 h-4" />
        <span>{isRtl ? "تصدير" : "Export"}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-48 rounded-md border border-border bg-popover shadow-lg py-1",
            isRtl ? "right-0" : "left-0",
          )}
          data-testid="menu-export-options"
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={it.onClick}
              data-testid={`button-export-${it.id}`}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-start"
            >
              <it.icon className={cn("w-4 h-4", it.color)} />
              <span>{isRtl ? it.labelAr : it.labelEn}</span>
            </button>
          ))}
          {data.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
              {isRtl ? "لا توجد بيانات للتصدير" : "No data to export"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
