import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';
import CheckInButton from '@/components/student/CheckInButton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Lesson } from '@/lib/supabase/types';

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch lesson details
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, courses(name, code, id)')
    .eq('id', lessonId)
    .single();

  if (!lesson) redirect('/student/dashboard');

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', lesson.course_id)
    .eq('student_id', user.id)
    .single();

  if (!enrollment) {
    return (
      <div className="py-6 space-y-4">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-red-700">אינך רשום לקורס זה</p>
            <Link href="/student/dashboard">
              <Button className="mt-4" variant="outline">חזרה</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if lesson is currently active
  const now = new Date();
  const lessonStart = new Date(lesson.scheduled_at);
  const lessonEnd = new Date(lessonStart.getTime() + lesson.duration_minutes * 60000);
  const isActive = now >= lessonStart && now <= lessonEnd;

  // Check if already checked in
  const { data: existingAttendance } = await supabase
    .from('attendance')
    .select('id, status, checked_in_at')
    .eq('lesson_id', lessonId)
    .eq('student_id', user.id)
    .single();

  return (
    <div className="py-6 space-y-4">
      {/* Lesson info card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{lesson.courses?.name}</CardTitle>
              <Badge variant="outline" className="mt-1">{lesson.courses?.code}</Badge>
            </div>
            {isActive && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 animate-pulse">
                פעיל
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {lessonStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              {lessonEnd.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              {' '}({lesson.duration_minutes} דקות)
            </span>
          </div>
          {lesson.location_name && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{lesson.location_name}</span>
            </div>
          )}
          {!lesson.location_lat && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>לשיעור זה לא הוגדר מיקום GPS</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in status / button */}
      {existingAttendance ? (
        <Card className="border-green-300">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-bold text-green-700 text-lg">כבר נרשמת לשיעור זה</p>
            <p className="text-sm text-gray-500 mt-1">
              זמן רישום: {new Date(existingAttendance.checked_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              <span className={existingAttendance.status === 'present' ? 'text-green-600' : 'text-amber-600'}>
                {existingAttendance.status === 'present' ? 'נוכח/ת' : 'איחור'}
              </span>
            </p>
          </CardContent>
        </Card>
      ) : !isActive ? (
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            {now < lessonStart ? (
              <>
                <p className="font-semibold text-gray-600">השיעור טרם התחיל</p>
                <p className="text-sm text-gray-400 mt-1">
                  יתחיל בשעה {lessonStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-600">השיעור הסתיים</p>
                <p className="text-sm text-gray-400 mt-1">לא ניתן לרשום נוכחות לאחר סיום השיעור</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-600 mb-4 text-sm">
              לחץ לרישום נוכחות. המערכת תאמת את מיקומך ב-GPS.
            </p>
            <CheckInButton lesson={lesson as Lesson} />
          </CardContent>
        </Card>
      )}

      <Link href="/student/dashboard">
        <Button variant="outline" className="w-full">חזרה לדף הבית</Button>
      </Link>
    </div>
  );
}
