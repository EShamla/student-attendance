import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. אימות שהמבצע הוא אכן איש מזכירות
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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    // 2. קבלת הנתונים, כולל ה-schoolId החדש
    const { fullName, email, role, studentId, password, schoolId } = await request.json();

    if (!fullName || !email || !role || !password || !schoolId) {
      return NextResponse.json({ error: 'נתונים חסרים, כולל מזהה מוסד' }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // 3. יצירת המשתמש ב-Auth עם הצמדת ה-school_id למטא-דאטה
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        status: 'active',
        student_id: studentId ?? null,
        school_id: schoolId, // שמירה בזהות המשתמש
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // 4. עדכון/יצירת הפרופיל עם השיוך המוסדי הסופי
    if (newUser.user) {
      const { error: upsertError } = await adminClient
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          full_name: fullName,
          email,
          role,
          status: 'active',
          student_id: studentId ?? null,
          school_id: schoolId, // השיוך הקריטי ב-Database
        });

      if (upsertError) {
        return NextResponse.json({ error: 'שגיאה בעדכון הפרופיל: ' + upsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, userId: newUser.user?.id });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}