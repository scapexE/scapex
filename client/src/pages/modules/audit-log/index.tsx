import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAuditLog, clearAuditLog, ACTION_LABELS, ACTION_COLORS, ACTION_CATEGORIES,
  type AuditEntry,
} from "@/lib/auditLog";
import { getUsers } from "@/lib/permissions";
import {
  FileText, Search, Trash2, Download, Clock, User, Shield, Activity, Printer, X, ChevronDown,
} from "lucide-react";
import { exportAuditToPDF } from "@/lib/pdfExport";

function AuditLogContent() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const allUsers = getUsers();
  const refresh = useCallback(() => setLog(getAuditLog()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("scapex_audit_update", handler);
    return () => window.removeEventListener("scapex_audit_update", handler);
  }, [refresh]);

  const categoryActions = categoryFilter !== "all"
    ? ACTION_CATEGORIES[categoryFilter]?.actions || []
    : [];

  const filtered = log.filter((e) => {
    if (userFilter !== "all" && e.userId !== userFilter) return false;
    if (categoryFilter !== "all" && !categoryActions.includes(e.action)) return false;
    if (moduleFilter !== "all" && e.module !== moduleFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (new Date(e.timestamp) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(e.timestamp) > to) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        e.userName.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        e.detailsAr.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const uniqueUsers: { id: string; name: string }[] = [];
  const seenUsers = new Set<string>();
  for (const e of log) {
    if (!seenUsers.has(e.userId)) {
      seenUsers.add(e.userId);
      uniqueUsers.push({ id: e.userId, name: e.userName });
    }
  }
  const uniqueModules: string[] = Array.from(new Set(log.map((e) => e.module)));

  const todayStr = new Date().toDateString();
  const stats = {
    total: log.length,
    today: log.filter((e) => new Date(e.timestamp).toDateString() === todayStr).length,
    users: uniqueUsers.length,
    logins: log.filter((e) => e.action === "login").length,
  };

  const hasActiveFilters = userFilter !== "all" || categoryFilter !== "all" || moduleFilter !== "all" || dateFrom || dateTo || search;

  const clearFilters = () => {
    setUserFilter("all");
    setCategoryFilter("all");
    setModuleFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(1);
  };

  const exportCSV = () => {
    const headers = "Timestamp,User,Role,Action,Module,Details\n";
    const rows = filtered
      .map((e) =>
        `"${e.timestamp}","${e.userName}","${e.userRole}","${e.action}","${e.module}","${isRtl ? e.detailsAr : e.details}"`,
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const selectClass = "text-sm border rounded-lg px-3 py-2 bg-background w-full focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors";

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            {isRtl ? "سجل حركات المستخدمين" : "User Activity Log"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isRtl ? "تتبع عمليات الدخول والخروج والتعديلات ورفع الملفات" : "Track logins, logouts, changes, uploads, and operations"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportAuditToPDF(filtered, isRtl)} data-testid="button-export-pdf">
            <Printer className="w-4 h-4 me-1" />
            {isRtl ? "تقرير PDF" : "PDF Report"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-audit">
            <Download className="w-4 h-4 me-1" />
            {isRtl ? "تصدير CSV" : "Export CSV"}
          </Button>
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={() => { clearAuditLog(); refresh(); }} data-testid="button-clear-audit">
              <Trash2 className="w-4 h-4 me-1" />
              {isRtl ? "مسح السجل" : "Clear Log"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isRtl ? "إجمالي السجلات" : "Total Records", value: stats.total, icon: FileText, color: "text-blue-500" },
          { label: isRtl ? "سجلات اليوم" : "Today's Records", value: stats.today, icon: Clock, color: "text-green-500" },
          { label: isRtl ? "المستخدمون" : "Users", value: stats.users, icon: User, color: "text-purple-500" },
          { label: isRtl ? "عمليات الدخول" : "Total Logins", value: stats.logins, icon: Shield, color: "text-amber-500" },
        ].map((s, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Search className="w-4 h-4" />
              {isRtl ? "البحث والتصفية" : "Search & Filters"}
            </CardTitle>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={clearFilters}>
                  <X className="w-3 h-3 me-1" />
                  {isRtl ? "مسح الفلاتر" : "Clear Filters"}
                </Button>
              )}
              <Button
                variant="ghost" size="sm" className="text-xs h-7"
                onClick={() => setShowFilters(!showFilters)}
              >
                <ChevronDown className={`w-3 h-3 me-1 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                {showFilters ? (isRtl ? "إخفاء" : "Hide") : (isRtl ? "عرض" : "Show")}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-3">
              <div className="relative w-full">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isRtl ? "البحث بالاسم أو التفاصيل أو الوحدة..." : "Search by name, details, or module..."}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="ps-9"
                  data-testid="input-search-audit"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {isRtl ? "المستخدم" : "User"}
                  </label>
                  <select
                    className={selectClass}
                    value={userFilter}
                    onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
                    data-testid="select-user-filter"
                  >
                    <option value="all">{isRtl ? "جميع المستخدمين" : "All Users"}</option>
                    {uniqueUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {isRtl ? "نوع العملية" : "Operation Type"}
                  </label>
                  <select
                    className={selectClass}
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                    data-testid="select-category-filter"
                  >
                    <option value="all">{isRtl ? "جميع العمليات" : "All Operations"}</option>
                    {Object.entries(ACTION_CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{isRtl ? cat.ar : cat.en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {isRtl ? "الوحدة" : "Module"}
                  </label>
                  <select
                    className={selectClass}
                    value={moduleFilter}
                    onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                    data-testid="select-module-filter"
                  >
                    <option value="all">{isRtl ? "جميع الوحدات" : "All Modules"}</option>
                    {uniqueModules.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {isRtl ? "من تاريخ" : "From"}
                    </label>
                    <input
                      type="date"
                      className={selectClass}
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {isRtl ? "إلى تاريخ" : "To"}
                    </label>
                    <input
                      type="date"
                      className={selectClass}
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      data-testid="input-date-to"
                    />
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-muted-foreground">{isRtl ? "الفلاتر النشطة:" : "Active filters:"}</span>
                  {userFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <User className="w-3 h-3" />
                      {uniqueUsers.find(u => u.id === userFilter)?.name}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setUserFilter("all")} />
                    </Badge>
                  )}
                  {categoryFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Activity className="w-3 h-3" />
                      {isRtl ? ACTION_CATEGORIES[categoryFilter]?.ar : ACTION_CATEGORIES[categoryFilter]?.en}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoryFilter("all")} />
                    </Badge>
                  )}
                  {moduleFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <FileText className="w-3 h-3" />
                      {moduleFilter}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setModuleFilter("all")} />
                    </Badge>
                  )}
                  {(dateFrom || dateTo) && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Clock className="w-3 h-3" />
                      {dateFrom || "..."} → {dateTo || "..."}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => { setDateFrom(""); setDateTo(""); }} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t mt-3">
            <span className="text-xs text-muted-foreground">
              {isRtl ? `${filtered.length} نتيجة` : `${filtered.length} results`}
              {hasActiveFilters && (isRtl ? ` (من ${log.length} سجل)` : ` (of ${log.length} total)`)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{isRtl ? "لا توجد سجلات" : "No records found"}</p>
              <p className="text-xs mt-1">
                {hasActiveFilters
                  ? (isRtl ? "جرب تعديل الفلاتر للحصول على نتائج" : "Try adjusting filters to get results")
                  : (isRtl ? "سيتم تسجيل الحركات تلقائياً عند استخدام النظام" : "Actions will be logged automatically when using the system")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginated.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  data-testid={`audit-entry-${entry.id}`}
                >
                  <div className="shrink-0 mt-0.5">
                    <Badge className={`text-xs ${ACTION_COLORS[entry.action] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {isRtl ? (ACTION_LABELS[entry.action]?.ar ?? entry.action) : (ACTION_LABELS[entry.action]?.en ?? entry.action)}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{isRtl ? entry.detailsAr : entry.details}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {entry.userName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {entry.userRole}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {entry.module}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatTime(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                {isRtl
                  ? `عرض ${(page - 1) * perPage + 1} إلى ${Math.min(page * perPage, filtered.length)} من ${filtered.length}`
                  : `Showing ${(page - 1) * perPage + 1} to ${Math.min(page * perPage, filtered.length)} of ${filtered.length}`}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {isRtl ? "السابق" : "Previous"}
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  {isRtl ? "التالي" : "Next"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditLogModule() {
  return (
    <MainLayout>
      <AuditLogContent />
    </MainLayout>
  );
}
