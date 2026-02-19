'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Profile, UserRole, UserStatus } from '@/lib/supabase/types';

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'סטודנט',
  lecturer: 'מרצה',
  secretariat: 'מזכירות',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'פעיל',
  pending: 'ממתין',
  suspended: 'מושהה',
};

interface UserEditModalProps {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function UserEditModal({ user, open, onOpenChange, onSuccess }: UserEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');

  useEffect(() => {
    if (user && open) {
      setFullName(user.full_name ?? '');
      setEmail(user.email ?? '');
      setRole((user.role as UserRole) ?? '');
      setStatus(user.status ?? '');
    }
  }, [user, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fullName: fullName.trim() || undefined,
          email: email.trim() || undefined,
          role: role || undefined,
          status: status || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('שגיאה בעדכון: ' + (data.error ?? 'שגיאה לא ידועה'));
      } else {
        toast.success('המשתמש עודכן בהצלחה');
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת משתמש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ישראל ישראלי"
            />
          </div>
          <div className="space-y-2">
            <Label>אימייל</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="text-right"
            />
          </div>
          <div className="space-y-2">
            <Label>תפקיד</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר תפקיד" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">{ROLE_LABELS.student}</SelectItem>
                <SelectItem value="lecturer">{ROLE_LABELS.lecturer}</SelectItem>
                <SelectItem value="secretariat">{ROLE_LABELS.secretariat}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>סטטוס</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as UserStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{STATUS_LABELS.active}</SelectItem>
                <SelectItem value="pending">{STATUS_LABELS.pending}</SelectItem>
                <SelectItem value="suspended">{STATUS_LABELS.suspended}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
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
