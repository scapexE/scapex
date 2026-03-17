import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { cn } from "@/lib/utils";

const cashflowData = [
  { name: 'Jan', in: 4000, out: 2400 },
  { name: 'Feb', in: 3000, out: 1398 },
  { name: 'Mar', in: 2000, out: 9800 },
  { name: 'Apr', in: 2780, out: 3908 },
  { name: 'May', in: 1890, out: 4800 },
  { name: 'Jun', in: 2390, out: 3800 },
  { name: 'Jul', in: 3490, out: 4300 },
];

const revenueData = [
  { name: 'Jan', revenue: 6500 },
  { name: 'Feb', revenue: 5900 },
  { name: 'Mar', revenue: 8000 },
  { name: 'Apr', revenue: 8100 },
  { name: 'May', revenue: 9500 },
  { name: 'Jun', revenue: 11000 },
  { name: 'Jul', revenue: 10500 },
];

export function AccountingDashboard() {
  const { t, dir } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +12.5%
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t('acc.dash.revenue')}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">SAR 1,245,000</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +4.1%
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t('acc.dash.expenses')}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">SAR 842,500</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +18.2%
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t('acc.dash.profit')}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">SAR 402,500</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{dir === 'rtl' ? 'رصيد البنك' : 'Bank Balance'}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">SAR 3,150,000</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6">{dir === 'rtl' ? 'التدفق النقدي (6 أشهر)' : 'Cash Flow (6 Months)'}</h3>
            <div className="h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                    contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}}
                  />
                  <Legend />
                  <Bar dataKey="in" name={dir === 'rtl' ? 'وارد' : 'Inflow'} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="out" name={dir === 'rtl' ? 'صادر' : 'Outflow'} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6">{dir === 'rtl' ? 'نمو الإيرادات' : 'Revenue Growth'}</h3>
            <div className="h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}}
                  />
                  <Line type="monotone" dataKey="revenue" name={dir === 'rtl' ? 'الإيرادات' : 'Revenue'} stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
