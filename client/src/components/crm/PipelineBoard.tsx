import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MoreHorizontal, Plus, Search, Filter, Mail, Phone,
  Clock, Calendar, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data
const STAGES = [
  { id: 'new', title: 'New Leads', color: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
  { id: 'qualified', title: 'Qualified', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'proposal', title: 'Proposal Sent', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  { id: 'won', title: 'Won', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
];

const INITIAL_LEADS = [
  { id: '1', title: 'Al-Faisaliyah Tower HVAC Upgrade', client: 'Saudi Binladin Group', value: '$1.2M', stage: 'new', priority: 'high', nextAction: 'Call to schedule site visit', date: 'Oct 15' },
  { id: '2', title: 'NEOM District 4 Infrastructure', client: 'NEOM Co.', value: '$4.5M', stage: 'new', priority: 'medium', nextAction: 'Review initial specs', date: 'Oct 16' },
  { id: '3', title: 'Riyadh Metro Station Maintenance', client: 'BACS Consortium', value: '$850K', stage: 'qualified', priority: 'high', nextAction: 'Prepare technical presentation', date: 'Oct 12' },
  { id: '4', title: 'Jeddah Corniche Development', client: 'Jeddah Municipality', value: '$2.1M', stage: 'qualified', priority: 'low', nextAction: 'Waiting for vendor list approval', date: 'Oct 14' },
  { id: '5', title: 'King Abdullah Financial District Retail', client: 'KAFD DMC', value: '$3.4M', stage: 'proposal', priority: 'high', nextAction: 'Follow up on proposal submitted on Oct 10', date: 'Oct 10' },
  { id: '6', title: 'Red Sea Airport Terminal Expansion', client: 'Red Sea Global', value: '$5.8M', stage: 'negotiation', priority: 'high', nextAction: 'Final price negotiation meeting', date: 'Oct 18' },
];

export function PipelineBoard() {
  const [leads, setLeads] = useState(INITIAL_LEADS);

  // Note: For a real app we'd use dnd-kit or react-beautiful-dnd, but for a fast mockup 
  // we'll implement simple HTML5 drag and drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("leadId", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, stage: stageId } : lead
      ));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-2 w-full max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search opportunities..." className="pl-9 h-9 bg-card" />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-card">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-medium text-muted-foreground hidden sm:block">
          Total Pipeline Value: <span className="text-foreground">$17.85M</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full min-w-max pb-2 px-1">
          {STAGES.map(stage => (
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
                  <span className="text-xs text-muted-foreground font-medium">
                    {leads.filter(l => l.stage === stage.id).length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Stage Content */}
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-2 pb-2">
                  {leads.filter(l => l.stage === stage.id).map(lead => (
                    <div 
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={cn(
                        "bg-card p-3 rounded-lg border shadow-sm cursor-grab hover:shadow-md transition-shadow",
                        stage.border
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-sm line-clamp-2 leading-tight">{lead.title}</div>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 -mr-1 -mt-1 text-muted-foreground">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-3">{lead.client}</div>
                      
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="font-bold text-primary">{lead.value}</span>
                        <Badge variant="outline" className={cn(
                          "text-[10px] px-1.5 py-0",
                          lead.priority === 'high' ? "text-destructive border-destructive/30 bg-destructive/10" :
                          lead.priority === 'medium' ? "text-amber-600 border-amber-600/30 bg-amber-600/10" : ""
                        )}>
                          {lead.priority}
                        </Badge>
                      </div>

                      <div className="pt-2 mt-2 border-t border-border/50 border-dashed flex items-start gap-1.5 text-xs text-muted-foreground">
                        {lead.priority === 'high' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        )}
                        <span className="line-clamp-1">{lead.nextAction}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground font-medium">
                        <Calendar className="w-3 h-3" />
                        {lead.date}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
