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
  'nav.service_catalog': { en: 'Service Catalog', ar: 'كتالوج الخدمات' },
  
  'nav.hr': { en: 'HR', ar: 'الموارد البشرية' },
  'nav.payroll': { en: 'Payroll', ar: 'مسيرات الرواتب' },
  'nav.mobile_app': { en: 'Engineers Mobile App', ar: 'تطبيق المهندسين' },
  'nav.attendance': { en: 'GPS Attendance', ar: 'الحضور عبر GPS' },
  'nav.hse': { en: 'HSE', ar: 'الصحة والسلامة والبيئة' },
  
  'nav.dms': { en: 'Document Management', ar: 'إدارة المستندات (DMS)' },
  'nav.client_portal': { en: 'Client Portal', ar: 'بوابة العملاء' },
  'nav.approve_registrations': { en: 'Approve Registrations', ar: 'اعتماد التسجيلات' },
  'nav.system_admin': { en: 'System Admin Panel', ar: 'لوحة تحكم النظام' },
  'nav.users': { en: 'User Management', ar: 'إدارة المستخدمين' },
  'nav.about': { en: 'About', ar: 'حول النظام' },
  
  // Header
  'header.search': { en: 'Search modules...', ar: 'البحث في الوحدات...' },
  'header.modules_active': { en: 'active modules', ar: 'وحدة مفعّلة' },
  'header.notifications': { en: 'Notifications', ar: 'الإشعارات' },
  'header.profile': { en: 'Profile', ar: 'الملف الشخصي' },

  // Dashboard Overview
  'dash.welcome': { en: 'Welcome back', ar: 'أهلاً بك' },
  'dash.overview': { en: 'Executive Dashboard', ar: 'لوحة القيادة التنفيذية' },
  'dash.active_projects': { en: 'Active Projects', ar: 'المشاريع النشطة' },
  'dash.pending_approvals': { en: 'Pending Approvals', ar: 'موافقات قيد الانتظار' },
  'dash.engineers_field': { en: 'Engineers in Field', ar: 'المهندسون في الميدان' },
  'dash.revenue': { en: 'Monthly Revenue', ar: 'الإيرادات الشهرية' },
  'dash.recent_activities': { en: 'Recent Activities', ar: 'آخر المستجدات' },
  'dash.ai_insights': { en: 'AI Insights', ar: 'رؤى الذكاء الاصطناعي' },
  'dash.apps': { en: 'My Workspace', ar: 'وحداتك المتاحة' },

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

  // Dashboard Alerts
  'dash.alert_title':        { en: 'System Alerts',                                          ar: 'تنبيهات النظام' },
  'dash.alert_payroll':      { en: 'Payroll Processing',                                     ar: 'معالجة الرواتب' },
  'dash.alert_payroll_desc': { en: 'Pending approval for 3 branches before month end.',      ar: 'في انتظار الاعتماد لـ 3 فروع قبل نهاية الشهر.' },
  'dash.alert_stock':        { en: 'Low Inventory',                                          ar: 'مخزون منخفض' },
  'dash.alert_stock_desc':   { en: 'Steel inventory at Riyadh warehouse is below minimum.',  ar: 'مخزون الحديد في مستودع الرياض أقل من الحد الأدنى.' },

  // Dashboard Stat Trends
  'dash.trend_projects':     { en: '+12% from last month',                ar: '+12% من الشهر الماضي' },
  'dash.trend_approvals':    { en: '15 require immediate action',         ar: '15 تستدعي اتخاذ إجراء' },
  'dash.trend_engineers':    { en: '92% attendance rate today',           ar: 'نسبة الحضور 92% اليوم' },
  'dash.trend_revenue':      { en: '+24% compared to last year',          ar: '+24% عن العام الماضي' },

  // Users page
  'users.title':              { en: 'User Management',                             ar: 'إدارة المستخدمين' },
  'users.desc':               { en: 'Add, edit, and manage system user roles and permissions', ar: 'إضافة وتعديل وضبط أدوار وصلاحيات مستخدمي النظام' },
  'users.add':                { en: 'Add User',                                    ar: 'إضافة مستخدم' },
  'users.search':             { en: 'Search by name or email...',                  ar: 'بحث بالاسم أو البريد...' },
  'users.all_roles':          { en: 'All Roles',                                   ar: 'كل الأدوار' },
  'users.col.user':           { en: 'User',                                        ar: 'المستخدم' },
  'users.col.national_id':    { en: 'National ID',                                 ar: 'رقم الهوية' },
  'users.col.roles':          { en: 'Roles',                                       ar: 'الأدوار' },
  'users.col.permissions':    { en: 'Permissions',                                 ar: 'الصلاحيات' },
  'users.col.created':        { en: 'Created',                                     ar: 'تاريخ الإضافة' },
  'users.col.status':         { en: 'Status',                                      ar: 'الحالة' },
  'users.col.actions':        { en: 'Actions',                                     ar: 'الإجراءات' },
  'users.edit':               { en: 'Edit',                                        ar: 'تعديل' },
  'users.no_results':         { en: 'No matching users',                           ar: 'لا يوجد مستخدمون مطابقون' },
  'users.showing':            { en: 'Showing',                                     ar: 'عرض' },
  'users.of':                 { en: 'of',                                          ar: 'من' },
  'users.user':               { en: 'users',                                       ar: 'مستخدم' },
  'users.stat.total':         { en: 'Total',                                       ar: 'الإجمالي' },
  'users.stat.active':        { en: 'Active',                                      ar: 'نشط' },
  'users.stat.admins':        { en: 'System Admins',                               ar: 'مديرو النظام' },
  'users.stat.pending':       { en: 'Pending Activation',                          ar: 'تفعيل الحساب' },
  'users.dialog.add':         { en: 'Add New User',                                ar: 'إضافة مستخدم جديد' },
  'users.dialog.edit':        { en: 'Edit User',                                   ar: 'تعديل المستخدم' },
  'users.dialog.delete':      { en: 'Confirm Delete',                              ar: 'تأكيد الحذف' },
  'users.dialog.delete_desc': { en: 'Are you sure you want to delete',             ar: 'هل أنت متأكد من حذف' },
  'users.dialog.delete_warn': { en: 'This cannot be undone.',                      ar: 'لا يمكن التراجع.' },
  'users.btn.save':           { en: 'Save User',                                   ar: 'حفظ المستخدم' },
  'users.btn.save_edit':      { en: 'Save Changes',                                ar: 'حفظ التعديلات' },
  'users.btn.delete':         { en: 'Delete',                                      ar: 'حذف' },
  'users.btn.cancel':         { en: 'Cancel',                                      ar: 'إلغاء' },
  'users.btn.save_perms':     { en: 'Save Permissions',                            ar: 'حفظ الصلاحيات' },
  'users.perms.title':        { en: 'Permissions',                                 ar: 'صلاحيات' },
  'users.perms.reset':        { en: 'Reset',                                       ar: 'إعادة ضبط' },
  'users.no_access':          { en: 'You do not have access to this page',         ar: 'لا تملك صلاحية الوصول' },
  'users.no_access_desc':     { en: 'Only system admins or delegates can manage users', ar: 'فقط مدير النظام أو المفوّضون يمكنهم إدارة المستخدمين' },

  // Pending / Activation
  'users.pending.title':      { en: 'Account Activation',                          ar: 'تفعيل الحساب' },
  'users.pending.desc':       { en: 'Registration requests pending role assignment and activation', ar: 'طلبات تسجيل تنتظر تحديد الأدوار وتفعيل الوصول' },
  'users.pending.empty':      { en: 'No accounts pending activation',              ar: 'لا توجد حسابات تنتظر التفعيل' },
  'users.pending.request':    { en: 'request(s)',                                  ar: 'طلب' },
  'users.pending.reg_date':   { en: 'Registered:',                                 ar: 'التسجيل:' },
  'users.btn.activate':       { en: 'Activate',                                    ar: 'تفعيل' },
  'users.btn.reject':         { en: 'Reject',                                      ar: 'رفض' },
  'users.btn.confirm_activate': { en: 'Activate Account',                          ar: 'تفعيل الحساب' },

  // UserForm
  'users.form.national_id':   { en: 'National ID *',                              ar: 'رقم الهوية الوطنية *' },
  'users.form.national_id_hint': { en: '10 digits — starts with 1 or 2',         ar: '10 أرقام — يبدأ بـ 1 أو 2' },
  'users.form.national_id_err': { en: 'Invalid ID — 10 digits starting with 1 or 2', ar: 'رقم الهوية غير صحيح — 10 أرقام يبدأ بـ 1 أو 2' },
  'users.form.national_id_ok':  { en: '✓ Valid National ID',                      ar: '✓ رقم الهوية صحيح' },
  'users.form.name':          { en: 'Full Name *',                                ar: 'الاسم الكامل *' },
  'users.form.email':         { en: 'Email *',                                    ar: 'البريد الإلكتروني *' },
  'users.form.password_new':  { en: 'Password *',                                 ar: 'كلمة المرور *' },
  'users.form.password_edit': { en: 'New Password (leave blank to keep current)', ar: 'كلمة المرور الجديدة (اتركها فارغة للإبقاء)' },
  'users.form.password_ph_new': { en: 'Password',                                 ar: 'كلمة المرور' },
  'users.form.password_ph_edit': { en: 'Leave blank to keep',                     ar: 'اتركها فارغة لعدم التغيير' },
  'users.form.roles':         { en: 'Job Roles *',                                ar: 'الأدوار الوظيفية *' },
  'users.form.roles_hint':    { en: '(multiple roles allowed)',                   ar: '(يمكن اختيار أكثر من دور)' },
  'users.form.admin_role':    { en: 'System Admin',                               ar: 'مدير النظام' },
  'users.form.admin_full':    { en: '(full access)',                              ar: '(صلاحيات كاملة)' },
  'users.form.primary_role':  { en: 'Primary role:',                              ar: 'الدور الأساسي:' },
  'users.form.merged_perms':  { en: '— Permissions merged from all roles',        ar: '— الصلاحيات مدمجة من جميع الأدوار' },
  'users.form.active':        { en: 'Account Active',                             ar: 'الحساب نشط (مفعّل)' },
  'users.form.inactive':      { en: 'Account Disabled',                           ar: 'الحساب معطّل' },

  // System Admin page
  'sa.title':              { en: 'System Control Panel',                      ar: 'لوحة تحكم النظام' },
  'sa.desc':               { en: 'Manage business activities, assign modules and users', ar: 'إدارة أنشطة الشركة وتخصيص الوحدات والمستخدمين' },
  'sa.badge':              { en: 'System Admin',                               ar: 'مدير النظام' },
  'sa.tab.activities':     { en: 'Activities',                                 ar: 'الأنشطة' },
  'sa.tab.users':          { en: 'Users',                                      ar: 'المستخدمون' },
  'sa.add_activity':       { en: 'Add Activity',                               ar: 'إضافة نشاط' },
  'sa.activities_count':   { en: 'activities defined',                         ar: 'نشاط مُعرَّف' },
  'sa.units':              { en: 'modules',                                    ar: 'وحدة' },
  'sa.users_count':        { en: 'users',                                      ar: 'مستخدم' },
  'sa.no_access':          { en: 'You do not have access to this page',        ar: 'لا تملك صلاحية الوصول' },
  'sa.no_access_desc':     { en: 'This page is for system admins only',        ar: 'هذه الصفحة خاصة بمدير النظام فقط' },
  'sa.edit':               { en: 'Edit',                                       ar: 'تعديل' },
  'sa.delete_confirm':     { en: 'Confirm Delete',                             ar: 'تأكيد الحذف' },
  'sa.delete_sure':        { en: 'Are you sure you want to delete',            ar: 'هل أنت متأكد من حذف' },
  'sa.delete':             { en: 'Delete',                                     ar: 'حذف' },
  'sa.cancel':             { en: 'Cancel',                                     ar: 'إلغاء' },
  'sa.save':               { en: 'Save Activity',                              ar: 'حفظ النشاط' },
  'sa.save_edit':          { en: 'Save Changes',                               ar: 'حفظ التعديلات' },
  'sa.add_title':          { en: 'Add New Activity',                           ar: 'إضافة نشاط جديد' },
  'sa.edit_title':         { en: 'Edit:',                                      ar: 'تعديل:' },
  'sa.assign_desc':        { en: 'Search by user name or national ID to assign them to an activity.', ar: 'ابحث باسم المستخدم أو رقم هويته لتعيينه على نشاط.' },

  // Activity Form
  'sa.form.name_ar':       { en: 'Activity Name (Arabic) *',                  ar: 'اسم النشاط (عربي) *' },
  'sa.form.name_en':       { en: 'Activity Name (EN) *',                      ar: 'اسم النشاط (إنجليزي) *' },
  'sa.form.color':         { en: 'Color',                                      ar: 'اللون' },
  'sa.form.icon':          { en: 'Icon',                                       ar: 'الأيقونة' },
  'sa.form.modules':       { en: 'Enabled Modules',                           ar: 'الوحدات المفعّلة' },
  'sa.form.select_all':    { en: 'Select All',                                 ar: 'تحديد الكل' },
  'sa.form.clear_all':     { en: 'Clear All',                                  ar: 'إلغاء الكل' },
  'sa.form.modules_count': { en: 'modules of',                                ar: 'وحدة من' },
  'sa.form.company_id':    { en: 'Company Identity for this Activity',         ar: 'هوية الشركة لهذا النشاط' },
  'sa.form.company_hint':  { en: '(shown in the top header)',                  ar: '(تظهر في الشريط العلوي)' },
  'sa.form.name_ar_label': { en: 'Company Name (Arabic)',                      ar: 'اسم الشركة بالعربي' },
  'sa.form.name_en_label': { en: 'Company Name (English)',                     ar: 'اسم الشركة بالإنجليزي' },
  'sa.form.logo':          { en: 'Company Logo',                               ar: 'شعار الشركة' },

  // Icon/Color pickers
  'sa.picker.choose_color':  { en: 'Choose Color',                            ar: 'اختر اللون' },
  'sa.picker.no_icon':       { en: 'No Icon',                                 ar: 'بلا أيقونة' },
  'sa.picker.custom_icon':   { en: 'Custom Icon',                             ar: 'أيقونة مخصصة' },
  'sa.picker.choose':        { en: 'Choose',                                  ar: 'اختر' },
  'sa.picker.upload':        { en: 'Upload Image',                            ar: 'رفع صورة' },
  'sa.picker.url':           { en: 'URL Link',                                ar: 'رابط URL' },
  'sa.picker.apply':         { en: 'Apply',                                   ar: 'تطبيق' },
  'sa.picker.custom_active': { en: 'Custom icon active',                      ar: 'أيقونة مخصصة مفعّلة' },
  'sa.picker.available':     { en: 'Available Icons',                         ar: 'أيقونات متاحة' },
  'sa.picker.upload_logo':   { en: 'Upload Logo',                             ar: 'رفع شعار' },

  // Assignment card
  'sa.assign.no_user':    { en: 'No users assigned yet',                      ar: 'لم يُعيَّن أي مستخدم بعد' },
  'sa.assign.search':     { en: 'Search by name or national ID to add...',    ar: 'ابحث باسم أو رقم هوية للإضافة...' },
  'sa.assign.no_match':   { en: 'No matching user',                           ar: 'لا يوجد مستخدم مطابق' },
  'sa.assign.refine':     { en: 'results — refine your search',               ar: 'نتيجة — دقّق البحث' },
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
