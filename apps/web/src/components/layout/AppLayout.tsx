'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const router = useRouter();
  const { user, isLoading, loadUser } = useAuthStore();

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
      <Sidebar />
      <main className="min-h-screen pt-18 md:pt-0 md:ml-[260px] transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 animate-in-page">
          {children}
        </div>
      </main>
    </div>
  );
}
