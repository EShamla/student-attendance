import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { haversineDistance } from '@/lib/geofencing';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
    }

    // 1. שליפת הפרופיל כולל ה-school_id של הסטודנט
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, school_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'student' || profile.status !== 'active') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const { lessonId, latitude, longitude } = await request.json();

    if (!lessonId || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 });
    }

    // 2. שליפת השיעור כולל ה-school_id שלו
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*, courses(id), school_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'השיעור לא נמצא' }, { status: 404 });
    }

    // 3. אימות שיוך מוסדי: הסטודנט והשיעור חייבים להשתייך לאותו מוסד
    if (lesson.school_id !== profile.school_id) {
      return NextResponse.json({ error: 'חריגת הרשאה מוסדית' }, { status: 403 });
    }

    // בדיקת תקינות זמני השיעור
    const now = new Date();
    const lessonStart = new Date(lesson.scheduled_at);
    const lessonEnd = new Date(lessonStart.getTime() + lesson.duration_minutes * 60 * 1000);

    if (now < lessonStart) {
      return NextResponse.json({ error: 'השיעור טרם התחיל' }, { status: 400 });
    }
    if (now > lessonEnd) {
      return NextResponse.json({ error: 'השיעור הסתיים' }, { status: 400 });
    }

    // אימות הרשמה לקורס
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', lesson.course_id)
      .eq('student_id', user.id)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'אינך רשום לקורס זה' }, { status: 403 });
    }

    // בדיקת כפל רישום
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('student_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'כבר נרשמת לשיעור זה' }, { status: 409 });
    }

    // אימות GPS
    let distanceMeters: number | null = null;
    if (lesson.location_lat != null && lesson.location_lng != null) {
      distanceMeters = haversineDistance(
        latitude,
        longitude,
        lesson.location_lat,
        lesson.location_lng
      );

      if (distanceMeters > 50) {
        return NextResponse.json(
          {
            error: `אינך נמצא בטווח הכיתה (50 מטר). מרחק נוכחי: ${distanceMeters.toFixed(0)} מטר`,
            distance: distanceMeters,
          },
          { status: 400 }
        );
      }
    }

    const minutesLate = (now.getTime() - lessonStart.getTime()) / 60000;
    const attendanceStatus = minutesLate <= 15 ? 'present' : 'late';

    // 4. הכנסת רשומת הנוכחות עם ה-school_id של פדרמן
    const { data: attendance, error: insertError } = await supabase
      .from('attendance')
      .insert({
        lesson_id: lessonId,
        student_id: user.id,
        school_id: lesson.school_id, // שמירת הזהות המוסדית ברשומה
        checked_in_at: now.toISOString(),
        latitude,
        longitude,
        distance_meters: distanceMeters,
        status: attendanceStatus,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'כבר נרשמת לשיעור זה' }, { status: 409 });
      }
      return NextResponse.json({ error: 'שגיאה ברישום הנוכחות' }, { status: 500 });
    }

    return NextResponse.json({ success: true, attendance, status: attendanceStatus });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}