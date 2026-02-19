import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface CsvUserRow {
  full_name: string;
  email: string;
  student_id?: string;
  role?: string;
  school_id?: string; // השדה החדש ששלחנו מה-Frontend
}

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. אימות זהות המזכירות
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id') // הוספת שליפת המוסד לביטחון
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'secretariat') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'למשתמש המבצע אין שיוך מוסדי' }, { status: 400 });
    }

    const { users }: { users: CsvUserRow[] } = await request.json();

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
    }

    const adminClient = await createAdminClient();
    const results: ImportResult[] = [];

    // 2. לולאת ייבוא הסטודנטים
    for (const row of users) {
      if (!row.email || !row.full_name) {
        results.push({ email: row.email ?? '', success: false, error: 'חסרים שדות חובה' });
        continue;
      }

      const role = row.role ?? 'student';
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

      // יצירת המשתמש ב-Auth עם שיוך מוסדי
      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email: row.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name,
          role,
          status: 'active',
          student_id: row.student_id ?? null,
          school_id: profile.school_id, // שימוש במוסד של המזכירה
        },
      });

      if (error) {
        results.push({ email: row.email, success: false, error: error.message });
        continue;
      }

      // 3. יצירת הפרופיל ב-Database עם ה-school_id
      if (newUser.user) {
        await adminClient
          .from('profiles')
          .upsert({
            id: newUser.user.id,
            full_name: row.full_name,
            email: row.email,
            role,
            status: 'active',
            student_id: row.student_id ?? null,
            school_id: profile.school_id, // שיוך קבוע בטבלת הפרופילים
          });
      }

      results.push({ email: row.email, success: true });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}