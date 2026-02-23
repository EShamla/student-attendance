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

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          student_id: studentId,
          role: null,
          status: 'pending',
        },
      },
    });

    if (error) {
      // משתמש כבר קיים
      if (error.message?.toLowerCase().includes('already registered') || error.message?.includes('already been registered')) {
        toast.error('כתובת המייל הזו כבר רשומה במערכת. נסה להתחבר או לאפס סיסמה.');
      } else {
        toast.error('שגיאה בהרשמה: ' + error.message);
      }
      setLoading(false);
      return;
    }

    // ניתוק מיידי — המשתמש לא אמור להיות מחובר עד שהמזכירות תאשר
    await supabase.auth.signOut();

    toast.success('הבקשה נקלטה בהצלחה!');
    // העבר למסך המתנה עם פרמטר שמציין שזו הרשמה חדשה
    router.push('/pending?registered=true');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-full mb-3">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">מערכת נוכחות</h1>
          <p className="text-gray-500 text-sm mt-1">הרשמה לסטודנטים חדשים</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>הרשמה</CardTitle>
            <CardDescription>
              לאחר ההרשמה, בקשתך תועבר לאישור המזכירות. תוכל להתחבר רק לאחר האישור.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">שם מלא</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="ישראל ישראלי"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">מספר סטודנט</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="123456789"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
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
                  placeholder="לפחות 6 תווים"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                הירשם
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
              כבר יש לך חשבון?{' '}
              <Link href="/login" className="text-indigo-600 hover:underline font-medium">
                התחברות
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
