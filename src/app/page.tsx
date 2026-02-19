import { redirect } from 'next/navigation';

// The middleware handles redirects based on auth state and role.
// This page just redirects to login as a fallback.
export default function Home() {
  redirect('/login');
}
