import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes
  const publicPaths = ['/login', '/register', '/pending'];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    // If already logged in and visiting login, redirect to appropriate dashboard
    if (user && pathname === '/login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single();

      const metaRole = user.user_metadata?.role as string | undefined;
      const effectiveRole = profile?.role ?? metaRole;
      if (profile?.status === 'pending') {
        return NextResponse.redirect(new URL('/pending', request.url));
      }
      if (effectiveRole === 'secretariat' || effectiveRole === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      if (effectiveRole === 'lecturer') {
        return NextResponse.redirect(new URL('/lecturer/dashboard', request.url));
      }
      if (effectiveRole === 'student') {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }
    }
    return supabaseResponse;
  }

  // API routes — no redirect, just pass through (they handle their own auth)
  if (pathname.startsWith('/api')) {
    return supabaseResponse;
  }

  // Unauthenticated → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fetch profile for role/status check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  // Pending users → redirect to pending page
  if (!profile || profile.status === 'pending' || (!profile.role && !user.user_metadata?.role)) {
    if (!pathname.startsWith('/pending')) {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
    return supabaseResponse;
  }

  // Suspended users → redirect to login
  if (profile.status === 'suspended') {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=suspended', request.url));
  }

  const role = (profile.role ?? user.user_metadata?.role) as string;

  // Role-based route guards
  if (pathname.startsWith('/student') && role !== 'student') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }
  if (pathname.startsWith('/lecturer') && role !== 'lecturer') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }
  if (pathname.startsWith('/admin')) {
    const isAdmin = role === 'admin' || role === 'secretariat';
    if (!isAdmin) return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }

  // Root redirect
  if (pathname === '/') {
    if (role === 'admin' || role === 'secretariat') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
