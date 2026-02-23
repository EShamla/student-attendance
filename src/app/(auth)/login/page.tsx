'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { GraduationCap, Loader2, Mail, KeyRound } from 'lucide-react';
import Link from 'next/link';

type LoginMode = 'password' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('password');
  const [otpSent, setOtpSent] = useState(false);

  // ── התחברות עם סיסמה ──────────────────────────────────────────────────────
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'אימייל או סיסמה שגויים'
          : 'שגיאה בהתחברות: ' + error.message
      );
      setLoading(false);
      return;
    }

    await redirectAfterLogin(supabase);
  }

  // ── שליחת Magic Link / OTP ────────────────────────────────────────────────
  async function handleOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // רק משתמשים קיימים
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      toast.error('שגיאה בשליחת הקישור: ' + error.message);
    } else {
      setOtpSent(true);
      toast.success('קישור כניסה נשלח לאימייל שלך!');
    }
    setLoading(false);
  }

  // ── שכחתי סיסמה ──────────────────────────────────────────────────────────
  async function handleForgotPassword() {
    if (!email) {
      toast.error('הזן תחילה את כתובת האימייל שלך');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error('שגיאה בשליחת הקישור: ' + error.message);
    } else {
      toast.success('קישור לאיפוס סיסמה נשלח לאימייל שלך');
    }
    setLoading(false);
  }

  // ── ניתוב לפי תפקיד לאחר כניסה מוצלחת ───────────────────────────────────
  async function redirectAfterLogin(supabase: ReturnType<typeof createClient>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    const metaRole = user.user_metadata?.role as string | undefined;
    const effectiveRole = profile?.role ?? metaRole;

    if (!profile || profile.status === 'pending' || !effectiveRole) {
      router.push('/pending');
    } else if (effectiveRole === 'admin') {
      router.push('/admin/dashboard');
    } else if (effectiveRole === 'lecturer') {
      router.push('/lecturer/dashboard');
    } else {
      router.push('/student/dashboard');
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-full mb-3">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">מערכת נוכחות</h1>
          <p className="text-gray-500 text-sm mt-1">ניהול נוכחות אקדמית עם GPS</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>התחברות</CardTitle>
            <CardDescription>הזן את פרטי הגישה שלך</CardDescription>

            {/* Toggle סוג כניסה */}
            <div className="flex gap-2 mt-3 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => { setMode('password'); setOtpSent(false); }}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === 'password' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <KeyRound className="h-4 w-4" />
                סיסמה
              </button>
              <button
                type="button"
                onClick={() => { setMode('otp'); setOtpSent(false); }}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === 'otp' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="h-4 w-4" />
                קישור למייל
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {/* ── מצב: OTP נשלח ── */}
            {mode === 'otp' && otpSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <Mail className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">קישור נשלח לאימייל שלך</p>
                  <p className="text-sm text-green-600 mt-1" dir="ltr">{email}</p>
                </div>
                <p className="text-sm text-gray-500">לחץ על הקישור במייל להיכנס למערכת</p>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  שלח שוב
                </button>
              </div>
            ) : (
              <form onSubmit={mode === 'password' ? handlePasswordLogin : handleOtpLogin} className="space-y-4">
                {/* שדה אימייל — משותף לשני המצבים */}
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@university.ac.il"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="text-right"
                  />
                </div>

                {/* שדה סיסמה — רק במצב password */}
                {mode === 'password' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">סיסמה</Label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={loading}
                        className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                      >
                        שכחתי סיסמה
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      dir="ltr"
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  {mode === 'password' ? 'התחבר' : 'שלח קישור כניסה'}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center text-sm text-gray-600">
              סטודנט חדש?{' '}
              <Link href="/register" className="text-indigo-600 hover:underline font-medium">
                הרשמה
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
