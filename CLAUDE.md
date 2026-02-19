# CLAUDE.md — Academic Attendance System

## Project Overview
Full-stack academic attendance system with GPS verification.
Hebrew UI, RTL layout, three roles: Secretariat, Lecturer, Student.

## Tech Stack
- Next.js 14 App Router
- Supabase (auth + PostgreSQL)
- Tailwind CSS v4 + tailwindcss-rtl
- Shadcn/UI (components in src/components/ui/)
- Lucide React icons

## Critical RTL/Hebrew Rules
1. **Root layout MUST have `<html dir="rtl" lang="he">`**
2. **Font**: Heebo from Google Fonts (excellent Hebrew support)
3. **Tailwind**: Use logical properties (`start`/`end`) instead of `left`/`right` where possible
4. **All user-facing strings are inline Hebrew** — no i18n library needed
5. **Shadcn components**: direction inherited via CSS `direction: rtl` on root
6. **Icons**: Lucide icons flip correctly with RTL when using `dir="rtl"` on parent

## Role System
- `admin` / `secretariat` → full admin, desktop-first UI, sidebar layout (routes under `/admin`)
- `lecturer` → view-only, sees attendance for their courses
- `student` → mobile-first, GPS check-in

## Account Status Flow
- Secretariat-created / CSV-imported → `status = active` immediately
- Self-registered → `status = pending`, `role = null` → needs secretariat approval
- `pending` users are redirected to `/pending` page

## Supabase Conventions
- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts` (uses cookies)
- All DB types are in `src/lib/supabase/types.ts`
- RLS is enabled on all tables — never bypass in client code

## GPS / Geofencing
- Haversine formula in `src/lib/geofencing.ts`
- Default radius: 50 meters
- Distance recalculated server-side for audit trail
- Client error: "אינך נמצא בטווח הכיתה (50 מטר)"

## File Structure Conventions
- Route groups: `(auth)`, `(student)`, `(lecturer)`, admin routes under `src/app/admin/`
- Shared UI components: `src/components/ui/` (shadcn)
- Role-specific components: `src/components/student/`, `src/components/lecturer/`, `src/components/secretariat/`
- Hooks: `src/hooks/`
- Lib/utils: `src/lib/`

## Toast Notifications
- Use `sonner` (not the deprecated shadcn toast)
- Import: `import { toast } from 'sonner'`
- Provider in root layout: `<Toaster />`

## API Routes
- `/api/attendance/checkin` — POST, server-validates GPS + enrollment
- `/api/admin/users/create` — POST, secretariat only, uses Supabase Admin API
- `/api/admin/users/csv` — POST, secretariat only, bulk user creation
- `/api/admin/users/approve` — POST, approve pending user
