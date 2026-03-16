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
