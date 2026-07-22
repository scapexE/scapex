// Shared helpers for printed documents (proposals, contracts, invoices, receipts)
// - Watermark overlay (company logo, configurable opacity)
// - "Prepared by" footer line (first name of the creating user)
// - ZATCA phase-1 e-invoice QR (TLV → base64 → QR data URL)
import QRCode from "qrcode";
import { dbGetItem } from "@/lib/dbStorage";
import { esc } from "@/lib/htmlEscape";
import type { PrintDesign, SystemSettings } from "@/lib/companySettings";

// ── Watermark ───────────────────────────────────────────────────────────────
/**
 * Fixed full-page watermark using the company/print logo.
 * Returns "" when disabled or when no logo is available.
 * Inject right after <body> (works for print via position:fixed on every page).
 */
export function watermarkHtml(pd: PrintDesign, sysCfg?: Pick<SystemSettings, "brandLogo">): string {
  if (!pd.watermarkEnabled) return "";
  const logo = pd.headerLogo || sysCfg?.brandLogo || "";
  if (!logo) return "";
  const opacity = Math.min(30, Math.max(0, Number(pd.watermarkOpacity) || 0)) / 100;
  if (opacity <= 0) return "";
  return `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;">
  <img src="${esc(logo)}" style="width:60%;max-width:420px;opacity:${opacity};-webkit-print-color-adjust:exact;print-color-adjust:exact;" />
</div>`;
}

// ── Prepared by ─────────────────────────────────────────────────────────────
interface StoredUser { id?: string | number; name?: string; nameAr?: string; fullName?: string; email?: string; }

/** Resolve the first name of a user from the local users cache. */
export function getUserFirstName(userId?: string | number | null): string {
  if (userId == null || userId === "") return "";
  try {
    const raw = dbGetItem("users");
    if (!raw) return "";
    const users = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(users)) return "";
    const u = users.find((x) => String(x?.id) === String(userId));
    if (!u) return "";
    const full = (u.name || u.nameAr || u.fullName || "").trim();
    if (full) return full.split(/\s+/)[0];
    if (u.email) return u.email.split("@")[0];
  } catch {}
  return "";
}

/**
 * Small "أُعدّ بواسطة …" line for document footers.
 * Returns "" when the creator is unknown.
 */
export function preparedByHtml(createdBy: string | number | null | undefined, lang: "ar" | "en" | "both" = "ar"): string {
  const first = getUserFirstName(createdBy);
  if (!first) return "";
  const label = lang === "en" ? `Prepared by: ${esc(first)}`
    : lang === "both" ? `أُعدّ بواسطة: ${esc(first)} / Prepared by: ${esc(first)}`
    : `أُعدّ بواسطة: ${esc(first)}`;
  return `<div style="text-align:center;font-size:9px;color:#94a3b8;margin-top:6px;" dir="${lang === "en" ? "ltr" : "rtl"}">${label}</div>`;
}

// ── ZATCA phase-1 QR (TLV base64) ───────────────────────────────────────────
function tlvField(tag: number, value: string): Uint8Array {
  const enc = new TextEncoder();
  const v = enc.encode(value);
  const out = new Uint8Array(2 + v.length);
  out[0] = tag;
  out[1] = v.length;
  out.set(v, 2);
  return out;
}

/** Build the ZATCA phase-1 TLV payload and return it base64-encoded. */
export function zatcaTlvBase64(opts: {
  sellerName: string;
  vatNumber: string;
  /** ISO timestamp of the invoice, e.g. "2026-07-22T00:00:00Z" */
  timestamp: string;
  /** Grand total incl. VAT, e.g. "1150.00" */
  total: string;
  /** VAT amount, e.g. "150.00" */
  vat: string;
}): string {
  const parts = [
    tlvField(1, opts.sellerName || ""),
    tlvField(2, opts.vatNumber || ""),
    tlvField(3, opts.timestamp || ""),
    tlvField(4, opts.total || ""),
    tlvField(5, opts.vat || ""),
  ];
  const len = parts.reduce((s, p) => s + p.length, 0);
  const buf = new Uint8Array(len);
  let off = 0;
  for (const p of parts) { buf.set(p, off); off += p.length; }
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

/** Render the ZATCA TLV payload as a QR code data URL (PNG). */
export async function zatcaQrDataUrl(tlvBase64: string): Promise<string> {
  try {
    return await QRCode.toDataURL(tlvBase64, { errorCorrectionLevel: "M", margin: 1, width: 220 });
  } catch {
    return "";
  }
}

/** Convenience: build the full ZATCA QR block HTML for tax invoices. */
export async function zatcaQrBlockHtml(opts: {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string;
  vat: string;
  labelAr?: boolean;
}): Promise<string> {
  const tlv = zatcaTlvBase64(opts);
  const dataUrl = await zatcaQrDataUrl(tlv);
  if (!dataUrl) return "";
  const label = opts.labelAr === false ? "ZATCA E-Invoice QR" : "رمز الفاتورة الإلكترونية (زاتكا)";
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
  <img src="${dataUrl}" style="width:110px;height:110px;" alt="ZATCA QR"/>
  <div style="font-size:8px;color:#94a3b8;">${label}</div>
</div>`;
}
