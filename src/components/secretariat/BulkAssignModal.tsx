'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { BookOpen, Loader2, CheckSquare } from 'lucide-react';
import type { Course } from '@/lib/supabase/types';

interface BulkAssignModalProps {
  selectedStudents: { id: string; full_name: string }[];
  onSuccess: () => void;
}

export default function BulkAssignModal({ selectedStudents, onSuccess }: BulkAssignModalProps) {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function fetchCourses() {
      setLoadingCourses(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('courses')
        .select('id, name, code, semesters(name)')
        .order('name');
      setCourses((data as unknown as Course[]) ?? []);
      setLoadingCourses(false);
    }
    fetchCourses();
    setSelectedCourseIds(new Set());
  }, [open]);

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (!selectedStudents.length || !selectedCourseIds.size) {
      toast.error('יש לבחור סטודנטים וקורסים');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/enrollments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents.map((s) => s.id),
          courseIds: Array.from(selectedCourseIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('שגיאה בשיוך: ' + (data.error ?? ''));
      } else {
        toast.success(
          `${data.inserted} שיוכים נוספו (${selectedStudents.length} סטודנטים × ${selectedCourseIds.size} קורסים)`
        );
        setOpen(false);
        onSuccess();
      }
    } catch {
      toast.error('שגיאה לא צפויה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={selectedStudents.length === 0}
          title={selectedStudents.length === 0 ? 'בחר סטודנטים תחילה' : ''}
        >
          <BookOpen className="ml-2 h-4 w-4" />
          שייך לקורס ({selectedStudents.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>שיוך מרובה לקורסים</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* סטודנטים נבחרים */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              סטודנטים נבחרים ({selectedStudents.length}):
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-lg border">
              {selectedStudents.map((s) => (
                <Badge key={s.id} variant="secondary" className="text-xs">
                  {s.full_name}
                </Badge>
              ))}
            </div>
          </div>

          {/* בחירת קורסים */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              בחר קורסים לשיוך:
            </p>
            {loadingCourses ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : courses.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">לא נמצאו קורסים</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {courses.map((course) => {
                  const checked = selectedCourseIds.has(course.id);
                  return (
                    <label
                      key={course.id}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCourse(course.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{course.name}</p>
                        <p className="text-xs text-gray-500">
                          {course.code}
                          {course.semesters?.name && ` — ${course.semesters.name}`}
                        </p>
                      </div>
                      {checked && <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {selectedCourseIds.size > 0 && (
            <p className="text-xs text-gray-500 text-center">
              יבוצעו {selectedStudents.length * selectedCourseIds.size} שיוכים ({selectedStudents.length} × {selectedCourseIds.size})
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>סגור</Button>
            <Button
              onClick={handleAssign}
              disabled={loading || selectedCourseIds.size === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              שייך
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
