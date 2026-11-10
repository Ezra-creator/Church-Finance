"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Users, History, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { AssemblySettings } from "@/lib/assembly";
import { updateAssemblySettingsAction } from "./actions";

export interface SettingsViewProps {
  initialSettings: AssemblySettings;
}

export function SettingsView({ initialSettings }: SettingsViewProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [assemblyName, setAssemblyName] = useState(initialSettings.assemblyName);
  const [parentBodyName, setParentBodyName] = useState(initialSettings.parentBodyName);
  const [assemblyAbbreviation, setAssemblyAbbreviation] = useState(
    initialSettings.assemblyAbbreviation
  );
  const [districtName, setDistrictName] = useState(initialSettings.districtName || "");
  const [areaName, setAreaName] = useState(initialSettings.areaName || "");
  const [reportRecipientName, setReportRecipientName] = useState(
    initialSettings.reportRecipientName || ""
  );
  const [signatoryTitlesStr, setSignatoryTitlesStr] = useState(
    initialSettings.signatoryTitles.join(", ") ||
      "Finance Secretary, Assembly Treasurer"
  );
  const [currency, setCurrency] = useState(initialSettings.currency || "GHS");
  const [timezone, setTimezone] = useState(initialSettings.timezone || "Africa/Accra");
  const [weekStartsOn, setWeekStartsOn] = useState(
    initialSettings.weekStartsOn || "Sunday"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const titles = signatoryTitlesStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      try {
        await updateAssemblySettingsAction({
          assemblyName,
          parentBodyName,
          assemblyAbbreviation,
          districtName: districtName || null,
          areaName: areaName || null,
          reportRecipientName: reportRecipientName || null,
          signatoryTitles: titles,
          currency,
          timezone,
          weekStartsOn,
        });

        addToast("success", "Assembly settings updated successfully.");
      } catch (err: any) {
        addToast("error", err.message || "Failed to update settings.");
      }
    });
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-4xl w-full space-y-8 pb-24">
      {/* Page Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-[24px] sm:text-[28px] font-semibold text-text leading-[34px]">
          Settings
        </h1>
        <p className="text-[14px] text-muted leading-[20px] mt-0.5">
          Local assembly identity, financial reporting parameters, and access administration.
        </p>
      </div>

      {/* Sub-navigation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/settings/users"
          className="p-5 bg-surface border border-border rounded-panel hover:bg-hover transition-colors flex items-start gap-4"
        >
          <div className="p-2.5 bg-hover rounded-control text-brand">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-text">
              Officers & Permissions
            </h2>
            <p className="text-[13px] text-muted mt-0.5">
              Manage Finance Secretary, Treasurer, and Reviewer accounts.
            </p>
          </div>
        </Link>

        <Link
          href="/settings/audit"
          className="p-5 bg-surface border border-border rounded-panel hover:bg-hover transition-colors flex items-start gap-4"
        >
          <div className="p-2.5 bg-hover rounded-control text-brand">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-text">
              Audit Trail
            </h2>
            <p className="text-[13px] text-muted mt-0.5">
              Chronological log of modifications, submissions, and unlocks.
            </p>
          </div>
        </Link>
      </div>

      {/* Assembly Identity Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-surface border border-border rounded-panel space-y-6">
        <div className="border-b border-border pb-4">
          <h2 className="text-[18px] font-semibold text-text leading-[26px]">
            Assembly Identity & Reporting
          </h2>
          <p className="text-[13px] text-muted mt-0.5">
            These details appear on generated financial statements, weekly returns, and tithe receipts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Assembly Name"
            value={assemblyName}
            onChange={(e) => setAssemblyName(e.target.value)}
            required
            detail="e.g. PUCA English Assembly"
          />

          <TextField
            label="Parent Body Name"
            value={parentBodyName}
            onChange={(e) => setParentBodyName(e.target.value)}
            required
            detail="e.g. The Church of Pentecost"
          />

          <TextField
            label="Assembly Abbreviation"
            value={assemblyAbbreviation}
            onChange={(e) => setAssemblyAbbreviation(e.target.value)}
            required
            detail="e.g. PUCA"
          />

          <TextField
            label="District / Circuit Name"
            value={districtName}
            onChange={(e) => setDistrictName(e.target.value)}
            optional
            detail="e.g. Sakumono District"
          />

          <TextField
            label="Area Name"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            optional
            detail="e.g. Teshie-Nungua Area"
          />

          <TextField
            label="Report Recipient Name / Title"
            value={reportRecipientName}
            onChange={(e) => setReportRecipientName(e.target.value)}
            optional
            detail="e.g. District Pastor / Area Office"
          />

          <div className="md:col-span-2">
            <TextField
              label="Signatory Titles (Comma-separated)"
              value={signatoryTitlesStr}
              onChange={(e) => setSignatoryTitlesStr(e.target.value)}
              detail="e.g. Finance Secretary, Assembly Treasurer"
            />
          </div>

          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: "GHS", label: "Ghana Cedi (GH₵)" },
            ]}
          />

          <Select
            label="Week Starts On"
            value={weekStartsOn}
            onChange={(e) => setWeekStartsOn(e.target.value)}
            options={[
              { value: "Sunday", label: "Sunday" },
              { value: "Monday", label: "Monday" },
            ]}
          />
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-end">
          <Button type="submit" variant="primary" disabled={isPending}>
            <Save className="w-4 h-4 mr-1.5" />
            {isPending ? "Saving..." : "Save assembly settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

