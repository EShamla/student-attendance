'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { Profile } from '@/lib/supabase/types';

interface ApprovalsTableProps {
  pendingUsers: Profile[];
  onRefresh: () => void;
}

export default function ApprovalsTable({ pendingUsers, onRefresh }: ApprovalsTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApprove(userId: string) {
    setLoadingId(userId);
    const res = await fetch('/api/admin/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'approve' }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error('שגיאה באישור: ' + (data.error ?? ''));
    } else {
      toast.success('המשתמש אושר בהצלחה');
      onRefresh();
    }
    setLoadingId(null);
  }

  async function handleReject(userId: string) {
    setLoadingId(userId);
    const res = await fetch('/api/admin/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'reject' }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error('שגיאה בדחייה: ' + (data.error ?? ''));
    } else {
      toast.success('המשתמש נדחה');
      onRefresh();
    }
    setLoadingId(null);
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="text-center py-10">
        <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
        <p className="text-gray-500">אין בקשות ממתינות לאישור</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="p-3 text-right font-medium">שם מלא</th>
            <th className="p-3 text-right font-medium">אימייל</th>
            <th className="p-3 text-right font-medium">מספר סטודנט</th>
            <th className="p-3 text-right font-medium">תאריך הרשמה</th>
            <th className="p-3 text-right font-medium">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium">{user.full_name || '—'}</td>
              <td className="p-3 text-gray-600" dir="ltr">{user.email}</td>
              <td className="p-3">{user.student_id || '—'}</td>
              <td className="p-3 text-gray-500">
                {new Date(user.created_at).toLocaleDateString('he-IL')}
              </td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(user.id)}
                    disabled={loadingId === user.id}
                  >
                    {loadingId === user.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <CheckCircle className="h-3 w-3 ml-1" />
                    }
                    אשר
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReject(user.id)}
                    disabled={loadingId === user.id}
                  >
                    {loadingId === user.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <XCircle className="h-3 w-3 ml-1" />
                    }
                    דחה
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
