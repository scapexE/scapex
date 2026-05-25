import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, Loader2, TrendingUp, TrendingDown, Scale, ArrowRight, BarChart3, FileText, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Invoice {
  id: number; invoiceNumber: string; type: string; clientName: string | null;
  issueDate: string; dueDate: string | null;
  subtotal: string; vatAmount: string; total: string; paidAmount: string;
  status: string;
}
interface Payment {
  id: number; paymentNumber: string; type: string;
  amount: string; date: string; method: string;
}
interface Account {
  id: number; code: string; nameAr: string; nameEn: string | null;
  type: string; parentId: number | null; balance: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SAR = (v: number) => `${fmt(v)} ر.س`;
const today = () => new Date().toISOString().slice(0, 10);
const firstOfYear = () => `${new Date().getFullYear()}-01-01`;
const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; };
const firstOfQuarter = () => {
  const d = new Date(); const q = Math.floor(d.getMonth() / 3);
  return `${d.getFullYear()}-${String(q*3+1).padStart(2,"0")}-01`;
};

function inRange(dateStr: string | null, from: string, to: string) {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

// ─── Print helper ─────────────────────────────────────────────────────────────
function printReport(title: string, html: string, isRtl: boolean) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html dir="${isRtl?"rtl":"ltr"}"><head><meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;margin:0;padding:24px;color:#1a1a1a}
    h1{font-size:18px;font-weight:900;color:#1e40af;margin:0 0 4px}
    .sub{color:#64748b;font-size:10px;margin-bottom:16px}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #1e40af;padding-bottom:12px;margin-bottom:20px;align-items:flex-end}
    .logo{font-size:20px;font-weight:900;color:#1e40af}
    table{width:100%;border-collapse:collapse;margin:8px 0}
    th{background:#1e40af;color:#fff;padding:7px 10px;text-align:${isRtl?"right":"left"};font-size:10px}
    td{padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px}
    tr:nth-child(even){background:#f8fafc}
    .section-header td{background:#e0e7ff;font-weight:700;color:#1e3a8a;font-size:11px;padding:8px 10px}
    .total-row td{background:#dbeafe;font-weight:700;border-top:2px solid #1e40af}
    .grand-total td{background:#1e40af;color:#fff;font-weight:900;font-size:12px}
    .positive{color:#166534}.negative{color:#dc2626}
    .footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:8px;text-align:center;color:#94a3b8;font-size:9px}
    @media print{body{padding:10px}}
  </style></head><body>
  <div class="header"><div class="logo">Scapex</div><div style="text-align:${isRtl?"left":"right"}"><h1>${title}</h1><div class="sub">${isRtl?"تاريخ الطباعة:":"Printed:"} ${new Date().toLocaleDateString(isRtl?"ar-SA":"en-GB")}</div></div></div>
  ${html}
  <div class="footer">شركة سكابكس للمقاولات · Scapex Contracting Co. · ${isRtl?"المعايير المحاسبية السعودية SOCPA":"Saudi SOCPA Standards"}</div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─── Period Selector ──────────────────────────────────────────────────────────
function PeriodSelector({ from, to, onChange, isRtl }: { from: string; to: string; onChange: (f: string, t: string) => void; isRtl: boolean }) {
  const presets = [
    { label: isRtl ? "هذا الشهر" : "This Month", from: firstOfMonth(), to: today() },
    { label: isRtl ? "هذا الربع" : "This Quarter", from: firstOfQuarter(), to: today() },
    { label: isRtl ? "هذا العام" : "This Year", from: firstOfYear(), to: today() },
    { label: isRtl ? "العام الماضي" : "Last Year", from: `${new Date().getFullYear()-1}-01-01`, to: `${new Date().getFullYear()-1}-12-31` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map(p => (
        <Button key={p.label} size="sm" variant={from === p.from && to === p.to ? "default" : "outline"}
          className="h-8 text-xs" onClick={() => onChange(p.from, p.to)}>{p.label}</Button>
      ))}
      <div className="flex items-center gap-1.5 ms-2">
        <Input type="date" className="h-8 text-xs w-34" value={from} onChange={e => onChange(e.target.value, to)} />
        <span className="text-muted-foreground text-xs">{isRtl ? "إلى" : "to"}</span>
        <Input type="date" className="h-8 text-xs w-34" value={to} onChange={e => onChange(from, e.target.value)} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function FinancialReportsTab() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(firstOfYear());
  const [to, setTo] = useState(today());

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, pmtRes, coaRes] = await Promise.all([
        fetch("/api/invoices"), fetch("/api/payments"), fetch("/api/chart-of-accounts"),
      ]);
      const [invData, pmtData, coaData] = await Promise.all([invRes.json(), pmtRes.json(), coaRes.json()]);
      setInvoices(Array.isArray(invData) ? invData : []);
      setPayments(Array.isArray(pmtData) ? pmtData : []);
      setAccounts(Array.isArray(coaData) ? coaData : []);
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const setPeriod = (f: string, t: string) => { setFrom(f); setTo(t); };

  // ── Filtered data ──────────────────────────────────────────────────────────
  const periodInvoices = useMemo(() =>
    invoices.filter(i => inRange(i.issueDate, from, to)), [invoices, from, to]);
  const periodPayments = useMemo(() =>
    payments.filter(p => inRange(p.date, from, to)), [payments, from, to]);

  // ── Income Statement calculations ──────────────────────────────────────────
  const incomeData = useMemo(() => {
    const salesInv = periodInvoices.filter(i => i.type === "sales");
    const purchaseInv = periodInvoices.filter(i => i.type === "purchase");

    const grossRevenue = salesInv.reduce((s, i) => s + parseFloat(i.subtotal || "0"), 0);
    const vatCollected = salesInv.reduce((s, i) => s + parseFloat(i.vatAmount || "0"), 0);
    const costOfSales = purchaseInv.reduce((s, i) => s + parseFloat(i.subtotal || "0"), 0);
    const grossProfit = grossRevenue - costOfSales;

    // Salary expenses from accounts with balance
    const salaryAcc = accounts.filter(a => a.code.startsWith("52") && parseFloat(a.balance || "0") > 0);
    const salaryExp = salaryAcc.reduce((s, a) => s + parseFloat(a.balance || "0"), 0);
    const adminAcc = accounts.filter(a => a.code.startsWith("53") && parseFloat(a.balance || "0") > 0);
    const adminExp = adminAcc.reduce((s, a) => s + parseFloat(a.balance || "0"), 0);

    const totalOpEx = salaryExp + adminExp;
    const operatingProfit = grossProfit - totalOpEx;

    // Other revenue (interest etc)
    const otherRevAcc = accounts.filter(a => a.code.startsWith("43") && parseFloat(a.balance || "0") > 0);
    const otherRev = otherRevAcc.reduce((s, a) => s + parseFloat(a.balance || "0"), 0);
    const financeExp = accounts.filter(a => a.code.startsWith("54") && parseFloat(a.balance || "0") > 0)
      .reduce((s, a) => s + parseFloat(a.balance || "0"), 0);

    const netIncome = operatingProfit + otherRev - financeExp;

    return { grossRevenue, vatCollected, costOfSales, grossProfit, salaryExp, adminExp, totalOpEx, operatingProfit, otherRev, financeExp, netIncome, salesCount: salesInv.length, purchaseCount: purchaseInv.length };
  }, [periodInvoices, accounts]);

  // ── Balance Sheet ──────────────────────────────────────────────────────────
  const balanceData = useMemo(() => {
    const coaByType = (type: string) => accounts.filter(a => a.type === type && a.parentId !== null && !accounts.some(b => b.parentId === a.id));
    const sum = (accs: Account[]) => accs.reduce((s, a) => s + parseFloat(a.balance || "0"), 0);

    const assetAccs = coaByType("asset");
    const liabAccs = coaByType("liability");
    const equityAccs = coaByType("equity");

    // Add receivables from invoices
    const outstandingReceivables = invoices.filter(i => i.type === "sales" && ["sent","partial"].includes(i.status))
      .reduce((s, i) => s + (parseFloat(i.total || "0") - parseFloat(i.paidAmount || "0")), 0);

    const totalAssets = sum(assetAccs) + outstandingReceivables;
    const totalLiab = sum(liabAccs);
    const totalEquity = sum(equityAccs);
    const retainedEarnings = totalAssets - totalLiab - totalEquity;

    return { assetAccs, liabAccs, equityAccs, totalAssets, totalLiab, totalEquity, retainedEarnings, outstandingReceivables };
  }, [accounts, invoices]);

  // ── Cash Flow ──────────────────────────────────────────────────────────────
  const cashData = useMemo(() => {
    const received = periodPayments.filter(p => p.type === "received").reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
    const paid = periodPayments.filter(p => p.type === "paid").reduce((s, p) => s + parseFloat(p.amount || "0"), 0);

    // Operating: cash from customers (paid invoices)
    const paidInvoices = periodInvoices.filter(i => ["paid","partial"].includes(i.status));
    const cashFromCustomers = paidInvoices.reduce((s, i) => s + parseFloat(i.paidAmount || "0"), 0) + received;

    const netCash = cashFromCustomers - paid;

    // By method
    const byMethod: Record<string, number> = {};
    periodPayments.filter(p => p.type === "received").forEach(p => {
      byMethod[p.method] = (byMethod[p.method] || 0) + parseFloat(p.amount || "0");
    });

    return { received, paid, cashFromCustomers, netCash, byMethod, count: periodPayments.length };
  }, [periodPayments, periodInvoices]);

  // ── AR Aging ───────────────────────────────────────────────────────────────
  const agingData = useMemo(() => {
    const now = new Date();
    const outstanding = invoices.filter(i => i.type === "sales" && ["sent","partial"].includes(i.status));
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const items: { inv: Invoice; overdue: number; balance: number }[] = [];

    for (const inv of outstanding) {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.issueDate);
      const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
      const balance = parseFloat(inv.total || "0") - parseFloat(inv.paidAmount || "0");
      items.push({ inv, overdue: diff, balance });
      if (diff <= 0) buckets.current += balance;
      else if (diff <= 30) buckets.days30 += balance;
      else if (diff <= 60) buckets.days60 += balance;
      else if (diff <= 90) buckets.days90 += balance;
      else buckets.over90 += balance;
    }
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    return { buckets, items, total };
  }, [invoices]);

  // ══════════════════════════════════════════════════════════════════════════
  // PRINT FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════
  const printIncomeStatement = () => {
    const d = incomeData;
    const row = (label: string, val: number, cls = "") =>
      `<tr${cls ? ` class="${cls}"` : ""}><td>${label}</td><td style="text-align:${isRtl?"left":"right"};font-weight:600">${SAR(val)}</td></tr>`;
    const html = `<table>
      <thead><tr><th>${isRtl?"البيان":"Item"}</th><th style="text-align:${isRtl?"left":"right"}">${isRtl?"المبلغ":"Amount"}</th></tr></thead>
      <tbody>
      <tr class="section-header"><td colspan="2">${isRtl?"الإيرادات":"Revenue"}</td></tr>
      ${row(isRtl?"إيرادات المبيعات":"Sales Revenue", d.grossRevenue)}
      ${row(isRtl?"ضريبة القيمة المضافة المحصّلة":"VAT Collected", d.vatCollected)}
      ${row(isRtl?"تكلفة المبيعات (مشتريات)":"Cost of Sales", -d.costOfSales)}
      <tr class="total-row"><td>${isRtl?"مجمل الربح":"Gross Profit"}</td><td style="text-align:${isRtl?"left":"right"};font-weight:900">${SAR(d.grossProfit)}</td></tr>
      <tr class="section-header"><td colspan="2">${isRtl?"مصروفات التشغيل":"Operating Expenses"}</td></tr>
      ${row(isRtl?"رواتب وبدلات":"Salaries & Allowances", -d.salaryExp)}
      ${row(isRtl?"مصروفات إدارية":"Admin Expenses", -d.adminExp)}
      <tr class="total-row"><td>${isRtl?"الربح التشغيلي":"Operating Profit"}</td><td style="text-align:${isRtl?"left":"right"};font-weight:900">${SAR(d.operatingProfit)}</td></tr>
      ${row(isRtl?"إيرادات أخرى":"Other Revenue", d.otherRev)}
      ${row(isRtl?"مصروفات مالية":"Finance Expenses", -d.financeExp)}
      <tr class="grand-total"><td>${isRtl?"صافي الربح / (الخسارة)":"Net Income / (Loss)"}</td><td style="text-align:${isRtl?"left":"right"}">${SAR(d.netIncome)}</td></tr>
      </tbody></table>`;
    printReport(isRtl ? "قائمة الدخل" : "Income Statement", html, isRtl);
  };

  const printBalanceSheet = () => {
    const d = balanceData;
    const row = (code: string, name: string, val: number) =>
      `<tr><td style="color:#64748b;font-size:10px">${code}</td><td>${name}</td><td style="text-align:${isRtl?"left":"right"};font-weight:600">${SAR(val)}</td></tr>`;
    const html = `<table>
      <thead><tr><th>${isRtl?"الرمز":"Code"}</th><th>${isRtl?"الحساب":"Account"}</th><th style="text-align:${isRtl?"left":"right"}">${isRtl?"الرصيد":"Balance"}</th></tr></thead>
      <tbody>
      <tr class="section-header"><td colspan="3">${isRtl?"الأصول":"ASSETS"}</td></tr>
      ${d.assetAccs.map(a => row(a.code, isRtl ? a.nameAr : (a.nameEn||a.nameAr), parseFloat(a.balance||"0"))).join("")}
      ${d.outstandingReceivables > 0 ? row("1201", isRtl?"ذمم مدينة — عملاء":"Accounts Receivable", d.outstandingReceivables) : ""}
      <tr class="total-row"><td colspan="2">${isRtl?"إجمالي الأصول":"Total Assets"}</td><td style="text-align:${isRtl?"left":"right"}">${SAR(d.totalAssets)}</td></tr>
      <tr class="section-header"><td colspan="3">${isRtl?"المطلوبات":"LIABILITIES"}</td></tr>
      ${d.liabAccs.map(a => row(a.code, isRtl ? a.nameAr : (a.nameEn||a.nameAr), parseFloat(a.balance||"0"))).join("")}
      <tr class="total-row"><td colspan="2">${isRtl?"إجمالي المطلوبات":"Total Liabilities"}</td><td style="text-align:${isRtl?"left":"right"}">${SAR(d.totalLiab)}</td></tr>
      <tr class="section-header"><td colspan="3">${isRtl?"حقوق الملكية":"EQUITY"}</td></tr>
      ${d.equityAccs.map(a => row(a.code, isRtl ? a.nameAr : (a.nameEn||a.nameAr), parseFloat(a.balance||"0"))).join("")}
      ${d.retainedEarnings !== 0 ? row("3201", isRtl?"أرباح/خسائر مرحّلة":"Retained Earnings", d.retainedEarnings) : ""}
      <tr class="total-row"><td colspan="2">${isRtl?"إجمالي حقوق الملكية":"Total Equity"}</td><td style="text-align:${isRtl?"left":"right"}">${SAR(d.totalEquity + d.retainedEarnings)}</td></tr>
      <tr class="grand-total"><td colspan="2">${isRtl?"إجمالي المطلوبات + حقوق الملكية":"Total Liabilities + Equity"}</td><td style="text-align:${isRtl?"left":"right"}">${SAR(d.totalLiab + d.totalEquity + d.retainedEarnings)}</td></tr>
      </tbody></table>`;
    printReport(isRtl ? "الميزانية العمومية" : "Balance Sheet", html, isRtl);
  };

  const printTrialBalance = () => {
    const leafAccs = accounts.filter(a => !accounts.some(b => b.parentId === a.id) && parseFloat(a.balance || "0") !== 0);
    const html = `<table>
      <thead><tr><th>${isRtl?"الرمز":"Code"}</th><th>${isRtl?"اسم الحساب":"Account"}</th><th>${isRtl?"النوع":"Type"}</th><th style="text-align:${isRtl?"left":"right"}">${isRtl?"مدين":"Debit"}</th><th style="text-align:${isRtl?"left":"right"}">${isRtl?"دائن":"Credit"}</th></tr></thead>
      <tbody>
      ${leafAccs.map(a => {
        const bal = parseFloat(a.balance || "0");
        const isDebit = ["asset","expense"].includes(a.type);
        return `<tr><td style="font-family:monospace;font-size:10px">${a.code}</td><td>${isRtl?a.nameAr:(a.nameEn||a.nameAr)}</td><td>${a.type}</td><td style="text-align:${isRtl?"left":"right"};color:#166534">${isDebit && bal > 0 ? SAR(bal) : "—"}</td><td style="text-align:${isRtl?"left":"right"};color:#dc2626">${!isDebit && bal > 0 ? SAR(bal) : "—"}</td></tr>`;
      }).join("")}
      <tr class="grand-total"><td colspan="3">${isRtl?"الإجمالي":"Total"}</td>
      <td style="text-align:${isRtl?"left":"right"}">${SAR(leafAccs.filter(a=>["asset","expense"].includes(a.type)).reduce((s,a)=>s+parseFloat(a.balance||"0"),0))}</td>
      <td style="text-align:${isRtl?"left":"right"}">${SAR(leafAccs.filter(a=>["liability","equity","revenue"].includes(a.type)).reduce((s,a)=>s+parseFloat(a.balance||"0"),0))}</td>
      </tr></tbody></table>`;
    printReport(isRtl ? "ميزان المراجعة" : "Trial Balance", html, isRtl);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ══════════════════════════════════════════════════════════════════════════
  const StatBox = ({ label, value, sub, color = "", icon: Icon }: any) => (
    <div className={cn("rounded-xl p-4 border border-border/40", color)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground opacity-50" />}
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  const Section = ({ title, children, onPrint, isRtl: r }: any) => (
    <Card className="border-border/50">
      <CardHeader className="py-3 px-4 flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={onPrint}>
          <Printer className="w-3 h-3" />{r ? "طباعة" : "Print"}
        </Button>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );

  const IncRow = ({ label, value, bold = false, indent = false, highlight = "", sign = 1 }: any) => {
    const v = value * sign;
    return (
      <div className={cn("flex justify-between items-center px-4 py-2 border-b border-border/30",
        bold && "bg-secondary/30 font-semibold",
        highlight === "profit" && "bg-emerald-50 dark:bg-emerald-950/20 font-bold",
        highlight === "loss" && "bg-red-50 dark:bg-red-950/20 font-bold",
        highlight === "total" && "bg-primary/5 font-bold text-base",
        indent && "ps-8",
      )}>
        <span className={cn("text-sm", bold && "font-semibold")}>{label}</span>
        <span className={cn("text-sm font-medium tabular-nums",
          v < 0 ? "text-red-600" : v > 0 && highlight ? "text-emerald-600" : "")}>
          {v < 0 ? `(${SAR(Math.abs(v))})` : SAR(v)}
        </span>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const d = incomeData;
  const b = balanceData;
  const c = cashData;
  const a = agingData;

  return (
    <div className="space-y-4">
      {/* Period + Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PeriodSelector from={from} to={to} onChange={setPeriod} isRtl={isRtl} />
        <Button variant="outline" size="sm" className="h-8 gap-1.5 self-start" onClick={fetchAll}>
          <RefreshCw className="w-3.5 h-3.5" />{isRtl ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox label={isRtl ? "إجمالي الإيرادات" : "Total Revenue"} value={SAR(d.grossRevenue)}
          sub={`${d.salesCount} ${isRtl ? "فاتورة" : "invoices"}`} color="bg-emerald-50/50 dark:bg-emerald-950/20" icon={TrendingUp} />
        <StatBox label={isRtl ? "صافي الربح" : "Net Income"} value={SAR(d.netIncome)}
          sub={d.grossRevenue > 0 ? `${((d.netIncome/d.grossRevenue)*100).toFixed(1)}% ${isRtl?"هامش":"margin"}` : "—"}
          color={d.netIncome >= 0 ? "bg-blue-50/50 dark:bg-blue-950/20" : "bg-red-50/50 dark:bg-red-950/20"} icon={BarChart3} />
        <StatBox label={isRtl ? "التدفق النقدي الصافي" : "Net Cash Flow"} value={SAR(c.netCash)}
          color="bg-purple-50/50 dark:bg-purple-950/20" icon={ArrowRight} />
        <StatBox label={isRtl ? "الذمم المدينة المستحقة" : "Outstanding AR"} value={SAR(a.total)}
          sub={`${a.items.length} ${isRtl ? "فاتورة" : "invoices"}`} color="bg-amber-50/50 dark:bg-amber-950/20" icon={Clock} />
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="income">
        <TabsList className="bg-secondary/50 flex-wrap h-auto">
          <TabsTrigger value="income" className="gap-1"><TrendingUp className="w-3.5 h-3.5" />{isRtl ? "قائمة الدخل" : "Income Statement"}</TabsTrigger>
          <TabsTrigger value="balance" className="gap-1"><Scale className="w-3.5 h-3.5" />{isRtl ? "الميزانية" : "Balance Sheet"}</TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-1"><ArrowRight className="w-3.5 h-3.5" />{isRtl ? "التدفق النقدي" : "Cash Flow"}</TabsTrigger>
          <TabsTrigger value="aging" className="gap-1"><Clock className="w-3.5 h-3.5" />{isRtl ? "تحليل الذمم" : "AR Aging"}</TabsTrigger>
          <TabsTrigger value="trial" className="gap-1"><FileText className="w-3.5 h-3.5" />{isRtl ? "ميزان المراجعة" : "Trial Balance"}</TabsTrigger>
        </TabsList>

        {/* ── Income Statement ──────────────────────────────────────────────── */}
        <TabsContent value="income" className="mt-4">
          <Section title={isRtl ? `قائمة الدخل — ${from} إلى ${to}` : `Income Statement — ${from} to ${to}`} onPrint={printIncomeStatement} isRtl={isRtl}>
            <div className="divide-y divide-border/30">
              <div className="px-4 py-2 bg-secondary/20 text-xs font-bold text-muted-foreground uppercase tracking-wide">{isRtl ? "الإيرادات" : "Revenue"}</div>
              <IncRow label={isRtl ? "إيرادات المبيعات" : "Sales Revenue"} value={d.grossRevenue} indent />
              <IncRow label={isRtl ? "ضريبة القيمة المضافة المحصّلة (15%)" : "VAT Collected (15%)"} value={d.vatCollected} indent />
              <div className="px-4 py-2 bg-secondary/20 text-xs font-bold text-muted-foreground uppercase tracking-wide">{isRtl ? "تكلفة المبيعات" : "Cost of Sales"}</div>
              <IncRow label={isRtl ? `فواتير المشتريات (${d.purchaseCount})` : `Purchase Invoices (${d.purchaseCount})`} value={d.costOfSales} sign={-1} indent />
              <IncRow label={isRtl ? "مجمل الربح" : "Gross Profit"} value={d.grossProfit} bold highlight={d.grossProfit >= 0 ? "profit" : "loss"} />
              <div className="px-4 py-2 bg-secondary/20 text-xs font-bold text-muted-foreground uppercase tracking-wide">{isRtl ? "مصروفات التشغيل" : "Operating Expenses"}</div>
              <IncRow label={isRtl ? "رواتب وبدلات" : "Salaries & Allowances"} value={d.salaryExp} sign={-1} indent />
              <IncRow label={isRtl ? "مصروفات إدارية وعمومية" : "General & Admin"} value={d.adminExp} sign={-1} indent />
              <IncRow label={isRtl ? "إجمالي مصروفات التشغيل" : "Total Operating Expenses"} value={d.totalOpEx} sign={-1} bold />
              <IncRow label={isRtl ? "الربح التشغيلي" : "Operating Profit"} value={d.operatingProfit} bold highlight={d.operatingProfit >= 0 ? "profit" : "loss"} />
              <div className="px-4 py-2 bg-secondary/20 text-xs font-bold text-muted-foreground uppercase tracking-wide">{isRtl ? "بنود أخرى" : "Other Items"}</div>
              <IncRow label={isRtl ? "إيرادات أخرى" : "Other Revenue"} value={d.otherRev} indent />
              <IncRow label={isRtl ? "مصروفات مالية" : "Finance Expenses"} value={d.financeExp} sign={-1} indent />
              <IncRow label={isRtl ? "صافي الربح / (الخسارة)" : "Net Income / (Loss)"} value={d.netIncome} bold highlight={d.netIncome >= 0 ? "total" : "loss"} />
            </div>
          </Section>
        </TabsContent>

        {/* ── Balance Sheet ──────────────────────────────────────────────────── */}
        <TabsContent value="balance" className="mt-4">
          <Section title={isRtl ? `الميزانية العمومية — ${to}` : `Balance Sheet — as of ${to}`} onPrint={printBalanceSheet} isRtl={isRtl}>
            <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/30">
              {/* Assets column */}
              <div>
                <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-950/20 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">{isRtl ? "الأصول" : "ASSETS"}</div>
                {b.assetAccs.filter(a => parseFloat(a.balance||"0") !== 0).map(acc => (
                  <div key={acc.id} className="flex justify-between px-4 py-2 border-b border-border/20 hover:bg-muted/20">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground me-2">{acc.code}</span>
                      <span className="text-sm">{isRtl ? acc.nameAr : (acc.nameEn || acc.nameAr)}</span>
                    </div>
                    <span className="text-sm font-medium">{SAR(parseFloat(acc.balance||"0"))}</span>
                  </div>
                ))}
                {b.outstandingReceivables > 0 && (
                  <div className="flex justify-between px-4 py-2 border-b border-border/20 hover:bg-muted/20">
                    <div><span className="font-mono text-xs text-muted-foreground me-2">1201</span><span className="text-sm">{isRtl ? "ذمم مدينة — عملاء" : "Accounts Receivable"}</span></div>
                    <span className="text-sm font-medium">{SAR(b.outstandingReceivables)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-blue-100/50 dark:bg-blue-950/30 font-bold border-t border-blue-200 dark:border-blue-800">
                  <span>{isRtl ? "إجمالي الأصول" : "Total Assets"}</span>
                  <span className="text-blue-700 dark:text-blue-400">{SAR(b.totalAssets)}</span>
                </div>
              </div>

              {/* Liabilities + Equity column */}
              <div>
                <div className="px-4 py-2 bg-red-50/50 dark:bg-red-950/20 text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">{isRtl ? "المطلوبات" : "LIABILITIES"}</div>
                {b.liabAccs.filter(a => parseFloat(a.balance||"0") !== 0).map(acc => (
                  <div key={acc.id} className="flex justify-between px-4 py-2 border-b border-border/20 hover:bg-muted/20">
                    <div><span className="font-mono text-xs text-muted-foreground me-2">{acc.code}</span><span className="text-sm">{isRtl ? acc.nameAr : (acc.nameEn || acc.nameAr)}</span></div>
                    <span className="text-sm font-medium">{SAR(parseFloat(acc.balance||"0"))}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 bg-red-50/30 dark:bg-red-950/20 font-semibold border-b border-border/30">
                  <span className="text-sm">{isRtl ? "إجمالي المطلوبات" : "Total Liabilities"}</span>
                  <span className="text-red-600">{SAR(b.totalLiab)}</span>
                </div>
                <div className="px-4 py-2 bg-purple-50/50 dark:bg-purple-950/20 text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide">{isRtl ? "حقوق الملكية" : "EQUITY"}</div>
                {b.equityAccs.filter(a => parseFloat(a.balance||"0") !== 0).map(acc => (
                  <div key={acc.id} className="flex justify-between px-4 py-2 border-b border-border/20 hover:bg-muted/20">
                    <div><span className="font-mono text-xs text-muted-foreground me-2">{acc.code}</span><span className="text-sm">{isRtl ? acc.nameAr : (acc.nameEn || acc.nameAr)}</span></div>
                    <span className="text-sm font-medium">{SAR(parseFloat(acc.balance||"0"))}</span>
                  </div>
                ))}
                {b.retainedEarnings !== 0 && (
                  <div className="flex justify-between px-4 py-2 border-b border-border/20 hover:bg-muted/20">
                    <div><span className="font-mono text-xs text-muted-foreground me-2">3201</span><span className="text-sm">{isRtl ? "أرباح/خسائر مرحّلة" : "Retained Earnings"}</span></div>
                    <span className={cn("text-sm font-medium", b.retainedEarnings >= 0 ? "text-emerald-600" : "text-red-600")}>{SAR(b.retainedEarnings)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-primary/5 font-bold border-t border-primary/20">
                  <span>{isRtl ? "إجمالي المطلوبات + حقوق الملكية" : "Total Liabilities + Equity"}</span>
                  <span className="text-primary">{SAR(b.totalLiab + b.totalEquity + b.retainedEarnings)}</span>
                </div>
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── Cash Flow ──────────────────────────────────────────────────────── */}
        <TabsContent value="cashflow" className="mt-4">
          <Section title={isRtl ? `قائمة التدفق النقدي — ${from} إلى ${to}` : `Cash Flow — ${from} to ${to}`}
            onPrint={() => {
              const html = `<table><thead><tr><th>${isRtl?"البيان":"Item"}</th><th style="text-align:${isRtl?"left":"right"}">${isRtl?"المبلغ":"Amount"}</th></tr></thead>
              <tbody>
              <tr class="section-header"><td colspan="2">${isRtl?"التدفقات التشغيلية":"Operating Activities"}</td></tr>
              <tr><td>${isRtl?"نقد مستلم من العملاء":"Cash from customers"}</td><td style="text-align:${isRtl?"left":"right"}">${SAR(c.cashFromCustomers)}</td></tr>
              <tr><td>${isRtl?"مدفوعات للموردين والآخرين":"Payments to suppliers"}</td><td style="text-align:${isRtl?"left":"right"};color:#dc2626">(${SAR(c.paid)})</td></tr>
              <tr class="grand-total"><td>${isRtl?"صافي التدفق النقدي":"Net Cash Flow"}</td><td style="text-align:${isRtl?"left":"right"}">${SAR(c.netCash)}</td></tr>
              </tbody></table>`;
              printReport(isRtl ? "قائمة التدفق النقدي" : "Cash Flow Statement", html, isRtl);
            }} isRtl={isRtl}>
            <div className="divide-y divide-border/30">
              <div className="px-4 py-2 bg-secondary/20 text-xs font-bold text-muted-foreground uppercase">{isRtl ? "التدفقات التشغيلية" : "Operating Activities"}</div>
              <div className="flex justify-between px-4 py-2.5 hover:bg-muted/20">
                <span className="text-sm ps-4">{isRtl ? "نقد مستلم من العملاء" : "Cash received from customers"}</span>
                <span className="text-sm font-medium text-emerald-600">{SAR(c.cashFromCustomers)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 hover:bg-muted/20">
                <span className="text-sm ps-4">{isRtl ? "مدفوعات سندات الصرف" : "Payment vouchers issued"}</span>
                <span className="text-sm font-medium text-red-600">({SAR(c.paid)})</span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-primary/5 font-bold border-t border-primary/20">
                <span>{isRtl ? "صافي التدفق النقدي" : "Net Cash Flow"}</span>
                <span className={c.netCash >= 0 ? "text-emerald-600" : "text-red-600"}>{c.netCash < 0 ? `(${SAR(Math.abs(c.netCash))})` : SAR(c.netCash)}</span>
              </div>
            </div>
            {/* By method */}
            {Object.keys(c.byMethod).length > 0 && (
              <div className="p-4 border-t border-border/30">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{isRtl ? "توزيع المقبوضات حسب طريقة الدفع" : "Receipts by Payment Method"}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(c.byMethod).map(([method, amount]) => (
                    <Badge key={method} variant="outline" className="text-xs font-normal">
                      {method}: {SAR(amount)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </TabsContent>

        {/* ── AR Aging ──────────────────────────────────────────────────────── */}
        <TabsContent value="aging" className="mt-4">
          <Section title={isRtl ? "تحليل الذمم المدينة (AR Aging)" : "Accounts Receivable Aging"}
            onPrint={() => {
              const html = `<table><thead><tr><th>${isRtl?"الفاتورة":"Invoice"}</th><th>${isRtl?"العميل":"Client"}</th><th>${isRtl?"تاريخ الاستحقاق":"Due Date"}</th><th>${isRtl?"أيام التأخر":"Overdue"}</th><th style="text-align:${isRtl?"left":"right"}">${isRtl?"المبلغ":"Balance"}</th></tr></thead>
              <tbody>${a.items.map(i=>`<tr><td>${i.inv.invoiceNumber}</td><td>${i.inv.clientName||"—"}</td><td>${i.inv.dueDate||i.inv.issueDate}</td><td style="color:${i.overdue>90?"#dc2626":i.overdue>30?"#d97706":"#16a34a"}">${i.overdue>0?`+${i.overdue} ${isRtl?"يوم":"days"}`:isRtl?"لم يستحق":"Not due"}</td><td style="text-align:${isRtl?"left":"right"};font-weight:600">${SAR(i.balance)}</td></tr>`).join("")}
              <tr class="grand-total"><td colspan="4">${isRtl?"الإجمالي":"Total"}</td><td style="text-align:${isRtl?"left":"right"}">${SAR(a.total)}</td></tr>
              </tbody></table>`;
              printReport(isRtl ? "تحليل الذمم المدينة" : "AR Aging Report", html, isRtl);
            }} isRtl={isRtl}>

            {/* Aging buckets */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-0 divide-x divide-border/30 border-b border-border/30">
              {[
                { label: isRtl ? "لم يستحق" : "Current", value: a.buckets.current, color: "text-emerald-600" },
                { label: isRtl ? "1-30 يوم" : "1-30 days", value: a.buckets.days30, color: "text-blue-600" },
                { label: isRtl ? "31-60 يوم" : "31-60 days", value: a.buckets.days60, color: "text-amber-600" },
                { label: isRtl ? "61-90 يوم" : "61-90 days", value: a.buckets.days90, color: "text-orange-600" },
                { label: isRtl ? "أكثر من 90 يوم" : "Over 90 days", value: a.buckets.over90, color: "text-red-600" },
              ].map((b, i) => (
                <div key={i} className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                  <p className={cn("font-bold mt-1", b.color)}>{SAR(b.value)}</p>
                </div>
              ))}
            </div>

            {/* AR detail table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead>{isRtl ? "الفاتورة" : "Invoice"}</TableHead>
                    <TableHead>{isRtl ? "العميل" : "Client"}</TableHead>
                    <TableHead>{isRtl ? "تاريخ الاستحقاق" : "Due Date"}</TableHead>
                    <TableHead>{isRtl ? "أيام التأخر" : "Overdue"}</TableHead>
                    <TableHead>{isRtl ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead>{isRtl ? "المدفوع" : "Paid"}</TableHead>
                    <TableHead>{isRtl ? "المتبقي" : "Balance"}</TableHead>
                    <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.items.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">{isRtl ? "لا توجد ذمم مدينة مستحقة" : "No outstanding receivables"}</TableCell></TableRow>
                  ) : a.items.map(({ inv, overdue, balance }) => (
                    <TableRow key={inv.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs text-primary font-semibold">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.clientName || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.dueDate || inv.issueDate}</TableCell>
                      <TableCell>
                        {overdue > 0
                          ? <Badge className={cn("text-xs border-0 font-normal", overdue > 90 ? "bg-red-100 text-red-700" : overdue > 30 ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700")}>+{overdue} {isRtl ? "يوم" : "d"}</Badge>
                          : <Badge className="text-xs border-0 font-normal bg-emerald-100 text-emerald-700">{isRtl ? "لم يستحق" : "Current"}</Badge>}
                      </TableCell>
                      <TableCell className="font-medium">{SAR(parseFloat(inv.total))}</TableCell>
                      <TableCell className="text-emerald-600 font-medium">{SAR(parseFloat(inv.paidAmount))}</TableCell>
                      <TableCell className="text-red-600 font-bold">{SAR(balance)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal capitalize">{inv.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {a.items.length > 0 && (
                    <TableRow className="bg-secondary/30 font-bold">
                      <TableCell colSpan={6} className="text-sm">{isRtl ? "إجمالي الذمم المدينة" : "Total Outstanding"}</TableCell>
                      <TableCell className="text-red-600 font-bold text-sm">{SAR(a.total)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>
        </TabsContent>

        {/* ── Trial Balance ──────────────────────────────────────────────────── */}
        <TabsContent value="trial" className="mt-4">
          <Section title={isRtl ? `ميزان المراجعة — ${to}` : `Trial Balance — as of ${to}`} onPrint={printTrialBalance} isRtl={isRtl}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead className="w-20">{isRtl ? "الرمز" : "Code"}</TableHead>
                    <TableHead>{isRtl ? "اسم الحساب" : "Account Name"}</TableHead>
                    <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                    <TableHead className="text-emerald-700">{isRtl ? "مدين" : "Debit"}</TableHead>
                    <TableHead className="text-red-600">{isRtl ? "دائن" : "Credit"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts
                    .filter(acc => !accounts.some(b => b.parentId === acc.id))
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map(acc => {
                      const bal = parseFloat(acc.balance || "0");
                      if (bal === 0) return null;
                      const isDebit = ["asset", "expense"].includes(acc.type);
                      return (
                        <TableRow key={acc.id} className="hover:bg-muted/20">
                          <TableCell className="font-mono text-xs text-muted-foreground">{acc.code}</TableCell>
                          <TableCell className="text-sm">{isRtl ? acc.nameAr : (acc.nameEn || acc.nameAr)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal capitalize">{acc.type}</Badge>
                          </TableCell>
                          <TableCell className="text-emerald-700 font-medium">{isDebit && bal > 0 ? SAR(bal) : "—"}</TableCell>
                          <TableCell className="text-red-600 font-medium">{!isDebit && bal > 0 ? SAR(bal) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  {/* Totals */}
                  {(() => {
                    const leafAccs = accounts.filter(a => !accounts.some(b => b.parentId === a.id));
                    const totalDebit = leafAccs.filter(a => ["asset","expense"].includes(a.type)).reduce((s,a) => s + parseFloat(a.balance||"0"), 0);
                    const totalCredit = leafAccs.filter(a => ["liability","equity","revenue"].includes(a.type)).reduce((s,a) => s + parseFloat(a.balance||"0"), 0);
                    return (
                      <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/30">
                        <TableCell colSpan={3} className="text-sm font-bold">{isRtl ? "الإجمالي" : "Total"}</TableCell>
                        <TableCell className="text-emerald-700 font-bold">{SAR(totalDebit)}</TableCell>
                        <TableCell className="text-red-600 font-bold">{SAR(totalCredit)}</TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
            {accounts.every(a => parseFloat(a.balance||"0") === 0) && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {isRtl ? "لا توجد أرصدة في شجرة الحسابات — يرجى تحديث أرصدة الحسابات" : "No account balances — update account balances in Chart of Accounts"}
              </div>
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
