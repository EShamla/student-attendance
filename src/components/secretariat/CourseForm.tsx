'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import type { Course, Semester, Profile } from '@/lib/supabase/types';

interface CourseFormProps {
  onSuccess: () => void;
  editCourse?: Course;
}

export default function CourseForm({ onSuccess, editCourse }: CourseFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [lecturers, setLecturers] = useState<Profile[]>([]);
  const [name, setName] = useState(editCourse?.name ?? '');
  const [code, setCode] = useState(editCourse?.code ?? '');
  const [semesterId, setSemesterId] = useState(editCourse?.semester_id ?? '');
  const [lecturerId, setLecturerId] = useState(editCourse?.lecturer_id ?? '');
  const [maxStudents, setMaxStudents] = useState(editCourse?.max_students?.toString() ?? '40');

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    Promise.all([
      supabase.from('semesters').select('*').order('start_date', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'lecturer').eq('status', 'active').order('full_name'),
    ]).then(([{ data: sems }, { data: lects }]) => {
      setSemesters(sems ?? []);
      setLecturers(lects ?? []);
    });
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const payload = {
      name,
      code,
      semester_id: semesterId,
      lecturer_id: lecturerId || null,
      max_students: parseInt(maxStudents),
    };

    const { error } = editCourse
      ? await supabase.from('courses').update(payload).eq('id', editCourse.id)
      : await supabase.from('courses').insert(payload);

    if (error) {
      toast.error('שגיאה בשמירת הקורס: ' + error.message);
    } else {
      toast.success(editCourse ? 'הקורס עודכן' : 'הקורס נוצר בהצלחה');
      setOpen(false);
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          {editCourse ? 'ערוך קורס' : 'קורס חדש'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editCourse ? 'עריכת קורס' : 'יצירת קורס חדש'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>שם הקורס</Label>
              <Input
                placeholder="אלגברה לינארית"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>קוד קורס</Label>
              <Input
                placeholder="MATH101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>סמסטר</Label>
            <Select value={semesterId} onValueChange={setSemesterId} required>
              <SelectTrigger>
                <SelectValue placeholder="בחר סמסטר" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>מרצה</Label>
            <Select value={lecturerId} onValueChange={setLecturerId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מרצה (אופציונלי)" />
              </SelectTrigger>
              <SelectContent>
                {lecturers.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>מספר מקסימלי של סטודנטים</Label>
            <Input
              type="number"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              min="1"
              max="500"
              dir="ltr"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              שמור
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
