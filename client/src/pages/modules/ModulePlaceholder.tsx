import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  Table as TableIcon,
  LayoutGrid
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ModulePlaceholderProps {
  moduleId: string;
  title: string;
  description: string;
  mockDataCols: string[];
}

export function ModulePlaceholder({ moduleId, title, description, mockDataCols }: ModulePlaceholderProps) {
  const { t, dir } = useLanguage();

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 h-[calc(100vh-6rem)]">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t(`nav.${moduleId}`)}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              Export
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              Create New
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <Input 
                  placeholder={`Search ${title}...`} 
                  className={`h-9 bg-secondary/50 border-0 ${dir === 'rtl' ? 'pr-9' : 'pl-9'}`}
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md p-1 bg-secondary/20">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-background shadow-sm">
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table Area */}
        <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-secondary/50 sticky top-0 z-10">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-12 text-center">
                    <input type="checkbox" className="rounded border-border" />
                  </TableHead>
                  {mockDataCols.map((col, i) => (
                    <TableHead key={i} className="whitespace-nowrap font-semibold">
                      {col}
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Generate 10 empty state mock rows to show structure */}
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <TableRow key={rowIndex} className="border-border/50 hover:bg-muted/50 transition-colors">
                    <TableCell className="text-center">
                      <input type="checkbox" className="rounded border-border" />
                    </TableCell>
                    {mockDataCols.map((_, colIndex) => (
                      <TableCell key={colIndex}>
                        <div className="h-4 w-3/4 bg-secondary rounded animate-pulse opacity-50" style={{ width: `${Math.random() * 40 + 40}%` }}></div>
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-border/50 p-3 flex items-center justify-between text-xs text-muted-foreground bg-secondary/20">
            <span>Showing 1 to 10 of 2,450 entries</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled className="h-7 px-2">Previous</Button>
              <Button variant="outline" size="sm" className="h-7 px-2 bg-background">1</Button>
              <Button variant="outline" size="sm" className="h-7 px-2">2</Button>
              <Button variant="outline" size="sm" className="h-7 px-2">3</Button>
              <span className="px-2 py-1">...</span>
              <Button variant="outline" size="sm" className="h-7 px-2">Next</Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
