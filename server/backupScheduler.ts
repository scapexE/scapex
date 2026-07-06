import { db, pool } from "./db";
import { appData, systemBackups } from "@shared/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { BACKUP_MODULES, dumpTable } from "./backup";
import { log } from "./index";
import { sendEmail } from "./email";

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
  emailEnabled: boolean;
  emailRecipient: string;
  emailFormat: "xlsx" | "pdf";
};

const SETTINGS_KEY = "scapex_backup_settings";

export const DEFAULT_SETTINGS: BackupSettings = {
  dailyEnabled: true,
  dailyHour: 2,
  weeklyEnabled: true,
  weeklyDay: 5,
  weeklyHour: 1,
  monthlyEnabled: true,
  monthlyHour: 4,
  retainDaily: 7,
  retainWeekly: 4,
  retainMonthly: 3,
  retainManual: 10,
  emailEnabled: false,
  emailRecipient: "",
  emailFormat: "xlsx",
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
  if (patch.emailEnabled !== undefined) out.emailEnabled = !!patch.emailEnabled;
  if (patch.emailRecipient !== undefined) out.emailRecipient = String(patch.emailRecipient || "").trim().slice(0, 200);
  if (patch.emailFormat !== undefined) out.emailFormat = patch.emailFormat === "pdf" ? "pdf" : "xlsx";
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

// ─── RESTORE ──────────────────────────────────────────────────────────────
const SAFE_IDENT_RE = /^[a-z_][a-z0-9_]*$/;
const PROTECTED_TABLES = new Set(["system_backups"]);

async function getTableColumns(client: any, table: string): Promise<string[]> {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return r.rows.map((row: any) => row.column_name);
}

async function getJsonbColumns(client: any, table: string): Promise<Set<string>> {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
       AND data_type IN ('jsonb', 'json')`,
    [table],
  );
  return new Set(r.rows.map((row: any) => row.column_name));
}

function coerceValue(v: any, isJsonb: boolean): any {
  if (v === null || v === undefined) return null;
  if (isJsonb) {
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  }
  if (typeof v === "object" && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return JSON.stringify(v);
  }
  return v;
}

export async function restoreBackup(opts: {
  id: number;
  actorId?: string;
  actorName?: string;
}): Promise<{
  preRestoreId: number | null;
  tablesRestored: number;
  rowsInserted: number;
  errors: Record<string, string>;
  status: "success" | "partial" | "failed";
}> {
  if (restoreInProgress) throw new Error("Another restore is already in progress");
  restoreInProgress = true;
  try {
  const row = await getBackupFile(opts.id);
  if (!row) throw new Error("Backup not found");
  if (!row.fileContent) throw new Error("Backup file content is missing");

  log(`restore #${opts.id}: creating pre_restore snapshot...`, "backup");
  let preRestoreId: number | null = null;
  try {
    const snap = await createBackup({
      type: "pre_restore",
      createdBy: opts.actorId,
      createdByName: opts.actorName ? `Pre-restore by ${opts.actorName}` : "Pre-restore",
    });
    preRestoreId = snap.id;
    log(`restore #${opts.id}: pre_restore snapshot #${snap.id} created (${snap.status})`, "backup");
  } catch (e: any) {
    throw new Error(`Pre-restore snapshot failed, aborting restore: ${e?.message || e}`);
  }

  const zip = await JSZip.loadAsync(Buffer.from(row.fileContent, "base64"));
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("Backup ZIP missing manifest.json");
  const manifest = JSON.parse(await manifestFile.async("string"));
  const moduleSpecs: { id: string; tables: string[] }[] = manifest.modules || [];

  const orderedTables: { module: string; table: string }[] = [];
  for (const m of moduleSpecs) {
    for (const t of m.tables) {
      if (!SAFE_IDENT_RE.test(t)) { continue; }
      if (PROTECTED_TABLES.has(t)) { continue; }
      orderedTables.push({ module: m.id, table: t });
    }
  }

  const errors: Record<string, string> = {};
  let tablesRestored = 0;
  let rowsInserted = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL session_replication_role = 'replica'");

    for (const { module, table } of orderedTables) {
      try {
        const entry = zip.file(`${module}/${table}.json`);
        if (!entry) { errors[table] = "Missing in archive"; continue; }
        const rows = JSON.parse(await entry.async("string")) as any[];
        if (!Array.isArray(rows)) { errors[table] = "Invalid file format"; continue; }

        const dbCols = await getTableColumns(client, table);
        if (dbCols.length === 0) { errors[table] = "Table does not exist"; continue; }
        const colSet = new Set(dbCols);
        const jsonbCols = await getJsonbColumns(client, table);

        await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);

        if (rows.length > 0) {
          const cols = Object.keys(rows[0]).filter((c) => colSet.has(c));
          if (cols.length === 0) { errors[table] = "No matching columns"; continue; }
          const colList = cols.map((c) => `"${c}"`).join(", ");
          const BATCH = 200;
          for (let i = 0; i < rows.length; i += BATCH) {
            const slice = rows.slice(i, i + BATCH);
            const values: any[] = [];
            const placeholders = slice.map((r, ri) => {
              const tuple = cols.map((c, ci) => {
                values.push(coerceValue(r[c], jsonbCols.has(c)));
                return `$${ri * cols.length + ci + 1}`;
              });
              return `(${tuple.join(", ")})`;
            }).join(", ");
            await client.query(`INSERT INTO "${table}" (${colList}) VALUES ${placeholders}`, values);
            rowsInserted += slice.length;
          }
        }

        const seqRes = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [table]);
        const seq = seqRes.rows[0]?.seq;
        if (seq) {
          await client.query(
            `SELECT setval($1, COALESCE((SELECT MAX(id) FROM "${table}"), 1), (SELECT COUNT(*) FROM "${table}") > 0)`,
            [seq],
          );
        }

        tablesRestored++;
      } catch (e: any) {
        errors[table] = e?.message || String(e);
      }
    }

    if (Object.keys(errors).length > 0) {
      await client.query("ROLLBACK");
      log(`restore #${opts.id}: failed atomically (${Object.keys(errors).length} table errors) — no data changed`, "backup");
      return { preRestoreId, tablesRestored: 0, rowsInserted: 0, errors, status: "failed" };
    }
    await client.query("SET LOCAL session_replication_role = 'origin'");
    await client.query("COMMIT");
  } catch (e: any) {
    try { await client.query("ROLLBACK"); } catch {}
    throw new Error(`Restore transaction failed: ${e?.message || e}`);
  } finally {
    client.release();
  }

  log(`restore #${opts.id}: success (${tablesRestored} tables, ${rowsInserted} rows)`, "backup");
  return { preRestoreId, tablesRestored, rowsInserted, errors, status: "success" };
  } finally {
    restoreInProgress = false;
  }
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

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────

