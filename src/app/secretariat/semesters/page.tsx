'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import SemesterForm from '@/components/secretariat/SemesterForm';
import type { Semester } from '@/lib/supabase/types';

export default function SemestersPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSemesters = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('semesters')
      .select('*')
      .order('start_date', { ascending: false });
    setSemesters(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);

  async function handleDelete(id: string) {
    if (!confirm('למחוק את הסמסטר? פעולה זו תמחק גם את כל הקורסים הקשורים.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('semesters').delete().eq('id', id);
    if (error) {
      toast.error('שגיאה במחיקה: ' + error.message);
    } else {
      toast.success('הסמסטר נמחק');
      fetchSemesters();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">סמסטרים</h1>
        <SemesterForm onSuccess={fetchSemesters} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>כל הסמסטרים</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-6">טוען...</p>
          ) : semesters.length === 0 ? (
            <p className="text-center text-gray-500 py-6">אין סמסטרים. צור את הראשון!</p>
          ) : (
            <div className="space-y-3">
              {semesters.map((semester) => (
                <div key={semester.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{semester.name}</p>
                        {semester.is_active && (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">פעיל</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(semester.start_date).toLocaleDateString('he-IL')} —{' '}
                        {new Date(semester.end_date).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SemesterForm onSuccess={fetchSemesters} editSemester={semester} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(semester.id)}
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
