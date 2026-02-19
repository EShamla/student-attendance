'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { GraduationCap, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error('שגיאה בהתחברות: ' + (error.message === 'Invalid login credentials'
        ? 'אימייל או סיסמה שגויים'
        : error.message));
      setLoading(false);
      return;
    }

    // Fetch profile to determine redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.status === 'pending' || !profile.role) {
      router.push('/pending');
    } else if (profile.role === 'secretariat') {
      router.push('/secretariat/dashboard');
    } else if (profile.role === 'lecturer') {
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
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                התחבר
              </Button>
            </form>

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
