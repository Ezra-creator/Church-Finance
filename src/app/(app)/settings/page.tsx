import React from "react";
import { requireUser } from "@/server/guards";
import { getAssemblySettings } from "@/lib/assembly";
import { SettingsView } from "./settings-view";

export const metadata = {
  title: "Settings — PUCA Finance",
};

export default async function SettingsPage() {
  await requireUser();
  const settings = await getAssemblySettings();

  return <SettingsView initialSettings={settings} />;
}

