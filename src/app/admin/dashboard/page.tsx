import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Calendar, GraduationCap } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: studentsCount },
    { count: coursesCount },
    { count: lessonsCount },
    { count: pendingCount },
    { data: activeSemester },
    { data: todayLessons },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'active'),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('lessons').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('semesters').select('*').eq('is_active', true).single(),
    supabase.from('lessons')
      .select('*, courses(name, code)')
      .gte('scheduled_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
      .lte('scheduled_at', new Date(new Date().setHours(23,59,59,999)).toISOString())
      .order('scheduled_at'),
  ]);

  const stats = [
    { label: 'סטודנטים פעילים', value: studentsCount ?? 0, icon: GraduationCap, color: 'text-blue-600 bg-blue-50', href: '/admin/students' },
    { label: 'קורסים', value: coursesCount ?? 0, icon: BookOpen, color: 'text-green-600 bg-green-50', href: '/admin/courses' },
    { label: 'שיעורים', value: lessonsCount ?? 0, icon: Calendar, color: 'text-purple-600 bg-purple-50', href: '/admin/lessons' },
    { label: 'ממתינים לאישור', value: pendingCount ?? 0, icon: Users, color: 'text-amber-600 bg-amber-50', href: '/admin/approvals' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">לוח בקרה</h1>
        {activeSemester && (
          <p className="text-gray-500 mt-1">סמסטר פעיל: {activeSemester.name}</p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Today's lessons */}
      <Card>
        <CardHeader>
          <CardTitle>שיעורים היום</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayLessons || todayLessons.length === 0 ? (
            <p className="text-gray-500 text-center py-6">אין שיעורים מתוכננים להיום</p>
          ) : (
            <div className="space-y-3">
              {todayLessons.map((lesson: { id: string; location_name: string; scheduled_at: string; duration_minutes: number; courses?: { name: string; code: string } }) => (
                <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{lesson.courses?.name}</p>
                    <p className="text-sm text-gray-500">{lesson.location_name}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">
                      {new Date(lesson.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500">{lesson.duration_minutes} דקות</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
