'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, GraduationCap, Search, Pencil } from 'lucide-react';
import UserCreateModal from '@/components/secretariat/UserCreateModal';
import UserEditModal from '@/components/secretariat/UserEditModal';
import CsvUploadModal from '@/components/secretariat/CsvUploadModal';
import BulkAssignModal from '@/components/secretariat/BulkAssignModal';
import type { Profile } from '@/lib/supabase/types';
import { ROLE_LABELS, ROLE_STYLES, STATUS_LABELS, STATUS_STYLES } from '@/lib/constants';

export default function StudentsPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  // ── Multi-select state ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setIsAdmin(profile?.role === 'admin');
    }
    checkAdmin();
  }, []);

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
    // אפס בחירה בעת חיפוש
    setSelectedIds(new Set());
  }, [search, users]);

  // ── Checkbox helpers ────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((u) => u.id)));
    }
  }

  const selectedStudents = filtered
    .filter((u) => selectedIds.has(u.id))
    .map((u) => ({ id: u.id, full_name: u.full_name }));

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
    const res = await fetch('/api/admin/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error('שגיאה בעדכון סטטוס: ' + (data.error ?? ''));
    } else {
      toast.success(newStatus === 'active' ? 'המשתמש הופעל' : 'המשתמש הושהה');
      fetchUsers();
    }
  }

  const allChecked = filtered.length > 0 && selectedIds.size === filtered.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">משתמשים</h1>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <BulkAssignModal selectedStudents={selectedStudents} onSuccess={fetchUsers} />
          )}
          <CsvUploadModal onSuccess={fetchUsers} />
          <UserCreateModal onSuccess={fetchUsers} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="חיפוש לפי שם, אימייל, מספר סטודנט..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-800 flex items-center justify-between">
          <span>{selectedIds.size} משתמשים נבחרו</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-indigo-600 hover:underline text-xs">
            נקה בחירה
          </button>
        </div>
      )}

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
                    {isAdmin && (
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => { if (el) el.indeterminate = someChecked; }}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                          title="בחר הכל"
                        />
                      </th>
                    )}
                    <th className="p-3 text-right font-medium">שם מלא</th>
                    <th className="p-3 text-right font-medium">אימייל</th>
                    <th className="p-3 text-right font-medium">מספר סטודנט</th>
                    <th className="p-3 text-right font-medium">תפקיד</th>
                    <th className="p-3 text-right font-medium">סטטוס</th>
                    {isAdmin && (
                      <th className="p-3 text-right font-medium">פעולות</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b hover:bg-gray-50 ${selectedIds.has(user.id) ? 'bg-indigo-50' : ''}`}
                    >
                      {isAdmin && (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                          />
                        </td>
                      )}
                      <td className="p-3 font-medium">{user.full_name || '—'}</td>
                      <td className="p-3 text-gray-600" dir="ltr">{user.email}</td>
                      <td className="p-3">{user.student_id || '—'}</td>
                      <td className="p-3">
                        <Badge className={user.role ? ROLE_STYLES[user.role] : ''} variant={user.role ? 'default' : 'outline'}>
                          {user.role ? (ROLE_LABELS[user.role] ?? user.role) : 'לא הוגדר'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={STATUS_STYLES[user.status]}>
                          {STATUS_LABELS[user.status]}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="p-3">
                          <div className="flex gap-1 items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditUser(user); setEditModalOpen(true); }}
                              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              title="עריכה"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserEditModal
        user={editUser}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
