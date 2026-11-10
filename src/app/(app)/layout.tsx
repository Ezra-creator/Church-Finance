import React from "react";
import { requireUser } from "@/server/guards";
import { getAssemblySettings } from "@/lib/assembly";
import { AppShell } from "@/components/layout/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const settings = await getAssemblySettings();

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      assemblyName={settings.assemblyName}
      parentBodyName={settings.parentBodyName}
      assemblyAbbreviation={settings.assemblyAbbreviation}
    >
      {children}
    </AppShell>
  );
}
