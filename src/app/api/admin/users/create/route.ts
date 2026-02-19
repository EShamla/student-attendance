import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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

    const { fullName, email, role, studentId, password } = await request.json();

    if (!fullName || !email || !role || !password) {
      return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // Create user via Supabase Admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        status: 'active',
        student_id: studentId ?? null,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Update profile (trigger creates it, but we need to ensure all fields are set)
    if (newUser.user) {
      await adminClient
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          full_name: fullName,
          email,
          role,
          status: 'active',
          student_id: studentId ?? null,
        });
    }

    return NextResponse.json({ success: true, userId: newUser.user?.id });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
