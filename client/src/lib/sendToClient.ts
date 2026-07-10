import { apiRequest } from "@/lib/queryClient";

/** Strip the auto-print script so emailed/portal copies don't trigger the print dialog. */
function stripAutoPrint(html: string): string {
  return html
    .replace(/<script>window\.onload=function\(\)\{window\.print\(\);\}<\/script>/g, "")
    .replace(/<button class="no-print"[\s\S]*?<\/button>/g, "");
}

/** Unicode-safe base64 encoding for HTML content. */
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export interface SendDocumentParams {
  /** Client email — required when sendEmail is true. */
  email?: string;
  /** CRM contact id — required when sendPortal is true. */
  contactId?: number | null;
  /** Document title (Arabic) — used as email subject and portal document title. */
  titleAr: string;
  titleEn?: string;
  /** documents.category value, e.g. "proposal" | "contract" | "invoice" | "voucher" | "letter". */
  category: string;
  /** Full printable HTML of the document. */
  html: string;
  sendEmail: boolean;
  sendPortal: boolean;
}

export interface SendDocumentResult {
  emailOk: boolean;
  portalOk: boolean;
  errors: string[];
}

/** Sends a copy of a document to the client's email and/or the client portal (as a shared document). */
export async function sendDocumentToClient(p: SendDocumentParams): Promise<SendDocumentResult> {
  const result: SendDocumentResult = { emailOk: false, portalOk: false, errors: [] };
  const cleanHtml = stripAutoPrint(p.html);

  if (p.sendEmail) {
    try {
      if (!p.email) throw new Error("No email");
      await apiRequest("POST", "/api/email/send", {
        to: p.email,
        subject: p.titleAr + (p.titleEn ? ` | ${p.titleEn}` : ""),
        html: cleanHtml,
        category: "document",
      });
      result.emailOk = true;
    } catch (e: any) {
      result.errors.push(`email: ${e?.message || e}`);
    }
  }

  if (p.sendPortal) {
    try {
      if (!p.contactId) throw new Error("No contact");
      const fileContent = toBase64(cleanHtml);
      await apiRequest("POST", "/api/crm-documents", {
        titleAr: p.titleAr,
        titleEn: p.titleEn || null,
        category: p.category,
        fileContent,
        originalName: `${p.titleAr}.html`,
        mimeType: "text/html",
        fileSize: Math.ceil(fileContent.length * 0.75),
        contactId: p.contactId,
        clientVisible: true,
        description: p.titleEn || null,
      });
      result.portalOk = true;
    } catch (e: any) {
      result.errors.push(`portal: ${e?.message || e}`);
    }
  }

  return result;
}
