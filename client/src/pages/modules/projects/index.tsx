import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ProjectsModule() {
  const { t } = useLanguage();

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('nav.projects')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('proj.desc') || 'Manage project lifecycles, timelines, and milestones.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('action.create_new')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="timeline" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50">
            <TabsTrigger value="timeline" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('proj.tab.timeline') || 'Gantt Timeline'}</TabsTrigger>
            <TabsTrigger value="list" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('proj.tab.list') || 'Projects List'}</TabsTrigger>
            <TabsTrigger value="kanban" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('proj.tab.kanban') || 'Tasks Board'}</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-4 overflow-hidden relative">
            <TabsContent value="timeline" className="h-full m-0 data-[state=active]:flex flex-col">
              <ProjectTimeline />
            </TabsContent>
            
            <TabsContent value="list" className="h-full m-0 data-[state=active]:flex flex-col">
              <ProjectsList />
            </TabsContent>
            
            <TabsContent value="kanban" className="h-full m-0 data-[state=active]:flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/50">
              <div className="text-muted-foreground">Kanban board implementation coming soon</div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
