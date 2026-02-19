import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface CsvUserRow {
  full_name: string;
  email: string;
  student_id?: string;
  role?: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify caller is secretariat
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'secretariat') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
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
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email: row.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name,
          role,
          status: 'active',
          student_id: row.student_id ?? null,
        },
      });

      if (error) {
        results.push({ email: row.email, success: false, error: error.message });
        continue;
      }

      // Upsert profile
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
