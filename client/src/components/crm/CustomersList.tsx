import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Search, Filter, Mail, Phone, MapPin, ExternalLink,
  MoreVertical, Building, Star, MessageSquare, Download, Copy, CheckSquare
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
import { WhatsAppAction } from "./actions/WhatsAppAction";
import { EmailAction } from "./actions/EmailAction";
import { useToast } from "@/hooks/use-toast";

const CUSTOMERS = [
  { id: '1', name: 'Saudi Binladin Group', industry: 'Construction', contact: 'Ahmed Al-Rashid', email: 'ahmed@sbg.com.sa', phone: '+966 50 123 4567', status: 'active', rating: 5 },
  { id: '2', name: 'NEOM Co.', industry: 'Development', contact: 'Sarah Smith', email: 'ssmith@neom.com', phone: '+966 55 987 6543', status: 'active', rating: 5 },
  { id: '3', name: 'Red Sea Global', industry: 'Tourism Development', contact: 'Mohammed Khalid', email: 'm.khalid@redsea.com', phone: '+966 56 234 5678', status: 'active', rating: 4 },
  { id: '4', name: 'Riyadh Municipality', industry: 'Government', contact: 'Fahad Al-Otaibi', email: 'falotaibi@alriyadh.gov.sa', phone: '+966 11 411 2222', status: 'lead', rating: 3 },
  { id: '5', name: 'Al-Bawani', industry: 'Construction', contact: 'Omar Tariq', email: 'omar.t@albawani.net', phone: '+966 50 555 7777', status: 'inactive', rating: 2 },
  { id: '6', name: 'Dar Al Arkan', industry: 'Contracting', contact: 'Yousef Hassan', email: 'y.hassan@alarkan.com', phone: '+966 54 333 9999', status: 'active', rating: 4 },
  { id: '7', name: 'Aramco', industry: 'Oil & Gas', contact: 'Tariq Al-Nasser', email: 'tariq.alnasser@aramco.com', phone: '+966 13 872 0115', status: 'active', rating: 5 },
  { id: '8', name: 'SABIC', industry: 'Petrochemicals', contact: 'Hassan Al-Zahrani', email: 'hassan.zahrani@sabic.com', phone: '+966 13 345 6789', status: 'lead', rating: 4 },
];

