import { db } from "./db";
import { appData, systemBackups } from "@shared/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import JSZip from "jszip";
import { BACKUP_MODULES, dumpTable } from "./backup";
import { log } from "./index";

export type BackupType = "manual" | "auto_daily" | "auto_weekly" | "auto_monthly" | "pre_restore";

export type BackupSettings = {
  dailyEnabled: boolean;
  dailyHour: number;
  weeklyEnabled: boolean;
  weeklyDay: number;
  weeklyHour: number;
  monthlyEnabled: boolean;
  monthlyHour: number;
  retainDaily: number;
  retainWeekly: number;
  retainMonthly: number;
  retainManual: number;
};

const SETTINGS_KEY = "scapex_backup_settings";

export const DEFAULT_SETTINGS: BackupSettings = {
  dailyEnabled: true,
  dailyHour: 2,
  weeklyEnabled: true,
  weeklyDay: 5,
  weeklyHour: 3,
  monthlyEnabled: true,
  monthlyHour: 4,
  retainDaily: 7,
  retainWeekly: 4,
  retainMonthly: 3,
  retainManual: 10,
};

export async function getBackupSettings(): Promise<BackupSettings> {
  const [row] = await db.select().from(appData).where(eq(appData.key, SETTINGS_KEY));
  if (!row) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...((row.value as any) || {}) };
}

function validateSettings(patch: Partial<BackupSettings>): Partial<BackupSettings> {
  const out: Partial<BackupSettings> = {};
  const intInRange = (v: any, min: number, max: number): number | undefined => {
    const n = parseInt(String(v), 10);
    if (!Number.isFinite(n)) return undefined;
    return Math.max(min, Math.min(max, n));
  };
  if (patch.dailyEnabled !== undefined) out.dailyEnabled = !!patch.dailyEnabled;
  if (patch.weeklyEnabled !== undefined) out.weeklyEnabled = !!patch.weeklyEnabled;
  if (patch.monthlyEnabled !== undefined) out.monthlyEnabled = !!patch.monthlyEnabled;
  if (patch.dailyHour !== undefined)   { const v = intInRange(patch.dailyHour, 0, 23);   if (v !== undefined) out.dailyHour = v; }
  if (patch.weeklyHour !== undefined)  { const v = intInRange(patch.weeklyHour, 0, 23);  if (v !== undefined) out.weeklyHour = v; }
  if (patch.monthlyHour !== undefined) { const v = intInRange(patch.monthlyHour, 0, 23); if (v !== undefined) out.monthlyHour = v; }
  if (patch.weeklyDay !== undefined)   { const v = intInRange(patch.weeklyDay, 0, 6);    if (v !== undefined) out.weeklyDay = v; }
  if (patch.retainDaily !== undefined)   { const v = intInRange(patch.retainDaily, 1, 90);   if (v !== undefined) out.retainDaily = v; }
  if (patch.retainWeekly !== undefined)  { const v = intInRange(patch.retainWeekly, 1, 52);  if (v !== undefined) out.retainWeekly = v; }
  if (patch.retainMonthly !== undefined) { const v = intInRange(patch.retainMonthly, 1, 24); if (v !== undefined) out.retainMonthly = v; }
  if (patch.retainManual !== undefined)  { const v = intInRange(patch.retainManual, 1, 100); if (v !== undefined) out.retainManual = v; }
  return out;
}

export async function saveBackupSettings(patch: Partial<BackupSettings>): Promise<BackupSettings> {
  const current = await getBackupSettings();
  const clean = validateSettings(patch);
  const merged: BackupSettings = { ...current, ...clean };
  const [existing] = await db.select().from(appData).where(eq(appData.key, SETTINGS_KEY));
  if (existing) {
    await db.update(appData).set({ value: merged as any, updatedAt: new Date() }).where(eq(appData.key, SETTINGS_KEY));
  } else {
    await db.insert(appData).values({ key: SETTINGS_KEY, value: merged as any });
  }
  return merged;
}

