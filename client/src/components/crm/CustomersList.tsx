import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Search, Filter, Mail, Phone, MapPin, ExternalLink,
  MoreVertical, Building, Star
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
  return (
    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border/50 bg-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search customers, contacts, or industries..." className="pl-9 h-9 bg-secondary/50 border-0" />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            245 Total Customers
          </div>
        </div>
      </CardHeader>
      
      <div className="overflow-auto flex-1 bg-card">
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0 z-10">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-12 text-center">
                <input type="checkbox" className="rounded border-border" />
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CUSTOMERS.map((customer) => (
              <TableRow key={customer.id} className="border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer">
                <TableCell className="text-center">
                  <input type="checkbox" className="rounded border-border" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
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
                <TableCell>
                  <div className="text-sm font-medium">{customer.contact}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal bg-secondary/80">
                    {customer.industry}
                  </Badge>
                </TableCell>
                <TableCell>
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
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                      <ExternalLink className="h-4 w-4" />
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
        <span>Showing 1 to 8 of 245 entries</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled className="h-7 px-2 text-xs">Previous</Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-primary text-primary-foreground border-primary">1</Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0">2</Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0">3</Button>
          <span className="px-2 py-1">...</span>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Next</Button>
        </div>
      </div>
    </Card>
  );
}
