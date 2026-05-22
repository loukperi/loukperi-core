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