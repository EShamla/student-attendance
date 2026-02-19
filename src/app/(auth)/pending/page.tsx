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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Card className="border-amber-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-amber-100 p-4 rounded-full">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-amber-900">בקשתך בבדיקה</CardTitle>
            <CardDescription className="text-base text-amber-800">
              הרשמתך למערכת הנוכחות התקבלה בהצלחה
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-gray-700">
                חשבונך ממתין לאישור המזכירות האקדמית של בית ספר פדרמן.
              </p>
              <p className="text-sm text-gray-500">
                ברגע שהגישה תאושר, תוכל להתחבר ולצפות בדאשבורד המזכירות.
              </p>
            </div>

            <div className="pt-4 border-t border-amber-100">
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full border-amber-300 text-amber-900 hover:bg-amber-50 hover:text-amber-950 transition-colors"
              >
                <LogOut className="ml-2 h-4 w-4" />
                יציאה מהמערכת
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}