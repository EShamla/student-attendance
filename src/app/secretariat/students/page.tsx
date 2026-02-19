'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, GraduationCap, Search } from 'lucide-react';
import UserCreateModal from '@/components/secretariat/UserCreateModal';
import CsvUploadModal from '@/components/secretariat/CsvUploadModal';
import type { Profile } from '@/lib/supabase/types';

const ROLE_LABELS: Record<string, string> = {
  student: 'סטודנט',
  lecturer: 'מרצה',
  secretariat: 'מזכירות',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  pending: 'ממתין',
  suspended: 'מושהה',
};

export default function StudentsPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setFiltered(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.student_id ?? '').includes(q)
      )
    );
  }, [search, users]);

  async function handleDelete(id: string) {
    if (!confirm('למחוק משתמש זה? פעולה זו אינה הפיכה.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      toast.error('שגיאה במחיקה: ' + error.message);
    } else {
      toast.success('המשתמש נמחק');
      fetchUsers();
    }
  }

  async function handleToggleStatus(user: Profile) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', user.id);
    if (error) {
      toast.error('שגיאה בעדכון סטטוס');
    } else {
      toast.success(newStatus === 'active' ? 'המשתמש הופעל' : 'המשתמש הושהה');
      fetchUsers();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">משתמשים</h1>
        <div className="flex gap-2">
          <CsvUploadModal onSuccess={fetchUsers} />
          <UserCreateModal onSuccess={fetchUsers} />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="חיפוש לפי שם, אימייל, מספר סטודנט..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>כל המשתמשים ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-6">טוען...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">לא נמצאו משתמשים</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-right font-medium">שם מלא</th>
                    <th className="p-3 text-right font-medium">אימייל</th>
                    <th className="p-3 text-right font-medium">מספר סטודנט</th>
                    <th className="p-3 text-right font-medium">תפקיד</th>
                    <th className="p-3 text-right font-medium">סטטוס</th>
                    <th className="p-3 text-right font-medium">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{user.full_name || '—'}</td>
                      <td className="p-3 text-gray-600" dir="ltr">{user.email}</td>
                      <td className="p-3">{user.student_id || '—'}</td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {user.role ? ROLE_LABELS[user.role] : 'לא הוגדר'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={`${STATUS_STYLES[user.status]} hover:${STATUS_STYLES[user.status]}`}>
                          {STATUS_LABELS[user.status]}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            className="text-xs"
                          >
                            {user.status === 'active' ? 'השהה' : 'הפעל'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
