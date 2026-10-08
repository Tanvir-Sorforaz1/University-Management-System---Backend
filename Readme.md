# University Management System — Backend

A REST API for a university with 3 departments (CSE, EEE, CIVIL), 8 semesters per department, and bKash payment integration for semester fees.

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL + Prisma 7 (multi-file schema) |
| Auth | JWT (access + refresh via httpOnly cookies) |
| OTP / Caching | Redis |
| Email | Nodemailer (Gmail) |
| Payment | bKash Tokenized Checkout |
| File Storage | Cloudinary + Multer |

## Roles

| Role | `adminType` / flag | Created by |
|---|---|---|
| VC | `ADMIN` + `adminType: VC` | `prisma db seed` |
| Registrar / Finance / Super | `ADMIN` + matching `adminType` | VC or Super via API |
| Department Head | `FACULTY` + `isDepartmentHead: true` | Any admin via API |
| Teacher | `FACULTY` + `isDepartmentHead: false` | Any admin via API |
| Student | `STUDENT` | Self-register (OTP email flow) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in all values:

```env
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://user:password@localhost:5432/university_db

BCRYPT_SALT_ROUNDS=10

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

SUPER_ADMIN_EMAIL=vc@university.edu
SUPER_ADMIN_PASSWORD=StrongPassword123

REDIS_USER=
REDIS_PASSWORD=
REDIS_HOST=localhost
REDIS_PORT=6379

SMTP_USER=your_gmail@gmail.com
SMTP_PASSWORD=your_gmail_app_password
EMAIL_SENDER=your_gmail@gmail.com

BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_USERNAME=
BKASH_PASSWORD=
BKASH_APP_KEY=
BKASH_APP_SECRET=
BKASH_CALLBACK_URL=http://localhost:5000/api/v1/payments/callback

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 3. Run database migration

```bash
npx prisma migrate dev --name init
```

### 4. Start the server

```bash
# development
npm run dev

# production
npm run build && npm start
```

On first start the server **automatically** seeds the VC account (from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`) and all 24 fixed semesters (3 departments × 8) if they don't already exist — no manual seed step required.

## API Overview

Base URL: `http://localhost:5000/api/v1`

```
# Auth
POST   /auth/register            Student self-register (sends OTP)
POST   /auth/verify-email        Verify OTP — creates account + logs in
POST   /auth/login
GET    /auth/me
POST   /auth/refresh-token
POST   /auth/logout

# Admin
POST   /admin/faculty            Create teacher or department head
POST   /admin/admins             Create admin (VC/Super only)
PATCH  /admin/faculty/:id/department-head
GET    /admin/users
PATCH  /admin/users/:id/status
GET    /admin/dashboard-stats
GET    /admin/audit-logs

# Semesters
GET    /semesters
GET    /semesters/:id
PATCH  /semesters/:id            Update fee / credit hours (admin)

# Fees & Payments (bKash)
POST   /fees                     Admin creates invoice for a student
GET    /fees/my                  Student views own fees
POST   /payments/initiate        Student starts bKash checkout
GET    /payments/callback        bKash redirects here after payment
GET    /payments/:id

# Enrollment (requires paid fee)
POST   /enrollments
GET    /enrollments/my

# Attendance
POST   /attendance               Faculty marks
GET    /attendance/my            Student view
GET    /attendance/:id           Faculty/admin view

# Exams
POST   /exams
GET    /exams/:id
PATCH  /exams/:id
DELETE /exams/:id

# Results
POST   /results                  Faculty enters marks
GET    /results/my               Student view
PATCH  /results/:id              Correction (audit-logged)

# Transcript / CGPA
GET    /transcripts/my
GET    /transcripts/:studentId   Admin/faculty view

# Notifications
GET    /notifications/my
PATCH  /notifications/:id/read
```

## bKash Payment Flow

```
Student → POST /payments/initiate
       ← receives bkashURL

Student → opens bkashURL in browser → pays on bKash's hosted page

bKash  → GET /payments/callback?paymentID=...&status=success
       → server calls bKash execute API to confirm
       → marks Fee.isPaid = true, sends notification
```

## Postman

Import both files from the `postman/` folder:
- `university-management-auth.postman_collection.json`
- `university-management-local.postman_environment.json`

Select the **University Management System - Local** environment. Login/register requests auto-save the access token into `{{accessToken}}`.