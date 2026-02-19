import * as XLSX from 'xlsx';
import type { Attendance } from './supabase/types';

export interface AttendanceExportRow {
  שם: string;
  'מספר סטודנט': string;
  קורס: string;
  שיעור: string;
  תאריך: string;
  'זמן רישום': string;
  נוכחות: string;
  'מרחק (מטרים)': string;
}

export function exportAttendanceToExcel(
  attendance: Attendance[],
  fileName: string = 'דוח_נוכחות'
) {
  const rows: AttendanceExportRow[] = attendance.map((record) => ({
    שם: record.profiles?.full_name ?? '',
    'מספר סטודנט': record.profiles?.student_id ?? '',
    קורס: record.lessons?.courses?.name ?? '',
    שיעור: record.lessons?.location_name ?? '',
    תאריך: record.lessons?.scheduled_at
      ? new Date(record.lessons.scheduled_at).toLocaleDateString('he-IL')
      : '',
    'זמן רישום': record.checked_in_at
      ? new Date(record.checked_in_at).toLocaleTimeString('he-IL')
      : '',
    נוכחות: record.status === 'present' ? 'נוכח/ת' : 'איחור',
    'מרחק (מטרים)': record.distance_meters?.toFixed(1) ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'נוכחות');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // שם
    { wch: 15 }, // מספר סטודנט
    { wch: 25 }, // קורס
    { wch: 20 }, // שיעור
    { wch: 12 }, // תאריך
    { wch: 12 }, // זמן רישום
    { wch: 10 }, // נוכחות
    { wch: 15 }, // מרחק
  ];

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportAttendanceToCsv(
  attendance: Attendance[],
  fileName: string = 'דוח_נוכחות'
) {
  const rows: AttendanceExportRow[] = attendance.map((record) => ({
    שם: record.profiles?.full_name ?? '',
    'מספר סטודנט': record.profiles?.student_id ?? '',
    קורס: record.lessons?.courses?.name ?? '',
    שיעור: record.lessons?.location_name ?? '',
    תאריך: record.lessons?.scheduled_at
      ? new Date(record.lessons.scheduled_at).toLocaleDateString('he-IL')
      : '',
    'זמן רישום': record.checked_in_at
      ? new Date(record.checked_in_at).toLocaleTimeString('he-IL')
      : '',
    נוכחות: record.status === 'present' ? 'נוכח/ת' : 'איחור',
    'מרחק (מטרים)': record.distance_meters?.toFixed(1) ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.csv`;
  link.click();
}
