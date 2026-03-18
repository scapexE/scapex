import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MoreHorizontal, Plus, Search, Filter, Phone,
  Clock, Calendar, AlertCircle, FileText, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  title: string;
  client: string;
  email: string;
  phone: string;
  value: string;
  stage: string;
  priority: string;
  nextAction: string;
  date: string;
}

const INITIAL_LEADS: Lead[] = [
  { id: '1', title: 'Al-Faisaliyah Tower HVAC Upgrade',         client: 'Saudi Binladin Group', email: 'ahmed@sbg.com.sa',            phone: '+966 501234567', value: '$1.2M',  stage: 'new',         priority: 'high',   nextAction: 'Call to schedule site visit',                    date: 'Oct 15' },
  { id: '2', title: 'NEOM District 4 Infrastructure',            client: 'NEOM Co.',              email: 'ssmith@neom.com',              phone: '+966 559876543', value: '$4.5M',  stage: 'new',         priority: 'medium', nextAction: 'Review initial specs',                           date: 'Oct 16' },
  { id: '3', title: 'Riyadh Metro Station Maintenance',          client: 'BACS Consortium',       email: 'info@bacs.com.sa',             phone: '+966 112345678', value: '$850K',  stage: 'qualified',   priority: 'high',   nextAction: 'Prepare technical presentation',                 date: 'Oct 12' },
  { id: '4', title: 'Jeddah Corniche Development',               client: 'Jeddah Municipality',   email: 'projects@jeddah.gov.sa',       phone: '+966 122345678', value: '$2.1M',  stage: 'qualified',   priority: 'low',    nextAction: 'Waiting for vendor list approval',               date: 'Oct 14' },
  { id: '5', title: 'King Abdullah Financial District Retail',   client: 'KAFD DMC',              email: 'contracts@kafd.sa',            phone: '+966 114567890', value: '$3.4M',  stage: 'proposal',    priority: 'high',   nextAction: 'Follow up on proposal submitted on Oct 10',      date: 'Oct 10' },
  { id: '6', title: 'Red Sea Airport Terminal Expansion',        client: 'Red Sea Global',        email: 'm.khalid@redsea.com',          phone: '+966 562345678', value: '$5.8M',  stage: 'negotiation', priority: 'high',   nextAction: 'Final price negotiation meeting',                date: 'Oct 18' },
];

export interface ProposalPrefill {
  clientName:    string;
  clientEmail:   string;
  clientContact: string;
  projectName:   string;
}

export function PipelineBoard({ onCreateProposal }: {
  onCreateProposal?: (data: ProposalPrefill) => void;
}) {
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [search, setSearch] = useState("");

  const STAGES = [
    { id: 'new',         title: t('crm.pipe.stage.new'),         color: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',      border: 'border-slate-300 dark:border-slate-700',   stripe: 'bg-slate-400 dark:bg-slate-500' },
    { id: 'qualified',   title: t('crm.pipe.stage.qualified'),   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',        border: 'border-blue-200 dark:border-blue-800',     stripe: 'bg-blue-500'   },
    { id: 'proposal',    title: t('crm.pipe.stage.proposal'),    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',    border: 'border-amber-200 dark:border-amber-800',   stripe: 'bg-amber-500'  },
    { id: 'negotiation', title: t('crm.pipe.stage.negotiation'), color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', stripe: 'bg-purple-500' },
    { id: 'won',         title: t('crm.pipe.stage.won'),         color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', stripe: 'bg-emerald-500' },
  ];

  const filtered = search.trim()
    ? leads.filter(l =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.client.toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const handleDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData("leadId", id);
  const handleDragOver  = (e: React.DragEvent) => e.preventDefault();
  const handleDrop      = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: stageId } : l));
  };

  const handleProposal = (lead: Lead) => {
    onCreateProposal?.({
      clientName:    lead.client,
      clientEmail:   lead.email,
      clientContact: lead.phone,
      projectName:   lead.title,
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-2 w-full max-w-md">
          <div className="relative w-full">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
            <Input
              placeholder={t('crm.pipe.search')}
              className={cn("h-9 bg-card", isRtl ? "pr-9" : "pl-9")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-card">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-medium text-muted-foreground hidden sm:block">
          {t('crm.pipe.total_value')} <span className="text-foreground">$17.85M</span>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full min-w-max pb-2 px-1">
          {STAGES.map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage.id);
            return (
              <div
                key={stage.id}
                className="flex flex-col w-80 shrink-0 bg-secondary/30 rounded-xl border border-border/50"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage Header */}
                <div className="p-3 shrink-0 flex items-center justify-between border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", stage.color)}>
                      {stage.title}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">{stageLeads.length}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Cards */}
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2 pb-2">
                    {stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className={cn(
                          "bg-card rounded-lg border shadow-sm cursor-grab hover:shadow-md transition-shadow overflow-hidden flex flex-col",
                          stage.border,
                        )}
                      >
                        {/* Colored stripe */}
                        <div className={cn("h-1.5 w-full shrink-0", stage.stripe)} />

                        <div className="p-3">
                          {/* Title + menu */}
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="font-semibold text-sm line-clamp-2 leading-tight flex-1 pe-1">{lead.title}</div>
                            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 -me-1 -mt-1 text-muted-foreground">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Client name */}
                          <div className="text-xs font-medium text-muted-foreground mb-0.5">{lead.client}</div>

                          {/* Contact row */}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 mb-2.5">
                            {lead.email && (
                              <span className="flex items-center gap-0.5 truncate max-w-[110px]">
                                <Mail className="w-2.5 h-2.5 shrink-0" />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-0.5 shrink-0" dir="ltr">
                                <Phone className="w-2.5 h-2.5" />
                                {lead.phone}
                              </span>
                            )}
                          </div>

                          {/* Value + priority */}
                          <div className="flex items-center justify-between text-sm mb-2.5">
                            <span className="font-bold text-primary">{lead.value}</span>
                            <Badge variant="outline" className={cn(
                              "text-[10px] px-1.5 py-0",
                              lead.priority === 'high'   ? "text-destructive border-destructive/30 bg-destructive/10" :
                              lead.priority === 'medium' ? "text-amber-600 border-amber-600/30 bg-amber-600/10" : "",
                            )}>
                              {lead.priority}
                            </Badge>
                          </div>

                          {/* Next action */}
                          <div className="pt-2 border-t border-border/50 border-dashed flex items-start gap-1.5 text-xs text-muted-foreground mb-2">
                            {lead.priority === 'high'
                              ? <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                              : <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                            <span className="line-clamp-1">{lead.nextAction}</span>
                          </div>

                          {/* Footer: date + proposal button */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                              <Calendar className="w-3 h-3" />
                              {lead.date}
                            </div>
                            {onCreateProposal && (
                              <button
                                data-testid={`button-create-proposal-${lead.id}`}
                                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-semibold bg-primary/8 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 px-2 py-1 rounded-md transition-all"
                                onClick={() => handleProposal(lead)}
                                title={isRtl ? 'إنشاء عرض سعر بيانات العميل' : 'Create Proposal with client data'}
                              >
                                <FileText className="w-3 h-3" />
                                {isRtl ? 'عرض سعر' : 'Proposal'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
