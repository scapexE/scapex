import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users, Target, CheckCircle2, TrendingUp, Wallet, FileText,
  Award, ArrowUp, ArrowDown, ChevronUp, ChevronDown, ChevronsUpDown,
  Calculator, Loader2, AlertCircle, Star, Trophy, Medal,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// ── Types ────────────────────────────────────────────────────────────────────
interface EmployeeStat {
  userId: string;
  name: string;
  role: string;
  customersCount: number;
  dealsCount: number;
  dealsWonValue: number;
  dealsPipelineValue: number;
  proposalsCount: number;
  proposalsApproved: number;
  proposalsValue: number;
  collectedAmount: number;
}

interface AnalyticsData {
  kpis: {
    totalCustomers: number;
    activeCustomers: number;
    totalPipeline: number;
    totalWon: number;
    totalCollected: number;
    totalProposals: number;
    totalProposalsCount: number;
    totalDeals: number;
    wonDeals: number;
  };
  employees: EmployeeStat[];
  trend: { label: string; collected: number; deals: number }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(2) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + "K"
    : n.toLocaleString("en-SA");

const fmtSAR = (n: number) => "SAR " + fmt(n);

type SortKey = keyof EmployeeStat;
type SortDir = "asc" | "desc";

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, sub, icon: Icon, color,
}: {
  title: string; value: string; sub?: string; icon: any; color: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-2xl font-bold tracking-tight mt-1 text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", color)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sort Header ───────────────────────────────────────────────────────────────
function SortTh({
  col, label, sortKey, sortDir, onSort,
}: {
  col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th
      className="px-3 py-2.5 text-left rtl:text-right text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sortDir === "asc"
            ? <ChevronUp className="w-3 h-3 text-primary" />
            : <ChevronDown className="w-3 h-3 text-primary" />
          : <ChevronsUpDown className="w-3 h-3 opacity-40" />
        }
      </span>
    </th>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CRMDashboard() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Employee table sorting
  const [sortKey, setSortKey] = useState<SortKey>("collectedAmount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Bonus calculator state
  const [bonusPct, setBonusPct] = useState<number>(5);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiRequest("GET", "/api/crm/analytics");
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message || "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.employees].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, sortKey, sortDir]);

  // Bonus calculator
  const totalCollected = data?.kpis.totalCollected ?? 0;
  const netIncome = totalCollected - totalExpenses;
  const bonusPool = Math.max(0, netIncome * bonusPct / 100);

  // Employee rank icons
  const rankIcon = (i: number) => {
    if (i === 0) return <Trophy className="w-4 h-4 text-amber-500" />;
    if (i === 1) return <Medal className="w-4 h-4 text-slate-400" />;
    if (i === 2) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="text-xs font-bold text-muted-foreground w-4 inline-block text-center">{i + 1}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground text-sm">
          {isRtl ? "جاري تحميل التحليلات..." : "Loading analytics..."}
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-destructive">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{isRtl ? "تعذر تحميل البيانات" : "Failed to load analytics"}</span>
      </div>
    );
  }

  const { kpis, trend } = data;

  return (
    <div className="flex flex-col gap-6 pb-8" dir={dir}>

      {/* ── Section: KPI Cards ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          {isRtl ? "المؤشرات الرئيسية" : "Key Performance Indicators"}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title={isRtl ? "إجمالي العملاء" : "Total Customers"}
            value={kpis.totalCustomers.toString()}
            sub={isRtl
              ? `${kpis.activeCustomers} عميل نشط`
              : `${kpis.activeCustomers} active`}
            icon={Users}
            color="bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            title={isRtl ? "قيمة الفرص المفتوحة" : "Open Pipeline"}
            value={fmtSAR(kpis.totalPipeline)}
            sub={isRtl
              ? `${kpis.totalDeals} فرصة إجمالاً`
              : `${kpis.totalDeals} total deals`}
            icon={Target}
            color="bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400"
          />
          <KpiCard
            title={isRtl ? "صفقات مُغلقة بنجاح" : "Won Deals Value"}
            value={fmtSAR(kpis.totalWon)}
            sub={isRtl
              ? `${kpis.wonDeals} صفقة مكتملة`
              : `${kpis.wonDeals} deals won`}
            icon={CheckCircle2}
            color="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            title={isRtl ? "إيرادات محصّلة" : "Collected Revenue"}
            value={fmtSAR(kpis.totalCollected)}
            sub={isRtl
              ? `${kpis.totalProposalsCount} عرض سعر — قيمة ${fmtSAR(kpis.totalProposals)}`
              : `${kpis.totalProposalsCount} proposals • ${fmtSAR(kpis.totalProposals)}`}
            icon={Wallet}
            color="bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400"
          />
        </div>
      </div>

      {/* ── Section: Trend Chart ──────────────────────────────────────────────── */}
      {trend && trend.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">
              {isRtl ? "الاتجاه الشهري — الإيرادات المحصّلة والصفقات المُغلقة" : "Monthly Trend — Collected Revenue & Won Deals"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "K" : v} />
                <Tooltip
                  formatter={(val: number) => ["SAR " + val.toLocaleString("en-SA")]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="collected" name={isRtl ? "محصّل" : "Collected"} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deals" name={isRtl ? "صفقات مُغلقة" : "Won Deals"} fill="hsl(142 70% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Section: Employee Performance Table ──────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
          <Award className="w-4 h-4" />
          {isRtl ? "أداء الموظفين" : "Employee Performance"}
        </h2>
        <Card className="border-border/60 shadow-sm">
          {sorted.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {isRtl ? "لا توجد بيانات موظفين بعد" : "No employee data yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="px-3 py-2.5 text-left rtl:text-right text-xs font-semibold text-muted-foreground w-8">#</th>
                    <th className="px-3 py-2.5 text-left rtl:text-right text-xs font-semibold text-muted-foreground">
                      {isRtl ? "الموظف" : "Employee"}
                    </th>
                    <SortTh col="customersCount" label={isRtl ? "العملاء" : "Customers"}
                      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="proposalsCount" label={isRtl ? "عروض الأسعار" : "Proposals"}
                      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="proposalsValue" label={isRtl ? "قيمة العروض" : "Proposals Value"}
                      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="dealsWonValue" label={isRtl ? "صفقات مُغلقة" : "Won Deals"}
                      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="collectedAmount" label={isRtl ? "محصّل" : "Collected"}
                      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-3 py-2.5 text-left rtl:text-right text-xs font-semibold text-muted-foreground">
                      {isRtl ? "مكافأة مقترحة" : "Bonus"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sorted.map((emp, i) => {
                    const contributionPct = totalCollected > 0
                      ? (emp.collectedAmount / totalCollected) * 100 : 0;
                    const empBonus = bonusPool * (contributionPct / 100);
                    return (
                      <tr
                        key={emp.userId}
                        className={cn(
                          "hover:bg-muted/20 transition-colors",
                          i < 3 && "bg-amber-50/30 dark:bg-amber-950/10"
                        )}
                      >
                        <td className="px-3 py-3 align-middle">
                          <span className="flex items-center justify-center w-6">{rankIcon(i)}</span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="font-medium text-foreground leading-tight">{emp.name}</div>
                          <div className="text-[11px] text-muted-foreground capitalize">{emp.role}</div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{emp.customersCount}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="font-medium">{emp.proposalsCount}</div>
                          {emp.proposalsApproved > 0 && (
                            <div className="text-[11px] text-emerald-600">
                              {emp.proposalsApproved} {isRtl ? "موافق عليها" : "approved"}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle font-mono text-sm">
                          {fmtSAR(emp.proposalsValue)}
                        </td>
                        <td className="px-3 py-3 align-middle font-mono text-sm">
                          <span className={emp.dealsWonValue > 0 ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                            {fmtSAR(emp.dealsWonValue)}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="font-mono text-sm font-semibold">
                            {fmtSAR(emp.collectedAmount)}
                          </div>
                          {totalCollected > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              {contributionPct.toFixed(1)}% {isRtl ? "من الإجمالي" : "of total"}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          {bonusPool > 0 ? (
                            <div className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400">
                              {fmtSAR(empBonus)}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── Section: Bonus Calculator ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          {isRtl ? "حاسبة مكافأة الإنجاز" : "Performance Bonus Calculator"}
        </h2>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Input: Total Expenses */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {isRtl ? "إجمالي المصروفات (SAR)" : "Total Expenses (SAR)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={totalExpenses || ""}
                  onChange={e => setTotalExpenses(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  dir="ltr"
                  className="font-mono"
                  data-testid="input-bonus-expenses"
                />
                <p className="text-[11px] text-muted-foreground">
                  {isRtl ? "أدخل المصروفات الإجمالية للفترة" : "Enter total period expenses"}
                </p>
              </div>

              {/* Input: Bonus % */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {isRtl ? "نسبة المكافأة % من صافي الدخل" : "Bonus % of Net Income"}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={bonusPct}
                    onChange={e => setBonusPct(parseFloat(e.target.value) || 0)}
                    dir="ltr"
                    className="font-mono pr-8 rtl:pl-8 rtl:pr-3"
                    data-testid="input-bonus-pct"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-sm text-muted-foreground font-medium">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isRtl ? "النسبة تُوزَّع على الموظفين بحسب مساهمتهم" : "Split proportionally by each employee's contribution"}
                </p>
              </div>

              {/* Output: Results */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {isRtl ? "النتائج" : "Results"}
                </Label>
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{isRtl ? "إجمالي الإيرادات" : "Total Revenue"}</span>
                    <span className="font-mono font-medium">{fmtSAR(totalCollected)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{isRtl ? "المصروفات" : "Expenses"}</span>
                    <span className="font-mono font-medium text-destructive">− {fmtSAR(totalExpenses)}</span>
                  </div>
                  <div className="border-t border-border/60 pt-2 flex justify-between items-center text-sm font-semibold">
                    <span>{isRtl ? "صافي الدخل" : "Net Income"}</span>
                    <span className={cn("font-mono", netIncome >= 0 ? "text-emerald-600" : "text-destructive")}>
                      {fmtSAR(Math.max(0, netIncome))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-violet-700 dark:text-violet-400">
                      {isRtl ? `إجمالي مجمع المكافآت (${bonusPct}%)` : `Bonus Pool (${bonusPct}%)`}
                    </span>
                    <span className="font-mono text-violet-700 dark:text-violet-400">{fmtSAR(bonusPool)}</span>
                  </div>
                </div>
                {netIncome < 0 && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {isRtl ? "صافي الدخل سالب — لا توجد مكافآت" : "Net income is negative — no bonus pool"}
                  </p>
                )}
              </div>
            </div>

            {/* Bonus breakdown mini-table (only if there's a bonus pool) */}
            {bonusPool > 0 && sorted.filter(e => e.collectedAmount > 0).length > 0 && (
              <div className="mt-5 pt-4 border-t border-border/60">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {isRtl ? "توزيع المكافآت على الموظفين" : "Bonus Distribution per Employee"}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="pb-2 text-left rtl:text-right text-xs text-muted-foreground font-medium">
                          {isRtl ? "الموظف" : "Employee"}
                        </th>
                        <th className="pb-2 text-right text-xs text-muted-foreground font-medium">
                          {isRtl ? "المحصّل" : "Collected"}
                        </th>
                        <th className="pb-2 text-right text-xs text-muted-foreground font-medium">
                          {isRtl ? "نسبة المساهمة" : "Contribution"}
                        </th>
                        <th className="pb-2 text-right text-xs font-semibold text-violet-700 dark:text-violet-400">
                          {isRtl ? "المكافأة" : "Bonus"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {sorted
                        .filter(e => e.collectedAmount > 0)
                        .map((emp, i) => {
                          const pct = totalCollected > 0 ? (emp.collectedAmount / totalCollected) * 100 : 0;
                          const bonus = bonusPool * (pct / 100);
                          return (
                            <tr key={emp.userId} className="hover:bg-muted/10">
                              <td className="py-2 font-medium">{emp.name}</td>
                              <td className="py-2 text-right font-mono text-xs">{fmtSAR(emp.collectedAmount)}</td>
                              <td className="py-2 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-violet-500 rounded-full"
                                      style={{ width: `${Math.min(100, pct)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono">{pct.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="py-2 text-right font-mono font-bold text-violet-600 dark:text-violet-400">
                                {fmtSAR(bonus)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot className="border-t-2 border-border/60">
                      <tr>
                        <td className="pt-2 text-sm font-bold">{isRtl ? "الإجمالي" : "Total"}</td>
                        <td className="pt-2 text-right font-mono font-bold text-sm">{fmtSAR(totalCollected)}</td>
                        <td className="pt-2 text-right text-xs font-mono">100%</td>
                        <td className="pt-2 text-right font-mono font-bold text-sm text-violet-600 dark:text-violet-400">
                          {fmtSAR(bonusPool)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
