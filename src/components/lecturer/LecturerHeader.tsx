'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { GraduationCap, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LecturerHeader({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('יצאת מהמערכת');
    router.push('/login');
  }

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-bold text-sm">מערכת נוכחות — מרצה</p>
            <p className="text-xs text-gray-500">{userName}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 ml-1" />
          יציאה
        </Button>
      </div>
    </header>
  );
}
