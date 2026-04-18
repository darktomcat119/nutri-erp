'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Top progress bar shown briefly on every route change.
 * Animates 0→100% over ~600ms then fades out.
 */
export function TopProgressBar(): JSX.Element | null {
  const pathname = usePathname();
  const search = useSearchParams();
  const [key, setKey] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setKey((k) => k + 1);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 650);
    return () => clearTimeout(t);
  }, [pathname, search]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none">
      <div
        key={key}
        className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-violet-500 shadow-[0_0_10px_rgba(59,130,246,0.45)] animate-topbar-progress"
      />
    </div>
  );
}
