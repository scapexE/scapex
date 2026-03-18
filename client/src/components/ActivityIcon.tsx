import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON_MAP } from "@/lib/icons";

export function ActivityIcon({ name, className }: { name: string; className?: string }) {
  if (!name || name === "none") return null;
  if (name.startsWith("data:") || name.startsWith("http")) {
    return <img src={name} alt="" className={cn("object-contain rounded", className)} />;
  }
  const Icon = (ICON_MAP[name] as React.ComponentType<{ className?: string }>) ?? Globe;
  return <Icon className={className} />;
}
