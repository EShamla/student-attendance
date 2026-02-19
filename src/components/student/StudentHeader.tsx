'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { GraduationCap, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentHeader({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('יצאת מהמערכת');
    router.push('/login');
  }

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-10">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-1.5 rounded-lg">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">מערכת נוכחות</p>
            <p className="text-xs text-gray-500 mt-0.5">{userName}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
