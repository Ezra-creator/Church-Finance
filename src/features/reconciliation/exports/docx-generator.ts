import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Packer,
  HeadingLevel,
} from "docx";
import { ReconciliationReportData } from "../report-data";

/**
 * Generates a standard Microsoft Word (.docx) document from a typed ReconciliationReportData model.
 * Includes income categories, expenses by category, bank deposits and held balances when present.
 */
export async function generateReconciliationDocx(
  data: ReconciliationReportData
): Promise<Buffer> {
  const incomeTableRows: TableRow[] = [];

  // Income Header row
  incomeTableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 4000, type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Giving Category",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Cash Counted",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Mobile Money",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Total",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Income Category rows
  for (const cat of data.incomeCategories) {
    incomeTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cat.name,
                    size: 20,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: cat.cashFormatted,
                    size: 20,
                    font: "Consolas",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: cat.momoFormatted,
                    size: 20,
                    font: "Consolas",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: cat.totalFormatted,
                    size: 20,
                    font: "Consolas",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  // Income Totals Row (Bold)
  incomeTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "TOTAL INCOME",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: data.totals.cashFormatted,
                  bold: true,
                  size: 20,
                  font: "Consolas",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: data.totals.momoFormatted,
                  bold: true,
                  size: 20,
                  font: "Consolas",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: data.totals.expectedFormatted,
                  bold: true,
                  size: 20,
                  font: "Consolas",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Phase 5: Build Expense Table if expenses exist
  const expenseTableRows: TableRow[] = [];
  if (data.expenseCategories.length > 0 && data.expenseTotals) {
    expenseTableRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Expense Category", bold: true, size: 20, font: "Calibri" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Cash", bold: true, size: 20, font: "Calibri" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "MoMo", bold: true, size: 20, font: "Calibri" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Bank", bold: true, size: 20, font: "Calibri" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Total", bold: true, size: 20, font: "Calibri" }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    for (const ec of data.expenseCategories) {
      expenseTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ec.name, size: 20, font: "Calibri" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: ec.cashFormatted, size: 20, font: "Consolas" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: ec.momoFormatted, size: 20, font: "Consolas" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: ec.bankFormatted, size: 20, font: "Consolas" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: ec.totalFormatted, size: 20, font: "Consolas" })] })],
            }),
          ],
        })
      );
    }

    expenseTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "TOTAL EXPENSES", bold: true, size: 20, font: "Calibri" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: data.expenseTotals.cashFormatted, bold: true, size: 20, font: "Consolas" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: data.expenseTotals.momoFormatted, bold: true, size: 20, font: "Consolas" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: data.expenseTotals.bankFormatted, bold: true, size: 20, font: "Consolas" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: data.expenseTotals.grandTotalFormatted, bold: true, size: 20, font: "Consolas" })] })],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Church name & Presbytery as serif heading
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: data.churchName,
                font: "Georgia",
                size: 32,
                bold: true,
                color: "1C1B18",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.presbyteryName.toUpperCase(),
                font: "Calibri",
                size: 18,
                color: "57534E",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200, before: 100 },
            children: [
              new TextRun({
                text: `WEEKLY FINANCIAL RETURN • ${data.weekRange}`,
                font: "Calibri",
                size: 20,
                color: "1C1B18",
              }),
            ],
          }),

          // Ruled income table
          new Table({
            rows: incomeTableRows,
            width: { size: 10000, type: WidthType.DXA },
          }),

          // Parallel run comparison / Variance note if present
          ...(data.totals.bookFormatted
            ? [
                new Paragraph({
                  spacing: { before: 300, after: 100 },
                  children: [
                    new TextRun({
                      text: "Parallel Run Comparison",
                      bold: true,
                      size: 20,
                      font: "Calibri",
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Paper Book Total: ${data.totals.bookFormatted}  •  System Total: ${data.totals.expectedFormatted}  •  Status: ${data.totals.varianceLabel || "Balanced"}`,
                      font: "Consolas",
                      size: 18,
                    }),
                  ],
                }),
                ...(data.varianceReason
                  ? [
                      new Paragraph({
                        spacing: { before: 80 },
                        children: [
                          new TextRun({
                            text: `Variance Explanation: "${data.varianceReason}"`,
                            font: "Calibri",
                            italics: true,
                            size: 18,
                          }),
                        ],
                      }),
                    ]
                  : []),
              ]
            : []),

          // Phase 6: District Remittance Allocation Line
          ...(data.districtAmountDueFormatted
            ? [
                new Paragraph({
                  spacing: { before: 250, after: 100 },
                  children: [
                    new TextRun({
                      text: "District Allocation Due: ",
                      bold: true,
                      size: 20,
                      font: "Calibri",
                    }),
                    new TextRun({
                      text: data.districtAmountDueFormatted,
                      bold: true,
                      font: "Consolas",
                      size: 20,
                    }),
                    new TextRun({
                      text: "  (Computed from active district percentage rules)",
                      font: "Calibri",
                      italics: true,
                      size: 18,
                      color: "555555",
                    }),
                  ],
                }),
              ]
            : []),

          // Phase 5: Expenses section if present
          ...(expenseTableRows.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 400, after: 120 },
                  children: [
                    new TextRun({
                      text: "Disbursements & Expenses",
                      bold: true,
                      size: 24,
                      font: "Georgia",
                      color: "1C1B18",
                    }),
                  ],
                }),
                new Table({
                  rows: expenseTableRows,
                  width: { size: 10000, type: WidthType.DXA },
                }),
              ]
            : []),

          // Phase 5: Banking & Held balances section if present
          ...(data.banking
            ? [
                new Paragraph({
                  spacing: { before: 400, after: 120 },
                  children: [
                    new TextRun({
                      text: "Bank Deposits & Held Funds",
                      bold: true,
                      size: 24,
                      font: "Georgia",
                      color: "1C1B18",
                    }),
                  ],
                }),
                ...(data.banking.deposits.length > 0
                  ? [
                      new Paragraph({
                        spacing: { after: 100 },
                        children: [
                          new TextRun({
                            text: `Deposits Made During Week: ${data.banking.deposits.length} deposit(s), total ${data.banking.totalDepositedFormatted}`,
                            font: "Calibri",
                            size: 18,
                          }),
                        ],
                      }),
                      ...data.banking.deposits.map(
                        (d) =>
                          new Paragraph({
                            spacing: { after: 60 },
                            children: [
                              new TextRun({
                                text: `  • ${d.dateFormatted}: ${d.kindLabel} (${d.amountFormatted}) Ref: ${d.bankReference}`,
                                font: "Consolas",
                                size: 17,
                              }),
                            ],
                          })
                      ),
                    ]
                  : [
                      new Paragraph({
                        spacing: { after: 100 },
                        children: [
                          new TextRun({
                            text: "No bank deposits were recorded during this week.",
                            font: "Calibri",
                            size: 18,
                            italics: true,
                          }),
                        ],
                      }),
                    ]),
                new Paragraph({
                  spacing: { before: 100, after: 200 },
                  children: [
                    new TextRun({
                      text: `Funds Held at Week End: Cash Held: ${data.banking.cashHeldFormatted}  •  MoMo Held: ${data.banking.momoHeldFormatted}  •  Total Held: ${data.banking.totalHeldFormatted}`,
                      font: "Consolas",
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
              ]
            : []),

          // Signatures Section
          new Paragraph({
            spacing: { before: 500, after: 200 },
            children: [
              new TextRun({
                text: "Attestation & Submission",
                bold: true,
                size: 20,
                font: "Calibri",
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `Prepared & Submitted by: ${data.preparedByName} on ${data.submittedAtFormatted} (Report Version ${data.version})`,
                font: "Calibri",
                size: 18,
                color: "57534E",
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 300 },
            children: [
              new TextRun({
                text: "Finance Secretary Signature: ____________________________________",
                font: "Calibri",
                size: 18,
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 300 },
            children: [
              new TextRun({
                text: "Parish Treasurer Signature:  ____________________________________",
                font: "Calibri",
                size: 18,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
