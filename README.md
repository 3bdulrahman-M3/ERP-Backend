# Backend ERP System

Backend ERP System built with Node.js and PostgreSQL

## Requirements

- Node.js (version 14 or higher)
- PostgreSQL (version 12 or higher)

## 🚀 Railway Deployment

للنشر على Railway، راجع ملف [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) للتعليمات التفصيلية.

**ملخص سريع:**
1. أنشئ مشروع جديد على Railway
2. أضف PostgreSQL Database service
3. أضف Environment Variables (راجع `.env.example`)
4. ارفع الكود من GitHub
5. شغل Migrations: `railway run npm run migrate`

## Installation

1. Install required packages:
```bash
npm install
```

2. Create `.env` file and enter your database credentials (or copy from `.env.example`):
```
# For Railway: DATABASE_URL is provided automatically
# For local: Use individual variables below

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ERP
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
RUN_SEEDER=true
```

3. Create the database in PostgreSQL:
```sql
CREATE DATABASE "ERP";
```

4. **Run Migrations to create tables:**
```bash
npm run migrate
```

> **Important Note:** You must run Migrations before starting the server for the first time.

## Running

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

## Migrations

### Run Migrations:
```bash
npm run migrate
```
Creates all required tables in the database.

### Undo last Migration:
```bash
npm run migrate:undo
```
Undoes the last executed migration.

## API Endpoints

- `GET /` - Home page
- `GET /api/health` - Check database connection status
- `POST /api/auth/login` - Login
  - Body: `{ "email": "user@example.com", "password": "password123" }`
  - Response: `{ "success": true, "data": { "accessToken": "...", "refreshToken": "...", "user": {...} } }`
- `POST /api/auth/refresh-token` - Refresh access token
  - Body: `{ "refreshToken": "..." }`
  - Response: `{ "success": true, "data": { "accessToken": "...", "user": {...} } }`
- `POST /api/auth/logout` - Logout
  - Body: `{ "refreshToken": "..." }`
  - Response: `{ "success": true, "message": "Logout successful" }`

## Authentication

- **Access Token**: Expires in 1 day
- **Refresh Token**: Expires in 7 days
- **Roles**: `admin`, `student`

## Project Structure

```
Backend-ERP/
├── app.js                  # Main server file
├── config/
│   └── database.js         # Database configuration (Sequelize)
├── controllers/
│   └── authController.js   # Authentication controller
├── services/
│   └── authService.js      # Authentication service
├── models/
│   ├── User.js             # User model
│   └── index.js            # Models export
├── routes/
│   └── authRoutes.js       # Authentication routes
├── middlewares/
│   ├── authMiddleware.js   # JWT verification middleware
│   └── responseHandler.js  # Response formatting middleware
├── migrations/
│   ├── 20240101000000-create-users.js  # Migration for users table
│   ├── runMigrations.js                # Script to run migrations
│   └── undoLastMigration.js            # Script to undo last migration
├── seeders/
│   └── seedAdmin.js        # Seeder for default Admin account
├── .env                    # Environment file (must be created)
├── .env.example            # Environment variables template
├── Procfile                # Railway deployment file
├── railway.json            # Railway configuration
├── package.json            # Project file
└── README.md               # This file
```
