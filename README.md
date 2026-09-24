# Student Attendance Management System (SAMS)

Final-year project. A full-stack attendance platform for colleges with four
roles — **Admin**, **Faculty**, **Student** and **Parent** — covering academic
setup, daily attendance marking, automatic shortage alerts, leave/on-duty
approvals, dashboards and exportable reports.

- **Frontend:** React 18 + Vite + shadcn/ui (Radix + Tailwind)
- **Backend:** Node.js + Express
- **Database:** MongoDB via Prisma ORM
- **Auth:** JWT (role-based access control)

## Repository layout

```
.
├── backend/    Express API, Prisma schema, seed script, integration tests
└── frontend/   React single-page app (Vite)
```

## Modules covered

1. Authentication & role-based access (Admin / Faculty / Student / Parent)
2. Department, course, class and subject management
3. Faculty and student records
4. Timetable management
5. Attendance marking (Present / Absent / Late / On-duty)
6. Attendance records browse & edit
7. Leave and on-duty requests with approval workflow and auto-adjustment
8. Shortage alerts (computed, notified, resolvable)
9. Defaulter lists
10. Reports & dashboards (daily, subject-wise, monthly, class) with Excel/PDF export
11. Settings, users and audit log

## Prerequisites

- Node.js 18+
- MongoDB running locally as a **single-node replica set** (Prisma's MongoDB
  connector requires transactions):

```bash
mongod --replSet rs0 --dbpath /path/to/data
# then, once:
mongosh --eval 'rs.initiate()'
```

MongoDB Atlas works too — point `DATABASE_URL` at a replica-set cluster.

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # adjust DATABASE_URL / JWT_SECRET if needed
npx prisma generate
npx prisma db push            # create collections & indexes
npm run seed                  # load demo dataset (departments… attendance)
npm run dev                   # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so no frontend
env vars are required for local development. To point at a different API, set
`VITE_API_PROXY` (dev proxy) or `VITE_API_URL` (build-time API base).

### 3. Production build

```bash
cd frontend && npm run build  # output in frontend/dist
```

## Demo accounts

The seed creates deterministic demo users. All student/parent accounts use the
same shared passwords.

| Role    | Email                                | Password     |
| ------- | ------------------------------------ | ------------ |
| Admin   | `admin@sams.edu`                     | `Admin@123`  |
| Faculty | `anita.faculty@sams.edu`             | `Faculty@123`|
| Student | `diya.reddy1@student.sams.edu`       | `Student@123`|
| Parent  | `parent.diya.reddy1@sams.edu`        | `Parent@123` |

Student emails follow `{first}.{last}{roll}@student.sams.edu`; each guardian is
`parent.{slug}@sams.edu`. The login screen lists the admin/faculty/student demo
accounts for one-click filling.

## Testing

With the backend running and seeded:

```bash
cd backend
npm test        # end-to-end API integration suite
```

The suite exercises auth, RBAC, academic CRUD, attendance marking & persistence,
leave/on-duty workflow, alerts, defaulters, reports/exports, dashboards,
settings, audit log, and security checks (NoSQL-injection rejection, role
guards).

> Note: the integration tests write records (attendance, leaves) into the target
> database. Re-run `npm run seed` afterwards to restore pristine demo data.

## Environment variables (`backend/.env`)

| Variable                       | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `DATABASE_URL`                 | MongoDB connection string (replica set)             |
| `PORT`                         | API port (default `4000`)                           |
| `NODE_ENV`                     | `development` / `production` / `test`               |
| `JWT_SECRET` / `JWT_EXPIRES_IN`| Token signing secret and lifetime                   |
| `MIN_ATTENDANCE_PERCENT`       | Default minimum attendance threshold (seed: `75`)   |
| `ATTENDANCE_EDIT_WINDOW_HOURS` | How long faculty may edit a marked session          |
| `SMTP_*`, `ALERT_FROM`         | Optional SMTP for guardian notification emails      |
| `CORS_ORIGIN`                  | Allowed frontend origin                             |

Settings such as the attendance threshold can also be changed at runtime from
the admin **Settings** page (persisted in the database).
