'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import type { Semester } from '@/lib/supabase/types';

interface SemesterFormProps {
  onSuccess: () => void;
  editSemester?: Semester;
}

export default function SemesterForm({ onSuccess, editSemester }: SemesterFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(editSemester?.name ?? '');
  const [startDate, setStartDate] = useState(editSemester?.start_date ?? '');
  const [endDate, setEndDate] = useState(editSemester?.end_date ?? '');
  const [isActive, setIsActive] = useState(editSemester?.is_active ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. שליפת המוסד של המשתמש המחובר
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.school_id) {
        throw new Error('לא נמצא שיוך מוסדי למשתמש המחובר');
      }

      // 2. הכנת הנתונים כולל ה-school_id
      const payload: any = { 
        name, 
        start_date: startDate, 
        end_date: endDate, 
        is_active: isActive,
        school_id: profile.school_id // הזרקת זהות המוסד
      };

      const { error } = editSemester
        ? await supabase.from('semesters').update(payload).eq('id', editSemester.id)
        : await supabase.from('semesters').insert(payload);

      if (error) throw error;

      toast.success(editSemester ? 'הסמסטר עודכן' : 'הסמסטר נוצר בהצלחה בבית ספר פדרמן');
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error('שגיאה בשמירת הסמסטר: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          {editSemester ? 'ערוך סמסטר' : 'סמסטר חדש'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editSemester ? 'עריכת סמסטר' : 'יצירת סמסטר חדש לפדרמן'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>שם הסמסטר</Label>
            <Input
              placeholder='סמסטר א׳ תשפ״ה'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>תאריך התחלה</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>תאריך סיום</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isActive">סמסטר פעיל</Label>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              שמור סמסטר
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}