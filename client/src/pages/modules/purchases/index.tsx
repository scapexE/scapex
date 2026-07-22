import { useState, useEffect, useCallback, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { esc } from "@/lib/htmlEscape";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Plus, Search, Truck, DollarSign, Clock, CheckCircle2, Edit, Printer, Trash2, Loader2, FileText, Send, ShieldCheck, XCircle, AlertTriangle, CalendarClock, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getAboutData, getSystemSettings, getPrintFontCss } from "@/lib/companySettings";
import { watermarkHtml, preparedByHtml, zatcaQrBlockHtml } from "@/lib/printShared";
import { dbGetItem } from "@/lib/dbStorage";
import { getRequestScope } from "@/lib/queryClient";
import { PoScheduleDialog, type PoLite } from "@/components/purchases/PoScheduleDialog";

interface PoItem { name: string; qty: number; unit: string; unitPrice: number; inventoryItemId?: string; }

interface PurchaseOrder {
  id: string; poNumber: string; vendor: string; vendorAr: string; vendorId?: string; vendorVat?: string;
  category: string; items: PoItem[];
  subtotal: number; vatAmount: number; total: number;
  status: "draft" | "pending_approval" | "approved" | "sent" | "partial" | "received" | "cancelled";
  orderDate: string; expectedDate: string; notes: string; createdBy?: string | null;
}

interface Vendor {
  id: string; nameAr: string; nameEn: string; category: string;
  phone: string; email: string; vatNo: string; rating: number; status: "active" | "inactive";
}

interface InvItemLite { id: string; nameAr: string; nameEn: string; unit: string; }

interface PoAlert { overdue: number; dueSoon: number; }

const CATS = [
  { id: "equipment", ar: "معدات", en: "Equipment" },
  { id: "consumables", ar: "مستهلكات", en: "Consumables" },
  { id: "it", ar: "تقنية المعلومات", en: "IT" },
  { id: "services", ar: "خدمات", en: "Services" },
  { id: "materials", ar: "مواد بناء", en: "Materials" },
];

const SEED_PO = [
  { poNumber: "PO-2026-001", items: [{ name: "Safety Helmets", qty: 50, unit: "pcs", unitPrice: 85 }], total: 4250, status: "received", expectedDate: "2026-03-10", notes: "" },
  { poNumber: "PO-2026-002", items: [{ name: "PPE Gloves", qty: 200, unit: "pairs", unitPrice: 12 }], total: 2400, status: "sent", expectedDate: "2026-03-15", notes: "" },
];

const SEED_VENDORS: Partial<Vendor>[] = [
  { nameAr: "شركة المعدات الصناعية", nameEn: "Industrial Equipment Co.", category: "equipment", phone: "+966112345678", email: "info@iec.sa", vatNo: "300123456789012", rating: 5 },
  { nameAr: "الشركة السعودية للمستلزمات", nameEn: "Saudi Supplies Co.", category: "consumables", phone: "+966113456789", email: "orders@ssc.sa", vatNo: "300234567890123", rating: 4 },
  { nameAr: "مؤسسة التقنية المتقدمة", nameEn: "Advanced Technology Est.", category: "it", phone: "+966114567890", email: "sales@ate.sa", vatNo: "300345678901234", rating: 4 },
];

function mapOrder(r: any): PurchaseOrder {
  const dbItems: PoItem[] = Array.isArray(r.dbItems) && r.dbItems.length
    ? r.dbItems.map((it: any) => ({
        name: it.descAr || it.descEn || "",
        qty: parseFloat(it.qty || "1") || 1,
        unit: it.unit || "",
        unitPrice: parseFloat(it.unitPrice || "0") || 0,
        inventoryItemId: it.inventoryItemId ? String(it.inventoryItemId) : undefined,
      }))
    : (r.items || []);
  return {
    id: String(r.id),
    poNumber: r.poNumber || `PO-${r.id}`,
    vendor: r.vendorNameEn || r.vendorNameAr || r.vendor || `Vendor ${r.vendorId || ""}`,
    vendorAr: r.vendorNameAr || r.vendor || "",
    vendorId: r.vendorId ? String(r.vendorId) : undefined,
    vendorVat: r.vendorVat || "",
    category: r.category || "equipment",
    items: dbItems,
    subtotal: parseFloat(r.subtotal || "0") || 0,
    vatAmount: parseFloat(r.vatAmount || "0") || 0,
    total: parseFloat(r.total || "0") || 0,
    status: r.status || "draft",
    orderDate: r.createdAt ? r.createdAt.split("T")[0] : "",
    expectedDate: r.deliveryDate || r.expectedDate || "",
    notes: r.notes || "",
    createdBy: r.createdBy || null,
  };
}

