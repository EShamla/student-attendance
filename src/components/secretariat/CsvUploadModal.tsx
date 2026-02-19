'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client'; // וודא שהנתיב ללקוח הסופאבייס נכון

interface CsvRow {
  full_name: string;
  email: string;
  student_id: string;
  role?: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

interface CsvUploadModalProps {
  onSuccess: () => void;
}

export default function CsvUploadModal({ onSuccess }: CsvUploadModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [fullData, setFullData] = useState<CsvRow[]>([]); // מדינה חדשה לשמירת כל הנתונים
  const [results, setResults] = useState<ImportResult[]>([]);
  const [dragging, setDragging] = useState(false);
  
  const supabase = createClient();

  const parseFile = useCallback((file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setFullData(result.data); // שומר את כל הסטודנטים
        setPreview(result.data.slice(0, 5)); // מציג רק 5 לתצוגה מקדימה
        setResults([]);
      },
      error: () => toast.error('שגיאה בקריאת הקובץ'),
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      parseFile(file);
    } else {
      toast.error('יש להעלות קובץ CSV');
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  async function handleImport() {
    if (fullData.length === 0) {
      toast.error('אין נתונים לייבא');
      return;
    }
    setLoading(true);

    try {
      // 1. שליפת ה-school_id של המשתמש המחובר (לירון/אביבה)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (profileError || !profile?.school_id) {
        throw new Error('לא נמצא שיוך מוסדי למשתמש המחובר');
      }

      // 2. הזרקת ה-school_id לכל הסטודנטים לפני השליחה
      const usersWithSchool = fullData.map(user => ({
        ...user,
        school_id: profile.school_id,
        role: user.role || 'student'
      }));

      const res = await fetch('/api/admin/users/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: usersWithSchool }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error('שגיאה בייבוא: ' + (data.error ?? 'שגיאה לא ידועה'));
      } else {
        setResults(data.results ?? []);
        const successCount = (data.results as ImportResult[]).filter((r) => r.success).length;
        toast.success(`${successCount} משתמשים יובאו בהצלחה לבית ספר פדרמן`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'שגיאה לא צפויה בתהליך');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="ml-2 h-4 w-4" />
          ייבוא CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא סטודנטים מ-CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">פורמט הקובץ הנדרש (כותרות):</p>
            <code dir="ltr" className="block">full_name,email,student_id,role</code>
            <p className="mt-1 text-xs">המערכת תשייך אוטומטית את הסטודנטים למוסד המחובר</p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">גרור קובץ CSV לכאן</p>
            <p className="text-gray-400 text-sm mb-3">או</p>
            <label className="cursor-pointer">
              <span className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                בחר קובץ
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
            </label>
          </div>

          {preview.length > 0 && (
            <div>
              <p className="font-medium text-sm mb-2">תצוגה מקדימה (5 שורות מתוך {fullData.length}):</p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="text-sm w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">שם</th>
                      <th className="p-2 text-right">אימייל</th>
                      <th className="p-2 text-right">מספר סטודנט</th>
                      <th className="p-2 text-right">תפקיד</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.full_name}</td>
                        <td className="p-2 text-gray-600" dir="ltr">{row.email}</td>
                        <td className="p-2">{row.student_id}</td>
                        <td className="p-2">
                          <Badge variant="outline">{row.role ?? 'student'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
              <p className="font-medium text-sm">תוצאות ייבוא:</p>
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.success
                    ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  }
                  <span dir="ltr">{r.email}</span>
                  {r.error && <span className="text-red-500">{r.error}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>סגור</Button>
            <Button onClick={handleImport} disabled={loading || fullData.length === 0}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              ייבא {fullData.length > 0 ? `${fullData.length} משתמשים` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}