export interface SignatureRecord {
  id: string;
  signerName: string;
  signerRole: string;
  signatureDataUrl: string;
  documentType: "proposal" | "contract" | "invoice" | "letter";
  documentId: string;
  documentNumber: string;
  party: "first" | "second";
  signedAt: string;
}

const STORAGE_KEY = "scapex_signatures";

export function getSignatures(): SignatureRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSignature(sig: SignatureRecord): void {
  const all = getSignatures();
  const idx = all.findIndex(
    (s) => s.documentId === sig.documentId && s.documentType === sig.documentType && s.party === sig.party,
  );
  if (idx >= 0) all[idx] = sig;
  else all.push(sig);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getDocumentSignatures(
  documentId: string,
): { first?: SignatureRecord; second?: SignatureRecord } {
  const all = getSignatures().filter((s) => s.documentId === documentId);
  return {
    first: all.find((s) => s.party === "first"),
    second: all.find((s) => s.party === "second"),
  };
}

export function deleteSignature(documentId: string, party: "first" | "second"): void {
  const all = getSignatures().filter(
    (s) => !(s.documentId === documentId && s.party === party),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getSavedSignatureImage(): string | null {
  try {
    return localStorage.getItem("scapex_default_signature");
  } catch {
    return null;
  }
}

export function saveDefaultSignature(dataUrl: string): void {
  localStorage.setItem("scapex_default_signature", dataUrl);
}