export function CustomersList() {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(CUSTOMERS.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const selectedCustomers = CUSTOMERS.filter(c => selectedIds.includes(c.id));

  const handleExportCSV = () => {
    if (selectedIds.length === 0) return;
    
    const headers = ['Company', 'Contact', 'Email', 'Phone', 'Industry', 'Status'];
    const csvContent = [
      headers.join(','),
      ...selectedCustomers.map(c => `"${c.name}","${c.contact}","${c.email}","${c.phone}","${c.industry}","${c.status}"`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'customers_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: dir === 'rtl' ? 'تم التصدير بنجاح' : 'Export Successful',
      description: dir === 'rtl' ? `تم تصدير ${selectedIds.length} عميل إلى ملف CSV.` : `Exported ${selectedIds.length} customers to CSV.`,
    });
  };

  const handleCopyData = () => {
    if (selectedIds.length === 0) return;
    
    const textData = selectedCustomers.map(c => 
      `${c.name} | ${c.contact} | ${c.email} | ${c.phone}`
    ).join('\n');
    
    navigator.clipboard.writeText(textData).then(() => {
      toast({
        title: dir === 'rtl' ? 'تم النسخ' : 'Copied',
        description: dir === 'rtl' ? `تم نسخ بيانات ${selectedIds.length} عميل إلى الحافظة.` : `Copied data for ${selectedIds.length} customers to clipboard.`,
      });
    });
  };

  const handleBulkWhatsApp = () => {
    toast({
      title: dir === 'rtl' ? 'إرسال واتساب جماعي' : 'Bulk WhatsApp',
      description: dir === 'rtl' ? `جاري تجهيز رسالة واتساب لـ ${selectedIds.length} جهة اتصال...` : `Preparing WhatsApp message for ${selectedIds.length} contacts...`,
    });
  };

  const handleBulkEmail = () => {
    toast({
      title: dir === 'rtl' ? 'إرسال بريد جماعي' : 'Bulk Email',
      description: dir === 'rtl' ? `جاري فتح مسودة البريد لـ ${selectedIds.length} مستلم...` : `Opening email draft for ${selectedIds.length} recipients...`,
    });
  };

  return (
    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full relative">
      <CardHeader className="p-4 border-b border-border/50 bg-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", dir === 'rtl' ? "right-3" : "left-3")} />
              <Input placeholder={t('crm.cust.search')} className={cn("h-9 bg-secondary/50 border-0", dir === 'rtl' ? "pr-9" : "pl-9")} />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            245 {t('crm.cust.total')}
          </div>
        </div>
      </CardHeader>
      
      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className={cn(
          "bg-primary/5 border-b border-primary/20 p-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2",
          dir === 'rtl' ? "pl-4 pr-4" : "pr-4 pl-4"
        )}>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/20">
              {selectedIds.length} {t('crm.cust.selected')}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <WhatsAppAction 
              selectedCount={selectedIds.length} 
              isBulk={true}
              trigger={
                <Button size="sm" variant="outline" className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950">
                  <MessageSquare className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('crm.cust.bulk_whatsapp')}</span>
                </Button>
              }
            />
            <EmailAction 
              selectedCount={selectedIds.length} 
              isBulk={true}
              trigger={
                <Button size="sm" variant="outline" className="h-8 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950">
                  <Mail className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('crm.cust.bulk_email')}</span>
                </Button>
              }
            />
            <div className="w-px h-4 bg-border mx-1"></div>
            <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={handleCopyData}>
              <Copy className="w-3 h-3" />
              <span className="hidden sm:inline">{t('crm.cust.copy')}</span>
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={handleExportCSV}>
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">{t('crm.cust.export')}</span>
            </Button>
          </div>
        </div>
      )}
      
      <div className="overflow-auto flex-1 bg-card">
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0 z-10 shadow-sm">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-12 text-center p-0 align-middle">
                <div className="flex items-center justify-center h-full w-full">
                  <input 
                    type="checkbox" 
                    className="rounded border-border w-4 h-4 accent-primary cursor-pointer" 
                    checked={selectedIds.length === CUSTOMERS.length && CUSTOMERS.length > 0}
                    onChange={handleSelectAll}
                  />
                </div>
              </TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{t('crm.cust.col.company')}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{t('crm.cust.col.contact')}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{t('crm.cust.col.industry')}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>{t('crm.cust.col.status')}</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-left' : 'text-right'}>{t('crm.cust.col.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CUSTOMERS.map((customer) => {
              const isSelected = selectedIds.includes(customer.id);
              
              return (
                <TableRow 
                  key={customer.id} 
                  className={cn(
                    "border-border/50 transition-colors group cursor-pointer",
                    isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                  )}
                  onClick={(e) => {
                    // Prevent row click if clicking on a button or action
                    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).tagName === 'INPUT') return;
                    handleSelectOne(customer.id);
                  }}
                >
                  <TableCell className="text-center p-0 align-middle">
                    <div className="flex items-center justify-center h-full w-full">
                      <input 
                        type="checkbox" 
                        className="rounded border-border w-4 h-4 accent-primary cursor-pointer" 
                        checked={isSelected}
                        onChange={() => handleSelectOne(customer.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded flex items-center justify-center shrink-0 border transition-colors",
                        isSelected ? "bg-primary/20 border-primary/30" : "bg-primary/10 border-primary/20"
                      )}>
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {customer.name}
                          {customer.rating === 5 && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          Riyadh, KSA
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                    <div className="text-sm font-medium">{customer.contact}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> <span dir="ltr">{customer.phone}</span></span>
                    </div>
                  </TableCell>
                  <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                    <Badge variant="secondary" className="font-normal bg-secondary/80">
                      {customer.industry}
                    </Badge>
                  </TableCell>
                  <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "font-normal border-transparent",
                        customer.status === 'active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        customer.status === 'lead' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className={dir === 'rtl' ? 'text-left' : 'text-right'}>
                    <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", dir === 'rtl' ? "justify-start" : "justify-end")}>
                      
                      <WhatsAppAction 
                        customerName={customer.contact} 
                        phoneNumber={customer.phone} 
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        }
                      />
                      
                      <EmailAction 
                        customerName={customer.contact} 
                        email={customer.email} 
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                            <Mail className="h-4 w-4" />
                          </Button>
                        }
                      />

                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <div className="border-t border-border/50 p-3 flex items-center justify-between text-xs text-muted-foreground bg-card">
        <span>{t('action.showing')} 1 {t('action.to')} 8 {t('action.of')} 245 {t('action.entries')}</span>
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
