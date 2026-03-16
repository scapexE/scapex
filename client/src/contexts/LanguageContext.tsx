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
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ar'); // Default to Arabic as requested for SCAPE

  useEffect(() => {
    // Update document direction
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
