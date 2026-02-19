'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, School, MapPin } from 'lucide-react';
import LessonForm from '@/components/secretariat/LessonForm';
import type { Lesson } from '@/lib/supabase/types';

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLessons = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('lessons')
      .select('*, courses(name, code, semesters(name))')
      .order('scheduled_at', { ascending: false });
    setLessons(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  async function handleDelete(id: string) {
    if (!confirm('למחוק שיעור זה?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      toast.error('שגיאה במחיקה: ' + error.message);
    } else {
      toast.success('השיעור נמחק');
      fetchLessons();
    }
  }

  function isLessonActive(lesson: Lesson) {
    const now = new Date();
    const start = new Date(lesson.scheduled_at);
    const end = new Date(start.getTime() + lesson.duration_minutes * 60000);
    return now >= start && now <= end;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">שיעורים</h1>
        <LessonForm onSuccess={fetchLessons} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>כל השיעורים</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-6">טוען...</p>
          ) : lessons.length === 0 ? (
            <div className="text-center py-10">
              <School className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">אין שיעורים. צור את הראשון!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{lesson.courses?.name}</p>
                      <Badge variant="outline">{lesson.courses?.code}</Badge>
                      {isLessonActive(lesson) && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 animate-pulse">בשידור חי</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {new Date(lesson.scheduled_at).toLocaleDateString('he-IL')} {' '}
                        {new Date(lesson.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>{lesson.duration_minutes} דקות</span>
                      {lesson.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lesson.location_name}
                        </span>
                      )}
                      {lesson.location_lat && (
                        <span className="text-xs text-gray-400 font-mono" dir="ltr">
                          GPS: {lesson.location_lat.toFixed(4)}, {lesson.location_lng?.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LessonForm onSuccess={fetchLessons} editLesson={lesson} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(lesson.id)}
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
