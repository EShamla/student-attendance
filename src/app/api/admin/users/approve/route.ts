import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // אימות זהות המאשר (חייב להיות admin)
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

    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 });
    }

    // שימוש ב-adminClient כדי לעדכן פרופיל של משתמש אחר (עוקף RLS)
    const adminClient = await createAdminClient();

    if (action === 'approve') {
      const { error } = await adminClient
        .from('profiles')
        .update({ role: 'student', status: 'active' })
        .eq('id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // עדכון metadata ב-Auth כדי שה-JWT יתרענן נכון
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { role: 'student', status: 'active' },
      });

      return NextResponse.json({ success: true, message: 'המשתמש אושר' });
    }

    if (action === 'reject') {
      const { error } = await adminClient
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { status: 'suspended' },
      });

      return NextResponse.json({ success: true, message: 'המשתמש נדחה' });
    }

    return NextResponse.json({ error: 'פעולה לא חוקית' }, { status: 400 });
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
