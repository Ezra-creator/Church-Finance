import React from "react";
import { requireUser } from "@/server/guards";
import { getChurchSettings } from "@/features/auth/service";
import { AppShell } from "@/components/layout/shell";
import { ForcedPasswordModal } from "@/features/auth/components/forced-password-modal";
import { ChurchSetupModal } from "@/features/auth/components/church-setup-modal";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const settings = await getChurchSettings();

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      churchName={settings?.churchName || "PUCA Finance"}
    >
      {/* Mandatory password change when user has mustChangePassword flag */}
      <ForcedPasswordModal mustChange={user.mustChangePassword} />

      {/* First-run setup modal when church settings have not been configured yet */}
      <ChurchSetupModal
        isConfigured={Boolean(settings)}
        canConfigure={user.role === Role.FINANCE_SECRETARY}
      />

      {children}
    </AppShell>
  );
}