function mapVendor(r: any): Vendor {
  return {
    id: String(r.id),
    nameAr: r.nameAr || "",
    nameEn: r.nameEn || r.nameAr || "",
    category: r.category || "equipment",
    phone: r.phone || "",
    email: r.email || "",
    vatNo: r.vatNumber || r.vatNo || "",
    rating: r.rating || 0,
    status: r.isActive !== false ? "active" : "inactive",
  };
}

async function buildPoHtml(po: PurchaseOrder, vendors: Vendor[], isRtl: boolean): Promise<string> {
  const v = vendors.find(x => x.id === po.vendorId);
  const sysCfg = getSystemSettings();
  const pd = sysCfg.printDesign;
  const about = getAboutData();
  const coNameAr = about.companyNameAr || "شركة سكابكس";
  const coNameEn = about.companyNameEn || "Scapex Company";
  const coVat = about.vatNumber || "310000000000003";
  let coLogoUrl = pd.headerLogo || "";
  if (!coLogoUrl) {
    try {
      const raw = dbGetItem("scapex_companies");
      if (raw) {
        const cos = JSON.parse(raw) as Array<{ id: string; logoUrl?: string }>;
        const aid = dbGetItem("scapex_active_company");
        const co = aid ? cos.find(c => c.id === aid) : cos[0];
        coLogoUrl = co?.logoUrl || "";
      }
    } catch {}
  }
  if (!coLogoUrl) coLogoUrl = sysCfg.brandLogo || "";
  const logoHtml = !pd.showLogo
    ? ""
    : coLogoUrl
    ? `<img src="${esc(coLogoUrl)}" style="width:56px;height:56px;object-fit:contain;border-radius:8px" />`
    : `<div style="font-size:22px;font-weight:900;color:${pd.accentColor}">${esc(coNameEn.charAt(0).toUpperCase() || "S")}</div>`;
  const headerNote = esc(isRtl ? pd.headerNoteAr : pd.headerNoteEn);
  const contactBits = [about.address, about.phone1, about.email1, about.website].filter(Boolean).map(x => esc(String(x).split("\n").join(" — "))).join(" · ");
  const printFont = getPrintFontCss();
  const subtotal = po.subtotal || (po.total ? po.total / 1.15 : 0);
  const vat = po.vatAmount || (po.total ? po.total - subtotal : 0);
  const qrBlock = await zatcaQrBlockHtml({
    sellerName: coNameAr,
    vatNumber: coVat,
    timestamp: `${po.orderDate || new Date().toISOString().slice(0, 10)}T00:00:00Z`,
    total: po.total.toFixed(2),
    vat: vat.toFixed(2),
    labelAr: isRtl,
  });
  const wmark = watermarkHtml(pd, sysCfg);
  const preparedBy = preparedByHtml(po.createdBy, isRtl ? "ar" : "en");
  const statusLabels: Record<string, [string, string]> = {
    draft: ["مسودة", "DRAFT"], pending_approval: ["بانتظار الاعتماد", "PENDING APPROVAL"], approved: ["معتمد", "APPROVED"],
    sent: ["مرسل", "SENT"], partial: ["استلام جزئي", "PARTIAL"], received: ["مستلم", "RECEIVED"], cancelled: ["ملغى", "CANCELLED"],
  };
  const stLabel = statusLabels[po.status] ? (isRtl ? statusLabels[po.status][0] : statusLabels[po.status][1]) : po.status;
  return `<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>${esc(po.poNumber)}</title>
  <style>${printFont.css}
  body{font-family:${printFont.family};font-size:12px;margin:0;padding:20px;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${pd.accentColor};padding-bottom:15px;margin-bottom:20px;background:${pd.headerBgColor};${pd.headerBgImage ? `background-image:url('${pd.headerBgImage}');background-size:cover;background-position:center;` : ""}${pd.headerBgColor !== "#ffffff" || pd.headerBgImage ? "padding:14px 16px;border-radius:8px;" : ""}color:${pd.headerTextColor}}
  .doc-title{font-size:16px;font-weight:700;color:${pd.accentColor};text-align:center;margin:10px 0}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;background:#f8fafc;padding:12px;border-radius:8px}
  .info-label{color:#64748b;font-size:10px}.info-value{font-weight:600;font-size:12px}
  table{width:100%;border-collapse:collapse;margin:15px 0}
  th{background:${pd.accentColor};color:white;padding:8px;text-align:${isRtl ? "right" : "left"};font-size:11px}
  td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}tr:nth-child(even){background:#f8fafc}
  .totals{margin-top:15px;display:flex;flex-direction:column;align-items:${isRtl ? "flex-start" : "flex-end"};gap:5px}
  .total-row{display:flex;gap:20px;font-size:12px}.total-row.grand{font-weight:700;font-size:14px;color:${pd.accentColor};border-top:2px solid ${pd.accentColor};padding-top:8px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:#f1f5f9;color:#475569}
  .footer{margin-top:30px;border-top:2px solid ${pd.accentColor};padding:10px 14px;text-align:center;color:${pd.footerTextColor};font-size:10px;background:${pd.footerBgColor};${pd.footerBgImage ? `background-image:url('${pd.footerBgImage}');background-size:cover;background-position:center;` : ""}border-radius:0 0 6px 6px}</style>
  </head><body>
  ${wmark}
  <div style="position:relative;z-index:1;">
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      ${logoHtml}
      <div>
        <div style="display:inline-block;text-align:center">
          <div style="font-size:15px;font-weight:700;color:${pd.headerTextColor}">${esc(isRtl ? coNameAr : coNameEn)}</div>
          <div style="font-size:10px;color:${pd.headerTextColor};opacity:0.75">${esc(isRtl ? coNameEn : coNameAr)}</div>
        </div>
        ${headerNote ? `<div style="font-size:10px;color:${pd.headerTextColor};opacity:0.85;margin-top:2px;white-space:pre-line">${headerNote}</div>` : ""}
      </div>
    </div>
    <div><span class="badge">${esc(stLabel)}</span></div>
  </div>
  <div class="doc-title">${isRtl ? "أمر شراء" : "Purchase Order"}</div>
  <div class="info-grid">
    <div><div class="info-label">${isRtl ? "رقم الأمر" : "PO No."}</div><div class="info-value">${esc(po.poNumber)}</div></div>
    <div><div class="info-label">${isRtl ? "تاريخ الأمر" : "Order Date"}</div><div class="info-value">${po.orderDate || "—"}</div></div>
    <div><div class="info-label">${isRtl ? "المورد" : "Vendor"}</div><div class="info-value">${esc(isRtl ? (po.vendorAr || v?.nameAr || "—") : (v?.nameEn || po.vendor || "—"))}</div></div>
    <div><div class="info-label">${isRtl ? "تاريخ التسليم المتوقع" : "Expected Delivery"}</div><div class="info-value">${po.expectedDate || "—"}</div></div>
    ${(v?.vatNo || po.vendorVat) ? `<div><div class="info-label">${isRtl ? "الرقم الضريبي للمورد" : "Vendor VAT No."}</div><div class="info-value">${esc(v?.vatNo || po.vendorVat || "")}</div></div>` : ""}
    ${v?.phone ? `<div><div class="info-label">${isRtl ? "هاتف المورد" : "Vendor Phone"}</div><div class="info-value">${esc(v.phone)}</div></div>` : ""}
  </div>
  <table><thead><tr>
    <th>${isRtl ? "الصنف" : "Item"}</th>
    <th>${isRtl ? "الكمية" : "Qty"}</th>
    <th>${isRtl ? "الوحدة" : "Unit"}</th>
    <th>${isRtl ? "سعر الوحدة" : "Unit Price"}</th>
    <th>${isRtl ? "الإجمالي" : "Total"}</th>
  </tr></thead><tbody>
  ${po.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${esc(i.unit)}</td><td>${i.unitPrice.toLocaleString()}</td><td>${(i.qty * i.unitPrice).toLocaleString()}</td></tr>`).join("")}
  </tbody></table>
  <div class="totals">
    <div class="total-row"><span>${isRtl ? "المجموع قبل الضريبة:" : "Subtotal:"}</span><span>${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR</span></div>
    <div class="total-row"><span>${isRtl ? "ضريبة القيمة المضافة (15%):" : "VAT (15%):"}</span><span>${vat.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR</span></div>
    <div class="total-row grand"><span>${isRtl ? "الإجمالي الكلي:" : "Grand Total:"}</span><span>${po.total.toLocaleString()} SAR</span></div>
  </div>
  ${po.notes ? `<div style="margin-top:15px;padding:10px;background:#f8fafc;border-radius:6px;font-size:11px;color:#475569">${esc(po.notes)}</div>` : ""}
  ${qrBlock ? `<div style="margin-top:18px;display:flex;justify-content:${isRtl ? "flex-end" : "flex-start"};">${qrBlock}</div>` : ""}
  <div class="footer">
    <div>${esc(coNameAr)} · ${esc(coNameEn)} · ${isRtl ? "الرقم الضريبي" : "VAT No"}: ${esc(coVat)}</div>
    ${contactBits ? `<div style="margin-top:4px">${contactBits}</div>` : ""}
    ${preparedBy}
  </div>
  </div>
  </body></html>`;
}

function printPO(po: PurchaseOrder, vendors: Vendor[], isRtl: boolean) {
  const w = window.open("", "_blank");
  if (!w) return;
  buildPoHtml(po, vendors, isRtl).then((html) => {
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
  });
}

export default function PurchasesModule() {
  const { dir } = useLanguage(); const isRtl = dir === "rtl";
  const { toast } = useToast();
  const { userRoles } = useActiveRole();
  const canApprove = userRoles.includes("admin") || userRoles.includes("manager");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invItems, setInvItems] = useState<InvItemLite[]>([]);
  const [poAlerts, setPoAlerts] = useState<Record<string, PoAlert>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("");
  const [showPODialog, setShowPODialog] = useState(false);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [schedulePo, setSchedulePo] = useState<PoLite | null>(null);
  const [form, setForm] = useState<Partial<PurchaseOrder>>({});
  const [vForm, setVForm] = useState<Partial<Vendor>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("vendor");
    if (v) setVendorFilter(v);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, vRes, iRes, sRes] = await Promise.all([
        fetch("/api/purchase-orders"), fetch("/api/vendors"),
        fetch("/api/inventory-items"), fetch("/api/po-payment-schedules"),
      ]);
      const [pData, vData, iData, sData] = await Promise.all([pRes.json(), vRes.json(), iRes.json(), sRes.json()]);

      setInvItems(Array.isArray(iData) ? iData.map((r: any) => ({ id: String(r.id), nameAr: r.nameAr || "", nameEn: r.nameEn || r.nameAr || "", unit: r.unit || "" })) : []);

      if (Array.isArray(sData)) {
        const now = new Date();
        const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const alerts: Record<string, PoAlert> = {};
        for (const s of sData) {
          if (!s.dueDate || s.status === "paid" || s.status === "cancelled") continue;
          const remaining = parseFloat(s.amount || "0") - parseFloat(s.paidAmount || "0");
          if (remaining <= 0.009) continue;
          const d = new Date(s.dueDate);
          if (d > soon) continue;
          const key = String(s.poId);
          const a = alerts[key] || { overdue: 0, dueSoon: 0 };
          if (d < now) a.overdue += 1; else a.dueSoon += 1;
          alerts[key] = a;
        }
        setPoAlerts(alerts);
      }

      if (Array.isArray(vData) && vData.length > 0) {
        setVendors(vData.map(mapVendor));
      } else {
        for (const v of SEED_VENDORS) await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
        const r2 = await fetch("/api/vendors");
        setVendors((await r2.json()).map(mapVendor));
      }

      if (Array.isArray(pData) && pData.length > 0) {
        setOrders(pData.map(mapOrder));
      } else {
        for (const po of SEED_PO) await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(po) });
        const r2 = await fetch("/api/purchase-orders");
        setOrders((await r2.json()).map(mapOrder));
      }
    } catch { toast({ title: isRtl ? "خطأ في تحميل البيانات" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (!q || o.poNumber.toLowerCase().includes(q) || o.vendor.toLowerCase().includes(q) || o.vendorAr.includes(search)) && (statusFilter === "all" || o.status === statusFilter) && (!vendorFilter || o.vendorId === vendorFilter);
  });

  const stats = {
    total: orders.length,
    pendingApproval: orders.filter(o => o.status === "pending_approval").length,
    pending: orders.filter(o => o.status === "sent" || o.status === "approved").length,
    totalValue: orders.reduce((s, o) => s + o.total, 0),
  };
  const statusColor = (s: string) => ({ draft: "secondary", pending_approval: "secondary", approved: "default", sent: "default", partial: "secondary", received: "default", cancelled: "destructive" }[s] as any || "secondary");
  const statusLabel = (s: string) => ({
    draft: isRtl ? "مسودة" : "Draft",
    pending_approval: isRtl ? "بانتظار الاعتماد" : "Pending Approval",
    approved: isRtl ? "معتمد" : "Approved",
    sent: isRtl ? "مرسل" : "Sent",
    partial: isRtl ? "جزئي" : "Partial",
    received: isRtl ? "مستلم" : "Received",
    cancelled: isRtl ? "ملغى" : "Cancelled",
  }[s] || s);
  const catLabel = (id: string) => { const c = CATS.find(x => x.id === id); return c ? (isRtl ? c.ar : c.en) : id; };

  // ── PO dialog: items + auto totals (15% VAT) ────────────────────────────
  const dlgItems = form.items || [];
  const dlgSubtotal = useMemo(() => dlgItems.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0), [dlgItems]);
  const dlgVat = dlgSubtotal * 0.15;
  const dlgTotal = dlgSubtotal + dlgVat;

  const setItem = (idx: number, patch: Partial<PoItem>) => {
    setForm(p => ({ ...p, items: (p.items || []).map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  };
  const addItem = () => setForm(p => ({ ...p, items: [...(p.items || []), { name: "", qty: 1, unit: "", unitPrice: 0 }] }));
  const removeItem = (idx: number) => setForm(p => ({ ...p, items: (p.items || []).filter((_, i) => i !== idx) }));

  const handleSavePO = async () => {
    if (!form.poNumber || !form.vendorId) { toast({ title: isRtl ? "ادخل رقم الأمر واختر المورد" : "Fill PO number and vendor", variant: "destructive" }); return; }
    const items = (form.items || []).filter(i => i.name.trim());
    if (items.length === 0) { toast({ title: isRtl ? "أضف صنفاً واحداً على الأقل" : "Add at least one item", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        poNumber: form.poNumber, vendorId: form.vendorId,
        subtotal: dlgSubtotal, vatAmount: dlgVat, total: dlgTotal,
        status: "draft", deliveryDate: form.expectedDate || null,
        notes: form.notes || "", items,
        createdBy: getRequestScope().userId || null,
      };
      const res = await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      setShowPODialog(false);
      toast({ title: isRtl ? "تم حفظ أمر الشراء" : "Purchase order saved" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم تحديث الحالة" : "Status updated" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const poAction = async (id: string, action: "submit-approval" | "approve" | "reject", body?: any) => {
    try {
      const res = await fetch(`/api/purchase-orders/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "");
      toast({
        title: action === "submit-approval" ? (isRtl ? "تم إرسال الأمر للاعتماد" : "Submitted for approval")
          : action === "approve" ? (isRtl ? "تم اعتماد أمر الشراء" : "Purchase order approved")
          : (isRtl ? "تم رفض أمر الشراء وإعادته لمسودة" : "Purchase order rejected"),
      });
      fetchData();
    } catch (e: any) { toast({ title: e?.message || (isRtl ? "خطأ" : "Error"), variant: "destructive" }); }
  };

  const handleReceive = async (po: PurchaseOrder) => {
    const linked = po.items.filter(i => i.inventoryItemId).length;
    const msg = isRtl
      ? `تأكيد استلام ${po.poNumber}؟${linked > 0 ? `\nسيتم إضافة ${linked} صنف/أصناف مرتبطة إلى المخزون تلقائياً.` : "\nلا توجد أصناف مرتبطة بالمخزون — سيتم تحديث الحالة فقط."}`
      : `Confirm receiving ${po.poNumber}?${linked > 0 ? `\n${linked} linked item(s) will be added to inventory automatically.` : "\nNo items linked to inventory — status only will be updated."}`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/receive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "");
      toast({
        title: isRtl ? "تم الاستلام" : "Received",
        description: isRtl
          ? `تمت إضافة ${data.movedItems || 0} صنف للمخزون${data.skippedItems ? ` — ${data.skippedItems} غير مرتبط تم تخطيه` : ""}`
          : `${data.movedItems || 0} item(s) added to inventory${data.skippedItems ? `, ${data.skippedItems} unlinked skipped` : ""}`,
      });
      fetchData();
    } catch (e: any) { toast({ title: e?.message || (isRtl ? "خطأ" : "Error"), variant: "destructive" }); }
  };

  const handleDeletePO = async (id: string) => {
    if (!window.confirm(isRtl ? "حذف أمر الشراء وجدول دفعاته؟" : "Delete PO and its payment schedule?")) return;
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleSaveVendor = async () => {
    if (!vForm.nameAr) { toast({ title: isRtl ? "ادخل اسم المورد" : "Enter vendor name", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { nameAr: vForm.nameAr, nameEn: vForm.nameEn, category: vForm.category, phone: vForm.phone, email: vForm.email, vatNo: vForm.vatNo, rating: vForm.rating || 0 };
      if (editVendor) {
        await fetch(`/api/vendors/${editVendor.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setShowVendorDialog(false);
      toast({ title: isRtl ? "تم حفظ المورد" : "Vendor saved" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "المشتريات والموردين" : "Purchases & Vendors"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "إدارة أوامر الشراء والموردين" : "Manage purchase orders and vendors"}</p>
          </div>
          <Button size="sm" onClick={() => { setForm({ status: "draft", orderDate: new Date().toISOString().split("T")[0], items: [{ name: "", qty: 1, unit: "", unitPrice: 0 }] }); setShowPODialog(true); }} data-testid="button-new-po">
            <Plus className="w-4 h-4 me-1.5" />{isRtl ? "أمر شراء جديد" : "New Purchase Order"}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي الطلبات" : "Total Orders", value: stats.total, icon: ShoppingCart, color: "text-blue-500" },
            { label: isRtl ? "بانتظار الاعتماد" : "Pending Approval", value: stats.pendingApproval, icon: ShieldCheck, color: "text-amber-500" },
            { label: isRtl ? "قيد التنفيذ" : "In Progress", value: stats.pending, icon: Truck, color: "text-purple-500" },
            { label: isRtl ? "إجمالي المشتريات" : "Total Value", value: `${(stats.totalValue / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-emerald-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="orders">{isRtl ? "أوامر الشراء" : "Purchase Orders"}</TabsTrigger>
            <TabsTrigger value="vendors">{isRtl ? "الموردون" : "Vendors"}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4 space-y-3">
            {vendorFilter && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
                <span className="text-blue-700 dark:text-blue-300">{isRtl ? `مفلتر بالمورد` : `Filtered by vendor`}</span>
                <button onClick={() => setVendorFilter("")} className="ms-auto text-xs underline text-blue-600">{isRtl ? "إلغاء الفلتر" : "Clear filter"}</button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRtl ? "بحث..." : "Search..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الحالات" : "All Statuses"}</SelectItem>
                  {["draft", "pending_approval", "approved", "sent", "partial", "received", "cancelled"].map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead>{isRtl ? "رقم الأمر" : "PO Number"}</TableHead>
                        <TableHead>{isRtl ? "المورد" : "Vendor"}</TableHead>
                        <TableHead>{isRtl ? "الإجمالي" : "Total"}</TableHead>
                        <TableHead>{isRtl ? "تاريخ الطلب" : "Order Date"}</TableHead>
                        <TableHead>{isRtl ? "التسليم المتوقع" : "Expected Delivery"}</TableHead>
                        <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد أوامر شراء" : "No purchase orders"}</TableCell></TableRow>
                      ) : filtered.map(o => {
                        const alert = poAlerts[o.id];
                        return (
                        <TableRow key={o.id} className="hover:bg-muted/40" data-testid={`row-po-${o.id}`}>
                          <TableCell className="font-mono text-xs font-semibold text-primary">
                            <div className="flex items-center gap-1.5">
                              {o.poNumber}
                              {alert?.overdue ? <span title={isRtl ? `${alert.overdue} دفعة متأخرة` : `${alert.overdue} overdue installment(s)`}><AlertTriangle className="w-3.5 h-3.5 text-red-500" data-testid={`alert-overdue-${o.id}`} /></span> : null}
                              {!alert?.overdue && alert?.dueSoon ? <span title={isRtl ? `${alert.dueSoon} دفعة قريبة الاستحقاق` : `${alert.dueSoon} installment(s) due soon`}><Clock className="w-3.5 h-3.5 text-amber-500" data-testid={`alert-duesoon-${o.id}`} /></span> : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{isRtl ? o.vendorAr : o.vendor}</TableCell>
                          <TableCell className="text-sm font-medium">{o.total.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{o.orderDate}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{o.expectedDate}</TableCell>
                          <TableCell><Badge variant={statusColor(o.status)}>{statusLabel(o.status)}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "طباعة" : "Print"} onClick={() => printPO(o, vendors, isRtl)} data-testid={`button-print-po-${o.id}`}><Printer className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title={isRtl ? "جدول الدفعات" : "Payment schedule"} onClick={() => setSchedulePo({ id: o.id, poNumber: o.poNumber, vendor: o.vendor, vendorAr: o.vendorAr, total: o.total })} data-testid={`button-schedule-po-${o.id}`}><CalendarClock className="w-3.5 h-3.5" /></Button>
                              {o.status === "draft" && <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "إرسال للاعتماد" : "Submit for approval"} onClick={() => poAction(o.id, "submit-approval")} data-testid={`button-submit-po-${o.id}`}><Send className="w-3.5 h-3.5 text-amber-600" /></Button>}
                              {o.status === "pending_approval" && canApprove && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "اعتماد" : "Approve"} onClick={() => poAction(o.id, "approve")} data-testid={`button-approve-po-${o.id}`}><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "رفض" : "Reject"} onClick={() => { const r = window.prompt(isRtl ? "سبب الرفض (اختياري):" : "Rejection reason (optional):") ?? ""; poAction(o.id, "reject", { reason: r }); }} data-testid={`button-reject-po-${o.id}`}><XCircle className="w-3.5 h-3.5 text-red-500" /></Button>
                                </>
                              )}
                              {o.status === "approved" && <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "إرسال للمورد" : "Send to vendor"} onClick={() => handleUpdateStatus(o.id, "sent")} data-testid={`button-send-po-${o.id}`}><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /></Button>}
                              {(o.status === "sent" || o.status === "partial") && <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "استلام (يحدث المخزون)" : "Receive (updates inventory)"} onClick={() => handleReceive(o)} data-testid={`button-receive-po-${o.id}`}><PackageCheck className="w-3.5 h-3.5 text-blue-600" /></Button>}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePO(o.id)} data-testid={`button-delete-po-${o.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );})}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="vendors" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setEditVendor(null); setVForm({ status: "active", category: "equipment", rating: 3 }); setShowVendorDialog(true); }}>
                <Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة مورد" : "Add Vendor"}
              </Button>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "اسم المورد" : "Vendor Name"}</TableHead>
                      <TableHead>{isRtl ? "الفئة" : "Category"}</TableHead>
                      <TableHead>{isRtl ? "الهاتف" : "Phone"}</TableHead>
                      <TableHead>{isRtl ? "البريد" : "Email"}</TableHead>
                      <TableHead>{isRtl ? "التقييم" : "Rating"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map(v => (
                      <TableRow key={v.id} className="hover:bg-muted/40" data-testid={`row-vendor-${v.id}`}>
                        <TableCell><div><p className="font-medium text-sm">{isRtl ? v.nameAr : v.nameEn}</p><p className="text-xs text-muted-foreground">{isRtl ? v.nameEn : v.nameAr}</p></div></TableCell>
                        <TableCell className="text-sm">{catLabel(v.category)}</TableCell>
                        <TableCell className="text-sm">{v.phone}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.email}</TableCell>
                        <TableCell className="text-sm">{"★".repeat(v.rating)}{"☆".repeat(5 - v.rating)}</TableCell>
                        <TableCell><Badge variant={v.status === "active" ? "default" : "secondary"}>{v.status === "active" ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title={isRtl ? "أوامر الشراء" : "View POs"} onClick={() => window.location.href = `/purchases?vendor=${encodeURIComponent(v.id)}`} data-testid={`button-vendor-pos-${v.id}`}><FileText className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditVendor(v); setVForm(v); setShowVendorDialog(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteVendor(v.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isRtl ? "أمر شراء جديد" : "New Purchase Order"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">{isRtl ? "رقم الأمر *" : "PO Number *"}</Label><Input className="mt-1 h-8 text-sm" value={form.poNumber || ""} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))} data-testid="input-po-number" /></div>
              <div><Label className="text-xs">{isRtl ? "المورد *" : "Vendor *"}</Label>
                <Select value={form.vendorId || "__none__"} onValueChange={v => { const ven = vendors.find(x => x.id === v); setForm(p => ({ ...p, vendorId: v === "__none__" ? undefined : v, vendor: ven?.nameEn || "", vendorAr: ven?.nameAr || "" })); }}>
                  <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-po-vendor"><SelectValue placeholder={isRtl ? "اختر مورداً" : "Select vendor"} /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">{isRtl ? "— اختر —" : "— Select —"}</SelectItem>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{isRtl ? v.nameAr : v.nameEn}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">{isRtl ? "تاريخ التسليم" : "Delivery Date"}</Label><Input type="date" className="mt-1 h-8 text-sm" value={form.expectedDate || ""} onChange={e => setForm(p => ({ ...p, expectedDate: e.target.value }))} data-testid="input-po-delivery" /></div>
              <div><Label className="text-xs">{isRtl ? "ملاحظات" : "Notes"}</Label><Input className="mt-1 h-8 text-sm" value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-po-notes" /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold">{isRtl ? "الأصناف *" : "Items *"}</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addItem} data-testid="button-add-po-item"><Plus className="w-3 h-3 me-1" />{isRtl ? "صنف" : "Item"}</Button>
              </div>
              <div className="space-y-2">
                {dlgItems.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-end p-2 rounded-lg border bg-secondary/20">
                    <div className="col-span-4"><Label className="text-[10px]">{isRtl ? "الصنف" : "Item"}</Label><Input className="mt-0.5 h-8 text-sm" value={it.name} onChange={e => setItem(idx, { name: e.target.value })} data-testid={`input-item-name-${idx}`} /></div>
                    <div className="col-span-1"><Label className="text-[10px]">{isRtl ? "كمية" : "Qty"}</Label><Input type="number" className="mt-0.5 h-8 text-sm" value={it.qty} onChange={e => setItem(idx, { qty: Number(e.target.value) })} data-testid={`input-item-qty-${idx}`} /></div>
                    <div className="col-span-2"><Label className="text-[10px]">{isRtl ? "الوحدة" : "Unit"}</Label><Input className="mt-0.5 h-8 text-sm" value={it.unit} onChange={e => setItem(idx, { unit: e.target.value })} data-testid={`input-item-unit-${idx}`} /></div>
                    <div className="col-span-2"><Label className="text-[10px]">{isRtl ? "السعر" : "Price"}</Label><Input type="number" className="mt-0.5 h-8 text-sm" value={it.unitPrice} onChange={e => setItem(idx, { unitPrice: Number(e.target.value) })} data-testid={`input-item-price-${idx}`} /></div>
                    <div className="col-span-2">
                      <Label className="text-[10px]">{isRtl ? "ربط بالمخزون" : "Inventory"}</Label>
                      <Select value={it.inventoryItemId || "__none__"} onValueChange={v => setItem(idx, { inventoryItemId: v === "__none__" ? undefined : v })}>
                        <SelectTrigger className="mt-0.5 h-8 text-xs" data-testid={`select-item-inventory-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{isRtl ? "بدون" : "None"}</SelectItem>
                          {invItems.map(iv => <SelectItem key={iv.id} value={iv.id}>{isRtl ? iv.nameAr : iv.nameEn}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)} data-testid={`button-remove-item-${idx}`}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{isRtl ? "الأصناف المرتبطة بالمخزون تضاف للكميات تلقائياً عند الاستلام" : "Items linked to inventory are stocked automatically on receive"}</p>
            </div>

            <div className="rounded-lg bg-secondary/40 p-3 flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{isRtl ? "المجموع قبل الضريبة" : "Subtotal"}</span><span data-testid="text-po-subtotal">{dlgSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{isRtl ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span><span data-testid="text-po-vat">{dlgVat.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR</span></div>
              <div className="flex justify-between font-bold border-t pt-1"><span>{isRtl ? "الإجمالي" : "Total"}</span><span data-testid="text-po-total">{dlgTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPODialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSavePO} disabled={saving} data-testid="button-save-po">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editVendor ? (isRtl ? "تعديل المورد" : "Edit Vendor") : (isRtl ? "إضافة مورد" : "Add Vendor")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div><Label className="text-xs">{isRtl ? "الاسم بالعربية *" : "Arabic Name *"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.nameAr || ""} onChange={e => setVForm(p => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الاسم بالإنجليزية" : "English Name"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.nameEn || ""} onChange={e => setVForm(p => ({ ...p, nameEn: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الهاتف" : "Phone"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.phone || ""} onChange={e => setVForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "البريد الإلكتروني" : "Email"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.email || ""} onChange={e => setVForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الرقم الضريبي" : "VAT Number"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.vatNo || ""} onChange={e => setVForm(p => ({ ...p, vatNo: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "التقييم (1-5)" : "Rating (1-5)"}</Label><Input type="number" min={1} max={5} className="mt-1 h-8 text-sm" value={vForm.rating || 3} onChange={e => setVForm(p => ({ ...p, rating: Number(e.target.value) }))} /></div>
            <div className="col-span-2">
              <Label className="text-xs">{isRtl ? "الفئة" : "Category"}</Label>
              <Select value={vForm.category || "equipment"} onValueChange={v => setVForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVendorDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveVendor} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PoScheduleDialog po={schedulePo} isRtl={isRtl} onClose={() => { setSchedulePo(null); fetchData(); }} />
    </MainLayout>
  );
}
