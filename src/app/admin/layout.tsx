import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SecretariatSidebar from '@/components/secretariat/SecretariatSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const metaRole = user.user_metadata?.role as string | undefined;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, full_name')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  if (!profile || !isAdmin || profile.status !== 'active') {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SecretariatSidebar userName={profile.full_name} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
