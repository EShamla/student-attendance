'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

// מיפוי כותרות עברית/אנגלית לשדות פנימיים
const HEADER_MAP: Record<string, string> = {
  "שם_מלא": "full_name",
  "שם מלא": "full_name",
  "שם": "full_name",
  "אימייל": "email",
  "מייל": "email",
  "תפקיד": "role",
  "מספר_סטודנט": "student_id",
  "מספר סטודנט": "student_id",
  "full_name": "full_name",
  "email": "email",
  "role": "role",
  "student_id": "student_id"
};

// מיפוי ערכי תפקיד עברית → אנגלית
const ROLE_MAP: Record<string, string> = {
  "סטודנט": "student",
  "תלמיד": "student",
  "מרצה": "lecturer",
  "מורה": "lecturer",
  "מדריך": "lecturer",
  "מנהל": "admin",
  "מזכירות": "admin",
  "מזכיר": "admin",
  "מזכירה": "admin",
  "אדמין": "admin",
  "student": "student",
  "lecturer": "lecturer",
  "admin": "admin"
};

interface CsvRow { full_name: string; email: string; student_id: string; role?: string; }
interface ImportResult { email: string; success: boolean; status?: 'already_exists'; error?: string; }
interface CsvUploadModalProps { onSuccess: () => void; }

function normalizeRow(raw: Record<string, string>): CsvRow {
  const row: Partial<Record<string, string>> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mk = HEADER_MAP[key.trim()]; if (!mk) continue;
    const v = String(value ?? '').trim();
    row[mk] = mk === 'role' ? (ROLE_MAP[v] ?? v.toLowerCase()) : v;
  }
  return { full_name: row.full_name ?? '', email: row.email ?? '', student_id: row.student_id ?? '', role: row.role };
}

export default function CsvUploadModal({ onSuccess }: CsvUploadModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [fullData, setFullData] = useState<CsvRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const supabase = createClient();

  const parseFile = useCallback((file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const normalized = result.data.map(normalizeRow);
        setFullData(normalized); setPreview(normalized.slice(0, 5)); setResults([]);
      },
      error: () => toast.error('שגיאה בקריאת הקובץ'),
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) parseFile(file);
    else toast.error('יש להעלות קובץ CSV');
  }
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) parseFile(file);
  }

  async function handleImport() {
    if (!fullData.length) { toast.error('אין נתונים לייבא'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile, error: pe } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();
      if (pe || !profile?.school_id) throw new Error('לא נמצא שיוך מוסדי');
      const payload = fullData.map(u => ({ ...u, school_id: profile.school_id, role: u.role || 'student' }));
      const res = await fetch('/api/admin/users/csv', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ users: payload }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error('שגיאה: ' + (data.error ?? '')); }
      else {
        const rs = data.results as ImportResult[];
        setResults(rs);
        const ok = rs.filter(r => r.success).length;
        const ex = rs.filter(r => r.status === 'already_exists').length;
        const fail = rs.filter(r => !r.success && r.status !== 'already_exists').length;
        if (ok) toast.success(ok + ' משתמשים יובאו בהצלחה');
        if (ex) toast.warning(ex + ' משתמשים כבר קיימים — דולגו');
        if (fail) toast.error(fail + ' שגיאות בייבוא');
        onSuccess();
      }
    } catch (err) { toast.error((err instanceof Error ? err.message : null) || 'שגיאה'); }
    finally { setLoading(false); }
  }

  const dragClass = dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="ml-2 h-4 w-4" />ייבוא CSV</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader><DialogTitle>ייבוא סטודנטים מ-CSV</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">כותרות נתמכות (עברית ואנגלית):</p>
            <div className="grid grid-cols-2 gap-x-4 text-xs">
              <code dir="ltr">full_name / שם_מלא</code><code dir="ltr">email / אימייל</code>
              <code dir="ltr">student_id / מספר_סטודנט</code><code dir="ltr">role / תפקיד</code>
            </div>
            <p className="mt-1 text-xs">תפקיד: סטודנט, מרצה, מנהל / student, lecturer, admin</p>
          </div>

          <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            className={"border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer " + dragClass}>
            <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">גרור קובץ CSV לכאן</p>
            <p className="text-gray-400 text-sm mb-3">או</p>
            <label className="cursor-pointer">
              <span className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">בחר קובץ</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
            </label>
          </div>

          {preview.length > 0 && (
            <div>
              <p className="font-medium text-sm mb-2">תצוגה מקדימה (5 שורות מתוך {fullData.length}):</p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="text-sm w-full">
                  <thead className="bg-gray-50"><tr>
                    <th className="p-2 text-right">שם</th><th className="p-2 text-right">אימייל</th>
                    <th className="p-2 text-right">מספר סטודנט</th><th className="p-2 text-right">תפקיד</th>
                  </tr></thead>
                  <tbody>{preview.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{row.full_name}</td>
                      <td className="p-2 text-gray-600" dir="ltr">{row.email}</td>
                      <td className="p-2">{row.student_id || '—'}</td>
                      <td className="p-2"><Badge variant="outline">{row.role ?? 'student'}</Badge></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
              <p className="font-medium text-sm">תוצאות ייבוא:</p>
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.success ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    : r.status === 'already_exists' ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  <span dir="ltr">{r.email}</span>
                  {r.status === 'already_exists' && <span className="text-amber-600">קיים — דולג</span>}
                  {r.error && r.status !== 'already_exists' && <span className="text-red-500">{r.error}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>סגור</Button>
            <Button onClick={handleImport} disabled={loading || !fullData.length}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              ייבא {fullData.length > 0 ? fullData.length + ' משתמשים' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
