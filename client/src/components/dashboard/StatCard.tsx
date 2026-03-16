import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  trend: string;
  icon: LucideIcon;
  trendUp?: boolean;
}

export function StatCard({ title, value, trend, icon: Icon, trendUp }: StatCardProps) {
  return (
    <Card className="hover-elevate shadow-sm border-border/50 transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className={cn(
          "text-xs mt-2 font-medium",
          trendUp === true ? "text-emerald-600 dark:text-emerald-400" : 
          trendUp === false ? "text-rose-600 dark:text-rose-400" : 
          "text-muted-foreground"
        )}>
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
