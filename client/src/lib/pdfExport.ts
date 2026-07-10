import { getAboutData, getSystemSettings, getPrintFontCss } from "@/lib/companySettings";
import { dbGetItem } from "@/lib/dbStorage";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function activeCompanyLogo(): string {
  try {
    const raw = dbGetItem("scapex_companies");
    if (raw) {
      const cos = JSON.parse(raw) as Array<{ id: string; logoUrl?: string }>;
      const aid = dbGetItem("scapex_active_company");
      const co = aid ? cos.find((c) => c.id === aid) : cos[0];
      return co?.logoUrl || "";
    }
  } catch {}
  return "";
}

/** Build the HTML of an official letter (خطاب رسمي) using the configured print design + letter header/footer texts. */
export function buildLetterHtml(opts: { subject?: string; body: string; recipient?: string; isRtl?: boolean }): string {
  const isRtl = opts.isRtl !== false;
  const sysCfg = getSystemSettings();
  const pd = sysCfg.printDesign;
  const about = getAboutData();
  const coNameAr = about.companyNameAr || "";
  const coNameEn = about.companyNameEn || "";
  const logoUrl = pd.headerLogo || activeCompanyLogo();
  const logoHtml = !pd.showLogo ? "" : logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" style="width:60px;height:60px;object-fit:contain;border-radius:8px" />`
    : "";
  const headerText = escapeHtml(isRtl ? (sysCfg.letterHeaderAr || "") : (sysCfg.letterHeaderEn || sysCfg.letterHeaderAr || ""));
  const footerText = escapeHtml(isRtl ? (sysCfg.letterFooterAr || "") : (sysCfg.letterFooterEn || sysCfg.letterFooterAr || ""));
  const headerNote = escapeHtml(isRtl ? pd.headerNoteAr : pd.headerNoteEn);
  const now = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const contactBits = [about.address, about.phone1, about.email1, about.website].filter(Boolean).map((v) => escapeHtml(String(v).split("\n").join(" — "))).join(" · ");
  const printFont = getPrintFontCss();
  return `<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}" lang="${isRtl ? "ar" : "en"}"><head><meta charset="UTF-8"><title>${escapeHtml(opts.subject || (isRtl ? "خطاب رسمي" : "Official Letter"))}</title>
  <style>
    ${printFont.css}
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${printFont.family}; padding:36px; color:#111827; font-size:14px; line-height:2; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .lh { display:flex; align-items:center; gap:14px; padding:16px; border-bottom:3px solid ${pd.accentColor}; margin-bottom:22px; background:${pd.headerBgColor}; ${pd.headerBgImage ? `background-image:url('${pd.headerBgImage}');background-size:cover;background-position:center;` : ""} ${pd.headerBgColor !== "#ffffff" || pd.headerBgImage ? "border-radius:8px;" : ""} color:${pd.headerTextColor}; }
    .lf { margin-top:36px; padding:12px 16px; border-top:2px solid ${pd.accentColor}; background:${pd.footerBgColor}; ${pd.footerBgImage ? `background-image:url('${pd.footerBgImage}');background-size:cover;background-position:center;` : ""} color:${pd.footerTextColor}; font-size:11px; text-align:center; border-radius:0 0 6px 6px; }
    @media print { .no-print { display:none !important; } }
  </style></head><body>
  <button class="no-print" onclick="window.print()" style="background:${pd.accentColor};color:white;border:none;padding:8px 20px;border-radius:6px;font-size:14px;cursor:pointer;margin-bottom:18px;">🖨️ ${isRtl ? "طباعة / حفظ PDF" : "Print / Save as PDF"}</button>
  <div class="lh">
    ${logoHtml}
    <div style="flex:1;text-align:${isRtl ? "right" : "left"}">
      <div style="display:inline-block;text-align:center">
        <div style="font-size:17px;font-weight:700">${escapeHtml(isRtl ? coNameAr : coNameEn)}</div>
        <div style="font-size:11px;opacity:0.8">${escapeHtml(isRtl ? coNameEn : coNameAr)}</div>
      </div>
      ${headerText ? `<div style="font-size:11px;opacity:0.9;margin-top:3px;white-space:pre-line">${headerText}</div>` : ""}
      ${headerNote ? `<div style="font-size:10px;opacity:0.85;margin-top:2px;white-space:pre-line">${headerNote}</div>` : ""}
    </div>
  </div>
  <div style="text-align:${isRtl ? "left" : "right"};font-size:12px;color:#6b7280;margin-bottom:14px">${isRtl ? "التاريخ" : "Date"}: ${now}</div>
  ${opts.recipient ? `<div style="font-weight:600;margin-bottom:10px">${escapeHtml(opts.recipient)}</div>` : ""}
  ${opts.subject ? `<div style="font-weight:700;font-size:15px;color:${pd.accentColor};margin-bottom:14px">${isRtl ? "الموضوع" : "Subject"}: ${escapeHtml(opts.subject)}</div>` : ""}
  <div style="white-space:pre-line;min-height:300px">${escapeHtml(opts.body)}</div>
  <div class="lf">
    ${footerText ? `<div style="white-space:pre-line;margin-bottom:4px">${footerText}</div>` : ""}
    ${contactBits ? `<div>${contactBits}</div>` : ""}
  </div>
  </body></html>`;
}

