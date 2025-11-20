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

2. إنشاء ملف `.env` وإدخال بيانات قاعدة البيانات الخاصة بك:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
RUN_SEEDER=true
```

3. إنشاء قاعدة البيانات في PostgreSQL:
```sql
CREATE DATABASE erp_db;
```

4. **تشغيل Migrations لإنشاء الجداول:**
```bash
npm run migrate
```

> **ملاحظة مهمة:** يجب تشغيل Migrations قبل بدء السيرفر لأول مرة.

## التشغيل

### وضع التطوير (مع إعادة التشغيل التلقائي):
```bash
npm run dev
```

### وضع الإنتاج:
```bash
npm start
```

## Migrations

### تشغيل Migrations:
```bash
npm run migrate
```
يقوم بإنشاء جميع الجداول المطلوبة في قاعدة البيانات.

### إلغاء آخر Migration:
```bash
npm run migrate:undo
```
يقوم بإلغاء آخر migration تم تنفيذه.

## API Endpoints

- `GET /` - الصفحة الرئيسية
- `GET /api/health` - التحقق من حالة قاعدة البيانات
- `POST /api/auth/login` - تسجيل الدخول
  - Body: `{ "email": "user@example.com", "password": "password123" }`
  - Response: `{ "success": true, "data": { "token": "...", "user": {...} } }`

## البنية

```
Backend-ERP/
├── app.js                  # ملف السيرفر الرئيسي
├── config/
│   └── database.js         # إعدادات قاعدة البيانات (Sequelize)
├── controllers/
│   └── authController.js   # Controller للمصادقة
├── services/
│   └── authService.js      # Service للمصادقة
├── models/
│   ├── User.js             # موديل User
│   └── index.js            # تصدير الموديلات
├── routes/
│   └── authRoutes.js       # Routes للمصادقة
├── middlewares/
│   ├── authMiddleware.js   # Middleware للتحقق من JWT
│   └── responseHandler.js  # Middleware لتنسيق الردود
├── migrations/
│   ├── 20240101000000-create-users.js  # Migration لجدول users
│   ├── runMigrations.js                # سكريبت لتشغيل Migrations
│   └── undoLastMigration.js            # سكريبت لإلغاء آخر Migration
├── seeders/
│   └── seedAdmin.js        # Seeder لحساب Admin افتراضي
├── .env                    # ملف البيئة (يجب إنشاؤه)
├── package.json            # ملف المشروع
└── README.md               # هذا الملف
```

