# دليل النشر التلقائي — erp.scape.sa

> ⚠️ لا تُكتب كلمات المرور في هذا الملف لأنه محفوظ داخل الكود على GitHub. أماكن كلمات المرور موضحة في جدول أدناه.

## كيف يعمل النشر التلقائي (بدون أي تدخل)
1. يُرفع الكود إلى GitHub (فرع `main`) — يتولى الوكيل الرفع بعد كل جلسة عمل.
2. GitHub Actions يشتغل تلقائياً (`.github/workflows/deploy.yml`) ويرسل طلباً مؤمَّناً إلى `https://erp.scape.sa/deploy` مع الترويسة `x-deploy-secret`.
3. خدمة الـ webhook على السيرفر (pm2 باسم `webhook`، السكربت `/var/www/webhook/deploy.js`، منفذ 4000 خلف nginx) تنفذ تلقائياً:
   - `git pull origin main`
   - تحديث قاعدة البيانات: `drizzle-kit push --force`
   - `npm install` ثم `npm run build`
   - إعادة التشغيل: `pm2 delete scapex && pm2 start ecosystem.config.cjs && pm2 save`
4. خلال 3–5 دقائق يكون الموقع محدثاً.

## أين توجد كلمات المرور والمفاتيح
| الغرض | المكان |
|---|---|
| كلمة مرور SSH للسيرفر (root@187.124.166.164) | لديك، ومحفوظة أيضاً في Replit Secrets باسم `DEPLOY_PASS` |
| مفتاح تأمين رابط النشر | على السيرفر: `/var/www/webhook/secret.txt` — ونسخة مشفرة في GitHub → Settings → Secrets → Actions → `DEPLOY_HOOK_SECRET` |
| كلمة مرور قاعدة البيانات على السيرفر | داخل `/var/www/scapex/ecosystem.config.cjs` (متغير `DATABASE_URL`) |
| رمز GitHub | مضمّن في رابط remote داخل السيرفر و Replit |

## النشر اليدوي (إن احتجته يوماً)
```bash
# 1. الدخول للسيرفر
ssh root@187.124.166.164        # كلمة المرور: DEPLOY_PASS

# 2. تنفيذ التحديث يدوياً
cd /var/www/scapex
git pull origin main
npm install --include=dev
npm run build
pm2 delete scapex && pm2 start /var/www/scapex/ecosystem.config.cjs && pm2 save

# أو بسطر واحد: تشغيل النشر عبر الرابط المؤمَّن
curl -X POST https://erp.scape.sa/deploy \
  -H "Content-Type: application/json" \
  -H "x-deploy-secret: $(cat /var/www/webhook/secret.txt)" -d '{}'
```

## فحص الحالة واستكشاف الأخطاء
```bash
pm2 list                      # حالة التطبيق وخدمة النشر
pm2 logs webhook --lines 50   # سجل خدمة النشر
tail -50 /var/www/deploy.log  # تفاصيل آخر عمليات النشر
pm2 logs scapex --lines 50    # سجل التطبيق نفسه
```
- سجل تشغيل النشر من GitHub: صفحة **Actions** في المستودع `scapexE/scapex`.
- للتأكد أن الموقع تحدث فعلاً: تغيّر اسم ملف `assets/index-*.js` داخل صفحة الموقع.

## ملاحظات أمان
- رابط النشر `/deploy` مؤمَّن — أي طلب بدون المفتاح الصحيح يُرفض (401).
- نسخة احتياطية من سكربت النشر القديم: `/var/www/webhook/deploy.js.bak`
- شهادة SSL: `/etc/letsencrypt/live/erp.scape.sa-0001/` — إعداد nginx: `/etc/nginx/sites-enabled/scapex.conf`
