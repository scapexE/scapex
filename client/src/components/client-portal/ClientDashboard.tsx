import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, Calendar, CheckCircle2, Clock, FileText, MessageSquare, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function ClientDashboard() {
  const { dir } = useLanguage();
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, sender: "Ahmed (SCAPE)", role: "support", text: dir === 'rtl' ? "مرحباً، تم تحديث المخططات الهندسية للمشروع في قسم المستندات." : "Hello, the engineering drawings have been updated in the documents section.", time: "10:30 AM" },
    { id: 2, sender: "You", role: "client", text: dir === 'rtl' ? "شكراً لك. هل تم اعتمادها من البلدية؟" : "Thank you. Have they been approved by the municipality?", time: "10:45 AM" },
    { id: 3, sender: "Ahmed (SCAPE)", role: "support", text: dir === 'rtl' ? "نعم، تم الاعتماد وصدرت رخصة البناء." : "Yes, approved and the building permit has been issued.", time: "11:00 AM" },
  ]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setMessages([
      ...messages,
      { id: Date.now(), sender: "You", role: "client", text: chatMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setChatMessage("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir={dir}>
      
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Welcome & Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-primary text-primary-foreground border-transparent sm:col-span-3">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {dir === 'rtl' ? "مرحباً بك، شركة نيوم" : "Welcome back, NEOM Co."}
                </h2>
                <p className="text-primary-foreground/80">
                  {dir === 'rtl' ? "إليك ملخص لمشاريعك النشطة وأحدث التطورات." : "Here is a summary of your active projects and recent updates."}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0 hidden sm:flex">
                <Building2 className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{dir === 'rtl' ? "المشاريع النشطة" : "Active Projects"}</p>
              </div>
              <p className="text-3xl font-bold">2</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{dir === 'rtl' ? "الموافقات المكتملة" : "Completed Approvals"}</p>
              </div>
              <p className="text-3xl font-bold">12</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{dir === 'rtl' ? "إجراءات معلقة" : "Pending Actions"}</p>
              </div>
              <p className="text-3xl font-bold">1</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Projects */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-5 border-b border-border/50">
            <CardTitle className="text-lg flex items-center justify-between">
              {dir === 'rtl' ? "متابعة المشاريع" : "Project Tracking"}
              <Button variant="ghost" size="sm" className="text-primary h-8">
                {dir === 'rtl' ? "عرض الكل" : "View All"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              
              {/* Project 1 */}
              <div className="p-5 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {dir === 'rtl' ? "مشروع المجمع السكني (المرحلة الأولى)" : "Residential Complex (Phase 1)"}
                      <Badge className="bg-blue-500 hover:bg-blue-600">{dir === 'rtl' ? "قيد التنفيذ" : "In Progress"}</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {dir === 'rtl' ? "الانتهاء المتوقع: أكتوبر 2026" : "Expected Completion: Oct 2026"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium mb-1">65% {dir === 'rtl' ? "مكتمل" : "Complete"}</p>
                    <div className="w-full sm:w-32 h-2.5 bg-secondary rounded-full overflow-hidden border border-border/50">
                      <div className="bg-primary h-full rounded-full" style={{ width: "65%" }}></div>
                    </div>
                  </div>
                </div>
                
                {/* Micro Timeline */}
                <div className="relative pt-6 pb-2">
                  <div className="absolute top-8 left-0 right-0 h-0.5 bg-border z-0"></div>
                  <div className="relative z-10 flex justify-between">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-background"></div>
                      <span className="text-xs font-medium text-muted-foreground">{dir === 'rtl' ? "التخطيط" : "Planning"}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-background"></div>
                      <span className="text-xs font-medium text-muted-foreground">{dir === 'rtl' ? "التصميم" : "Design"}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20"></div>
                      <span className="text-xs font-medium text-primary">{dir === 'rtl' ? "التنفيذ" : "Construction"}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-secondary border-2 border-border ring-4 ring-background"></div>
                      <span className="text-xs font-medium text-muted-foreground">{dir === 'rtl' ? "التسليم" : "Handover"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project 2 */}
              <div className="p-5 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {dir === 'rtl' ? "تصميم مركز الأعمال الإقليمي" : "Regional Business Center Design"}
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">{dir === 'rtl' ? "مراجعة العميل" : "Client Review"}</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {dir === 'rtl' ? "الانتهاء المتوقع: مايو 2026" : "Expected Completion: May 2026"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium mb-1">90% {dir === 'rtl' ? "مكتمل" : "Complete"}</p>
                    <div className="w-full sm:w-32 h-2.5 bg-secondary rounded-full overflow-hidden border border-border/50">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: "90%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>

      {/* Sidebar Column */}
      <div className="space-y-6">
        
        {/* Important Documents */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-5 border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {dir === 'rtl' ? "أحدث المستندات" : "Recent Documents"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{dir === 'rtl' ? "المخططات الإنشائية V2.pdf" : "Structural_Drawings_V2.pdf"}</p>
                    <p className="text-xs text-muted-foreground">4.2 MB • {dir === 'rtl' ? "اليوم" : "Today"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100">
                  <Download className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{dir === 'rtl' ? "عقد الإشراف الهندسي.pdf" : "Supervision_Contract.pdf"}</p>
                    <p className="text-xs flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-200 text-amber-600 bg-amber-50">
                        {dir === 'rtl' ? "بانتظار توقيعك" : "Pending Signature"}
                      </Badge>
                    </p>
                  </div>
                </div>
                <Button size="sm" className="shrink-0 h-7 text-xs bg-primary hover:bg-primary/90">
                  {dir === 'rtl' ? "توقيع" : "Sign"}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-3 border-t border-border/50 bg-muted/10 justify-center">
            <Button variant="outline" size="sm" className="w-full gap-2 border-dashed">
              <Upload className="w-4 h-4" />
              {dir === 'rtl' ? "رفع مستند جديد" : "Upload Document"}
            </Button>
          </CardFooter>
        </Card>

        {/* Real-time Chat */}
        <Card className="border-border/50 shadow-sm flex flex-col h-[400px]">
          <CardHeader className="p-4 border-b border-border/50 bg-primary/5 pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-primary/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary">SC</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{dir === 'rtl' ? "مدير حسابك" : "Account Manager"}</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {dir === 'rtl' ? "متصل الآن - أحمد (SCAPE)" : "Online - Ahmed (SCAPE)"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden relative">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                <div className="text-center text-xs text-muted-foreground my-2">
                  {dir === 'rtl' ? "اليوم" : "Today"}
                </div>
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex max-w-[85%]",
                      msg.role === 'client' ? (dir === 'rtl' ? "mr-auto flex-row-reverse" : "ml-auto") : ""
                    )}
                  >
                    <div className={cn(
                      "rounded-2xl px-4 py-2 text-sm",
                      msg.role === 'client' 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}>
                      <p>{msg.text}</p>
                      <span className={cn(
                        "text-[10px] mt-1 block opacity-70",
                        dir === 'rtl' ? "text-left" : "text-right"
                      )}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-3 border-t border-border/50">
            <form 
              className="flex w-full gap-2"
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            >
              <Input 
                placeholder={dir === 'rtl' ? "اكتب رسالة..." : "Type a message..."} 
                className="flex-1 bg-secondary/50 focus-visible:ring-1"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <Button type="submit" size="icon" className="shrink-0 bg-primary hover:bg-primary/90">
                <MessageSquare className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
// Adding Building2 import that was missing in the implementation
import { Building2 } from "lucide-react";