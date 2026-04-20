'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TopProgressBar } from './TopProgressBar';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

export function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const router = useRouter();
  const { user, isLoading, loadUser } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center animate-pulse">
            <div className="h-5 w-5 rounded-md bg-blue-500/50" />
          </div>
          <div className="space-y-2">
            <div className="h-2 w-32 bg-slate-200 rounded-full shimmer" />
            <div className="h-2 w-24 bg-slate-100 rounded-full shimmer mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <></>;

  return (
    <div className="min-h-screen bg-[#f1f3f8]">
      <Suspense fallback={null}>
        <TopProgressBar />
      </Suspense>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          collapsed ? 'md:ml-[68px]' : 'md:ml-[260px]',
        )}
      >
        <Header onMobileMenuClick={() => setMobileOpen(true)} />
        <main>
          <div className="p-4 sm:p-6 lg:p-8 animate-in-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
