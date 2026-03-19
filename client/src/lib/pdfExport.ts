function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportTableToPDF(
  title: string,
  headers: string[],
  rows: string[][],
  isRtl: boolean = false,
): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

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
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding:40px; color:#111827; direction:${isRtl ? "rtl" : "ltr"}; }
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
