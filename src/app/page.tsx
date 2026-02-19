'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function handleRedirect() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // ניתוב מהיר לפי המטא-דאטה שכבר קיים אצלך בדפדפן
      const role = session.user.user_metadata?.role;
      const status = session.user.user_metadata?.status;

      if (status !== 'active') {
        router.push('/pending');
      } else {
        router.push(`/${role || 'student'}`);
      }
    }
    handleRedirect();
  }, [router]);

  return null; // דף מעבר שקוף
}