/** Print an official letter (خطاب رسمي) using the configured print design + letter header/footer texts. */
export function printLetter(opts: { subject?: string; body: string; recipient?: string; isRtl?: boolean }): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(buildLetterHtml(opts));
  w.document.close();
}

export function exportTableToPDF(
  title: string,
  headers: string[],
  rows: string[][],
  isRtl: boolean = false,
): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const tableFont = getPrintFontCss();
  const headerCells = headers.map((h) => `<th style="border:1px solid #d1d5db;padding:8px 12px;background:#f3f4f6;font-weight:600;text-align:${isRtl ? "right" : "left"};white-space:nowrap;">${escapeHtml(h)}</th>`).join("");
  const bodyRows = rows.map((row) =>
    `<tr>${row.map((cell) => `<td style="border:1px solid #d1d5db;padding:6px 12px;text-align:${isRtl ? "right" : "left"}">${escapeHtml(cell)}</td>`).join("")}</tr>`
  ).join("");

  const now = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="${isRtl ? "rtl" : "ltr"}" lang="${isRtl ? "ar" : "en"}">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        ${tableFont.css}
        body { font-family: ${tableFont.family}; padding:40px; color:#111827; direction:${isRtl ? "rtl" : "ltr"}; }
        @media print {
          body { padding:20px; }
          .no-print { display:none !important; }
        }
        .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #3b82f6; }
        .logo { font-size:24px; font-weight:bold; color:#3b82f6; }
        .meta { font-size:12px; color:#6b7280; }
        h1 { font-size:20px; margin-bottom:4px; }
        table { width:100%; border-collapse:collapse; font-size:13px; margin-top:16px; }
        tr:nth-child(even) td { background:#f9fafb; }
        .footer { margin-top:24px; padding-top:12px; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af; text-align:center; }
        .btn { background:#3b82f6; color:white; border:none; padding:8px 20px; border-radius:6px; font-size:14px; cursor:pointer; margin-bottom:20px; }
        .btn:hover { background:#2563eb; }
      </style>
    </head>
    <body>
      <button class="btn no-print" onclick="window.print()">🖨️ ${isRtl ? "طباعة / حفظ PDF" : "Print / Save as PDF"}</button>
      <div class="header">
        <div>
          <div class="logo">Scapex</div>
          <h1>${title}</h1>
        </div>
        <div class="meta">${now}</div>
      </div>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div class="footer">
        Scapex ERP — ${isRtl ? "تم إنشاء التقرير تلقائياً" : "Report generated automatically"} — ${now}
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function exportAuditToPDF(
  entries: { timestamp: string; userName: string; userRole: string; action: string; module: string; details: string; detailsAr: string }[],
  isRtl: boolean,
): void {
  const headers = isRtl
    ? ["التاريخ", "المستخدم", "الدور", "الإجراء", "الوحدة", "التفاصيل"]
    : ["Date", "User", "Role", "Action", "Module", "Details"];

  const rows = entries.map((e) => [
    new Date(e.timestamp).toLocaleString(isRtl ? "ar-SA" : "en-US"),
    e.userName,
    e.userRole,
    e.action,
    e.module,
    isRtl ? e.detailsAr : e.details,
  ]);

  exportTableToPDF(
    isRtl ? "تقرير سجل حركات المستخدمين" : "User Activity Log Report",
    headers,
    rows,
    isRtl,
  );
}
