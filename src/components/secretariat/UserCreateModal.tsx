'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // הוספת ייבוא הסופאבייס
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import type { UserRole } from '@/lib/supabase/types';

interface UserCreateModalProps {
  onSuccess: () => void;
}

export default function UserCreateModal({ onSuccess }: UserCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. שליפת המוסד של המשתמש המבצע את הפעולה (המזכירות)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.school_id) {
        throw new Error('לא נמצא שיוך מוסדי למשתמש המחובר');
      }

      // 2. שליחת המידע יחד עם ה-schoolId ל-API
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullName, 
          email, 
          role, 
          studentId: studentId || null, 
          password,
          schoolId: profile.school_id // הזרקת המזהה של בית ספר פדרמן
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error('שגיאה ביצירת משתמש: ' + (data.error ?? 'שגיאה לא ידועה'));
      } else {
        toast.success('המשתמש נוצר בהצלחה ומשויך למוסד הרלוונטי');
        setOpen(false);
        setFullName(''); setEmail(''); setStudentId(''); setPassword('');
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בתהליך יצירת המשתמש');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="ml-2 h-4 w-4" />
          הוסף משתמש ידנית
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת משתמש חדש בבית ספר פדרמן</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input
              placeholder="ישראל ישראלי"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>אימייל</Label>
            <Input
              type="email"
              placeholder="user@university.ac.il"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              className="text-right"
            />
          </div>
          <div className="space-y-2">
            <Label>תפקיד</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">סטודנט</SelectItem>
                <SelectItem value="lecturer">מרצה</SelectItem>
                <SelectItem value="secretariat">מזכירות</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === 'student' && (
            <div className="space-y-2">
              <Label>מספר סטודנט</Label>
              <Input
                placeholder="123456789"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                dir="ltr"
                className="text-right"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>סיסמה ראשונית</Label>
            <Input
              type="password"
              placeholder="לפחות 6 תווים"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              dir="ltr"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              צור משתמש
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}