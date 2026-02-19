import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import AttendanceTable from '@/components/lecturer/AttendanceTable';

export default async function LecturerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get today's active lessons for this lecturer
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data: todayLessons } = await supabase
    .from('lessons')
    .select('*, courses!inner(name, code, lecturer_id)')
    .eq('courses.lecturer_id', user.id)
    .gte('scheduled_at', startOfDay)
    .lte('scheduled_at', endOfDay)
    .order('scheduled_at');

  // Get all courses for this lecturer
  const { data: courses } = await supabase
    .from('courses')
    .select('*, semesters(name, is_active)')
    .eq('lecturer_id', user.id)
    .order('name');

  // Get enrollment counts for each lesson
  const lessonWithEnrollments = await Promise.all(
    (todayLessons ?? []).map(async (lesson: { id: string; course_id: string; scheduled_at: string; duration_minutes: number; location_name: string; location_lat: number | null; location_lng: number | null; courses?: { name: string; code: string; lecturer_id: string } }) => {
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', lesson.course_id);
      return { ...lesson, enrolledCount: count ?? 0 };
    })
  );

  function isActive(lesson: { scheduled_at: string; duration_minutes: number }) {
    const now = new Date();
    const start = new Date(lesson.scheduled_at);
    const end = new Date(start.getTime() + lesson.duration_minutes * 60000);
    return now >= start && now <= end;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">לוח בקרה — מרצה</h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's lessons with real-time attendance */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">שיעורים היום</h2>
        {lessonWithEnrollments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-10 text-gray-500">
              אין שיעורים מתוכננים להיום
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {lessonWithEnrollments.map((lesson) => (
              <Card key={lesson.id} className={isActive(lesson) ? 'border-green-400 shadow-md' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{lesson.courses?.name}</CardTitle>
                        <Badge variant="outline">{lesson.courses?.code}</Badge>
                        {isActive(lesson) && (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 animate-pulse">
                            פעיל עכשיו
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(lesson.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          {' '}({lesson.duration_minutes} דקות)
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {lesson.location_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <AttendanceTable lessonId={lesson.id} totalEnrolled={lesson.enrolledCount} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All courses */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">הקורסים שלי</h2>
        {!courses || courses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-10 text-gray-500">
              לא שויכת לאף קורס
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{course.semesters?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{course.code}</Badge>
                      {course.semesters?.is_active && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">פעיל</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
