"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  RefreshCw,
  Tag,
  Check,
} from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { StatusMark } from "@/components/ui/status-mark";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { formatCedi } from "@/lib/money";
import {
  inspectStatementFileAction,
  previewImportAction,
  commitImportAction,
  createParserProfileAction,
} from "../actions";
import {
  ParserProfileConfig,
  ColumnMapConfig,
  AmountSignConvention,
  ParseRowError,
} from "../parsers/types";
import { ImportPreviewResult, StatementFileInspection } from "../service";
import { StatementFileType } from "@prisma/client";

export interface SavedProfileOption {
  id: string;
  name: string;
  fileType: StatementFileType;
  headerRow: number;
  columnMap: ColumnMapConfig;
  dateFormat: string;
  amountSign: AmountSignConvention;
}

export interface ImportWizardProps {
  savedProfiles: SavedProfileOption[];
}

export function ImportWizard({ savedProfiles }: ImportWizardProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    savedProfiles.length > 0 ? savedProfiles[0].id : "CUSTOM"
  );

  // Step 2 mapping state
  const [inspection, setInspection] = useState<StatementFileInspection | null>(null);
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [dateFormat, setDateFormat] = useState<string>("YYYY-MM-DD HH:mm:ss");
  const [amountSign, setAmountSign] = useState<AmountSignConvention>(
    "POSITIVE_IN_NEGATIVE_OUT"
  );
  const [columnMap, setColumnMap] = useState<ColumnMapConfig>({
    dateColumn: "",
    amountColumn: "",
    creditColumn: "",
    debitColumn: "",
    directionColumn: "",
    referenceColumn: "",
    descriptionColumn: "",
    counterpartyNameColumn: "",
    counterpartyPhoneColumn: "",
  });
  const [saveAsProfile, setSaveAsProfile] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>("");

  // Step 3 preview state
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);

  // Step 4 result state
  const [commitResult, setCommitResult] = useState<{
    id: string;
    rowsImported: number;
    rowsDuplicate: number;
    needsReviewCount: number;
    autoCount: number;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("File exceeds the 5 MB limit. Please upload a smaller statement file.");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Drop zone handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("File exceeds the 5 MB limit. Please upload a smaller statement file.");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Construct current profile config
  const currentProfileConfig: ParserProfileConfig = useMemo(() => {
    if (selectedProfileId !== "CUSTOM") {
      const saved = savedProfiles.find((p) => p.id === selectedProfileId);
      if (saved) {
        return {
          id: saved.id,
          name: saved.name,
          fileType: saved.fileType,
          headerRow: saved.headerRow,
          columnMap: saved.columnMap,
          dateFormat: saved.dateFormat,
          amountSign: saved.amountSign,
        };
      }
    }

    const fileType = selectedFile?.name.toLowerCase().endsWith(".csv")
      ? StatementFileType.CSV
      : StatementFileType.XLSX;

    return {
      name: newProfileName || "Custom Mapping",
      fileType,
      headerRow,
      columnMap,
      dateFormat,
      amountSign,
    };
  }, [
    selectedProfileId,
    savedProfiles,
    selectedFile,
    newProfileName,
    headerRow,
    columnMap,
    dateFormat,
    amountSign,
  ]);

  // Proceed from Step 1 to Step 2 or Step 3
  const handleStep1Proceed = () => {
    if (!selectedFile) {
      setErrorMsg("Please select a statement file to upload.");
      return;
    }

    setErrorMsg(null);

    startTransition(async () => {
      // If a saved profile is selected and valid, we can go directly to Step 3 (Preview)
      if (selectedProfileId !== "CUSTOM") {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("profile", JSON.stringify(currentProfileConfig));

        const res = await previewImportAction(formData);
        if (!res.success) {
          setErrorMsg(res.error.message);
          return;
        }

        setPreviewResult(res.data);
        setStep(3);
        return;
      }

      // Otherwise inspect file and move to Step 2 (Map columns)
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("headerRow", String(headerRow));

      const res = await inspectStatementFileAction(formData);
      if (!res.success) {
        setErrorMsg(res.error.message);
        return;
      }

      setInspection(res.data);

      // Auto-guess columns if possible
      const headers = res.data.headers;
      const lower = headers.map((h) => h.toLowerCase());

      const findHeader = (keywords: string[]) => {
        for (const kw of keywords) {
          const idx = lower.findIndex((h) => h.includes(kw));
          if (idx !== -1) return headers[idx];
        }
        return "";
      };

      setColumnMap((prev) => ({
        ...prev,
        dateColumn: findHeader(["date", "time", "timestamp"]) || headers[0] || "",
        amountColumn: findHeader(["amount", "gross", "value", "net"]) || "",
        referenceColumn: findHeader(["ref", "trans id", "id", "receipt", "external"]) || "",
        descriptionColumn: findHeader(["desc", "detail", "narration", "reason", "memo"]) || headers[1] || "",
        counterpartyNameColumn: findHeader(["from", "sender", "name", "payer", "counterparty"]) || "",
        counterpartyPhoneColumn: findHeader(["phone", "mobile", "msisdn", "number"]) || "",
      }));

      setStep(2);
    });
  };

  // Re-inspect if headerRow changed
  const handleHeaderRowChange = (newRow: number) => {
    setHeaderRow(newRow);
    if (!selectedFile) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("headerRow", String(newRow));

      const res = await inspectStatementFileAction(formData);
      if (res.success) {
        setInspection(res.data);
      }
    });
  };

  // Proceed from Step 2 to Step 3
  const handleStep2Proceed = () => {
    if (!columnMap.dateColumn) {
      setErrorMsg("Please select a column for Transaction Date.");
      return;
    }
    if (!columnMap.descriptionColumn) {
      setErrorMsg("Please select a column for Description.");
      return;
    }
    if (amountSign === "SEPARATE_COLUMNS") {
      if (!columnMap.creditColumn && !columnMap.debitColumn) {
        setErrorMsg("Please select at least a Credit column for incoming payments.");
        return;
      }
    } else {
      if (!columnMap.amountColumn) {
        setErrorMsg("Please select a column for Amount.");
        return;
      }
    }

    if (saveAsProfile && !newProfileName.trim()) {
      setErrorMsg("Please enter a name for the saved profile.");
      return;
    }

    setErrorMsg(null);

    startTransition(async () => {
      // Save profile if requested
      if (saveAsProfile && newProfileName.trim() && selectedFile) {
        const fileType = selectedFile.name.toLowerCase().endsWith(".csv")
          ? StatementFileType.CSV
          : StatementFileType.XLSX;

        await createParserProfileAction({
          name: newProfileName.trim(),
          fileType,
          headerRow,
          columnMap,
          dateFormat,
          amountSign,
        });
      }

      // Generate preview
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("profile", JSON.stringify(currentProfileConfig));

        const res = await previewImportAction(formData);
        if (!res.success) {
          setErrorMsg(res.error.message);
          return;
        }

        setPreviewResult(res.data);
        setStep(3);
      }
    });
  };

  // Commit import in Step 3
  const handleCommitImport = () => {
    if (!selectedFile) return;
    setErrorMsg(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("profile", JSON.stringify(currentProfileConfig));

      const res = await commitImportAction(formData);
      if (!res.success) {
        setErrorMsg(res.error.message);
        return;
      }

      // Count prospective auto vs review from preview
      let needsReview = 0;
      let auto = 0;
      if (previewResult) {
        for (const row of previewResult.previewRows) {
          if (row.prospectiveStatus === "NEEDS_REVIEW") needsReview++;
          if (row.prospectiveStatus === "AUTO") auto++;
        }
      }

      setCommitResult({
        id: res.data.id,
        rowsImported: res.data.rowsImported,
        rowsDuplicate: res.data.rowsDuplicate,
        needsReviewCount: needsReview,
        autoCount: auto,
      });

      addToast("success", `Statement imported successfully: ${res.data.rowsImported} rows added.`);
      setStep(4);
    });
  };

  // Live sample parse for Step 2
  const liveSampleParsed = useMemo(() => {
    if (!inspection || !inspection.sampleRows) return [];

    return inspection.sampleRows.slice(0, 3).map((row, idx) => {
      const rawDate = columnMap.dateColumn ? row[columnMap.dateColumn] : "";
      const rawAmount =
        amountSign === "SEPARATE_COLUMNS"
          ? row[columnMap.creditColumn || ""] || row[columnMap.debitColumn || ""]
          : columnMap.amountColumn
          ? row[columnMap.amountColumn]
          : "";
      const rawDesc = columnMap.descriptionColumn ? row[columnMap.descriptionColumn] : "";
      const rawSender = columnMap.counterpartyNameColumn
        ? row[columnMap.counterpartyNameColumn]
        : columnMap.counterpartyPhoneColumn
        ? row[columnMap.counterpartyPhoneColumn]
        : "";

      return {
        rowNum: headerRow + 1 + idx,
        date: rawDate || "—",
        amount: rawAmount ? `GH₵ ${rawAmount}` : "—",
        sender: rawSender || "—",
        desc: rawDesc || "—",
      };
    });
  }, [inspection, columnMap, amountSign, headerRow]);

  const stepLabels = [
    "1. Choose file",
    "2. Map columns",
    "3. Preview & Validate",
    "4. Import complete",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <RuleHeading
        eyebrow="Statement Importer"
        title="Import Mobile Money Statement"
        description="Upload CSV or XLSX statements, configure column layout, and automatically classify transactions."
        action={
          <Link href="/money/momo">
            <Button variant="quiet" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to MoMo
            </Button>
          </Link>
        }
      />

      {/* Thin Progress Line (Not a stepper widget) */}
      <div className="space-y-2 select-none">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-ink-soft">
          <span className="font-semibold text-ink">Step {step} of 4: {stepLabels[step - 1].slice(3)}</span>
          <span className="tabular-nums">{step * 25}%</span>
        </div>
        <div className="w-full bg-rule h-0.5 rounded-[1px] overflow-hidden">
          <div
            className="bg-ink h-0.5 transition-all duration-300"
            style={{ width: `${step * 25}%` }}
          />
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-variance/10 border border-variance text-variance text-sm rounded-[2px] flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Error during statement processing</p>
            <p className="text-xs leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* STEP 1: CHOOSE FILE */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="p-6 bg-paper border border-rule rounded-[2px] space-y-6">
            <div>
              <h3 className="text-base font-serif font-normal text-ink mb-1">
                Select Statement File
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Upload your parish Mobile Money statement in CSV or Excel (XLSX) format. Files up to 5 MB are parsed securely server-side.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-rule-strong hover:border-ink rounded-[2px] p-8 text-center bg-ink/[0.01] transition-colors cursor-pointer relative"
            >
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="statement-file-input"
              />
              <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                <div className="p-3 bg-paper border border-rule rounded-[2px] text-ink">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-ink">{selectedFile.name}</p>
                    <p className="text-xs font-mono text-ink-soft tabular-nums">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.endsWith(".csv") ? "CSV" : "Excel Spreadsheet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-ink">
                      Drag and drop your statement file here, or click to browse
                    </p>
                    <p className="text-xs text-ink-soft">
                      Supports CSV, XLSX or XLS (up to 5 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Selection */}
            <div className="pt-4 border-t border-rule space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block">
                Parser Profile
              </label>
              <div className="space-y-2">
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2.5 text-ink focus:outline-none focus:border-ink font-mono"
                >
                  {savedProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      Saved Profile: {p.name} ({p.fileType})
                    </option>
                  ))}
                  <option value="CUSTOM">
                    + Configure new column layout / custom mapping
                  </option>
                </select>
                <p className="text-xs text-ink-soft">
                  {selectedProfileId === "CUSTOM"
                    ? "You will be prompted to map column names in the next step."
                    : "Using existing saved column mapping profile. File will be previewed immediately."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/money/momo">
              <Button variant="quiet">Cancel</Button>
            </Link>
            <Button
              variant="primary"
              disabled={!selectedFile || isPending}
              onClick={handleStep1Proceed}
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Reading file...
                </>
              ) : selectedProfileId !== "CUSTOM" ? (
                <>
                  Preview statement
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              ) : (
                <>
                  Continue to column mapping
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: MAP COLUMNS */}
      {step === 2 && inspection && (
        <div className="space-y-6">
          <div className="p-6 bg-paper border border-rule rounded-[2px] space-y-6">
            <div>
              <h3 className="text-base font-serif font-normal text-ink mb-1">
                Map Statement Columns
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Match each required transaction field to the corresponding column header in your uploaded statement file.
              </p>
            </div>

            {/* Header row config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-rule">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                  Header Row Number
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={headerRow}
                  onChange={(e) => handleHeaderRowChange(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  1-indexed row where column headers are located (usually 1)
                </p>
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                  Amount Convention
                </label>
                <select
                  value={amountSign}
                  onChange={(e) => setAmountSign(e.target.value as AmountSignConvention)}
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                >
                  <option value="POSITIVE_IN_NEGATIVE_OUT">
                    Single column (positive = In, negative = Out)
                  </option>
                  <option value="SEPARATE_COLUMNS">
                    Separate Credit (In) & Debit (Out) columns
                  </option>
                  <option value="ALWAYS_POSITIVE_USE_DIRECTION">
                    Always positive amount + Direction column
                  </option>
                </select>
              </div>
            </div>

            {/* Column dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date column */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                  Date & Time Column <span className="text-variance">*</span>
                </label>
                <select
                  value={columnMap.dateColumn}
                  onChange={(e) => setColumnMap({ ...columnMap, dateColumn: e.target.value })}
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                >
                  <option value="">-- Select Column --</option>
                  {inspection.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Format */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                  Date Format
                </label>
                <input
                  type="text"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm:ss"
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  e.g. YYYY-MM-DD HH:mm:ss, DD/MM/YYYY HH:mm:ss, or DD-MM-YYYY
                </p>
              </div>

              {/* Amount Columns */}
              {amountSign === "SEPARATE_COLUMNS" ? (
                <>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                      Credit (Incoming) Column <span className="text-variance">*</span>
                    </label>
                    <select
                      value={columnMap.creditColumn || ""}
                      onChange={(e) => setColumnMap({ ...columnMap, creditColumn: e.target.value })}
                      className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                    >
                      <option value="">-- Select Credit Column --</option>
                      {inspection.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                      Debit (Outgoing) Column
                    </label>
                    <select
                      value={columnMap.debitColumn || ""}
                      onChange={(e) => setColumnMap({ ...columnMap, debitColumn: e.target.value })}
                      className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                    >
                      <option value="">-- Select Debit Column (Optional) --</option>
                      {inspection.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                    Amount Column <span className="text-variance">*</span>
                  </label>
                  <select
                    value={columnMap.amountColumn || ""}
                    onChange={(e) => setColumnMap({ ...columnMap, amountColumn: e.target.value })}
                    className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                  >
                    <option value="">-- Select Amount Column --</option>
                    {inspection.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Direction Column if direction convention */}
              {amountSign === "ALWAYS_POSITIVE_USE_DIRECTION" && (
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                    Direction Column (CR/DR, IN/OUT)
                  </label>
                  <select
                    value={columnMap.directionColumn || ""}
                    onChange={(e) => setColumnMap({ ...columnMap, directionColumn: e.target.value })}
                    className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                  >
                    <option value="">-- Select Direction Column --</option>
                    {inspection.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description column */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                  Description / Narration <span className="text-variance">*</span>
                </label>
                <select
                  value={columnMap.descriptionColumn}
                  onChange={(e) => setColumnMap({ ...columnMap, descriptionColumn: e.target.value })}
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                >
                  <option value="">-- Select Description Column --</option>
                  {inspection.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference column */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                  External Reference / Transaction ID
                </label>
                <select
                  value={columnMap.referenceColumn || ""}
                  onChange={(e) => setColumnMap({ ...columnMap, referenceColumn: e.target.value })}
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                >
                  <option value="">-- Optional Reference Column --</option>
                  {inspection.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Counterparty Name */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                  Sender / Counterparty Name
                </label>
                <select
                  value={columnMap.counterpartyNameColumn || ""}
                  onChange={(e) => setColumnMap({ ...columnMap, counterpartyNameColumn: e.target.value })}
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                >
                  <option value="">-- Optional Sender Name --</option>
                  {inspection.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Counterparty Phone */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
                  Sender Phone Number
                </label>
                <select
                  value={columnMap.counterpartyPhoneColumn || ""}
                  onChange={(e) => setColumnMap({ ...columnMap, counterpartyPhoneColumn: e.target.value })}
                  className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                >
                  <option value="">-- Optional Phone Column --</option>
                  {inspection.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LIVE PREVIEW OF 3 ROWS BENEATH CHOICES */}
            <div className="pt-6 border-t border-rule space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wider font-mono font-semibold text-ink-soft">
                  Live Preview of First 3 Parsed Rows
                </h4>
                <span className="text-[11px] font-mono text-ink-soft">
                  Updates dynamically with selected mappings
                </span>
              </div>

              <div className="border border-rule rounded-[2px] overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-ink/[0.02] border-b border-rule">
                    <tr>
                      <th className="py-2 px-3 text-ink-soft font-normal">Row</th>
                      <th className="py-2 px-3 text-ink-soft font-normal">Date & Time</th>
                      <th className="py-2 px-3 text-ink-soft font-normal">Amount</th>
                      <th className="py-2 px-3 text-ink-soft font-normal">Sender</th>
                      <th className="py-2 px-3 text-ink-soft font-normal">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {liveSampleParsed.map((r) => (
                      <tr key={r.rowNum} className="hover:bg-ink/[0.01]">
                        <td className="py-2 px-3 text-ink-soft">{r.rowNum}</td>
                        <td className="py-2 px-3 text-ink truncate max-w-[140px]">{r.date}</td>
                        <td className="py-2 px-3 text-ink font-semibold tabular-nums">{r.amount}</td>
                        <td className="py-2 px-3 text-ink truncate max-w-[120px]">{r.sender}</td>
                        <td className="py-2 px-3 text-ink-soft truncate max-w-[200px]">"{r.desc}"</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SAVE AS PROFILE OPTION */}
            <div className="pt-4 border-t border-rule space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAsProfile}
                  onChange={(e) => setSaveAsProfile(e.target.checked)}
                  className="rounded-[2px] border-rule text-ink focus:ring-0"
                />
                <span className="text-sm font-medium text-ink">
                  Save as profile for future statement uploads
                </span>
              </label>

              {saveAsProfile && (
                <div className="pl-6 max-w-sm">
                  <input
                    type="text"
                    placeholder="e.g. MTN MoMo Standard CSV"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <Button
              variant="primary"
              disabled={isPending}
              onClick={handleStep2Proceed}
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Generating preview...
                </>
              ) : (
                <>
                  Preview statement
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATE */}
      {step === 3 && previewResult && (
        <div className="space-y-6">
          {/* Prominent "Nothing has been saved yet" line */}
          <div className="p-4 bg-ink/[0.02] border border-rule rounded-[2px] flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-attention flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-ink">
                Nothing has been saved yet
              </p>
              <p className="text-xs text-ink-soft">
                Review the parsed statement counts and row validation below before committing this import to the parish ledger.
              </p>
            </div>
          </div>

          {/* Counts Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-paper border border-rule rounded-[2px]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">Total Rows</p>
              <p className="text-2xl font-mono tabular-nums font-semibold text-ink mt-0.5">
                {previewResult.rowsTotal}
              </p>
            </div>
            <div className="p-3 bg-paper border border-rule rounded-[2px]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-balanced">New to Import</p>
              <p className="text-2xl font-mono tabular-nums font-semibold text-balanced mt-0.5">
                {previewResult.rowsValid}
              </p>
            </div>
            <div className="p-3 bg-paper border border-rule rounded-[2px]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">Duplicates</p>
              <p className="text-2xl font-mono tabular-nums font-semibold text-ink-soft mt-0.5">
                {previewResult.rowsDuplicate}
              </p>
            </div>
            <div className="p-3 bg-paper border border-rule rounded-[2px]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-variance">Errors / Skipped</p>
              <p className="text-2xl font-mono tabular-nums font-semibold text-variance mt-0.5">
                {previewResult.rowsSkipped}
              </p>
            </div>
          </div>

          {/* Row-level errors list */}
          {previewResult.errors.length > 0 && (
            <div className="p-4 bg-variance/5 border border-variance/30 rounded-[2px] space-y-3">
              <div className="flex items-center gap-2 text-variance text-xs uppercase tracking-wider font-mono font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Row-Level Errors ({previewResult.errors.length})</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-variance/15 text-xs font-mono">
                {previewResult.errors.map((err, i) => (
                  <div key={i} className="py-1.5 text-variance leading-relaxed">
                    Row {err.rowIndex}: {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* First 25 Rows Preview */}
          <div className="p-4 bg-paper border border-rule rounded-[2px] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider font-mono font-semibold text-ink-soft">
                First 25 Prospective Rows
              </h4>
              <span className="text-[11px] font-mono text-ink-soft">
                Showing preview before database write
              </span>
            </div>

            <div className="border border-rule rounded-[2px] overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-ink/[0.02] border-b border-rule sticky top-0 bg-paper">
                  <tr>
                    <th className="py-2 px-3 text-ink-soft font-normal">Row</th>
                    <th className="py-2 px-3 text-ink-soft font-normal">Date & Time</th>
                    <th className="py-2 px-3 text-ink-soft font-normal">Direction</th>
                    <th className="py-2 px-3 text-ink-soft font-normal text-right">Amount</th>
                    <th className="py-2 px-3 text-ink-soft font-normal">Sender</th>
                    <th className="py-2 px-3 text-ink-soft font-normal">Description</th>
                    <th className="py-2 px-3 text-ink-soft font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {previewResult.previewRows.map((row) => {
                    const isDup = row.isDuplicate;
                    return (
                      <tr
                        key={row.rowIndex}
                        className={isDup ? "opacity-40 bg-ink/[0.01]" : "hover:bg-ink/[0.01]"}
                      >
                        <td className="py-2 px-3 text-ink-soft">{row.rowIndex}</td>
                        <td className="py-2 px-3 text-ink truncate max-w-[130px]">
                          {formatAccraDate(new Date(row.occurredAt), { day: "numeric", month: "short" })}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1 py-0.2 rounded-[1px] text-[10px] ${
                              row.direction === "OUT"
                                ? "bg-variance/10 text-variance"
                                : "bg-balanced/10 text-balanced"
                            }`}
                          >
                            {row.direction}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold tabular-nums text-ink">
                          {formatCedi(row.amount)}
                        </td>
                        <td className="py-2 px-3 text-ink truncate max-w-[120px]">
                          {row.matchedMember?.fullName || row.counterpartyName || row.counterpartyPhone || "—"}
                        </td>
                        <td className="py-2 px-3 text-ink-soft truncate max-w-[180px]">
                          "{row.rawDescription}"
                        </td>
                        <td className="py-2 px-3">
                          {isDup ? (
                            <span className="text-[10px] text-ink-soft">Duplicate</span>
                          ) : row.prospectiveCategory ? (
                            <span className="text-[10px] text-balanced font-medium">
                              {row.prospectiveCategory.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-attention font-medium">
                              Needs Review
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                if (selectedProfileId === "CUSTOM") {
                  setStep(2);
                } else {
                  setStep(1);
                }
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <Button
              variant="primary"
              disabled={previewResult.rowsValid === 0 || isPending}
              onClick={handleCommitImport}
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Importing statement...
                </>
              ) : (
                <>
                  Confirm and import ({previewResult.rowsValid} rows)
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT COMPLETE & RESULT SUMMARY */}
      {step === 4 && commitResult && (
        <div className="p-8 bg-paper border border-rule rounded-[2px] space-y-6 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-[2px] bg-balanced/10 text-balanced mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-serif font-normal text-ink">
              Statement Import Complete
            </h3>
            <p className="text-xs text-ink-soft">
              Transactions have been committed to the ledger with full audit logging.
            </p>
          </div>

          {/* Result stats */}
          <div className="grid grid-cols-2 gap-3 text-left pt-2">
            <div className="p-3 bg-ink/[0.02] border border-rule rounded-[2px]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">
                Imported Rows
              </p>
              <p className="text-xl font-mono tabular-nums font-semibold text-ink mt-0.5">
                {commitResult.rowsImported}
              </p>
            </div>
            <div className="p-3 bg-ink/[0.02] border border-rule rounded-[2px]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">
                Duplicates Skipped
              </p>
              <p className="text-xl font-mono tabular-nums font-semibold text-ink-soft mt-0.5">
                {commitResult.rowsDuplicate}
              </p>
            </div>
            <div className="p-3 bg-balanced/5 border border-balanced/20 rounded-[2px]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-balanced">
                Auto-Classified
              </p>
              <p className="text-xl font-mono tabular-nums font-semibold text-balanced mt-0.5">
                {commitResult.autoCount}
              </p>
            </div>
            <div className="p-3 bg-attention/5 border border-attention/20 rounded-[2px]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-attention">
                Needs Review
              </p>
              <p className="text-xl font-mono tabular-nums font-semibold text-attention mt-0.5">
                {commitResult.needsReviewCount}
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            {commitResult.needsReviewCount > 0 ? (
              <Link href="/money/momo/review">
                <Button variant="primary" className="w-full">
                  <Tag className="w-4 h-4 mr-1.5" />
                  Go to review queue ({commitResult.needsReviewCount} left)
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            ) : null}

            <Link href="/money/momo">
              <Button variant="secondary" className="w-full">
                Return to MoMo register
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
