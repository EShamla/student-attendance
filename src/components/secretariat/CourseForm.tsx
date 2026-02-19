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
    
    async function fetchData() {
      // 1. קבלת המוסד של המשתמש המחובר לסינון הרשימות
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (profile?.school_id) {
        const [sems, lects] = await Promise.all([
          // סינון סמסטרים לפי בית ספר
          supabase.from('semesters')
            .select('*')
            .eq('school_id', profile.school_id)
            .order('start_date', { ascending: false }),
          // סינון מרצים לפי בית ספר
          supabase.from('profiles')
            .select('*')
            .eq('school_id', profile.school_id)
            .eq('role', 'lecturer')
            .eq('status', 'active')
            .order('full_name'),
        ]);
        
        setSemesters(sems.data ?? []);
        setLecturers(lects.data ?? []);
      }
    }

    fetchData();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      // 2. קבלת ה-school_id לצורך יצירת הקורס
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.school_id) throw new Error('לא נמצא שיוך מוסדי');

      const payload: any = {
        name,
        code,
        semester_id: semesterId,
        lecturer_id: lecturerId || null,
        max_students: parseInt(maxStudents),
        school_id: profile.school_id // הזרקת המוסד לכל קורס חדש
      };

      const { error } = editCourse
        ? await supabase.from('courses').update(payload).eq('id', editCourse.id)
        : await supabase.from('courses').insert(payload);

      if (error) throw error;

      toast.success(editCourse ? 'הקורס עודכן' : 'הקורס נוצר בהצלחה בבית ספר פדרמן');
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error('שגיאה בשמירת הקורס: ' + error.message);
    } finally {
      setLoading(false);
    }
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
                placeholder="מבוא למדיניות ציבורית"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>קוד קורס</Label>
              <Input
                placeholder="FED101"
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