export async function buildExcelBackup(): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  const now = new Date();

  // Summary sheet
  const summaryData: any[][] = [
    ["Scapex ERP — نسخة احتياطية تلقائية"],
    ["تاريخ النسخ", now.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })],
    [""],
    ["الموديول", "اسم الجدول", "عدد السجلات"],
  ];

  for (const mod of BACKUP_MODULES) {
    for (const t of mod.tables) {
      try {
        const rows = await dumpTable(t);
        summaryData.push([mod.labelAr, t, rows.length]);

        // Add data sheet for each table (limit 10,000 rows)
        if (rows.length > 0) {
          const sheetName = t.slice(0, 31);
          const ws = XLSX.utils.json_to_sheet(rows.slice(0, 10000));
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      } catch (e: any) {
        summaryData.push([mod.labelAr, t, `خطأ: ${e?.message || e}`]);
      }
    }
  }

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 30 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "ملخص");

  // Move summary to first position
  const sheets = wb.SheetNames;
  const summaryIdx = sheets.indexOf("ملخص");
  if (summaryIdx > 0) {
    sheets.splice(summaryIdx, 1);
    sheets.unshift("ملخص");
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── EMAIL BACKUP ──────────────────────────────────────────────────────────

export async function sendBackupEmail(opts: {
  recipient: string;
  format: "xlsx" | "pdf";
  backupType?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const stamp = now.toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh", year: "numeric", month: "long", day: "numeric" });
    const dateSlug = now.toISOString().slice(0, 10);
    const xlsxFilename = `scapex-backup-${dateSlug}.xlsx`;
    const zipFilename = `scapex-backup-${dateSlug}.zip`;

    log(`sending backup email to ${opts.recipient} (xlsx + zip)...`, "backup");

    const [excelBuffer, zipResult] = await Promise.all([
      buildExcelBackup(),
      buildFullBackup(),
    ]);

    const typeLabel = opts.backupType === "auto_weekly" ? "الأسبوعية"
      : opts.backupType === "auto_daily" ? "اليومية"
      : opts.backupType === "auto_monthly" ? "الشهرية"
      : "الفورية";

    const result = await sendEmail({
      to: opts.recipient,
      subject: `نسخة احتياطية Scapex ERP — ${stamp}`,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px; background: #1e40af; padding: 20px; border-radius: 10px;">
            <h2 style="color: white; margin: 0; font-size: 22px;">🗄 Scapex ERP</h2>
            <p style="color: #bfdbfe; font-size: 14px; margin: 6px 0 0;">النسخة الاحتياطية التلقائية</p>
          </div>
          <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 15px; margin: 0 0 12px;">مرحباً،</p>
            <p style="color: #334155; font-size: 15px; margin: 0 0 16px;">
              تم إنشاء النسخة الاحتياطية <strong>${typeLabel}</strong> بنجاح بتاريخ <strong>${stamp}</strong>.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
              <p style="color: #166534; margin: 0; font-size: 14px; font-weight: 600;">📎 المرفقات (2 ملف):</p>
              <p style="color: #166534; margin: 8px 0 0; font-size: 13px;">
                📊 <strong>${xlsxFilename}</strong> — ملف Excel للمراجعة والأرشفة
              </p>
              <p style="color: #166534; margin: 6px 0 0; font-size: 13px;">
                🗜 <strong>${zipFilename}</strong> — ملف ZIP للاستعادة الكاملة للنظام
              </p>
            </div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
              <p style="color: #1e40af; margin: 0; font-size: 13px; font-weight: 600;">🔄 كيفية الاستعادة من ملف ZIP:</p>
              <p style="color: #1e40af; margin: 6px 0 0; font-size: 12px;">
                تسجيل الدخول → النسخ الاحتياطية → تبويب "السجل" → زر "استعادة من ZIP" → رفع الملف
              </p>
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              احتفظ بملف ZIP في مكان آمن — يمكن استخدامه لاستعادة النظام بالكامل حتى في حال فقدان السيرفر.
            </p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
            هذا البريد مُرسَل تلقائياً من Scapex ERP — ${now.getFullYear()}
          </p>
        </div>
      `,
      attachments: [
        { filename: xlsxFilename, content: excelBuffer },
        { filename: zipFilename, content: zipResult.buffer },
      ],
    });

    if (result.success) {
      log(`backup email sent to ${opts.recipient} with xlsx+zip (id: ${result.id})`, "backup");
    } else {
      log(`backup email failed: ${result.error}`, "backup");
    }
    return result;
  } catch (e: any) {
    const msg = e?.message || String(e);
    log(`backup email error: ${msg}`, "backup");
    return { success: false, error: msg };
  }
}

let schedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;
let tickInFlight = false;
let restoreInProgress = false;
export function isRestoreInProgress() { return restoreInProgress; }

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
  if (restoreInProgress) {
    log("scheduler tick skipped — restore in progress", "backup");
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
        // Send email if configured
        if (s.emailEnabled && s.emailRecipient) {
          sendBackupEmail({ recipient: s.emailRecipient, format: s.emailFormat, backupType: "auto_weekly" })
            .catch((e) => log(`email send error: ${e?.message || e}`, "backup"));
        }
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
