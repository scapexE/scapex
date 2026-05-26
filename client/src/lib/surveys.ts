import { scopedFetch } from "@/lib/queryClient";

export interface SurveyQuestion {
  id: string;
  labelAr: string;
  labelEn: string;
  type?: "rating" | "text" | "recommendation";
}

export interface SurveyResponse {
  id: number;
  rating: number | null;
  answers: Record<string, string | number>;
  feedback: string | null;
  recommendation: "yes" | "maybe" | "no" | null;
  submittedAt: string;
}

export interface Survey {
  id: number;
  token: string;
  contactId: number | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  sentVia: "email" | "whatsapp" | "link";
  message: string | null;
  questions: SurveyQuestion[];
  status: "sent" | "responded" | "expired";
  sentAt: string;
  respondedAt: string | null;
  expiresAt: string | null;
  response: SurveyResponse | null;
  link?: string;
}

export interface CreateSurveyInput {
  recipients: Array<{ contactId?: number; name: string; email?: string; phone?: string }>;
  questions: SurveyQuestion[];
  sentVia: "email" | "whatsapp" | "link";
  message: string;
  isRtl: boolean;
}

export interface CreateSurveyResult {
  success: boolean;
  surveys: Survey[];
  emailsSent: number;
  emailsFailed: number;
  emailErrors?: Array<{ to: string; error?: string }>;
}

export async function fetchSurveys(contactId?: number | string): Promise<Survey[]> {
  const url = contactId != null
    ? `/api/surveys?contactId=${encodeURIComponent(String(contactId))}`
    : "/api/surveys";
  const res = await scopedFetch(url);
  if (!res.ok) return [];
  return res.json();
}

export async function createSurveys(input: CreateSurveyInput): Promise<CreateSurveyResult> {
  const res = await scopedFetch("/api/surveys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to create surveys");
  }
  return res.json();
}

export async function deleteSurvey(id: number): Promise<void> {
  await scopedFetch(`/api/surveys/${id}`, { method: "DELETE" });
}

// Compute breakdown stats from real survey responses
export function computeStats(surveys: Survey[]) {
  const responded = surveys.filter(s => s.status === "responded" && s.response);
  const ratings = responded.map(s => s.response?.rating || 0).filter(Boolean);
  const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

  const collect = (key: string) => responded
    .map(s => Number(s.response?.answers?.[key] || 0))
    .filter(v => v > 0);

  const recommends = responded.filter(s => s.response?.recommendation === "yes").length;

  return {
    total: surveys.length,
    responded: responded.length,
    pending: surveys.filter(s => s.status === "sent").length,
    expired: surveys.filter(s => s.status === "expired").length,
    avgRating: avg(ratings),
    avgService: avg(collect("serviceQuality")),
    avgComm: avg(collect("communication")),
    avgTime: avg(collect("timeliness")),
    avgValue: avg(collect("valueForMoney")),
    recommendRate: responded.length ? Math.round((recommends / responded.length) * 100) : 0,
    responseRate: surveys.length ? Math.round((responded.length / surveys.length) * 100) : 0,
  };
}
