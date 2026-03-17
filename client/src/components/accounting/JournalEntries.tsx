import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Search, Filter, Plus, FileText, CheckCircle2, 
  MoreVertical, FileDown, Paperclip, Eye
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const JOURNAL_ENTRIES = [
  { id: 'JE-26-001', date: '2026-03-15', description: 'Client Payment - NEOM', amount: 'SAR 120,000', status: 'posted', ref: 'INV-2026-042' },
  { id: 'JE-26-002', date: '2026-03-14', description: 'Payroll March 2026', amount: 'SAR 450,000', status: 'posted', ref: 'PR-2026-03' },
  { id: 'JE-26-003', date: '2026-03-14', description: 'Office Supplies & Equipment', amount: 'SAR 15,400', status: 'draft', ref: 'PO-2026-088' },
  { id: 'JE-26-004', date: '2026-03-12', description: 'Consulting Fee - Binladin', amount: 'SAR 85,000', status: 'posted', ref: 'INV-2026-041' },
  { id: 'JE-26-005', date: '2026-03-10', description: 'Rent Payment - HQ', amount: 'SAR 60,000', status: 'posted', ref: 'RENT-03' },
  { id: 'JE-26-006', date: '2026-03-08', description: 'VAT Payment Q1', amount: 'SAR 142,500', status: 'posted', ref: 'VAT-Q1' },
];

export function JournalEntries() {
  const { t, dir } = useLanguage();

  return (
    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border/50 bg-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", dir === 'rtl' ? "right-3" : "left-3")} />
              <Input placeholder={t('action.search')} className={cn("h-9 bg-secondary/50 border-0", dir === 'rtl' ? "pr-9" : "pl-9")} />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex h-9">
              <FileDown className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('action.export')}
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 h-9">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {dir === 'rtl' ? 'قيد جديد' : 'New Entry'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <div className="overflow-auto flex-1 bg-card">
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0 z-10">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'رقم القيد' : 'Entry #'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'البيان' : 'Description'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'المرجع' : 'Reference'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-left' : 'text-right'}>{t('action.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {JOURNAL_ENTRIES.map((entry) => (
              <TableRow key={entry.id} className="border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer">
                <TableCell className={cn("font-mono text-sm", dir === 'rtl' ? 'text-right' : 'text-left')}>
                  {entry.id}
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {entry.date}
                </TableCell>
                <TableCell className={cn("font-medium", dir === 'rtl' ? 'text-right' : 'text-left')}>
                  {entry.description}
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  <span className="text-xs bg-muted px-2 py-1 rounded border border-border">
                    {entry.ref}
                  </span>
                </TableCell>
                <TableCell className={cn("font-semibold", dir === 'rtl' ? 'text-right' : 'text-left')}>
                  <span dir="ltr">{entry.amount}</span>
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-normal border-transparent",
                      entry.status === 'posted' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    )}
                  >
                    {entry.status === 'posted' ? (dir === 'rtl' ? 'مُرحل' : 'Posted') : (dir === 'rtl' ? 'مسودة' : 'Draft')}
                  </Badge>
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-left' : 'text-right'}>
                  <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", dir === 'rtl' ? "justify-start" : "justify-end")}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="border-t border-border/50 p-3 flex items-center justify-between text-xs text-muted-foreground bg-card">
        <span>{t('action.showing')} 1 {t('action.to')} 6 {t('action.of')} 245 {t('action.entries')}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled className="h-7 px-2 text-xs">{t('action.previous')}</Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-primary text-primary-foreground border-primary">1</Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0">2</Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0">3</Button>
          <span className="px-2 py-1">...</span>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">{t('action.next')}</Button>
        </div>
      </div>
    </Card>
  );
}