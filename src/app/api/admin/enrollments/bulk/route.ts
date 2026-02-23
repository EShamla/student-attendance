import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const { studentIds, courseIds }: { studentIds: string[]; courseIds: string[] } = await request.json();

    if (!studentIds?.length || !courseIds?.length) {
      return NextResponse.json({ error: 'חסרים סטודנטים או קורסים' }, { status: 400 });
    }

    // בנה את כל הצמדים (student × course) — Cartesian product
    const rows = studentIds.flatMap((studentId) =>
      courseIds.map((courseId) => ({
        student_id: studentId,
        course_id: courseId,
      }))
    );

    // Bulk upsert עם ignoreDuplicates כדי לא לשבור על שיוכים קיימים
    const { data, error } = await supabase
      .from('enrollments')
      .upsert(rows, { onConflict: 'student_id,course_id', ignoreDuplicates: true })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length ?? 0,
      total: rows.length,
    });
  } catch (error) {
    console.error('Bulk enroll error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
