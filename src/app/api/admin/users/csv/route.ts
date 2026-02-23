import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// 1. מחקנו את student_id מההגדרות
interface CsvUserRow {
  full_name: string;
  email: string;
  role?: string;
  school_id?: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    // 2. פתחנו את ההרשאות - עכשיו גם מנהל (admin) וגם מזכירות יכולים לייבא
    if (!profile || (profile.role !== 'secretariat' && profile.role !== 'admin')) {
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

    for (const row of users) {
      if (!row.email || !row.full_name) {
        results.push({ email: row.email ?? '', success: false, error: 'חסרים שדות חובה' });
        continue;
      }

      const role = row.role ?? 'student';
      // יצירת סיסמה זמנית מאובטחת
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

      // יצירת המשתמש במערכת ההזדהות של סופאבייס
      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email: row.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name,
          role,
          status: 'active',
          school_id: profile.school_id, 
          // 3. הוסר student_id
        },
      });

      if (error) {
        results.push({ email: row.email, success: false, error: error.message });
        continue;
      }

      // יצירת הפרופיל בטבלת Profiles
      if (newUser.user) {
        await adminClient
          .from('profiles')
          .upsert({
            id: newUser.user.id,
            full_name: row.full_name,
            email: row.email,
            role,
            status: 'active',
            school_id: profile.school_id,
            // 4. הוסר student_id
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