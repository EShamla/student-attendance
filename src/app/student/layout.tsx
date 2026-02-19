import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StudentHeader from '@/components/student/StudentHeader';

export default async function StudentLayout({
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

  if (!profile || profile.role !== 'student' || profile.status !== 'active') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader userName={profile.full_name} />
      <main className="max-w-lg mx-auto p-4">
        {children}
      </main>
    </div>
  );
}
