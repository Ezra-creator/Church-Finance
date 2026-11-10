import React from "react";
import { Sidebar, BottomBar, NavUser } from "./nav";
import { ToastProvider } from "@/components/ui/toast";

export interface AppShellProps {
  user: NavUser;
  churchName?: string;
  isFocusedFlow?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  user,
  churchName,
  isFocusedFlow,
  aside,
  children,
}: AppShellProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-text font-sans antialiased text-left">
        {/* Desktop Sidebar (232px fixed left) */}
        <Sidebar user={user} churchName={churchName} />

        {/* Desktop Top Bar (64px desktop, 56px phone/tablet) */}
        <div className="lg:pl-[232px] flex flex-col min-h-screen min-w-0">
          <header className="h-14 lg:h-16 bg-surface border-b border-border px-4 lg:px-8 flex items-center justify-between z-20 flex-shrink-0">
            <div className="text-lead font-semibold text-text">
              {churchName || "PUCA Finance"}
            </div>
            <div className="text-caption text-muted">
              {user.name || user.email}
            </div>
          </header>

          {/* Main Content Area (padding 32px on desktop, bottom padding equal to bottom bar 64px + safe-area on mobile below lg) */}
          <main className="flex-1 w-full pb-[calc(64px+env(safe-area-inset-bottom,0px))] lg:pb-8 p-4 lg:p-8 flex justify-start">
            <div className="w-full max-w-[1120px] min-w-0 text-left">
              {children}
            </div>

            {/* Context Aside on desktop if present */}
            {aside ? (
              <aside className="hidden xl:block w-72 flex-shrink-0 border-l border-border p-8 space-y-6 select-none ml-8">
                {aside}
              </aside>
            ) : null}
          </main>
        </div>

        {/* Mobile Bottom Tab Bar (<1024px, hidden on desktop, hides in focused flows) */}
        <BottomBar user={user} churchName={churchName} isFocusedFlow={isFocusedFlow} />
      </div>
    </ToastProvider>
  );
}
