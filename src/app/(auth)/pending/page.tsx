'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';

  const [checking, setChecking] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // בדוק אם המשתמש מחובר בכלל
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkSession();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  // רענן סשן ובדוק סטטוס עדכני מה-DB
  async function handleRefreshStatus() {
    setChecking(true);
    const supabase = createClient();

    try {
      // רענן את הטוקן תחילה
      await supabase.auth.refreshSession();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single();

      if (profile?.status === 'active' && profile?.role) {
        toast.success('חשבונך אושר! מעביר אותך...');
        if (profile.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (profile.role === 'lecturer') {
          router.push('/lecturer/dashboard');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        toast.info('חשבונך עדיין ממתין לאישור המזכירות');
      }
    } catch {
      toast.error('שגיאה בבדיקת הסטטוס');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Card className="border-amber-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-amber-100 p-4 rounded-full">
                {justRegistered
                  ? <CheckCircle className="h-10 w-10 text-green-600" />
                  : <Clock className="h-10 w-10 text-amber-600" />
                }
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-amber-900">
              {justRegistered ? 'בקשתך התקבלה!' : 'בקשתך בבדיקה'}
            </CardTitle>
            <CardDescription className="text-base text-amber-800">
              {justRegistered
                ? 'הרשמתך נקלטה בהצלחה במערכת הנוכחות'
                : 'הרשמתך למערכת הנוכחות התקבלה בהצלחה'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-gray-700">
                חשבונך ממתין לאישור המזכירות האקדמית.
              </p>
              {justRegistered ? (
                <p className="text-sm text-gray-500">
                  לאחר שהמזכירות תאשר את בקשתך, תקבל הודעה ותוכל להתחבר למערכת.
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  אם המזכירות כבר אישרה את חשבונך, לחץ על <strong>רענן סטטוס</strong>.
                </p>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-amber-100">
              {/* כפתור רענון — רלוונטי רק למשתמשים מחוברים */}
              {isLoggedIn && (
                <Button
                  onClick={handleRefreshStatus}
                  disabled={checking}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {checking
                    ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    : <RefreshCw className="ml-2 h-4 w-4" />
                  }
                  {checking ? 'בודק...' : 'רענן סטטוס'}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={isLoggedIn ? handleSignOut : () => router.push('/login')}
                className="w-full border-amber-300 text-amber-900 hover:bg-amber-50 hover:text-amber-950 transition-colors"
              >
                <LogOut className="ml-2 h-4 w-4" />
                {isLoggedIn ? 'יציאה מהמערכת' : 'חזרה להתחברות'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
