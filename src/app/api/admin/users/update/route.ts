import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { UserRole, UserStatus } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
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

    const metadataRole = (user.user_metadata?.role as string) || profile?.role;
    const isAdmin = metadataRole === 'admin' || profile?.role === 'secretariat';

    if (!isAdmin) {
      return NextResponse.json({ error: 'אין הרשאה לעריכת משתמשים' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, fullName, email, role, status } = body;

    if (!userId) {
      return NextResponse.json({ error: 'מזהה משתמש חסר' }, { status: 400 });
    }

    const validRoles: UserRole[] = ['student', 'lecturer', 'secretariat'];
    const validStatuses: UserStatus[] = ['active', 'pending', 'suspended'];

    const adminClient = await createAdminClient();

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) {
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'תפקיד לא תקין' }, { status: 400 });
      }
      updates.role = role;
    }
    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
    }

    const metadataUpdates: Record<string, unknown> = {};
    if (fullName !== undefined) metadataUpdates.full_name = fullName;
    if (role !== undefined) metadataUpdates.role = role;
    if (status !== undefined) metadataUpdates.status = status;

    if (Object.keys(metadataUpdates).length > 0) {
      const { error: metaError } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: metadataUpdates,
        ...(email !== undefined ? { email } : {}),
      });
      if (metaError) {
        return NextResponse.json({ error: 'שגיאה בעדכון Auth: ' + metaError.message }, { status: 400 });
      }
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: 'שגיאה בעדכון פרופיל: ' + profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
