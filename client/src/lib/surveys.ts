export interface Survey {
  id: string;
  customerId: string;
  customerName: string;
  sentVia: "email" | "whatsapp";
  sentAt: string;
  status: "sent" | "responded" | "expired";
  rating?: number;
  feedback?: string;
  feedbackEn?: string;
  respondedAt?: string;
  serviceQuality?: number;
  communication?: number;
  timeliness?: number;
  valueForMoney?: number;
  recommendation?: "yes" | "maybe" | "no";
}

const STORAGE_KEY = "scapex_surveys";

export function getSurveys(): Survey[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

export function saveSurveys(surveys: Survey[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
  window.dispatchEvent(new CustomEvent("scapex_surveys_update"));
}

export function addSurvey(survey: Omit<Survey, "id">): Survey {
  const surveys = getSurveys();
  const newSurvey: Survey = { ...survey, id: `SRV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
  surveys.unshift(newSurvey);
  saveSurveys(surveys);
  return newSurvey;
}

export function getSurveysByCustomer(customerId: string): Survey[] {
  return getSurveys().filter(s => s.customerId === customerId);
}

export function simulateResponse(surveyId: string): Survey | null {
  const surveys = getSurveys();
  const idx = surveys.findIndex(s => s.id === surveyId);
  if (idx === -1) return null;
  const ratings = [3, 4, 4, 5, 5, 5, 4, 3, 5, 4];
  const feedbacksAr = [
    "خدمة ممتازة وفريق عمل محترف. شكراً لكم!",
    "جودة العمل عالية لكن التسليم تأخر قليلاً.",
    "تجربة رائعة، سنتعامل معكم مجدداً بإذن الله.",
    "المشروع نُفذ بشكل جيد مع بعض الملاحظات البسيطة.",
    "أداء متميز في كل المراحل. نوصي بالتعامل معكم.",
    "التواصل كان ممتازاً والنتائج تجاوزت التوقعات.",
    "عمل جيد بشكل عام، نأمل تحسين سرعة الاستجابة.",
    "فريق عمل ملتزم ومحترف. شكراً على الجهود.",
  ];
  const feedbacksEn = [
    "Excellent service and professional team. Thank you!",
    "High quality work but delivery was slightly delayed.",
    "Great experience, we will work with you again.",
    "Project was executed well with some minor notes.",
    "Outstanding performance at every stage. Highly recommended.",
    "Communication was excellent and results exceeded expectations.",
    "Good work overall, we hope to see faster response times.",
    "Committed and professional team. Thanks for the efforts.",
  ];
  const recs: ("yes" | "maybe" | "no")[] = ["yes", "yes", "yes", "maybe", "yes", "yes", "maybe", "yes"];
  const pick = Math.floor(Math.random() * ratings.length);

  surveys[idx] = {
    ...surveys[idx],
    status: "responded",
    rating: ratings[pick],
    feedback: feedbacksAr[pick % feedbacksAr.length],
    feedbackEn: feedbacksEn[pick % feedbacksEn.length],
    respondedAt: new Date().toISOString(),
    serviceQuality: Math.min(5, ratings[pick] + Math.floor(Math.random() * 2) - 1),
    communication: Math.min(5, ratings[pick] + Math.floor(Math.random() * 2)),
    timeliness: Math.max(2, ratings[pick] - Math.floor(Math.random() * 2)),
    valueForMoney: Math.min(5, ratings[pick] + Math.floor(Math.random() * 2) - 1),
    recommendation: recs[pick % recs.length],
  };
  saveSurveys(surveys);
  return surveys[idx];
}

export function getSurveyStats(customerId?: string) {
  const all = customerId ? getSurveysByCustomer(customerId) : getSurveys();
  const responded = all.filter(s => s.status === "responded");
  const avgRating = responded.length > 0 ? responded.reduce((s, r) => s + (r.rating || 0), 0) / responded.length : 0;
  const avgService = responded.length > 0 ? responded.reduce((s, r) => s + (r.serviceQuality || 0), 0) / responded.length : 0;
  const avgComm = responded.length > 0 ? responded.reduce((s, r) => s + (r.communication || 0), 0) / responded.length : 0;
  const avgTime = responded.length > 0 ? responded.reduce((s, r) => s + (r.timeliness || 0), 0) / responded.length : 0;
  const avgValue = responded.length > 0 ? responded.reduce((s, r) => s + (r.valueForMoney || 0), 0) / responded.length : 0;
  const recommends = responded.filter(r => r.recommendation === "yes").length;

  return {
    total: all.length,
    responded: responded.length,
    pending: all.filter(s => s.status === "sent").length,
    expired: all.filter(s => s.status === "expired").length,
    avgRating: Math.round(avgRating * 10) / 10,
    avgService: Math.round(avgService * 10) / 10,
    avgComm: Math.round(avgComm * 10) / 10,
    avgTime: Math.round(avgTime * 10) / 10,
    avgValue: Math.round(avgValue * 10) / 10,
    recommendRate: responded.length > 0 ? Math.round((recommends / responded.length) * 100) : 0,
    responseRate: all.length > 0 ? Math.round((responded.length / all.length) * 100) : 0,
  };
}

export function seedDemoSurveys(): void {
  if (localStorage.getItem("scapex_surveys_seeded")) return;
  const demoSurveys: Survey[] = [
    { id: "SRV-DEMO-001", customerId: "1", customerName: "Saudi Binladin Group", sentVia: "email", sentAt: "2025-12-15T10:30:00Z", status: "responded", rating: 5, feedback: "خدمة ممتازة وفريق عمل محترف. شكراً لكم!", feedbackEn: "Excellent service and professional team. Thank you!", respondedAt: "2025-12-16T14:20:00Z", serviceQuality: 5, communication: 5, timeliness: 4, valueForMoney: 5, recommendation: "yes" },
    { id: "SRV-DEMO-002", customerId: "2", customerName: "NEOM Co.", sentVia: "whatsapp", sentAt: "2025-12-20T09:00:00Z", status: "responded", rating: 4, feedback: "جودة العمل عالية لكن التسليم تأخر قليلاً.", feedbackEn: "High quality work but delivery was slightly delayed.", respondedAt: "2025-12-21T11:45:00Z", serviceQuality: 5, communication: 4, timeliness: 3, valueForMoney: 4, recommendation: "yes" },
    { id: "SRV-DEMO-003", customerId: "3", customerName: "Red Sea Global", sentVia: "email", sentAt: "2026-01-05T08:15:00Z", status: "responded", rating: 5, feedback: "تجربة رائعة، سنتعامل معكم مجدداً بإذن الله.", feedbackEn: "Great experience, we will work with you again.", respondedAt: "2026-01-06T16:30:00Z", serviceQuality: 5, communication: 5, timeliness: 5, valueForMoney: 4, recommendation: "yes" },
    { id: "SRV-DEMO-004", customerId: "7", customerName: "Aramco", sentVia: "email", sentAt: "2026-01-10T07:45:00Z", status: "responded", rating: 5, feedback: "أداء متميز في كل المراحل. نوصي بالتعامل معكم.", feedbackEn: "Outstanding performance at every stage. Highly recommended.", respondedAt: "2026-01-11T09:00:00Z", serviceQuality: 5, communication: 5, timeliness: 5, valueForMoney: 5, recommendation: "yes" },
    { id: "SRV-DEMO-005", customerId: "6", customerName: "Dar Al Arkan", sentVia: "whatsapp", sentAt: "2026-02-01T12:00:00Z", status: "responded", rating: 4, feedback: "المشروع نُفذ بشكل جيد مع بعض الملاحظات البسيطة.", feedbackEn: "Project was executed well with some minor notes.", respondedAt: "2026-02-02T10:15:00Z", serviceQuality: 4, communication: 4, timeliness: 4, valueForMoney: 3, recommendation: "maybe" },
    { id: "SRV-DEMO-006", customerId: "1", customerName: "Saudi Binladin Group", sentVia: "whatsapp", sentAt: "2026-03-01T11:00:00Z", status: "sent" },
    { id: "SRV-DEMO-007", customerId: "8", customerName: "SABIC", sentVia: "email", sentAt: "2026-03-10T08:30:00Z", status: "sent" },
  ];
  saveSurveys(demoSurveys);
  localStorage.setItem("scapex_surveys_seeded", "1");
}