async function buildBackupZip(): Promise<{
  buffer: Buffer;
  manifest: any;
  errors: Record<string, string>;
  totalRows: number;
  tableCount: number;
}> {
  const zip = new JSZip();
  const rowCounts: Record<string, number> = {};
  const errors: Record<string, string> = {};
  let totalRows = 0;
  let tableCount = 0;
  for (const mod of BACKUP_MODULES) {
    for (const t of mod.tables) {
      try {
        const rows = await dumpTable(t);
        zip.file(`${mod.id}/${t}.json`, JSON.stringify(rows, null, 2));
        rowCounts[t] = rows.length;
        totalRows += rows.length;
        tableCount += 1;
      } catch (e: any) {
        errors[t] = e?.message || String(e);
      }
    }
  }
  const manifest = {
    product: "Scapex ERP",
    exportedAt: new Date().toISOString(),
    modules: BACKUP_MODULES.map((m) => ({ id: m.id, tables: m.tables })),
    rowCounts,
    errors,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return { buffer, manifest, errors, totalRows, tableCount };
}

export async function createBackup(opts: {
  type: BackupType;
  createdBy?: string;
  createdByName?: string;
}): Promise<{ id: number; status: string; errorCount: number; sizeBytes: number }> {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `scapex-${opts.type}-${stamp}.zip`;
  try {
    const { buffer, manifest, errors, totalRows, tableCount } = await buildBackupZip();
    const errorCount = Object.keys(errors).length;
    const status = errorCount === 0 ? "success" : "partial";
    const base64 = buffer.toString("base64");
    const [inserted] = await db.insert(systemBackups).values({
      type: opts.type,
      filename,
      status,
      sizeBytes: buffer.length,
      tableCount,
      totalRows,
      errorCount,
      errors: errors as any,
      manifest: manifest as any,
      fileContent: base64,
      createdBy: opts.createdBy,
      createdByName: opts.createdByName,
    }).returning({ id: systemBackups.id });
    await applyRetention(opts.type);
    return { id: inserted.id, status, errorCount, sizeBytes: buffer.length };
  } catch (e: any) {
    const [inserted] = await db.insert(systemBackups).values({
      type: opts.type,
      filename,
      status: "failed",
      errors: { _fatal: e?.message || String(e) } as any,
      createdBy: opts.createdBy,
      createdByName: opts.createdByName,
    }).returning({ id: systemBackups.id });
    return { id: inserted.id, status: "failed", errorCount: 1, sizeBytes: 0 };
  }
}

async function applyRetention(type: BackupType) {
  const s = await getBackupSettings();
  const keep =
    type === "auto_daily" ? s.retainDaily :
    type === "auto_weekly" ? s.retainWeekly :
    type === "auto_monthly" ? s.retainMonthly :
    type === "manual" ? s.retainManual :
    50;
  const rows = await db.select({ id: systemBackups.id })
    .from(systemBackups)
    .where(eq(systemBackups.type, type))
    .orderBy(desc(systemBackups.createdAt));
  const toDelete = rows.slice(keep).map((r) => r.id);
  if (toDelete.length) {
    await db.delete(systemBackups).where(inArray(systemBackups.id, toDelete));
    log(`backup retention: removed ${toDelete.length} old ${type} backup(s)`, "backup");
  }
}

export async function listBackups(opts: { type?: string; limit?: number } = {}) {
  const limit = Math.min(opts.limit || 100, 200);
  const rows = opts.type
    ? await db.select({
        id: systemBackups.id, type: systemBackups.type, filename: systemBackups.filename,
        status: systemBackups.status, sizeBytes: systemBackups.sizeBytes,
        tableCount: systemBackups.tableCount, totalRows: systemBackups.totalRows,
        errorCount: systemBackups.errorCount, createdBy: systemBackups.createdBy,
        createdByName: systemBackups.createdByName, createdAt: systemBackups.createdAt,
      }).from(systemBackups).where(eq(systemBackups.type, opts.type)).orderBy(desc(systemBackups.createdAt)).limit(limit)
    : await db.select({
        id: systemBackups.id, type: systemBackups.type, filename: systemBackups.filename,
        status: systemBackups.status, sizeBytes: systemBackups.sizeBytes,
        tableCount: systemBackups.tableCount, totalRows: systemBackups.totalRows,
        errorCount: systemBackups.errorCount, createdBy: systemBackups.createdBy,
        createdByName: systemBackups.createdByName, createdAt: systemBackups.createdAt,
      }).from(systemBackups).orderBy(desc(systemBackups.createdAt)).limit(limit);
  return rows;
}

export async function getBackupFile(id: number) {
  const [row] = await db.select().from(systemBackups).where(eq(systemBackups.id, id));
  return row || null;
}

export async function deleteBackup(id: number) {
  await db.delete(systemBackups).where(eq(systemBackups.id, id));
}

export async function getBackupStatus() {
  const settings = await getBackupSettings();
  const [lastSuccess] = await db.select({
    id: systemBackups.id, type: systemBackups.type, createdAt: systemBackups.createdAt,
    sizeBytes: systemBackups.sizeBytes, totalRows: systemBackups.totalRows,
  }).from(systemBackups).where(eq(systemBackups.status, "success")).orderBy(desc(systemBackups.createdAt)).limit(1);

  const totalCountResult = await db.execute(sql`SELECT COUNT(*)::int AS c, COALESCE(SUM(size_bytes),0)::bigint AS s FROM system_backups`);
  const stats = (totalCountResult as any).rows?.[0] || { c: 0, s: 0 };

  return {
    settings,
    lastSuccess: lastSuccess || null,
    nextDaily: settings.dailyEnabled ? nextOccurrence(settings.dailyHour, 0, null) : null,
    nextWeekly: settings.weeklyEnabled ? nextOccurrence(settings.weeklyHour, 0, settings.weeklyDay) : null,
    nextMonthly: settings.monthlyEnabled ? nextMonthlyOccurrence(settings.monthlyHour, settings.weeklyDay) : null,
    totalCount: Number(stats.c) || 0,
    totalSize: Number(stats.s) || 0,
    schedulerRunning: schedulerRunning,
  };
}

function nextOccurrence(hour: number, minute: number, weekday: number | null): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (weekday === null) {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else {
    const today = next.getDay();
    let diff = (weekday - today + 7) % 7;
    if (diff === 0 && next <= now) diff = 7;
    next.setDate(next.getDate() + diff);
  }
  return next.toISOString();
}

function nextMonthlyOccurrence(hour: number, weekday: number): string {
  const now = new Date();
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const candidate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1, hour, 0, 0, 0);
    const dayOfMonthOfWeekday = ((weekday - candidate.getDay() + 7) % 7) + 1;
    candidate.setDate(dayOfMonthOfWeekday);
    if (candidate > now) return candidate.toISOString();
  }
  return "";
}

let schedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;
let tickInFlight = false;

async function hasBackupSince(type: BackupType, since: Date): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1 FROM system_backups
    WHERE type = ${type} AND created_at >= ${since.toISOString()} AND status <> 'failed'
    LIMIT 1
  `);
  return ((result as any).rows || []).length > 0;
}

async function tick() {
  if (tickInFlight) {
    log("scheduler tick skipped — previous run still in progress", "backup");
    return;
  }
  tickInFlight = true;
  try {
    const s = await getBackupSettings();
    const now = new Date();

    if (s.dailyEnabled && now.getHours() >= s.dailyHour) {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), s.dailyHour, 0, 0, 0);
      if (!(await hasBackupSince("auto_daily", startOfDay))) {
        log(`scheduled daily backup starting...`, "backup");
        const r = await createBackup({ type: "auto_daily", createdByName: "Scheduler" });
        log(`daily backup #${r.id} ${r.status} (${(r.sizeBytes / 1024).toFixed(1)}KB)`, "backup");
      }
    }

    if (s.weeklyEnabled && now.getDay() === s.weeklyDay && now.getHours() >= s.weeklyHour) {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), s.weeklyHour, 0, 0, 0);
      if (!(await hasBackupSince("auto_weekly", startOfDay))) {
        log(`scheduled weekly backup starting...`, "backup");
        const r = await createBackup({ type: "auto_weekly", createdByName: "Scheduler" });
        log(`weekly backup #${r.id} ${r.status} (${(r.sizeBytes / 1024).toFixed(1)}KB)`, "backup");
      }
    }

    if (s.monthlyEnabled && now.getDay() === s.weeklyDay && now.getDate() <= 7 && now.getHours() >= s.monthlyHour) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      if (!(await hasBackupSince("auto_monthly", startOfMonth))) {
        log(`scheduled monthly backup starting...`, "backup");
        const r = await createBackup({ type: "auto_monthly", createdByName: "Scheduler" });
        log(`monthly backup #${r.id} ${r.status} (${(r.sizeBytes / 1024).toFixed(1)}KB)`, "backup");
      }
    }
  } catch (e: any) {
    console.error("[backup] scheduler tick error:", e?.message || e);
  } finally {
    tickInFlight = false;
  }
}

export function startBackupScheduler() {
  if (schedulerInterval) return;
  schedulerRunning = true;
  schedulerInterval = setInterval(tick, 5 * 60 * 1000);
  setTimeout(tick, 30 * 1000).unref?.();
  log("backup scheduler started (5-min interval)", "backup");
}
