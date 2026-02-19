'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Attendance } from '@/lib/supabase/types';

export function useRealtimeAttendance(lessonId: string) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase
      .from('attendance')
      .select('*, profiles(id, full_name, student_id, email)')
      .eq('lesson_id', lessonId)
      .order('checked_in_at', { ascending: true })
      .then(({ data }) => {
        if (data) setAttendance(data as Attendance[]);
        setLoading(false);
      });

    // Real-time subscription
    const channel = supabase
      .channel(`attendance:lesson:${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `lesson_id=eq.${lessonId}`,
        },
        async (payload) => {
          // Fetch the new record with joined profile data
          const { data } = await supabase
            .from('attendance')
            .select('*, profiles(id, full_name, student_id, email)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setAttendance((prev) => [...prev, data as Attendance]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId]);

  return { attendance, loading };
}
