"use client";

import React from "react";
import { AppNavigation, NavUser } from "./nav";
import { ToastProvider } from "@/components/ui/toast";

export interface AppShellProps {
  user: NavUser;
  assemblyName: string;
  parentBodyName: string;
  assemblyAbbreviation: string;
  hidePhoneNav?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  user,
  assemblyName,
  parentBodyName,
  assemblyAbbreviation,
  hidePhoneNav = false,
  children,
}: AppShellProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-text flex flex-col">
        {/* Navigation Shell: Desktop Sidebar, Tablet Rail, Phone Bottom Tab Bar */}
        <AppNavigation
          user={user}
          assemblyName={assemblyName}
          parentBodyName={parentBodyName}
          assemblyAbbreviation={assemblyAbbreviation}
          hidePhoneNav={hidePhoneNav}
        />

        {/* Main Column */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all ${
            hidePhoneNav
              ? "md:ml-[96px] lg:ml-[232px]"
              : "md:ml-[96px] lg:ml-[232px] pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-0"
          }`}
        >
          <main className="flex-1 w-full flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
