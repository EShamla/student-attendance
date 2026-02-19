'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck } from 'lucide-react';
import ApprovalsTable from '@/components/secretariat/ApprovalsTable';
import type { Profile } from '@/lib/supabase/types';

export default function ApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setPendingUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">אישורים</h1>
        {pendingUsers.length > 0 && (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-sm px-2 py-1">
            {pendingUsers.length} ממתינים
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-600" />
            <CardTitle>סטודנטים שנרשמו עצמאית — ממתינים לאישור</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-6">טוען...</p>
          ) : (
            <ApprovalsTable pendingUsers={pendingUsers} onRefresh={fetchPending} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
