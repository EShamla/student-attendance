-- ============================================================
-- Migration 002 — Consolidate admin role
-- שינוי: תפקיד 'secretariat' → 'admin' בכל הטבלאות
-- ============================================================

-- 1. עדכון הגדרת הטיפוס (enum) — אם קיים
DO $$
BEGIN
  -- הוספת ערך 'admin' ל-enum אם לא קיים
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
  END IF;
END
$$;

-- 2. עדכון כל הרשומות בטבלת profiles
UPDATE profiles
SET role = 'admin'
WHERE role = 'secretariat';

-- 3. עדכון ב-auth.users metadata (Supabase Function)
-- הערה: בסופאבייס, user_metadata לא מתעדכן אוטומטית —
-- עדכן ידנית דרך Supabase Dashboard > Auth > Users
-- או הרץ את הסקריפט הבא ב-Service Role:
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
-- WHERE raw_user_meta_data->>'role' = 'secretariat';
