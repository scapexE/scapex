# دليل رفع Scapex على سيرفر VPS مع cPanel
# Scapex Deployment Guide — VPS with cPanel/Plesk

---

## المتطلبات / Requirements

| المتطلب | الحد الأدنى |
|---------|------------|
| Node.js | v20 أو أحدث |
| RAM | 1 GB+ |
| مساحة القرص | 500 MB+ |
| نظام التشغيل | Linux (Ubuntu/CentOS/Debian) |

> ملاحظة: التطبيق حالياً يستخدم localStorage في المتصفح لتخزين البيانات (لا يحتاج PostgreSQL إلا إذا تم تفعيل API routes لاحقاً)

---

## الخطوة 1: تجهيز الملفات للرفع

### الملفات المطلوبة للرفع:
```
dist/
  ├── index.cjs          ← ملف السيرفر (الباك إند)
  └── public/            ← ملفات الفرونت إند
      ├── index.html
      └── assets/
          ├── index-*.css
          └── index-*.js
package.json
version.json
```

### الملفات التي لا تحتاج رفعها:
```
node_modules/     ← سيتم تثبيتها على السيرفر
client/           ← كود المصدر فقط - البناء موجود في dist/
server/           ← كود المصدر فقط - البناء موجود في dist/
shared/           ← كود المصدر فقط
script/           ← أدوات البناء فقط
```

---

## الخطوة 2: رفع الملفات على السيرفر

### الطريقة 1: عبر cPanel File Manager
1. ادخل cPanel → **File Manager**
2. انشئ مجلد جديد مثلاً: `/home/username/scapex`
3. ارفع الملفات التالية:
   - مجلد `dist/` كاملاً
   - ملف `package.json`
   - ملف `version.json`

### الطريقة 2: عبر SSH (أسرع)
```bash
# على جهازك المحلي بعد تنزيل الملفات من Replit
scp -r dist/ package.json version.json username@your-server:/home/username/scapex/
```

---

## الخطوة 3: إعداد Node.js على cPanel

### عبر cPanel Node.js Selector:
1. ادخل cPanel → **Setup Node.js App**
2. اضغط **Create Application**
3. عبّي الحقول:
   - **Node.js version**: `20.x` أو أحدث
   - **Application mode**: `Production`
   - **Application root**: `scapex`
   - **Application URL**: اختر الدومين (مثلاً `scapex.yourdomain.com`)
   - **Application startup file**: `dist/index.cjs`
4. اضغط **Create**

### إعداد Environment Variables:
في نفس صفحة Node.js App، أضف:
```
NODE_ENV = production
PORT = 5000
```

### تثبيت الحزم:
في نفس الصفحة اضغط **Run NPM Install**
أو عبر SSH:
```bash
cd /home/username/scapex
npm install --production
```

---

## الخطوة 4: عبر SSH (بديل عن cPanel Node.js Selector)

```bash
# الاتصال بالسيرفر
ssh username@your-server-ip

# تثبيت Node.js (إذا غير موجود)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# التحقق من الإصدار
node --version   # يجب أن يكون v20+
npm --version

# الدخول لمجلد المشروع
cd /home/username/scapex

# تثبيت الحزم
npm install --production

# تشغيل تجريبي
PORT=5000 NODE_ENV=production node dist/index.cjs

# إذا اشتغل بنجاح — أوقفه (Ctrl+C) ونكمل الخطوة التالية
```

---

## الخطوة 5: تشغيل دائم باستخدام PM2

```bash
# تثبيت PM2 (مدير العمليات)
sudo npm install -g pm2

# تشغيل التطبيق
cd /home/username/scapex
PORT=5000 NODE_ENV=production pm2 start dist/index.cjs --name "scapex"

# التأكد من التشغيل
pm2 status

# تشغيل تلقائي عند إعادة تشغيل السيرفر
pm2 startup
pm2 save

# أوامر مفيدة:
pm2 logs scapex          # عرض السجلات
pm2 restart scapex       # إعادة تشغيل
pm2 stop scapex          # إيقاف
pm2 delete scapex        # حذف
```

---

## الخطوة 6: ربط الدومين (Reverse Proxy)

### إذا تستخدم cPanel مع Apache:
أضف في `.htaccess` داخل مجلد `public_html` (أو مجلد الدومين الفرعي):

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://localhost:5000/$1 [P,L]
```

### أو عبر Nginx (إذا متوفر):
أنشئ ملف `/etc/nginx/sites-available/scapex`:

```nginx
server {
    listen 80;
    server_name scapex.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/scapex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## الخطوة 7: شهادة SSL (HTTPS)

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx

# إصدار شهادة SSL
sudo certbot --nginx -d scapex.yourdomain.com

# التجديد التلقائي
sudo certbot renew --dry-run
```

أو من cPanel → **SSL/TLS** → **Let's Encrypt**

---

## التحقق من التشغيل

بعد إتمام كل الخطوات، افتح المتصفح:
```
https://scapex.yourdomain.com
```

يجب أن تظهر صفحة تسجيل الدخول.

### بيانات الدخول الافتراضية:
| المستخدم | كلمة المرور |
|----------|-------------|
| admin@scapex.sa | Admin@123 |
| manager@scapex.sa | Manager@123 |
| accountant@scapex.sa | Account@123 |
| engineer@scapex.sa | Engineer@123 |

---

## تحديث التطبيق مستقبلاً

```bash
# 1. بناء النسخة الجديدة على Replit
npm run build

# 2. رفع الملفات الجديدة
scp -r dist/ username@your-server:/home/username/scapex/

# 3. إعادة تشغيل التطبيق
ssh username@your-server "pm2 restart scapex"
```

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| الصفحة لا تفتح | تأكد أن PM2 يعمل: `pm2 status` |
| خطأ في المنفذ | تأكد أن PORT=5000 وأن المنفذ غير مستخدم |
| مشكلة SSL | تأكد من إعداد Certbot بشكل صحيح |
| بيانات مفقودة بعد التحديث | البيانات محفوظة في localStorage بالمتصفح — لن تتأثر بتحديث السيرفر |

---

> تم إنشاء هذا الدليل لمنصة Scapex V1.0
