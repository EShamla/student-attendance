'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Calendar,
  Users,
  UserCheck,
  BarChart3,
  LogOut,
  School,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin/dashboard', label: 'דף הבית', icon: LayoutDashboard },
  { href: '/admin/semesters', label: 'סמסטרים', icon: Calendar },
  { href: '/admin/courses', label: 'קורסים', icon: BookOpen },
  { href: '/admin/lessons', label: 'שיעורים', icon: School },
  { href: '/admin/students', label: 'משתמשים', icon: GraduationCap },
  { href: '/admin/approvals', label: 'אישורים', icon: UserCheck },
  { href: '/admin/reports', label: 'דוחות', icon: BarChart3 },
];

export default function SecretariatSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('יצאת מהמערכת');
    router.push('/login');
  }

  return (
    <aside className="w-64 bg-indigo-900 text-white flex flex-col min-h-screen shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-indigo-700">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-sm">מזכירות</p>
            <p className="text-indigo-300 text-xs truncate max-w-[140px]">{userName}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-indigo-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors text-sm font-medium"
        >
          <LogOut className="h-5 w-5" />
          יציאה
        </button>
      </div>
    </aside>
  );
}
