import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import LessonCard from '@/components/student/LessonCard';
import type { Lesson, Attendance } from '@/lib/supabase/types';

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get all enrolled course IDs
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', user.id);

  const courseIds = (enrollments ?? []).map((e: { course_id: string }) => e.course_id);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

  // Get today's lessons from enrolled courses
  const { data: todayLessons } = courseIds.length > 0
    ? await supabase
        .from('lessons')
        .select('*, courses(name, code)')
        .in('course_id', courseIds)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .order('scheduled_at')
    : { data: [] };

  // Get upcoming lessons (next 7 days, not today)
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 23, 59, 59).toISOString();

  const { data: upcomingLessons } = courseIds.length > 0
    ? await supabase
        .from('lessons')
        .select('*, courses(name, code)')
        .in('course_id', courseIds)
        .gte('scheduled_at', tomorrow)
        .lte('scheduled_at', nextWeek)
        .order('scheduled_at')
    : { data: [] };

  // Get today's attendance for this student
  const lessonIds = (todayLessons ?? []).map((l: Lesson) => l.id);
  const { data: attendanceRecords } = lessonIds.length > 0
    ? await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', user.id)
        .in('lesson_id', lessonIds)
    : { data: [] };

  const attendanceMap = new Map<string, Attendance>(
    (attendanceRecords ?? []).map((a: Attendance) => [a.lesson_id, a])
  );

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">שלום 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's lessons */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">שיעורים היום</h2>
        {!todayLessons || todayLessons.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">אין שיעורים היום</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayLessons.map((lesson: Lesson & { courses?: { name: string; code: string } }) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                attendance={attendanceMap.get(lesson.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming lessons */}
      {upcomingLessons && upcomingLessons.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">שיעורים קרובים</h2>
          <div className="space-y-3">
            {upcomingLessons.slice(0, 5).map((lesson: Lesson & { courses?: { name: string; code: string } }) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </section>
      )}

      {courseIds.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">לא רשום לאף קורס עדיין</p>
            <p className="text-gray-400 text-xs mt-1">פנה למזכירות לרישום לקורסים</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
