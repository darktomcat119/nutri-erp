import { AppLayout } from '@/components/layout/AppLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return <AppLayout>{children}</AppLayout>;
}
