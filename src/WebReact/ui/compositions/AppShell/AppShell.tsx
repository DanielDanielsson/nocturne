'use client';

import type { ReactNode } from 'react';
import { SideBarNavigation } from '@ui/compositions/SideBarNavigation';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <SideBarNavigation currentUserName="Nocturne" />
      <main className="app-shell-main">
        {children}
      </main>
    </div>
  );
}
