# دليل رفع Scapex على سيرفر VPS (Hostinger)
# Scapex Deployment Guide — VPS with cPanel / SSH

---

## ⚠️ متطلبات أساسية / Requirements

| المتطلب | الحد الأدنى |
|---------|------------|
| Node.js | v20 أو أحدث |
| PostgreSQL | v14 أو أحدث |
| RAM | 2 GB+ (موصى به) |
| مساحة القرص | 1 GB+ |
| نظام التشغيل | Linux (Ubuntu 20.04+ / Debian) |

> **مهم:** النظام الآن يستخدم PostgreSQL لتخزين جميع البيانات. يجب إعداد قاعدة بيانات قبل تشغيل التطبيق.

---

## الخطوة 1: بناء ملفات الإنتاج (على Replit)

```bash
npm run build
```

الملفات الناتجة في مجلد `dist/`:
```
dist/
  ├── index.cjs          ← ملف السيرفر (الباك إند)
  └── public/            ← ملفات الفرونت إند
      ├── index.html
      └── assets/
          ├── index-*.css
          └── index-*.js
```

---

## الخطوة 2: رفع الملفات على السيرفر

### الملفات المطلوبة للرفع:
```
dist/           ← مجلد البناء كاملاً
package.json
version.json
```

### عبر SSH (أسرع):
```bash
# على جهازك المحلي بعد تنزيل الملفات من Replit
scp -r dist/ package.json version.json username@your-server-ip:/home/username/scapex/
```

### عبر cPanel File Manager:
1. افتح cPanel → **File Manager**
2. أنشئ مجلداً: `/home/username/scapex`
3. ارفع `dist/`، `package.json`، `version.json`

---

## الخطوة 3: إعداد PostgreSQL على السيرفر

```bash
# الاتصال بالسيرفر
ssh username@your-server-ip

# تثبيت PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# تشغيل PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# إنشاء قاعدة بيانات ومستخدم
sudo -u postgres psql << 'EOF'
CREATE USER scapex_user WITH PASSWORD 'ضع_كلمة_مرور_قوية_هنا';
CREATE DATABASE scapex_db OWNER scapex_user;
GRANT ALL PRIVILEGES ON DATABASE scapex_db TO scapex_user;
EOF
```

---

## الخطوة 4: إعداد متغيرات البيئة

أنشئ ملف `.env` في مجلد المشروع:
```bash
nano /home/username/scapex/.env
```

أضف المحتوى التالي:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://scapex_user:كلمة_المرور@localhost:5432/scapex_db
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
SESSION_SECRET=اكتب_نص_عشوائي_طويل_هنا_للأمان
PORTAL_JWT_SECRET=نص_عشوائي_آخر_للبوابة
```

> **RESEND_API_KEY**: مطلوب لإرسال رسائل التحقق بالبريد. احصل عليه من [resend.com](https://resend.com)

---

## الخطوة 5: تثبيت Node.js وتشغيل المشروع

```bash
# تثبيت Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# التحقق من الإصدارات
node --version   # يجب أن يكون v20+
npm --version

# الدخول لمجلد المشروع
cd /home/username/scapex

# تثبيت الحزم (إنتاج فقط)
npm install --omit=dev

# إنشاء جداول قاعدة البيانات (أول مرة فقط)
DATABASE_URL="postgresql://scapex_user:كلمة_المرور@localhost:5432/scapex_db" npx drizzle-kit push

# تجربة تشغيل يدوي للتأكد
source .env && node dist/index.cjs
# إذا ظهر: "serving on port 5000" → ناجح. اضغط Ctrl+C وكمّل.
```

---

## الخطوة 6: تشغيل دائم باستخدام PM2

```bash
# تثبيت PM2
sudo npm install -g pm2

# تشغيل التطبيق مع ملف .env
cd /home/username/scapex
pm2 start dist/index.cjs --name "scapex" --env-file .env

# تشغيل تلقائي عند إعادة تشغيل السيرفر
pm2 startup
pm2 save

# أوامر مفيدة
pm2 status              # حالة التطبيق
pm2 logs scapex         # عرض السجلات المباشرة
pm2 restart scapex      # إعادة تشغيل
pm2 stop scapex         # إيقاف
```

---

## الخطوة 7: Nginx كـ Reverse Proxy

```bash
# تثبيت Nginx
sudo apt install -y nginx

# إنشاء ملف إعدادات
sudo nano /etc/nginx/sites-available/scapex
```

أضف المحتوى التالي (استبدل `scapex.yourdomain.com` بدومينك):
```nginx
server {
    listen 80;
    server_name scapex.yourdomain.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

```bash
# تفعيل الإعدادات
sudo ln -s /etc/nginx/sites-available/scapex /etc/nginx/sites-enabled/
sudo nginx -t          # التحقق من صحة الإعدادات
sudo systemctl reload nginx
```

---

## الخطوة 8: شهادة SSL (HTTPS)

```bash
# تثبيت Certbot
sudo apt install -y certbot python3-certbot-nginx

# إصدار شهادة SSL مجانية
sudo certbot --nginx -d scapex.yourdomain.com

# التجديد التلقائي (يعمل تلقائياً عادةً)
sudo certbot renew --dry-run
```

---

## الخطوة 9: إعداد Webhook للتحديث التلقائي

إذا كنت تريد نشراً تلقائياً عند push على Git:

```bash
# أنشئ سكريبت التحديث
nano /home/username/deploy.sh
```

```bash
#!/bin/bash
cd /home/username/scapex
# انسخ الملفات الجديدة هنا حسب طريقتك (git pull أو scp)
npm install --omit=dev
pm2 restart scapex
echo "✅ Scapex updated at $(date)"
```

```bash
chmod +x /home/username/deploy.sh
```

للاستدعاء عبر webhook HTTP بسيط، أضف endpoint في Express أو استخدم أداة مثل [webhook](https://github.com/adnanh/webhook).

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

# 2. رفع الملفات الجديدة على السيرفر
scp -r dist/ username@your-server-ip:/home/username/scapex/

# 3. إعادة تشغيل التطبيق
ssh username@your-server-ip "pm2 restart scapex"
```

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| الصفحة لا تفتح | `pm2 status` و `pm2 logs scapex` |
| خطأ في قاعدة البيانات | تأكد من DATABASE_URL وأن PostgreSQL يعمل: `sudo systemctl status postgresql` |
| خطأ 502 Bad Gateway | التطبيق لم يبدأ — `pm2 logs scapex` لمعرفة السبب |
| خطأ في المنفذ | تأكد `PORT=5000` وأن المنفذ غير مستخدم: `sudo lsof -i :5000` |
| مشكلة SSL | تأكد من إعداد Certbot: `sudo certbot certificates` |
| البريد لا يُرسل | تأكد من RESEND_API_KEY في ملف `.env` |

---

## الملفات الجاهزة للرفع الآن

```
dist/index.cjs          ← 1.2 MB (السيرفر كاملاً)
dist/public/index.html  ← الصفحة الرئيسية
dist/public/assets/     ← CSS + JS (مضغوط)
package.json
version.json
```

> **آخر بناء:** نجح ✅ — 2582 وحدة، السيرفر 1.2MB، الفرونت إند 2.4MB (666KB مضغوط)
