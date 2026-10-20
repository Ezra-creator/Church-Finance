import React from "react";
import { DesktopNav, MobileNav, NavUser } from "./nav";
import { ToastProvider } from "@/components/ui/toast";

export interface AppShellProps {
  user: NavUser;
  churchName?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  user,
  churchName,
  aside,
  children,
}: AppShellProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen flex bg-paper text-ink selection:bg-ink selection:text-paper">
        {/* Desktop Left Rail (240px) */}
        <DesktopNav user={user} churchName={churchName} />

        {/* Center Main Ledger Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 flex justify-center w-full">
            <div className="flex-1 max-w-ledger w-full px-4 sm:px-8 py-8 pb-24 lg:pb-12 min-w-0">
              {children}
            </div>

            {/* Asymmetric Context Aside on 1280px+ desktop */}
            {aside ? (
              <aside className="hidden xl:block w-72 flex-shrink-0 border-l border-rule p-8 space-y-6 select-none">
                {aside}
              </aside>
            ) : null}
          </main>
        </div>

        {/* Mobile Bottom Tab Bar */}
        <MobileNav user={user} churchName={churchName} />
      </div>
    </ToastProvider>
  );
}
