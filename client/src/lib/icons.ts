import type React from "react";
import {
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw, Globe, Layers,
  Factory, TreePine, Zap, Wind, Droplets, Mountain, Wrench, Cpu,
  FlaskConical, Anchor, Warehouse, Hammer, Recycle, Sprout, Fish,
  Cog, Home, Star, Package, Truck, Sun, Landmark, BrainCircuit,
  Microscope, Car, Ship, Train, Stethoscope, BarChart3,
} from "lucide-react";

export const ICON_OPTIONS: {
  key: string; Icon: React.ComponentType<{ className?: string }>; ar: string; en: string;
}[] = [
  { key: "HardHat",     Icon: HardHat,      ar: "خوذة",           en: "Hard Hat" },
  { key: "Leaf",        Icon: Leaf,          ar: "ورقة",           en: "Leaf" },
  { key: "ShieldAlert", Icon: ShieldAlert,   ar: "درع",            en: "Shield" },
  { key: "Flame",       Icon: Flame,         ar: "لهب",            en: "Flame" },
  { key: "Building2",   Icon: Building2,     ar: "مبنى",           en: "Building" },
  { key: "RefreshCcw",  Icon: RefreshCcw,    ar: "تدوير",          en: "Refresh" },
  { key: "Globe",       Icon: Globe,         ar: "كرة أرضية",      en: "Globe" },
  { key: "Layers",      Icon: Layers,        ar: "طبقات",          en: "Layers" },
  { key: "Factory",     Icon: Factory,       ar: "مصنع",           en: "Factory" },
  { key: "TreePine",    Icon: TreePine,      ar: "شجرة",           en: "Tree" },
  { key: "Zap",         Icon: Zap,           ar: "طاقة",           en: "Energy" },
  { key: "Wind",        Icon: Wind,          ar: "رياح",           en: "Wind" },
  { key: "Droplets",    Icon: Droplets,      ar: "مياه",           en: "Water" },
  { key: "Mountain",    Icon: Mountain,      ar: "جبل",            en: "Mountain" },
  { key: "Wrench",      Icon: Wrench,        ar: "مفتاح",          en: "Wrench" },
  { key: "Cpu",         Icon: Cpu,           ar: "معالج",          en: "CPU" },
  { key: "FlaskConical",Icon: FlaskConical,  ar: "كيمياء",         en: "Chemistry" },
  { key: "Anchor",      Icon: Anchor,        ar: "مرساة",          en: "Anchor" },
  { key: "Warehouse",   Icon: Warehouse,     ar: "مستودع",         en: "Warehouse" },
  { key: "Hammer",      Icon: Hammer,        ar: "مطرقة",          en: "Hammer" },
  { key: "Recycle",     Icon: Recycle,       ar: "إعادة تدوير",    en: "Recycle" },
  { key: "Sprout",      Icon: Sprout,        ar: "نبات",           en: "Sprout" },
  { key: "Fish",        Icon: Fish,          ar: "سمكة",           en: "Fish" },
  { key: "Cog",         Icon: Cog,           ar: "تروس",           en: "Gear" },
  { key: "Home",        Icon: Home,          ar: "منزل",           en: "Home" },
  { key: "Star",        Icon: Star,          ar: "نجمة",           en: "Star" },
  { key: "Package",     Icon: Package,       ar: "طرد",            en: "Package" },
  { key: "Truck",       Icon: Truck,         ar: "شاحنة",          en: "Truck" },
  { key: "Sun",         Icon: Sun,           ar: "شمس",            en: "Sun" },
  { key: "Landmark",    Icon: Landmark,      ar: "حكومي",          en: "Government" },
  { key: "BrainCircuit",Icon: BrainCircuit,  ar: "ذكاء اصطناعي",   en: "AI" },
  { key: "Microscope",  Icon: Microscope,    ar: "مجهر",           en: "Microscope" },
  { key: "Car",         Icon: Car,           ar: "سيارة",          en: "Car" },
  { key: "Ship",        Icon: Ship,          ar: "سفينة",          en: "Ship" },
  { key: "Train",       Icon: Train,         ar: "قطار",           en: "Train" },
  { key: "Stethoscope", Icon: Stethoscope,   ar: "طب",             en: "Medical" },
  { key: "BarChart3",   Icon: BarChart3,     ar: "إحصاء",          en: "Statistics" },
];

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> =
  Object.fromEntries(ICON_OPTIONS.map(({ key, Icon }) => [key, Icon]));
