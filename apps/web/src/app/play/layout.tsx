import type { ReactNode } from 'react';

/** Child app shell: full-screen, no document scroll, soft sky background. */
export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="kid-shell fixed inset-0 flex flex-col overflow-hidden bg-linear-to-b from-sky to-[#eaf8e3] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  );
}
