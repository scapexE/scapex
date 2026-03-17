import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations: Record<string, Record<Language, string>> = {
  // Navigation Categories
  'nav.cat.core': { en: 'Core & Analytics', ar: 'الأساسيات والتحليلات' },
  'nav.cat.business': { en: 'Business & Finance', ar: 'الأعمال والمالية' },
  'nav.cat.operations': { en: 'Operations', ar: 'العمليات' },
  'nav.cat.engineering': { en: 'Engineering', ar: 'الهندسة' },
  'nav.cat.hr': { en: 'Human Resources', ar: 'الموارد البشرية' },
  'nav.cat.system': { en: 'System & Portals', ar: 'النظام والبوابات' },

  // Navigation Items
  'nav.dashboard': { en: 'Dashboard', ar: 'لوحة القيادة' },
  'nav.ai_control': { en: 'AI Control Center', ar: 'مركز تحكم الذكاء الاصطناعي' },
  'nav.bi': { en: 'BI Analytics', ar: 'تحليلات البيانات' },
  'nav.multi_tenant': { en: 'Company Management', ar: 'إدارة الشركات والفروع' },
  
  'nav.crm': { en: 'CRM', ar: 'إدارة علاقات العملاء' },
  'nav.sales': { en: 'Sales', ar: 'المبيعات' },
  'nav.purchases': { en: 'Purchases', ar: 'المشتريات' },
  'nav.accounting': { en: 'Accounting', ar: 'المحاسبة المالية' },
  
  'nav.projects': { en: 'Project Management', ar: 'إدارة المشاريع' },
  'nav.inventory': { en: 'Inventory', ar: 'المخازن' },
  'nav.equipment': { en: 'Equipment & Fleet', ar: 'المعدات والمركبات' },
  
  'nav.engineering': { en: 'Engineering Drawings', ar: 'الرسومات الهندسية' },
  'nav.approvals': { en: 'Approvals', ar: 'الموافقات' },
  'nav.government': { en: 'Government Entities', ar: 'الجهات الحكومية' },
  'nav.smart_proposal': { en: 'Smart Proposal', ar: 'المقترحات الذكية' },
  
  'nav.hr': { en: 'HR', ar: 'الموارد البشرية' },
  'nav.payroll': { en: 'Payroll', ar: 'مسيرات الرواتب' },
  'nav.mobile_app': { en: 'Engineers Mobile App', ar: 'تطبيق المهندسين' },
  'nav.attendance': { en: 'GPS Attendance', ar: 'الحضور عبر GPS' },
  'nav.hse': { en: 'HSE', ar: 'الصحة والسلامة والبيئة' },
  
  'nav.dms': { en: 'Document Management', ar: 'إدارة المستندات (DMS)' },
  'nav.client_portal': { en: 'Client Portal', ar: 'بوابة العملاء' },
  
  // Header
  'header.search': { en: 'Search modules...', ar: 'البحث في الوحدات...' },
  'header.notifications': { en: 'Notifications', ar: 'الإشعارات' },
  'header.profile': { en: 'Profile', ar: 'الملف الشخصي' },

  // Dashboard Overview
  'dash.welcome': { en: 'Welcome back', ar: 'مرحباً بعودتك' },
  'dash.overview': { en: 'Enterprise Overview', ar: 'نظرة عامة على المؤسسة' },
  'dash.active_projects': { en: 'Active Projects', ar: 'المشاريع النشطة' },
  'dash.pending_approvals': { en: 'Pending Approvals', ar: 'موافقات قيد الانتظار' },
  'dash.engineers_field': { en: 'Engineers in Field', ar: 'المهندسون في الميدان' },
  'dash.revenue': { en: 'Monthly Revenue', ar: 'الإيرادات الشهرية' },
  'dash.recent_activities': { en: 'Recent Activities', ar: 'الأنشطة الأخيرة' },
  'dash.ai_insights': { en: 'AI Insights', ar: 'رؤى الذكاء الاصطناعي' },
  'dash.apps': { en: 'SCAPE Apps', ar: 'تطبيقات سكيب' },

  // Common Actions
  'action.create_new': { en: 'Create New', ar: 'إنشاء جديد' },
  'action.export': { en: 'Export', ar: 'تصدير' },
  'action.search': { en: 'Search...', ar: 'البحث...' },
  'action.filter': { en: 'Filter', ar: 'تصفية' },
  'action.previous': { en: 'Previous', ar: 'السابق' },
  'action.next': { en: 'Next', ar: 'التالي' },
  'action.showing': { en: 'Showing', ar: 'عرض' },
  'action.to': { en: 'to', ar: 'إلى' },
  'action.of': { en: 'of', ar: 'من' },
  'action.entries': { en: 'entries', ar: 'سجلات' },

  // CRM Module
  'crm.desc': { en: 'Manage leads, opportunities, customers, and sales activities.', ar: 'إدارة العملاء المحتملين والفرص والعملاء وأنشطة المبيعات.' },
  'crm.new_lead': { en: 'New Lead', ar: 'عميل محتمل جديد' },
  'crm.tab.pipeline': { en: 'Pipeline', ar: 'مسار المبيعات' },
  'crm.tab.customers': { en: 'Customers', ar: 'العملاء' },
  'crm.tab.analytics': { en: 'Analytics', ar: 'التحليلات' },

  // CRM Pipeline
  'crm.pipe.search': { en: 'Search opportunities...', ar: 'البحث في الفرص...' },
  'crm.pipe.total_value': { en: 'Total Pipeline Value:', ar: 'إجمالي قيمة المسار:' },
  'crm.pipe.stage.new': { en: 'New Leads', ar: 'عملاء جدد' },
  'crm.pipe.stage.qualified': { en: 'Qualified', ar: 'مؤهلون' },
  'crm.pipe.stage.proposal': { en: 'Proposal Sent', ar: 'تم إرسال المقترح' },
  'crm.pipe.stage.negotiation': { en: 'Negotiation', ar: 'تفاوض' },
  'crm.pipe.stage.won': { en: 'Won', ar: 'مكتسبة' },

  // CRM Customers
  'crm.cust.search': { en: 'Search customers, contacts, or industries...', ar: 'البحث عن العملاء أو جهات الاتصال أو المجالات...' },
  'crm.cust.total': { en: 'Total Customers', ar: 'إجمالي العملاء' },
  'crm.cust.selected': { en: 'selected', ar: 'محدد' },
  'crm.cust.bulk_whatsapp': { en: 'Send Bulk WhatsApp', ar: 'إرسال واتساب جماعي' },
  'crm.cust.bulk_email': { en: 'Send Bulk Email', ar: 'إرسال بريد جماعي' },
  'crm.cust.export': { en: 'Export Data', ar: 'تصدير البيانات' },
  'crm.cust.copy': { en: 'Copy Details', ar: 'نسخ البيانات' },
  'crm.cust.col.company': { en: 'Company', ar: 'الشركة' },
  'crm.cust.col.contact': { en: 'Primary Contact', ar: 'جهة الاتصال الرئيسية' },
  'crm.cust.col.industry': { en: 'Industry', ar: 'المجال' },
  'crm.cust.col.status': { en: 'Status', ar: 'الحالة' },
  'crm.cust.col.actions': { en: 'Actions', ar: 'إجراءات' },
  
  // CRM Dashboard
  'crm.dash.active_leads': { en: 'Total Active Leads', ar: 'إجمالي العملاء النشطين' },
  'crm.dash.active_leads.trend': { en: '+12 this week', ar: '+12 هذا الأسبوع' },
  'crm.dash.pipe_value': { en: 'Total Pipeline Value', ar: 'إجمالي قيمة المسار' },
  'crm.dash.pipe_value.trend': { en: '+5.2% from last month', ar: '+5.2% عن الشهر الماضي' },
  'crm.dash.win_rate': { en: 'Win Rate', ar: 'معدل الفوز' },
  'crm.dash.win_rate.trend': { en: '-2.1% from last month', ar: '-2.1% عن الشهر الماضي' },
  'crm.dash.revenue_ytd': { en: 'Revenue Won (YTD)', ar: 'الإيرادات المحققة (منذ بداية العام)' },
  'crm.dash.revenue_ytd.trend': { en: 'On track for $20M target', ar: 'في المسار الصحيح لهدف 20 مليون دولار' },
  'crm.dash.chart.title': { en: 'Revenue vs Pipeline (6 Months)', ar: 'الإيرادات مقابل المسار (6 أشهر)' },
  'crm.dash.sources.title': { en: 'Lead Sources', ar: 'مصادر العملاء' },
  'crm.dash.top_performers': { en: 'Top Performers', ar: 'أفضل المؤدين' },

  // Projects Module
  'proj.desc': { en: 'Manage project lifecycles, timelines, and milestones.', ar: 'إدارة دورة حياة المشاريع والجداول الزمنية والمعالم.' },
  'proj.tab.timeline': { en: 'Gantt Timeline', ar: 'المخطط الزمني (Gantt)' },
  'proj.tab.list': { en: 'Projects List', ar: 'قائمة المشاريع' },
  'proj.tab.kanban': { en: 'Tasks Board', ar: 'لوحة المهام' },
  
  'proj.timeline.title': { en: 'Project Timeline (Gantt)', ar: 'المخطط الزمني للمشروع (Gantt)' },
  'proj.timeline.project_name': { en: 'Project / Phase', ar: 'المشروع / المرحلة' },
  
  'proj.status.completed': { en: 'Completed', ar: 'مكتمل' },
  'proj.status.in_progress': { en: 'In Progress', ar: 'قيد التنفيذ' },
  'proj.status.pending': { en: 'Pending', ar: 'قيد الانتظار' },
  'proj.status.delayed': { en: 'Delayed', ar: 'متأخر' },
  'proj.status.active': { en: 'Active', ar: 'نشط' },
  
  'proj.phase.planning': { en: 'Planning', ar: 'التخطيط' },
  'proj.phase.design': { en: 'Design', ar: 'التصميم' },
  'proj.phase.submission': { en: 'Submission', ar: 'التقديم' },
  'proj.phase.approval': { en: 'Approval', ar: 'الموافقة' },
  'proj.phase.construction': { en: 'Construction', ar: 'التنفيذ / البناء' },
  'proj.phase.handover': { en: 'Handover', ar: 'التسليم' },

  // Sales Module
  'sales.desc': { en: 'Manage sales orders, quotations, and client contracts.', ar: 'إدارة عروض الأسعار، طلبات المبيعات، وعقود العملاء.' },
  'sales.tab.quotations': { en: 'Quotations', ar: 'عروض الأسعار' },
  'sales.tab.orders': { en: 'Sales Orders', ar: 'طلبات المبيعات' },
  'sales.tab.contracts': { en: 'Contracts', ar: 'العقود' },
  'sales.contract.signed': { en: 'Signed', ar: 'مُوقّع' },
  'sales.contract.pending': { en: 'Pending Signature', ar: 'بانتظار التوقيع' },
  'sales.contract.sign': { en: 'Sign Contract', ar: 'توقيع العقد' },
  'sales.contract.draw': { en: 'Draw', ar: 'رسم التوقيع' },
  'sales.contract.type': { en: 'Type', ar: 'كتابة التوقيع' },
  'sales.contract.clear': { en: 'Clear', ar: 'مسح' },
  'sales.contract.confirm': { en: 'Confirm & Sign', ar: 'تأكيد وتوقيع' },

  // Accounting Module
  'acc.desc': { en: 'Manage general ledger, chart of accounts, journal entries, and financial reports.', ar: 'إدارة دفتر الأستاذ العام، دليل الحسابات، قيود اليومية، والتقارير المالية.' },
  'acc.tab.dashboard': { en: 'Overview', ar: 'نظرة عامة' },
  'acc.tab.coa': { en: 'Chart of Accounts', ar: 'دليل الحسابات' },
  'acc.tab.journal': { en: 'Journal Entries', ar: 'قيود اليومية' },
  'acc.tab.reports': { en: 'Financial Reports', ar: 'التقارير المالية' },
  'acc.tab.taxes': { en: 'Taxes & VAT', ar: 'الضرائب والقيمة المضافة' },
  
  'acc.dash.revenue': { en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
  'acc.dash.expenses': { en: 'Total Expenses', ar: 'إجمالي المصروفات' },
  'acc.dash.profit': { en: 'Net Profit', ar: 'صافي الربح' },
  'acc.dash.cash': { en: 'Cash Flow', ar: 'التدفق النقدي' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ar');

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      toggleLanguage, 
      t,
      dir: language === 'ar' ? 'rtl' : 'ltr'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
