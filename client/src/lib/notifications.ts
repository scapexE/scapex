import { dbGetItem, dbSetItem } from "@/lib/dbStorage";
export interface AppNotification {
  id: string;
  timestamp: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  module?: string;
  link?: string;
}

const STORAGE_KEY = "scapex_notifications";
const MAX_NOTIFICATIONS = 100;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getNotifications(): AppNotification[] {
  try {
    return JSON.parse(dbGetItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function save(list: AppNotification[]) {
  dbSetItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("scapex_notification_update"));
}

export function addNotification(
  n: Omit<AppNotification, "id" | "timestamp" | "read">,
): void {
  const list = getNotifications();
  list.unshift({
    ...n,
    id: generateId(),
    timestamp: new Date().toISOString(),
    read: false,
  });
  if (list.length > MAX_NOTIFICATIONS) list.length = MAX_NOTIFICATIONS;
  save(list);
}

export function markAsRead(id: string): void {
  const list = getNotifications();
  const item = list.find((n) => n.id === id);
  if (item) {
    item.read = true;
    save(list);
  }
}

export function markAllRead(): void {
  const list = getNotifications();
  list.forEach((n) => (n.read = true));
  save(list);
}

export function removeNotification(id: string): void {
  save(getNotifications().filter((n) => n.id !== id));
}

export function clearNotifications(): void {
  save([]);
}

export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

export function seedDemoNotifications(): void {
  if (getNotifications().length > 0 || dbGetItem("scapex_notifications_seeded")) return;
  dbSetItem("scapex_notifications_seeded", "1");
  const now = Date.now();
  const demos: Omit<AppNotification, "id" | "timestamp" | "read">[] = [
    {
      titleEn: "New project task assigned",
      titleAr: "مهمة مشروع جديدة",
      bodyEn: "Project PRJ-2024-042 has a new task assigned to you",
      bodyAr: "المشروع PRJ-2024-042 لديه مهمة جديدة مسندة إليك",
      type: "warning",
      module: "projects",
      link: "/projects",
    },
    {
      titleEn: "Payroll processed",
      titleAr: "تمت معالجة الرواتب",
      bodyEn: "March 2026 payroll has been processed successfully",
      bodyAr: "تمت معالجة رواتب مارس 2026 بنجاح",
      type: "success",
      module: "payroll",
      link: "/payroll",
    },
    {
      titleEn: "Low inventory alert",
      titleAr: "تنبيه مخزون منخفض",
      bodyEn: "5 items are below minimum stock level",
      bodyAr: "5 أصناف أقل من الحد الأدنى للمخزون",
      type: "error",
      module: "inventory",
      link: "/inventory",
    },
    {
      titleEn: "New client registered",
      titleAr: "تسجيل عميل جديد",
      bodyEn: "Al-Rashid Construction has registered on the client portal",
      bodyAr: "شركة الراشد للمقاولات سجلت في بوابة العملاء",
      type: "info",
      module: "client_portal",
      link: "/client-portal",
    },
    {
      titleEn: "HSE incident reported",
      titleAr: "تم الإبلاغ عن حادثة سلامة",
      bodyEn: "Minor incident reported at Site #7 - Riyadh",
      bodyAr: "تم الإبلاغ عن حادثة بسيطة في الموقع رقم 7 - الرياض",
      type: "warning",
      module: "hse",
      link: "/hse",
    },
  ];
  demos.forEach((d, i) => {
    const list = getNotifications();
    list.push({
      ...d,
      id: generateId() + i,
      timestamp: new Date(now - i * 3600000).toISOString(),
      read: false,
    });
    dbSetItem(STORAGE_KEY, JSON.stringify(list));
  });
  window.dispatchEvent(new CustomEvent("scapex_notification_update"));
}

export const TYPE_STYLES: Record<AppNotification["type"], { icon: string; color: string }> = {
  info: { icon: "ℹ️", color: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" },
  success: { icon: "✅", color: "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20" },
  warning: { icon: "⚠️", color: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" },
  error: { icon: "🔴", color: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" },
};
