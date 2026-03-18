import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Trash2, ChevronRight, ChevronDown, Building2, Briefcase, Tags,
  Save, X, HardHat, Leaf, ShieldAlert, Flame, RefreshCcw, Check, Upload, ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  type Company, type CompanyActivity, type CompanyService, type ServiceSpecialization,
  getActiveCompany, updateCompany, generateId,
} from "@/lib/company-services";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw,
};

export function CompanyServicesManager() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [company, setCompany] = useState<Company>(getActiveCompany());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{
    type: "activity" | "service" | "specialization";
    activityId?: string;
    serviceId?: string;
    id: string;
  } | null>(null);

  const toggleActivity = (id: string) => {
    setExpandedActivities((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleService = (id: string) => {
    setExpandedServices((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleSaveCompany = () => {
    updateCompany(company);
    toast({ title: isRtl ? "تم الحفظ ✓" : "Saved ✓", description: isRtl ? "تم حفظ الأنشطة والخدمات" : "Activities and services saved" });
  };

  const addActivity = () => {
    const newActivity: CompanyActivity = {
      id: generateId(),
      nameAr: isRtl ? "نشاط جديد" : "New Activity",
      nameEn: "New Activity",
      color: "blue",
      iconName: "Briefcase",
      services: [],
    };
    setCompany({ ...company, activities: [...company.activities, newActivity] });
    setExpandedActivities((prev) => new Set([...prev, newActivity.id]));
  };

  const addService = (activityId: string) => {
    const newService: CompanyService = {
      id: generateId(),
      nameAr: isRtl ? "خدمة جديدة" : "New Service",
      nameEn: "New Service",
      specializations: [],
    };
    const activities = company.activities.map((a) =>
      a.id === activityId ? { ...a, services: [...a.services, newService] } : a
    );
    setCompany({ ...company, activities });
    setExpandedServices((prev) => new Set([...prev, newService.id]));
  };

  const addSpecialization = (activityId: string, serviceId: string) => {
    const newSpec: ServiceSpecialization = {
      id: generateId(),
      nameAr: isRtl ? "تخصص جديد" : "New Specialization",
      nameEn: "New Specialization",
    };
    const activities = company.activities.map((a) =>
      a.id === activityId
        ? {
            ...a,
            services: a.services.map((s) =>
              s.id === serviceId ? { ...s, specializations: [...s.specializations, newSpec] } : s
            ),
          }
        : a
    );
    setCompany({ ...company, activities });
  };

  const deleteActivity = (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف هذا النشاط؟" : "Delete this activity?")) return;
    setCompany({ ...company, activities: company.activities.filter((a) => a.id !== id) });
  };

  const deleteService = (activityId: string, serviceId: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف هذه الخدمة؟" : "Delete this service?")) return;
    const activities = company.activities.map((a) =>
      a.id === activityId ? { ...a, services: a.services.filter((s) => s.id !== serviceId) } : a
    );
    setCompany({ ...company, activities });
  };

  const deleteSpecialization = (activityId: string, serviceId: string, specId: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف هذا التخصص؟" : "Delete this specialization?")) return;
    const activities = company.activities.map((a) =>
      a.id === activityId
        ? {
            ...a,
            services: a.services.map((s) =>
              s.id === serviceId ? { ...s, specializations: s.specializations.filter((sp) => sp.id !== specId) } : s
            ),
          }
        : a
    );
    setCompany({ ...company, activities });
  };

  const updateActivityName = (id: string, field: "nameAr" | "nameEn", value: string) => {
    const activities = company.activities.map((a) =>
      a.id === id ? { ...a, [field]: value } : a
    );
    setCompany({ ...company, activities });
  };

  const updateServiceName = (activityId: string, serviceId: string, field: "nameAr" | "nameEn", value: string) => {
    const activities = company.activities.map((a) =>
      a.id === activityId
        ? {
            ...a,
            services: a.services.map((s) => (s.id === serviceId ? { ...s, [field]: value } : s)),
          }
        : a
    );
    setCompany({ ...company, activities });
  };

  const updateSpecializationName = (activityId: string, serviceId: string, specId: string, field: "nameAr" | "nameEn", value: string) => {
    const activities = company.activities.map((a) =>
      a.id === activityId
        ? {
            ...a,
            services: a.services.map((s) =>
              s.id === serviceId
                ? {
                    ...s,
                    specializations: s.specializations.map((sp) =>
                      sp.id === specId ? { ...sp, [field]: value } : sp
                    ),
                  }
                : s
            ),
          }
        : a
    );
    setCompany({ ...company, activities });
  };

  return (
    <div className="space-y-5">
      {/* Company header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isRtl ? "الشركة الحالية" : "Current Company"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Logo upload section */}
          <div>
            <Label className="text-xs">{isRtl ? "شعار الشركة" : "Company Logo"}</Label>
            <div className="mt-1 flex items-center gap-3">
              {/* Logo preview */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-border/60 flex-shrink-0"
                style={{ background: company.logoColor || "#1e40af" }}
              >
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {company.nameEn?.charAt(0)?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setCompany({ ...company, logoUrl: ev.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <div className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-md px-2 py-1.5 hover:bg-primary/5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {isRtl ? "رفع شعار" : "Upload Logo"}
                  </div>
                </label>
                {company.logoUrl && (
                  <button
                    onClick={() => setCompany({ ...company, logoUrl: undefined })}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                    {isRtl ? "إزالة الشعار" : "Remove Logo"}
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">{isRtl ? "لون الخلفية:" : "BG Color:"}</Label>
                  <input
                    type="color"
                    value={company.logoColor || "#1e40af"}
                    onChange={(e) => setCompany({ ...company, logoColor: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer border-0"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">{isRtl ? "الاسم بالعربي" : "Name (Arabic)"}</Label>
            <Input
              value={company.nameAr}
              onChange={(e) => setCompany({ ...company, nameAr: e.target.value })}
              className="mt-1 h-9 bg-background"
            />
          </div>
          <div>
            <Label className="text-xs">{isRtl ? "الاسم بالإنجليزي" : "Name (English)"}</Label>
            <Input
              value={company.nameEn}
              onChange={(e) => setCompany({ ...company, nameEn: e.target.value })}
              className="mt-1 h-9 bg-background"
            />
          </div>
          <div>
            <Label className="text-xs">{isRtl ? "الرقم الضريبي" : "VAT Number"}</Label>
            <Input
              value={company.vatNumber || ""}
              onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
              className="mt-1 h-9 bg-background"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Activities tree */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">{isRtl ? "شجرة الأنشطة والخدمات" : "Activities & Services Tree"}</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addActivity} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" />
            {isRtl ? "إضافة نشاط" : "Add Activity"}
          </Button>
          <Button size="sm" onClick={handleSaveCompany} className="gap-1.5 h-8">
            <Save className="w-3.5 h-3.5" />
            {isRtl ? "حفظ الكل" : "Save All"}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {company.activities.map((activity) => {
            const Icon = ICONS[activity.iconName] ?? Briefcase;
            const isExpanded = expandedActivities.has(activity.id);
            const isEditing = editingItem?.type === "activity" && editingItem.id === activity.id;
            return (
              <Card key={activity.id} className="border-border/50">
                <CardHeader className="py-3 px-4 bg-secondary/20 border-b border-border/40">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleActivity(activity.id)}
                      className="flex items-center gap-2 shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                          `bg-${activity.color}-500`
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    </button>
                    <div className="flex-1 min-w-0 space-y-1">
                      {isEditing ? (
                        <>
                          <Input
                            value={activity.nameAr}
                            onChange={(e) => updateActivityName(activity.id, "nameAr", e.target.value)}
                            className="h-7 text-sm"
                            placeholder={isRtl ? "الاسم بالعربي" : "Name (Arabic)"}
                            autoFocus
                          />
                          <Input
                            value={activity.nameEn}
                            onChange={(e) => updateActivityName(activity.id, "nameEn", e.target.value)}
                            className="h-7 text-sm"
                            placeholder={isRtl ? "الاسم بالإنجليزي" : "Name (English)"}
                          />
                        </>
                      ) : (
                        <div onClick={() => setEditingItem({ type: "activity", id: activity.id })} className="cursor-pointer hover:bg-secondary/30 rounded px-2 py-1">
                          <p className="font-semibold text-sm">{isRtl ? activity.nameAr : activity.nameEn}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.services.length} {isRtl ? "خدمة" : "service(s)"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-emerald-600"
                          onClick={() => setEditingItem(null)}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => addService(activity.id)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        onClick={() => deleteActivity(activity.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-4 space-y-3">
                    {/* Services */}
                    {activity.services.map((service) => {
                      const isServiceExpanded = expandedServices.has(service.id);
                      const isServiceEditing = editingItem?.type === "service" && editingItem.id === service.id;
                      return (
                        <div key={service.id} className="ms-6 border-s-2 border-border/40 ps-4 space-y-2">
                          <div className="flex items-center justify-between gap-2 bg-secondary/30 rounded-lg p-2">
                            <button
                              onClick={() => toggleService(service.id)}
                              className="flex items-center gap-2 shrink-0"
                            >
                              {isServiceExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <div className="flex-1 min-w-0">
                              {isServiceEditing ? (
                                <div className="space-y-1">
                                  <Input
                                    value={service.nameAr}
                                    onChange={(e) => updateServiceName(activity.id, service.id, "nameAr", e.target.value)}
                                    className="h-6 text-xs"
                                    placeholder={isRtl ? "الاسم بالعربي" : "Name (Arabic)"}
                                    autoFocus
                                  />
                                  <Input
                                    value={service.nameEn}
                                    onChange={(e) => updateServiceName(activity.id, service.id, "nameEn", e.target.value)}
                                    className="h-6 text-xs"
                                    placeholder={isRtl ? "الاسم بالإنجليزي" : "Name (English)"}
                                  />
                                </div>
                              ) : (
                                <div onClick={() => setEditingItem({ type: "service", activityId: activity.id, id: service.id })} className="cursor-pointer hover:bg-secondary/50 rounded px-2 py-0.5 flex items-center gap-2">
                                  <p className="text-sm font-medium">{isRtl ? service.nameAr : service.nameEn}</p>
                                  <Badge variant="outline" className="text-[10px]">
                                    {service.specializations.length} {isRtl ? "تخصص" : "spec(s)"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {isServiceEditing && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-emerald-600"
                                  onClick={() => setEditingItem(null)}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => addSpecialization(activity.id, service.id)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600"
                                onClick={() => deleteService(activity.id, service.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Specializations */}
                          {isServiceExpanded && service.specializations.length > 0 && (
                            <div className="ms-4 space-y-1">
                              {service.specializations.map((spec) => {
                                const isSpecEditing = editingItem?.type === "specialization" && editingItem.id === spec.id;
                                return (
                                  <div
                                    key={spec.id}
                                    className="flex items-center justify-between gap-2 text-xs bg-secondary/20 rounded px-2 py-1.5"
                                  >
                                    <Tags className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      {isSpecEditing ? (
                                        <div className="space-y-1">
                                          <Input
                                            value={spec.nameAr}
                                            onChange={(e) => updateSpecializationName(activity.id, service.id, spec.id, "nameAr", e.target.value)}
                                            className="h-5 text-[10px]"
                                            placeholder={isRtl ? "الاسم بالعربي" : "Name (Arabic)"}
                                            autoFocus
                                          />
                                          <Input
                                            value={spec.nameEn}
                                            onChange={(e) => updateSpecializationName(activity.id, service.id, spec.id, "nameEn", e.target.value)}
                                            className="h-5 text-[10px]"
                                            placeholder={isRtl ? "الاسم بالإنجليزي" : "Name (English)"}
                                          />
                                        </div>
                                      ) : (
                                        <span onClick={() => setEditingItem({ type: "specialization", activityId: activity.id, serviceId: service.id, id: spec.id })} className="cursor-pointer hover:bg-secondary/50 rounded px-1 py-0.5 block">
                                          {isRtl ? spec.nameAr : spec.nameEn}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      {isSpecEditing && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 text-emerald-600"
                                          onClick={() => setEditingItem(null)}
                                        >
                                          <Check className="w-2.5 h-2.5" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 p-0 text-red-600"
                                        onClick={() => deleteSpecialization(activity.id, service.id, spec.id)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {activity.services.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {isRtl ? "لا توجد خدمات — اضغط + لإضافة خدمة" : "No services — Click + to add a service"}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {company.activities.length === 0 && (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Briefcase className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">
                  {isRtl ? "لا توجد أنشطة — ابدأ بإضافة نشاط" : "No activities — Start by adding an activity"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
