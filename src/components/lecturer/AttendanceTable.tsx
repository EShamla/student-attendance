'use client';

import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';

interface AttendanceTableProps {
  lessonId: string;
  totalEnrolled: number;
}

export default function AttendanceTable({ lessonId, totalEnrolled }: AttendanceTableProps) {
  const { attendance, loading } = useRealtimeAttendance(lessonId);

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount = attendance.filter((a) => a.status === 'late').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="mr-2 text-gray-500">טוען נתוני נוכחות...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live counter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">שידור חי</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-600 font-bold">{presentCount} נוכחים</span>
          {lateCount > 0 && <span className="text-amber-600 font-bold">{lateCount} באיחור</span>}
          <span className="text-gray-400">מתוך {totalEnrolled} רשומים</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: totalEnrolled > 0 ? `${((presentCount + lateCount) / totalEnrolled) * 100}%` : '0%' }}
        />
      </div>

      {/* Table */}
      {attendance.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">ממתין לרישום נוכחות...</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right font-medium">#</th>
                <th className="p-3 text-right font-medium">שם סטודנט</th>
                <th className="p-3 text-right font-medium">מספר סטודנט</th>
                <th className="p-3 text-right font-medium">זמן רישום</th>
                <th className="p-3 text-right font-medium">סטטוס</th>
                <th className="p-3 text-right font-medium">מרחק</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record, index) => (
                <tr key={record.id} className="border-t">
                  <td className="p-3 text-gray-400">{index + 1}</td>
                  <td className="p-3 font-medium">{record.profiles?.full_name}</td>
                  <td className="p-3 text-gray-600">{record.profiles?.student_id ?? '—'}</td>
                  <td className="p-3 text-gray-600">
                    {new Date(record.checked_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-3">
                    <Badge className={record.status === 'present' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                      {record.status === 'present' ? 'נוכח/ת' : 'איחור'}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-500 text-xs font-mono">
                    {record.distance_meters != null ? `${record.distance_meters.toFixed(0)}מ` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
