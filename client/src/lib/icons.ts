import type React from "react";
import {
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw, Globe, Layers,
  Factory, TreePine, Zap, Wind, Droplets, Mountain, Wrench, Cpu,
  FlaskConical, Anchor, Warehouse, Hammer, Recycle, Sprout, Fish,
  Cog, Home, Star, Package, Truck, Sun, Landmark, BrainCircuit,
  Microscope, Car, Ship, Train, Stethoscope, BarChart3,
} from "lucide-react";

export const ICON_OPTIONS: {
  key: string; Icon: React.ComponentType<{ className?: string }>; ar: string;
}[] = [
  { key: "HardHat",     Icon: HardHat,      ar: "خوذة" },
  { key: "Leaf",        Icon: Leaf,          ar: "ورقة" },
  { key: "ShieldAlert", Icon: ShieldAlert,   ar: "درع" },
  { key: "Flame",       Icon: Flame,         ar: "لهب" },
  { key: "Building2",   Icon: Building2,     ar: "مبنى" },
  { key: "RefreshCcw",  Icon: RefreshCcw,    ar: "تدوير" },
  { key: "Globe",       Icon: Globe,         ar: "كرة أرضية" },
  { key: "Layers",      Icon: Layers,        ar: "طبقات" },
  { key: "Factory",     Icon: Factory,       ar: "مصنع" },
  { key: "TreePine",    Icon: TreePine,      ar: "شجرة" },
  { key: "Zap",         Icon: Zap,           ar: "طاقة" },
  { key: "Wind",        Icon: Wind,          ar: "رياح" },
  { key: "Droplets",    Icon: Droplets,      ar: "مياه" },
  { key: "Mountain",    Icon: Mountain,      ar: "جبل" },
  { key: "Wrench",      Icon: Wrench,        ar: "مفتاح" },
  { key: "Cpu",         Icon: Cpu,           ar: "معالج" },
  { key: "FlaskConical",Icon: FlaskConical,  ar: "كيمياء" },
  { key: "Anchor",      Icon: Anchor,        ar: "مرساة" },
  { key: "Warehouse",   Icon: Warehouse,     ar: "مستودع" },
  { key: "Hammer",      Icon: Hammer,        ar: "مطرقة" },
  { key: "Recycle",     Icon: Recycle,       ar: "إعادة تدوير" },
  { key: "Sprout",      Icon: Sprout,        ar: "نبات" },
  { key: "Fish",        Icon: Fish,          ar: "سمكة" },
  { key: "Cog",         Icon: Cog,           ar: "تروس" },
  { key: "Home",        Icon: Home,          ar: "منزل" },
  { key: "Star",        Icon: Star,          ar: "نجمة" },
  { key: "Package",     Icon: Package,       ar: "طرد" },
  { key: "Truck",       Icon: Truck,         ar: "شاحنة" },
  { key: "Sun",         Icon: Sun,           ar: "شمس" },
  { key: "Landmark",    Icon: Landmark,      ar: "حكومي" },
  { key: "BrainCircuit",Icon: BrainCircuit,  ar: "ذكاء اصطناعي" },
  { key: "Microscope",  Icon: Microscope,    ar: "مجهر" },
  { key: "Car",         Icon: Car,           ar: "سيارة" },
  { key: "Ship",        Icon: Ship,          ar: "سفينة" },
  { key: "Train",       Icon: Train,         ar: "قطار" },
  { key: "Stethoscope", Icon: Stethoscope,   ar: "طب" },
  { key: "BarChart3",   Icon: BarChart3,     ar: "إحصاء" },
];

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> =
  Object.fromEntries(ICON_OPTIONS.map(({ key, Icon }) => [key, Icon]));
