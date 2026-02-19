'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Download, BarChart3, FileSpreadsheet } from 'lucide-react';
import type { Course, Lesson, Attendance, Semester } from '@/lib/supabase/types';

export default function ReportsPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('semesters').select('*').order('start_date', { ascending: false })
      .then(({ data }) => setSemesters(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedSemester) return;
    const supabase = createClient();
    supabase.from('courses').select('*').eq('semester_id', selectedSemester).order('name')
      .then(({ data }) => { setCourses(data ?? []); setSelectedCourse(''); setSelectedLesson('all'); });
  }, [selectedSemester]);

  useEffect(() => {
    if (!selectedCourse) return;
    const supabase = createClient();
    supabase.from('lessons').select('*').eq('course_id', selectedCourse).order('scheduled_at', { ascending: false })
      .then(({ data }) => { setLessons(data ?? []); setSelectedLesson('all'); });
  }, [selectedCourse]);

  const fetchAttendance = useCallback(async () => {
    if (!selectedCourse) return;
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('attendance')
      .select('*, profiles(id, full_name, student_id, email), lessons(id, scheduled_at, location_name, duration_minutes, courses(name, code))')
      .order('checked_in_at');

    if (selectedLesson && selectedLesson !== 'all') {
      query = query.eq('lesson_id', selectedLesson);
    } else {
      // Filter by course via lessons
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length > 0) {
        query = query.in('lesson_id', lessonIds);
      }
    }

    const { data, error } = await query;
    if (error) {
      toast.error('שגיאה בטעינת נתונים: ' + error.message);
    } else {
      setAttendance(data ?? []);
    }
    setLoading(false);
  }, [selectedCourse, selectedLesson, lessons]);

  async function handleExportExcel() {
    if (attendance.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }
    const { exportAttendanceToExcel } = await import('@/lib/export');
    exportAttendanceToExcel(attendance as Attendance[], 'דוח_נוכחות');
    toast.success('הקובץ הורד בהצלחה');
  }

  async function handleExportCsv() {
    if (attendance.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }
    const { exportAttendanceToCsv } = await import('@/lib/export');
    exportAttendanceToCsv(attendance as Attendance[], 'דוח_נוכחות');
    toast.success('הקובץ הורד בהצלחה');
  }

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount = attendance.filter((a) => a.status === 'late').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">דוחות נוכחות</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>סינון</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>סמסטר</Label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger><SelectValue placeholder="בחר סמסטר" /></SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>קורס</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={!selectedSemester}>
                <SelectTrigger><SelectValue placeholder="בחר קורס" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>שיעור</Label>
              <Select value={selectedLesson} onValueChange={setSelectedLesson} disabled={!selectedCourse}>
                <SelectTrigger><SelectValue placeholder="כל השיעורים" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל השיעורים</SelectItem>
                  {lessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {new Date(l.scheduled_at).toLocaleDateString('he-IL')} — {l.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-4" onClick={fetchAttendance} disabled={!selectedCourse || loading}>
            {loading ? 'טוען...' : 'הצג דוח'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {attendance.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-green-600">{presentCount}</p>
                <p className="text-sm text-gray-500 mt-1">נוכחים</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-amber-600">{lateCount}</p>
                <p className="text-sm text-gray-500 mt-1">באיחור</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold">{attendance.length}</p>
                <p className="text-sm text-gray-500 mt-1">סה״כ רשומות</p>
              </CardContent>
            </Card>
          </div>

          {/* Export buttons */}
          <div className="flex gap-3">
            <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700">
              <FileSpreadsheet className="ml-2 h-4 w-4" />
              ייצוא Excel
            </Button>
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="ml-2 h-4 w-4" />
              ייצוא CSV
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-right font-medium">שם</th>
                      <th className="p-3 text-right font-medium">מספר סטודנט</th>
                      <th className="p-3 text-right font-medium">שיעור</th>
                      <th className="p-3 text-right font-medium">זמן רישום</th>
                      <th className="p-3 text-right font-medium">נוכחות</th>
                      <th className="p-3 text-right font-medium">מרחק</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{record.profiles?.full_name}</td>
                        <td className="p-3">{record.profiles?.student_id ?? '—'}</td>
                        <td className="p-3 text-gray-600">
                          {record.lessons?.location_name}<br />
                          <span className="text-xs">{record.lessons?.scheduled_at && new Date(record.lessons.scheduled_at).toLocaleDateString('he-IL')}</span>
                        </td>
                        <td className="p-3">
                          {new Date(record.checked_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {record.status === 'present' ? 'נוכח/ת' : 'איחור'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">
                          {record.distance_meters != null ? `${record.distance_meters.toFixed(0)}מ` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
