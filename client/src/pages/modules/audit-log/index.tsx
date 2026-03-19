import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAuditLog, clearAuditLog, ACTION_LABELS, ACTION_COLORS,
  type AuditEntry,
} from "@/lib/auditLog";
import {
  FileText, Search, Trash2, Download, Filter,
  Clock, User, Shield, Activity, Printer,
} from "lucide-react";
import { exportAuditToPDF } from "@/lib/pdfExport";

function AuditLogContent() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const refresh = useCallback(() => setLog(getAuditLog()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("scapex_audit_update", handler);
    return () => window.removeEventListener("scapex_audit_update", handler);
  }, [refresh]);

  const filtered = log.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (moduleFilter !== "all" && e.module !== moduleFilter) return false;
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

  const uniqueActions: AuditEntry["action"][] = Array.from(new Set(log.map((e) => e.action)));
  const uniqueModules: string[] = Array.from(new Set(log.map((e) => e.module)));

  const stats = {
    total: log.length,
    today: log.filter((e) => new Date(e.timestamp).toDateString() === new Date().toDateString()).length,
    users: new Set(log.map((e) => e.userId)).size,
    actions: uniqueActions.length,
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

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            {isRtl ? "سجل حركات المستخدمين" : "User Activity Log"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isRtl ? "تتبع جميع العمليات والإجراءات في النظام" : "Track all operations and actions in the system"}
          </p>
        </div>
        <div className="flex gap-2">
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
          { label: isRtl ? "المستخدمون النشطون" : "Active Users", value: stats.users, icon: User, color: "text-purple-500" },
          { label: isRtl ? "أنواع الإجراءات" : "Action Types", value: stats.actions, icon: Shield, color: "text-amber-500" },
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
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRtl ? "البحث في السجل..." : "Search log..."}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="ps-9"
                data-testid="input-search-audit"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                className="text-sm border rounded-md px-2 py-1.5 bg-background"
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                data-testid="select-action-filter"
              >
                <option value="all">{isRtl ? "جميع الإجراءات" : "All Actions"}</option>
                {uniqueActions.map((a) => (
                  <option key={a} value={a}>{isRtl ? ACTION_LABELS[a].ar : ACTION_LABELS[a].en}</option>
                ))}
              </select>
              <select
                className="text-sm border rounded-md px-2 py-1.5 bg-background"
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
          </div>
        </CardHeader>
        <CardContent>
          {paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{isRtl ? "لا توجد سجلات" : "No records found"}</p>
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
                    <Badge className={`text-xs ${ACTION_COLORS[entry.action]}`}>
                      {isRtl ? ACTION_LABELS[entry.action].ar : ACTION_LABELS[entry.action].en}
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
