# LoukPeri Core API - Setup Guide

## Requirements

- Node.js 24+
- npm
- PostgreSQL
- Git

## Project path

```powershell
C:\Projects\LoukPeri\backend\loukperi-core-api

## Install dependencies
npm install
Environment file

## Create .env in the backend project root:

NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/loukperi_core_dev?schema=public"

JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

DEFAULT_TIMEZONE=Europe/Athens

## Prisma
npm run prisma:generate
npm run prisma:push
npm run prisma:seed

## Start backend
npm run start:dev

## Swagger
http://localhost:3001/docs

## Demo users
admin@client.com / ChangeMe123!
manager@client.com / ChangeMe123!
operator@client.com / ChangeMe123!
viewer@client.com / ChangeMe123!

## Κάνε **Save**.

---

## Βήμα 3 — Φτιάξε το δεύτερο αρχείο

Τρέξε:

```powershell
code docs\SMOKE_TEST.md

Βάλε αυτό:

# LoukPeri Core API - Smoke Test Checklist

## Health

```http
GET /api/v1/health
GET /api/v1/health/db
Auth
POST /api/v1/auth/login
GET /api/v1/auth/me
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
Users / Roles
GET /api/v1/users
GET /api/v1/roles
GET /api/v1/permissions
Workspace
GET /api/v1/workspaces/current
GET /api/v1/workspaces/current/settings
Records / Tasks
GET /api/v1/records
GET /api/v1/tasks
GET /api/v1/statuses
Record detail
GET /api/v1/records/{recordId}
GET /api/v1/records/{recordId}/activity
GET /api/v1/records/{recordId}/notes
GET /api/v1/records/{recordId}/files
Dashboards
GET /api/v1/dashboards
GET /api/v1/dashboards/default?scope_type=workspace
GET /api/v1/dashboards/{dashboardId}/data
Reports
GET /api/v1/reports
GET /api/v1/reports/{reportId}/data
POST /api/v1/reports/{reportId}/export
GET /api/v1/exports/{exportId}/download
Expected result

All core endpoints return 200/201 and no compile errors.


Κάνε **Save**.

---

## Βήμα 4 — Κάνε commit

Μετά τρέξε:

```powershell
git status
git add docs/SETUP.md docs/SMOKE_TEST.md
git commit -m "Add setup and smoke test documentation"
git push