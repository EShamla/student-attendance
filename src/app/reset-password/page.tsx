'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { GraduationCap, Loader2, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false); // האם יש סשן תקף

  // Supabase שולח את הטוקן ב-URL hash — ממתינים עד שה-SSR client יקלוט אותו
  useEffect(() => {
    const supabase = createClient();

    // האזנה לשינוי סשן שנוצר מהלינק
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // בדיקה ישירה — אם כבר יש סשן (לאחר ניווט חוזר)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }
    if (password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error('שגיאה בעדכון הסיסמה: ' + error.message);
    } else {
      toast.success('הסיסמה עודכנה בהצלחה!');
      await supabase.auth.signOut();
      router.push('/login');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-full mb-3">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">מערכת נוכחות</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-center mb-2">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <CardTitle className="text-center">הגדרת סיסמה חדשה</CardTitle>
            <CardDescription className="text-center">
              {ready
                ? 'הזן את הסיסמה החדשה שלך'
                : 'מאמת את הקישור, אנא המתן...'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!ready ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">סיסמה חדשה</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="לפחות 6 תווים"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">אימות סיסמה</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="הזן שוב את הסיסמה"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  עדכן סיסמה
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
