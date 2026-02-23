import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// מטפל ב-OAuth / Magic Link / OTP callbacks מסופאבייס
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // לאחר החלפת הקוד — בדוק תפקיד ונתב בהתאם
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .single();

        if (!profile || profile.status === 'pending' || !profile.role) {
          return NextResponse.redirect(new URL('/pending', origin));
        }
        if (profile.status === 'suspended') {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL('/login?error=suspended', origin));
        }
        if (profile.role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', origin));
        }
        if (profile.role === 'lecturer') {
          return NextResponse.redirect(new URL('/lecturer/dashboard', origin));
        }
        return NextResponse.redirect(new URL('/student/dashboard', origin));
      }
    }
  }

  // אם אין code — העבר ל-next או לדף הבית
  return NextResponse.redirect(new URL(next, origin));
}
