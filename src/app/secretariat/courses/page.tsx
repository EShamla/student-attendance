'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, BookOpen } from 'lucide-react';
import CourseForm from '@/components/secretariat/CourseForm';
import type { Course } from '@/lib/supabase/types';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('courses')
      .select('*, semesters(name, is_active), profiles(full_name)')
      .order('created_at', { ascending: false });
    setCourses(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function handleDelete(id: string) {
    if (!confirm('למחוק קורס זה? פעולה זו תמחק גם את כל השיעורים והרשומות הקשורות.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      toast.error('שגיאה במחיקה: ' + error.message);
    } else {
      toast.success('הקורס נמחק');
      fetchCourses();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">קורסים</h1>
        <CourseForm onSuccess={fetchCourses} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>כל הקורסים</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-6">טוען...</p>
          ) : courses.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">אין קורסים. צור את הראשון!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{course.name}</p>
                      <Badge variant="outline">{course.code}</Badge>
                      {course.semesters?.is_active && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">פעיל</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {course.semesters?.name} · מרצה: {course.profiles?.full_name ?? 'לא שויך'} · {course.max_students} מקומות
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CourseForm onSuccess={fetchCourses} editCourse={course} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(course.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
