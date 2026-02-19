import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import LecturerHeader from '@/components/lecturer/LecturerHeader';

export default async function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'lecturer' || profile.status !== 'active') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LecturerHeader userName={profile.full_name} />
      <main className="max-w-6xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
