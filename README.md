# Backend ERP System

نظام Backend ERP مبني بـ Node.js و PostgreSQL

## المتطلبات

- Node.js (الإصدار 14 أو أحدث)
- PostgreSQL (الإصدار 12 أو أحدث)

## التثبيت

1. تثبيت المكتبات المطلوبة:
```bash
npm install
```

2. إنشاء ملف `.env` من `env.example`:
```bash
cp env.example .env
```

3. تعديل ملف `.env` وإدخال بيانات قاعدة البيانات الخاصة بك:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
```

4. إنشاء قاعدة البيانات في PostgreSQL:
```sql
CREATE DATABASE erp_db;
```

## التشغيل

### وضع التطوير (مع إعادة التشغيل التلقائي):
```bash
npm run dev
```

### وضع الإنتاج:
```bash
npm start
```

## API Endpoints

- `GET /` - الصفحة الرئيسية
- `GET /api/health` - التحقق من حالة قاعدة البيانات
- `GET /api/init` - إنشاء جدول مثال (اختياري)

## البنية

```
Backend-ERP/
├── app.js              # ملف السيرفر الرئيسي
├── config/
│   └── database.js     # إعدادات قاعدة البيانات
├── .env                # ملف البيئة (يجب إنشاؤه)
├── .env.example        # مثال على ملف البيئة
├── package.json        # ملف المشروع
└── README.md           # هذا الملف
```

