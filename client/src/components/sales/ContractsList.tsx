import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Search, Filter, FileText, Download, Eye, ExternalLink, ShieldCheck, Clock
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
import { ContractSignature } from "./ContractSignature";
import { useState } from "react";

const INITIAL_CONTRACTS = [
  { id: 'CTR-26-001', title: 'Consulting Agreement Phase 1', client: 'Saudi Binladin Group', value: 'SAR 450,000', date: '2026-03-10', status: 'pending' },
  { id: 'CTR-26-002', title: 'Design & Supervision Contract', client: 'NEOM Co.', value: 'SAR 1,200,000', date: '2026-03-12', status: 'signed', signedDate: '2026-03-14 10:30 AM' },
  { id: 'CTR-26-003', title: 'HSE Compliance SLA', client: 'Red Sea Global', value: 'SAR 280,000', date: '2026-03-15', status: 'pending' },
  { id: 'CTR-26-004', title: 'Annual Maintenance SLA', client: 'Riyadh Municipality', value: 'SAR 850,000', date: '2026-02-28', status: 'signed', signedDate: '2026-03-05 14:15 PM' },
];

export function ContractsList() {
  const { t, dir } = useLanguage();
  const [contracts, setContracts] = useState(INITIAL_CONTRACTS);

  const handleSignComplete = (id: string) => {
    setContracts(prev => prev.map(c => 
      c.id === id ? { ...c, status: 'signed', signedDate: new Date().toLocaleString() } : c
    ));
  };

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
          <div className="text-sm text-muted-foreground font-medium">
            12 {t('sales.tab.contracts')}
          </div>
        </div>
      </CardHeader>
      
      <div className="overflow-auto flex-1 bg-card">
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0 z-10">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'رقم العقد' : 'Contract ID'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'الموضوع' : 'Title'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'العميل' : 'Client'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'القيمة' : 'Value'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'تاريخ الإنشاء' : 'Date'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{dir === 'rtl' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-left' : 'text-right'}>{t('action.actions') || 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} className="border-border/50 hover:bg-muted/30 transition-colors group">
                <TableCell className={cn("font-mono text-sm", dir === 'rtl' ? 'text-right' : 'text-left')}>
                  {contract.id}
                </TableCell>
                <TableCell className={cn("font-medium", dir === 'rtl' ? 'text-right' : 'text-left')}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {contract.title}
                  </div>
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {contract.client}
                </TableCell>
                <TableCell className={cn("font-medium", dir === 'rtl' ? 'text-right' : 'text-left')}>
                  {contract.value}
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {contract.date}
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {contract.status === 'signed' ? (
                    <div className="flex flex-col gap-1">
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1 w-fit">
                        <ShieldCheck className="w-3 h-3" />
                        {t('sales.contract.signed')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{contract.signedDate}</span>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1 border-amber-200 dark:border-amber-800">
                      <Clock className="w-3 h-3" />
                      {t('sales.contract.pending')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-left' : 'text-right'}>
                  <div className={cn("flex items-center gap-2", dir === 'rtl' ? "justify-start" : "justify-end")}>
                    
                    {contract.status === 'pending' && (
                      <ContractSignature 
                        contractId={contract.id}
                        contractTitle={contract.title}
                        clientName={contract.client}
                        status={contract.status}
                        onSignComplete={() => handleSignComplete(contract.id)}
                      />
                    )}
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
