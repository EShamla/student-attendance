'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUserAndRedirect() {
      const supabase = createClient();
      
      // 1. בדיקה אם יש סשן פעיל (האם המשתמש מחובר)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // 2. שליפת הנתונים הכי עדכניים מה-DB (מתעלם מה-Cache הישן)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        router.push('/login');
        return;
      }

      // 3. ניתוב חכם לפי הסטטוס והתפקיד המעודכנים
      if (profile.status !== 'active') {
        router.push('/pending'); // הדף שראית בצילום המסך
      } else {
        // ניתוב לדאשבורד המתאים לפי התפקיד
        if (profile.role === 'secretariat') {
          router.push('/secretariat');
        } else if (profile.role === 'lecturer') {
          router.push('/lecturer');
        } else {
          router.push('/student');
        }
      }
      setLoading(false);
    }

    checkUserAndRedirect();
  }, [router]);

  // מסך טעינה קצר בזמן שהמערכת מוודאת את ההרשאות שלך
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-gray-500">בודק הרשאות כניסה...</p>
      </div>
    </div>
  );
}