// ─── Sub-Services Library ──────────────────────────────────────────────────
// Detailed service definitions for each main activity type
// with AI proposal templates and Saudi market pricing (2025)

import type { ServiceType } from "./proposals";

export interface SubServiceItem {
  descAr: string;
  descEn: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface SubService {
  id: string;
  serviceType: ServiceType;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  icon: string; // lucide icon name
  color: string;
  defaultValidity: number;
  estimatedMargin: number;
  introAr: (proj: string) => string;
  introEn: (proj: string) => string;
  scopeAr: (proj: string) => string;
  scopeEn: (proj: string) => string;
  items: SubServiceItem[];
  tags: string[];
}

// ─── Safety Services Sub-Services ──────────────────────────────────────────

const SAFETY_SERVICES_SUBS: SubService[] = [
  {
    id: "fire_alarm_install",
    serviceType: "safety_services",
    labelAr: "تركيب أنظمة الإنذار والحماية من الحريق",
    labelEn: "Fire Alarm & Fire Protection System Installation",
    descAr: "توريد وتركيب أنظمة الكشف والإنذار عن الحريق ومنظومات الإطفاء الآلي وفق اشتراطات الدفاع المدني",
    descEn: "Supply and installation of fire detection, alarm, and automatic suppression systems per Civil Defense requirements",
    icon: "Flame",
    color: "red",
    defaultValidity: 30,
    estimatedMargin: 30,
    introAr: (p) => `يسعدنا تقديم عرض أسعارنا لتوريد وتركيب أنظمة الإنذار والحماية من الحريق لـ (${p})، ونحرص على تنفيذ المشروع وفق اشتراطات الدفاع المدني والكودات الدولية NFPA وأحدث التقنيات المعتمدة.`,
    introEn: (p) => `We are pleased to submit our proposal for the supply and installation of fire alarm and protection systems for (${p}), ensuring full compliance with Civil Defense requirements and NFPA international codes.`,
    scopeAr: (p) => `نقدم عرضنا لتنفيذ منظومة الإنذار والحماية من الحريق لمشروع (${p}) شاملاً التصميم والتوريد والتركيب والاختبار والتسليم مع التدريب الكامل للكادر التشغيلي.`,
    scopeEn: (p) => `We offer our proposal to implement the fire alarm and protection system for (${p}), including design, supply, installation, testing, handover, and full operational team training.`,
    items: [
      { descAr: "كاشفات الدخان (Smoke Detectors) — توريد وتركيب", descEn: "Smoke Detectors — Supply & Installation", qty: 50, unit: "حبة / Pc", unitPrice: 185, total: 9250 },
      { descAr: "لوحة التحكم المركزية في الإنذار (FACP)", descEn: "Fire Alarm Control Panel (FACP)", qty: 1, unit: "وحدة / Unit", unitPrice: 8500, total: 8500 },
      { descAr: "أجهزة الإنذار الصوتي والمرئي (Horn Strobe)", descEn: "Horn Strobe Alarm Devices", qty: 20, unit: "حبة / Pc", unitPrice: 220, total: 4400 },
      { descAr: "طفايات الحريق (CO2 & Dry Powder) — توريد وتركيب", descEn: "Fire Extinguishers (CO2 & Dry Powder) — Supply & Install", qty: 30, unit: "طفاية / Unit", unitPrice: 350, total: 10500 },
      { descAr: "نقاط سحب يدوية (Manual Call Points)", descEn: "Manual Call Points", qty: 15, unit: "حبة / Pc", unitPrice: 120, total: 1800 },
      { descAr: "شبكة مواسير الإطفاء ورأس الرش (Sprinkler System)", descEn: "Sprinkler System Piping & Heads", qty: 80, unit: "رأس / Head", unitPrice: 280, total: 22400 },
      { descAr: "أعمال التمديدات الكهربائية وكابلات الإنذار", descEn: "Electrical Wiring & Alarm Cables", qty: 1, unit: "مقطوع / L.S", unitPrice: 12000, total: 12000 },
      { descAr: "اختبار المنظومة وتشغيلها والحصول على موافقة الدفاع المدني", descEn: "System Testing, Commissioning & Civil Defense Approval", qty: 1, unit: "مقطوع / L.S", unitPrice: 7500, total: 7500 },
      { descAr: "تدريب الكادر التشغيلي على نظام الإنذار", descEn: "Operational Team Training on Fire Alarm System", qty: 1, unit: "دورة / Course", unitPrice: 3500, total: 3500 },
    ],
    tags: ["NFPA", "Civil Defense", "دفاع مدني", "إنذار", "إطفاء"],
  },
  {
    id: "fire_alarm_maintenance",
    serviceType: "safety_services",
    labelAr: "عقد صيانة أنظمة الإنذار والحماية من الحريق",
    labelEn: "Fire Alarm & Fire Protection System Maintenance Contract",
    descAr: "عقد صيانة دورية وطارئة لمنظومات الكشف والإنذار عن الحريق والإطفاء الآلي مع التقارير الدورية",
    descEn: "Periodic and emergency maintenance contract for fire detection, alarm, and automatic suppression systems with periodic reports",
    icon: "WrenchIcon",
    color: "orange",
    defaultValidity: 30,
    estimatedMargin: 40,
    introAr: (p) => `نتشرف بتقديم عرض أسعارنا لعقد الصيانة الدورية لأنظمة الإنذار والحماية من الحريق لـ (${p}). نضمن لكم استمرارية عمل المنظومة بكفاءة عالية وامتثالاً تاماً لاشتراطات الدفاع المدني على مدار العام.`,
    introEn: (p) => `We are honored to submit our maintenance contract proposal for fire alarm and protection systems at (${p}). We guarantee continuous, efficient system operation in full compliance with Civil Defense requirements year-round.`,
    scopeAr: (p) => `يشمل العقد الصيانة الدورية الوقائية والتصحيحية لجميع مكونات منظومة الحريق في مشروع (${p}) مع صيانة طارئة وتقارير فنية شهرية.`,
    scopeEn: (p) => `The contract covers periodic preventive and corrective maintenance of all fire system components at (${p}), with emergency response and monthly technical reports.`,
    items: [
      { descAr: "زيارة صيانة وقائية دورية ربع سنوية (شاملة الفحص الكامل)", descEn: "Quarterly Preventive Maintenance Visit (Full Inspection)", qty: 4, unit: "زيارة / Visit", unitPrice: 2200, total: 8800 },
      { descAr: "اختبار دوري شامل لأجهزة الكشف والإنذار", descEn: "Comprehensive Testing of Detection & Alarm Devices", qty: 2, unit: "اختبار / Test", unitPrice: 1800, total: 3600 },
      { descAr: "فحص وضغط شبكة الإطفاء وتعبئة الطفايات", descEn: "Fire Network Pressure Test & Extinguisher Refill", qty: 2, unit: "مرة / Time", unitPrice: 1500, total: 3000 },
      { descAr: "تقرير صيانة شهري مع حالة المنظومة", descEn: "Monthly Maintenance Report with System Status", qty: 12, unit: "تقرير / Report", unitPrice: 350, total: 4200 },
      { descAr: "صيانة طارئة خارج أوقات الدوام (On-Call 24/7)", descEn: "Emergency Maintenance — 24/7 On-Call Response", qty: 12, unit: "شهر / Month", unitPrice: 800, total: 9600 },
      { descAr: "قطع غيار وبدائل تشغيلية (Spare Parts Budget)", descEn: "Operational Spare Parts Budget", qty: 1, unit: "مقطوع / L.S", unitPrice: 5000, total: 5000 },
    ],
    tags: ["صيانة", "عقد سنوي", "حريق", "دفاع مدني", "Maintenance"],
  },
  {
    id: "fire_install_report",
    serviceType: "safety_services",
    labelAr: "إصدار تقارير تركيب أنظمة الحماية من الحريق",
    labelEn: "Fire Protection System Installation Reports",
    descAr: "إعداد وإصدار التقارير الفنية الرسمية لعمليات التركيب ووثائق الاعتماد الرسمية من الدفاع المدني",
    descEn: "Preparation and issuance of official technical installation reports and Civil Defense accreditation documents",
    icon: "FileCheck",
    color: "amber",
    defaultValidity: 14,
    estimatedMargin: 55,
    introAr: (p) => `نتقدم بعرض أسعارنا لخدمة إعداد وإصدار التقارير الفنية الرسمية لأنظمة الحماية من الحريق في مشروع (${p})، لضمان الامتثال الكامل ومتطلبات استصدار الرخص من الدفاع المدني.`,
    introEn: (p) => `We present our proposal for the preparation and issuance of official technical reports for fire protection systems at (${p}), ensuring full compliance and Civil Defense licensing requirements.`,
    scopeAr: (p) => `تشمل الخدمة إعداد التقارير الفنية الكاملة لمشروع (${p}) من رسومات تنفيذية ومحاضر فحص وشهادات اختبار وحزمة وثائق الدفاع المدني.`,
    scopeEn: (p) => `The service covers full technical report preparation for (${p}) including as-built drawings, inspection records, test certificates, and Civil Defense documentation package.`,
    items: [
      { descAr: "إعداد الرسومات التنفيذية كما نُفِّذت (As-Built Drawings)", descEn: "As-Built Drawings Preparation", qty: 1, unit: "مشروع / Project", unitPrice: 4500, total: 4500 },
      { descAr: "تقرير الفحص الفني الشامل للمنظومة", descEn: "Comprehensive System Technical Inspection Report", qty: 1, unit: "تقرير / Report", unitPrice: 3500, total: 3500 },
      { descAr: "محاضر اختبار الأجهزة (Device Testing Records)", descEn: "Device Testing & Commissioning Records", qty: 1, unit: "مجموعة / Set", unitPrice: 2000, total: 2000 },
      { descAr: "إعداد ملف استصدار رخصة الدفاع المدني", descEn: "Civil Defense License Application File Preparation", qty: 1, unit: "ملف / File", unitPrice: 5000, total: 5000 },
      { descAr: "متابعة استصدار الرخصة لدى الدفاع المدني", descEn: "Civil Defense License Follow-up & Coordination", qty: 1, unit: "مقطوع / L.S", unitPrice: 3500, total: 3500 },
    ],
    tags: ["تقارير", "رخصة", "دفاع مدني", "Reports", "License"],
  },
  {
    id: "fire_equipment_supply",
    serviceType: "safety_services",
    labelAr: "توريد معدات ومستلزمات الحماية من الحريق",
    labelEn: "Fire Protection Equipment & Supplies",
    descAr: "توريد طفايات الحريق وخراطيم الإطفاء والبكرات ومعدات السلامة المعتمدة من الدفاع المدني",
    descEn: "Supply of fire extinguishers, hoses, reels, and Civil Defense-approved safety equipment",
    icon: "Package",
    color: "red",
    defaultValidity: 14,
    estimatedMargin: 25,
    introAr: (p) => `نقدم عرض أسعارنا لتوريد معدات ومستلزمات الحماية من الحريق لـ (${p})، جميع المنتجات معتمدة من الدفاع المدني السعودي ومطابقة للمواصفات القياسية السعودية SASO.`,
    introEn: (p) => `We present our quotation for fire protection equipment and supplies for (${p}). All products are Saudi Civil Defense-approved and SASO-compliant.`,
    scopeAr: (p) => `يشمل العرض توريد جميع معدات ومستلزمات الحماية من الحريق المطلوبة لمشروع (${p}) وفق قائمة الكميات المعتمدة.`,
    scopeEn: (p) => `The offer covers supply of all fire protection equipment and supplies required for (${p}) per the approved bill of quantities.`,
    items: [
      { descAr: "طفايات حريق بودرة جافة 6 كجم", descEn: "6 kg Dry Powder Fire Extinguisher", qty: 20, unit: "طفاية / Unit", unitPrice: 280, total: 5600 },
      { descAr: "طفايات حريق CO2 5 كجم", descEn: "5 kg CO2 Fire Extinguisher", qty: 10, unit: "طفاية / Unit", unitPrice: 420, total: 4200 },
      { descAr: "بكرة خرطوم الحريق مع الخزانة (Fire Hose Reel Cabinet)", descEn: "Fire Hose Reel with Cabinet", qty: 8, unit: "وحدة / Unit", unitPrice: 1200, total: 9600 },
      { descAr: "لوحات وملصقات إرشادية الحريق (Fire Safety Signs)", descEn: "Fire Safety Signage & Labels", qty: 1, unit: "مجموعة / Set", unitPrice: 2500, total: 2500 },
      { descAr: "بطانيات النجاة (Fire Blankets)", descEn: "Fire Blankets", qty: 10, unit: "قطعة / Pc", unitPrice: 150, total: 1500 },
      { descAr: "عربة إطفاء متنقلة 50 كجم", descEn: "50 kg Mobile Fire Trolley", qty: 2, unit: "عربة / Trolley", unitPrice: 2200, total: 4400 },
    ],
    tags: ["توريد", "معدات", "طفايات", "Equipment", "Supply"],
  },
  {
    id: "emergency_training",
    serviceType: "safety_services",
    labelAr: "تأهيل وتدريب فرق الطوارئ والإخلاء",
    labelEn: "Emergency Response & Evacuation Team Training",
    descAr: "تدريب وتأهيل فرق الطوارئ والإخلاء وإجراء التدريبات العملية والتجريبية الكاملة",
    descEn: "Training and qualification of emergency and evacuation teams with full practical drills",
    icon: "Users",
    color: "amber",
    defaultValidity: 30,
    estimatedMargin: 50,
    introAr: (p) => `نسعد بتقديم برنامج التأهيل والتدريب على الطوارئ والإخلاء لـ (${p})، وفق أحدث المناهج الدولية وبإشراف مدربين معتمدين من الجهات الدولية المعترف بها.`,
    introEn: (p) => `We are pleased to offer our emergency response and evacuation training program for (${p}), delivered by internationally certified trainers per the latest international curricula.`,
    scopeAr: (p) => `يشمل البرنامج التدريبي لمشروع (${p}) التدريب النظري والعملي على إجراءات الطوارئ والإخلاء ومكافحة الحريق وإسعاف الحوادث.`,
    scopeEn: (p) => `The training program for (${p}) covers theoretical and practical training on emergency procedures, evacuation, firefighting, and incident first aid.`,
    items: [
      { descAr: "دورة إدارة الطوارئ والإخلاء (نظري وعملي)", descEn: "Emergency Management & Evacuation Training (Theory + Practical)", qty: 1, unit: "دورة / Course", unitPrice: 12000, total: 12000 },
      { descAr: "تدريب عملي على مكافحة الحرائق بالطفايات", descEn: "Practical Fire Extinguisher Training", qty: 1, unit: "جلسة / Session", unitPrice: 4500, total: 4500 },
      { descAr: "إعداد وتنفيذ خطة الإخلاء وإرشاد المسالك", descEn: "Evacuation Plan Preparation & Pathway Signage", qty: 1, unit: "مقطوع / L.S", unitPrice: 5000, total: 5000 },
      { descAr: "تنفيذ تدريب تجريبي كامل (Fire Drill) وتقرير التقييم", descEn: "Full Fire Drill Execution & Evaluation Report", qty: 1, unit: "تدريب / Drill", unitPrice: 6500, total: 6500 },
      { descAr: "شهادات إتمام معتمدة للمشاركين", descEn: "Certified Completion Certificates for Participants", qty: 30, unit: "شهادة / Cert", unitPrice: 120, total: 3600 },
    ],
    tags: ["تدريب", "طوارئ", "إخلاء", "Training", "Emergency"],
  },
];

// ─── Contracting Sub-Services ──────────────────────────────────────────────

const CONTRACTING_SUBS: SubService[] = [
  {
    id: "building_construction",
    serviceType: "contracting",
    labelAr: "إنشاء وتشييد المباني",
    labelEn: "Building Construction",
    descAr: "تنفيذ مشاريع إنشاء المباني السكنية والتجارية والصناعية من الخرسانة والحجر والهيكل المعدني",
    descEn: "Construction of residential, commercial, and industrial buildings in concrete, stone, or steel structure",
    icon: "Building2",
    color: "violet",
    defaultValidity: 45,
    estimatedMargin: 22,
    introAr: (p) => `يسرنا تقديم عرض أسعارنا لتنفيذ مشروع إنشاء (${p}). نلتزم بتنفيذ المشروع وفق أحدث المعايير الهندسية والمواصفات السعودية مع التزام صارم بالجدول الزمني والجودة العالية.`,
    introEn: (p) => `We are pleased to offer our proposal for the construction of (${p}). We commit to executing the project per the latest engineering standards and Saudi specifications with strict adherence to the timeline and high quality.`,
    scopeAr: (p) => `يشمل نطاق العمل لمشروع (${p}) جميع الأعمال المدنية والإنشائية من حفر وتسوية وخرسانة وبناء وتشطيبات وفق الكميات المعتمدة.`,
    scopeEn: (p) => `The scope for (${p}) covers all civil and structural works including excavation, grading, concrete, masonry, and finishing per approved quantities.`,
    items: [
      { descAr: "أعمال الحفر والردم والتسوية", descEn: "Excavation, Backfill & Grading", qty: 600, unit: "م³ / m³", unitPrice: 85, total: 51000 },
      { descAr: "أعمال الخرسانة المسلحة (أساسات + عمود + سقف)", descEn: "Reinforced Concrete (Foundation + Columns + Slabs)", qty: 250, unit: "م³ / m³", unitPrice: 580, total: 145000 },
      { descAr: "أعمال البناء بالطابوق والحجر", descEn: "Brick & Stone Masonry Works", qty: 1200, unit: "م² / m²", unitPrice: 110, total: 132000 },
      { descAr: "أعمال البياض الداخلي والخارجي", descEn: "Internal & External Plastering", qty: 2000, unit: "م² / m²", unitPrice: 45, total: 90000 },
      { descAr: "أعمال العزل الحراري والمائي", descEn: "Thermal & Waterproof Insulation", qty: 800, unit: "م² / m²", unitPrice: 65, total: 52000 },
      { descAr: "أعمال الدهانات والديكور الداخلي", descEn: "Painting & Interior Decoration", qty: 2000, unit: "م² / m²", unitPrice: 38, total: 76000 },
      { descAr: "أعمال الأرضيات (رخام / سيراميك / باركيه)", descEn: "Flooring Works (Marble / Tiles / Parquet)", qty: 600, unit: "م² / m²", unitPrice: 185, total: 111000 },
      { descAr: "إدارة المشروع والإشراف الهندسي", descEn: "Project Management & Engineering Supervision", qty: 1, unit: "مقطوع / L.S", unitPrice: 45000, total: 45000 },
    ],
    tags: ["بناء", "خرسانة", "مباني", "Construction", "Building"],
  },
  {
    id: "government_buildings",
    serviceType: "contracting",
    labelAr: "إنشاء المباني الحكومية",
    labelEn: "Government Building Construction",
    descAr: "تنفيذ مشاريع المباني الحكومية (مراكز صحية، مدارس، مراكز أمنية، دور حكومية) وفق اشتراطات الجهات الحكومية",
    descEn: "Construction of government buildings (health centers, schools, security centers, government offices) per government specifications",
    icon: "Landmark",
    color: "blue",
    defaultValidity: 45,
    estimatedMargin: 18,
    introAr: (p) => `نقدم عرضنا الفني والمالي لتنفيذ مشروع (${p}) وفق اشتراطات ومواصفات الجهة الحكومية المختصة والكودات السعودية المعتمدة، مع الالتزام بجميع متطلبات التوثيق والضمانات الحكومية.`,
    introEn: (p) => `We present our technical and financial proposal for (${p}) per the competent government authority's specifications and approved Saudi codes, committing to all documentation and government warranty requirements.`,
    scopeAr: (p) => `ينفذ المشروع (${p}) وفق مواصفات وكميات الجهة الحكومية المختصة شاملاً جميع الأعمال المدنية والمعمارية والمواصفات الخاصة بالمباني الحكومية.`,
    scopeEn: (p) => `The project (${p}) is executed per the government authority's specifications and quantities, including all civil, architectural, and government-specific building requirements.`,
    items: [
      { descAr: "أعمال البنية التحتية والأساسات العميقة", descEn: "Infrastructure & Deep Foundation Works", qty: 1, unit: "مقطوع / L.S", unitPrice: 180000, total: 180000 },
      { descAr: "أعمال الهيكل الإنشائي (خرسانة + حديد تسليح)", descEn: "Structural Works (Concrete + Reinforcing Steel)", qty: 500, unit: "م³ / m³", unitPrice: 600, total: 300000 },
      { descAr: "أعمال الواجهات والتشطيبات الخارجية", descEn: "Facades & External Finishing", qty: 1500, unit: "م² / m²", unitPrice: 220, total: 330000 },
      { descAr: "أعمال التشطيبات الداخلية وفق المواصفات الحكومية", descEn: "Internal Finishing per Government Specs", qty: 2500, unit: "م² / m²", unitPrice: 180, total: 450000 },
      { descAr: "منظومة الكهرباء والميكانيكا (MEP)", descEn: "Electrical & Mechanical Systems (MEP)", qty: 1, unit: "مقطوع / L.S", unitPrice: 250000, total: 250000 },
      { descAr: "أعمال الموقع الخارجي وتنسيق الموقع", descEn: "External Site Works & Landscaping", qty: 1, unit: "مقطوع / L.S", unitPrice: 85000, total: 85000 },
      { descAr: "إدارة المشروع والإشراف الهندسي والتوثيق", descEn: "Project Management, Supervision & Documentation", qty: 1, unit: "مقطوع / L.S", unitPrice: 75000, total: 75000 },
    ],
    tags: ["حكومي", "مباني", "Government", "Construction", "مدارس"],
  },
  {
    id: "road_infrastructure",
    serviceType: "contracting",
    labelAr: "مشاريع الطرق والبنية التحتية",
    labelEn: "Roads & Infrastructure Projects",
    descAr: "تنفيذ مشاريع إنشاء وصيانة الطرق والأرصفة وشبكات الصرف الصحي والمياه والكهرباء والاتصالات",
    descEn: "Construction and maintenance of roads, sidewalks, drainage networks, water, power, and telecom infrastructure",
    icon: "Construction",
    color: "slate",
    defaultValidity: 45,
    estimatedMargin: 20,
    introAr: (p) => `نتقدم بعرض أسعارنا لتنفيذ مشروع (${p})، معتمدين على خبرتنا الواسعة في مشاريع البنية التحتية وتنفيذها وفق أعلى معايير الجودة والكودات الهندسية السعودية المعتمدة.`,
    introEn: (p) => `We offer our proposal for (${p}), drawing on our extensive experience in infrastructure projects and executing them per the highest quality standards and Saudi engineering codes.`,
    scopeAr: (p) => `يشمل نطاق العمل لمشروع (${p}) جميع أعمال البنية التحتية من طرق وأرصفة وصرف صحي وشبكات مياه وتجهيزات الإنارة وفق الكميات والمواصفات المعتمدة.`,
    scopeEn: (p) => `The scope for (${p}) covers all infrastructure works including roads, sidewalks, drainage, water networks, and street lighting per approved quantities and specifications.`,
    items: [
      { descAr: "أعمال الحفر والردم وتحضير الطبقة الأساسية", descEn: "Excavation, Backfill & Base Course Preparation", qty: 1000, unit: "م³ / m³", unitPrice: 75, total: 75000 },
      { descAr: "طبقة الأساس من الحجر المكسر (Sub-base)", descEn: "Crushed Stone Sub-base Layer", qty: 800, unit: "م² / m²", unitPrice: 55, total: 44000 },
      { descAr: "طبقة الأسفلت الرابطة (Binder Course)", descEn: "Asphalt Binder Course", qty: 800, unit: "م² / m²", unitPrice: 65, total: 52000 },
      { descAr: "طبقة الأسفلت النهائية (Wearing Course)", descEn: "Asphalt Wearing Course", qty: 800, unit: "م² / m²", unitPrice: 75, total: 60000 },
      { descAr: "إنشاء أرصفة خرسانية للمشاة", descEn: "Concrete Sidewalk Construction", qty: 500, unit: "م² / m²", unitPrice: 120, total: 60000 },
      { descAr: "شبكة صرف أمطار (مجاري + بالوعات)", descEn: "Stormwater Drainage Network (Channels + Drains)", qty: 1, unit: "مقطوع / L.S", unitPrice: 85000, total: 85000 },
      { descAr: "إنارة الطرق (أعمدة + كابلات + لمبات LED)", descEn: "Road Lighting (Poles + Cables + LED Lamps)", qty: 40, unit: "عمود / Pole", unitPrice: 3500, total: 140000 },
      { descAr: "دهان الخطوط والمرور والإشارات الأفقية", descEn: "Road Markings, Traffic Lines & Horizontal Signs", qty: 1, unit: "مقطوع / L.S", unitPrice: 35000, total: 35000 },
    ],
    tags: ["طرق", "أسفلت", "Roads", "Infrastructure", "بنية تحتية"],
  },
  {
    id: "road_maintenance",
    serviceType: "contracting",
    labelAr: "صيانة الطرق والأرصفة",
    labelEn: "Road & Pavement Maintenance",
    descAr: "أعمال صيانة وإصلاح الطرق والأرصفة المتشققة والمتهالكة وترقيع الحفر وإعادة الدهان",
    descEn: "Maintenance and repair of cracked and deteriorated roads and sidewalks, pothole patching, and re-marking",
    icon: "Hammer",
    color: "slate",
    defaultValidity: 30,
    estimatedMargin: 28,
    introAr: (p) => `نقدم عرض أسعارنا لأعمال صيانة وإصلاح الطرق والأرصفة في مشروع (${p})، وفق أحدث الأساليب الهندسية وباستخدام مواد مطابقة للمواصفات السعودية لضمان متانة وجودة الأعمال.`,
    introEn: (p) => `We offer our proposal for road and pavement maintenance works at (${p}), using the latest engineering methods and Saudi-spec compliant materials to ensure durability and quality.`,
    scopeAr: (p) => `تشمل أعمال الصيانة لمشروع (${p}) تقييم الحالة وإصلاح التشققات وترقيع الحفر وتجديد طبقة الأسفلت وإعادة الدهانات والإشارات.`,
    scopeEn: (p) => `Maintenance works for (${p}) include condition assessment, crack repair, pothole patching, asphalt overlay renewal, and re-marking.`,
    items: [
      { descAr: "فحص وتقييم حالة الطريق (Pavement Condition Index)", descEn: "Road Condition Assessment (PCI Survey)", qty: 1, unit: "تقرير / Report", unitPrice: 8000, total: 8000 },
      { descAr: "قطع وإزالة الأسفلت المتهالك", descEn: "Cutting & Removing Deteriorated Asphalt", qty: 500, unit: "م² / m²", unitPrice: 35, total: 17500 },
      { descAr: "ترقيع وإصلاح الحفر والتشققات العميقة", descEn: "Pothole Patching & Deep Crack Repair", qty: 200, unit: "م² / m²", unitPrice: 85, total: 17000 },
      { descAr: "فرش طبقة أسفلت تصحيحية (Overlay)", descEn: "Corrective Asphalt Overlay", qty: 500, unit: "م² / m²", unitPrice: 65, total: 32500 },
      { descAr: "إصلاح وتجديد الأرصفة المتضررة", descEn: "Damaged Sidewalk Repair & Renewal", qty: 200, unit: "م² / m²", unitPrice: 95, total: 19000 },
      { descAr: "إعادة دهان الخطوط والإشارات الأفقية", descEn: "Re-marking Traffic Lines & Signs", qty: 1, unit: "مقطوع / L.S", unitPrice: 12000, total: 12000 },
    ],
    tags: ["صيانة", "طرق", "أسفلت", "Maintenance", "Pavement"],
  },
  {
    id: "road_humanization",
    serviceType: "contracting",
    labelAr: "مشاريع إنسنة الطرق والحدائق والممرات",
    labelEn: "Road Humanization, Parks & Pedestrian Paths",
    descAr: "مشاريع تحويل الطرق والأماكن العامة إلى بيئات إنسانية صديقة للمشاة مع حدائق وممرات وجلسات خارجية وإضاءة بيئية",
    descEn: "Projects transforming roads and public spaces into pedestrian-friendly human environments with parks, walkways, outdoor seating, and ambient lighting",
    icon: "Trees",
    color: "green",
    defaultValidity: 45,
    estimatedMargin: 25,
    introAr: (p) => `نسعد بتقديم عرضنا لمشروع (${p}) ضمن مبادرات الإنسنة والتطوير العمراني. نحرص على تصميم وتنفيذ بيئات حضرية متكاملة تعزز جودة الحياة وفق رؤية 2030 والمعايير العالمية للتصميم العمراني المستدام.`,
    introEn: (p) => `We are pleased to offer our proposal for (${p}) under urban humanization and development initiatives, committed to designing and executing integrated urban environments enhancing quality of life per Vision 2030 and global sustainable urban design standards.`,
    scopeAr: (p) => `يشمل مشروع (${p}) تصميم وتنفيذ منظومة الإنسنة المتكاملة من ممرات مشاة وحدائق ومجالس خارجية وعناصر بصرية وإضاءة بيئية ونباتات ومرافق عامة.`,
    scopeEn: (p) => `Project (${p}) covers design and execution of an integrated humanization system including pedestrian walkways, parks, outdoor seating, visual elements, ambient lighting, plants, and public amenities.`,
    items: [
      { descAr: "تصميم مخطط الإنسنة وعناصره البصرية (Concept Design)", descEn: "Humanization Layout & Visual Elements Concept Design", qty: 1, unit: "مشروع / Project", unitPrice: 35000, total: 35000 },
      { descAr: "إنشاء ممرات المشاة بالبلاط والحجر الطبيعي", descEn: "Pedestrian Walkways (Paving Stone & Natural Stone)", qty: 800, unit: "م² / m²", unitPrice: 220, total: 176000 },
      { descAr: "تركيب جلسات ومقاعد خارجية معدنية معالجة", descEn: "Installation of Treated Metal Outdoor Seating & Benches", qty: 20, unit: "وحدة / Unit", unitPrice: 2800, total: 56000 },
      { descAr: "تنسيق وزراعة الحدائق والأشجار والشجيرات", descEn: "Garden Landscaping, Trees & Shrubs Planting", qty: 1, unit: "مقطوع / L.S", unitPrice: 120000, total: 120000 },
      { descAr: "منظومة إضاءة بيئية وحدائقية (LED)", descEn: "Ambient & Garden LED Lighting System", qty: 1, unit: "مقطوع / L.S", unitPrice: 75000, total: 75000 },
      { descAr: "عناصر بصرية وفنية (مجسمات، لوحات ترحيب، هوية بصرية)", descEn: "Visual & Artistic Elements (Sculptures, Welcome Signs, Identity)", qty: 1, unit: "مقطوع / L.S", unitPrice: 45000, total: 45000 },
      { descAr: "نظام ري مؤتمت (Automated Irrigation)", descEn: "Automated Irrigation System", qty: 1, unit: "مقطوع / L.S", unitPrice: 38000, total: 38000 },
      { descAr: "أعمال الصيانة الأولى (سنة أولى مجانية)", descEn: "First Year Free Maintenance Works", qty: 12, unit: "شهر / Month", unitPrice: 3500, total: 42000 },
    ],
    tags: ["إنسنة", "حدائق", "Humanization", "Parks", "تطوير عمراني"],
  },
  {
    id: "infrastructure_maintenance",
    serviceType: "contracting",
    labelAr: "صيانة البنية التحتية والمرافق",
    labelEn: "Infrastructure & Utilities Maintenance",
    descAr: "صيانة شاملة لشبكات المياه والصرف الصحي والكهرباء وإنارة الطرق والمرافق العامة",
    descEn: "Comprehensive maintenance of water, sewage, electrical networks, street lighting, and public utilities",
    icon: "Settings",
    color: "slate",
    defaultValidity: 30,
    estimatedMargin: 32,
    introAr: (p) => `نقدم عرض أسعارنا لصيانة البنية التحتية والمرافق في مشروع (${p})، مع الالتزام بالاستجابة السريعة والصيانة الوقائية الدورية لضمان استمرارية الخدمات.`,
    introEn: (p) => `We offer our proposal for infrastructure and utilities maintenance at (${p}), committing to rapid response and periodic preventive maintenance to ensure service continuity.`,
    scopeAr: (p) => `يشمل عقد الصيانة لمشروع (${p}) جميع شبكات البنية التحتية مع خدمة طوارئ على مدار الساعة وتقارير دورية.`,
    scopeEn: (p) => `The maintenance contract for (${p}) covers all infrastructure networks with 24/7 emergency service and periodic reports.`,
    items: [
      { descAr: "صيانة دورية شبكة المياه والصرف الصحي", descEn: "Periodic Water & Sewage Network Maintenance", qty: 12, unit: "شهر / Month", unitPrice: 4500, total: 54000 },
      { descAr: "صيانة منظومة إنارة الطرق والمرافق", descEn: "Street Lighting & Utilities Maintenance", qty: 12, unit: "شهر / Month", unitPrice: 3500, total: 42000 },
      { descAr: "خدمة طوارئ 24 ساعة (On-Call Emergency)", descEn: "24/7 Emergency Response Service", qty: 12, unit: "شهر / Month", unitPrice: 2000, total: 24000 },
      { descAr: "تقارير الصيانة الشهرية ومؤشرات الأداء", descEn: "Monthly Maintenance Reports & KPI Indicators", qty: 12, unit: "تقرير / Report", unitPrice: 500, total: 6000 },
      { descAr: "قطع الغيار والمواد الاستهلاكية", descEn: "Spare Parts & Consumables Budget", qty: 1, unit: "مقطوع / L.S", unitPrice: 30000, total: 30000 },
    ],
    tags: ["صيانة", "شبكات", "Maintenance", "Utilities", "بنية تحتية"],
  },
];

// ─── Combined Registry ──────────────────────────────────────────────────────

export const ALL_SUB_SERVICES: SubService[] = [
  ...SAFETY_SERVICES_SUBS,
  ...CONTRACTING_SUBS,
];

export const SUB_SERVICES_BY_TYPE: Partial<Record<ServiceType, SubService[]>> = {
  safety_services: SAFETY_SERVICES_SUBS,
  contracting: CONTRACTING_SUBS,
};

export function getSubServices(serviceType: ServiceType): SubService[] {
  return SUB_SERVICES_BY_TYPE[serviceType] ?? [];
}

export function hasSubServices(serviceType: ServiceType): boolean {
  return (SUB_SERVICES_BY_TYPE[serviceType]?.length ?? 0) > 0;
}

export function getSubService(serviceType: ServiceType, subId: string): SubService | null {
  return SUB_SERVICES_BY_TYPE[serviceType]?.find(s => s.id === subId) ?? null;
}
