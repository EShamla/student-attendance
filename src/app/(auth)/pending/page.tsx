'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

export default function PendingPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-amber-100 p-4 rounded-full">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-xl">בקשתך בבדיקה</CardTitle>
            <CardDescription className="text-base">
              הרשמתך התקבלה בהצלחה
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              חשבונך ממתין לאישור המזכירות האקדמית.
              תקבל הודעה באימייל עם אישור הגישה.
            </p>
            <p className="text-sm text-gray-500">
              לשאלות, פנה ישירות למזכירות המחלקה.
            </p>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="ml-2 h-4 w-4" />
              יציאה
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
