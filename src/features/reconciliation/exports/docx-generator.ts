import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  HeadingLevel,
} from "docx";
import { ReconciliationReportData } from "../report-data";

/**
 * Generates a standard Microsoft Word (.docx) document from a typed ReconciliationReportData model.
 */
export async function generateReconciliationDocx(
  data: ReconciliationReportData
): Promise<Buffer> {
  const tableRows: TableRow[] = [];

  // Header row
  tableRows.push(
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

  // Category rows
  for (const cat of data.incomeCategories) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: cat.name, size: 20, font: "Calibri" }),
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

  // Totals Row (Bold)
  tableRows.push(
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
            rows: tableRows,
            width: { size: 10000, type: WidthType.DXA },
          }),

          // Variance note if present
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

          // Signatures Section
          new Paragraph({
            spacing: { before: 600, after: 400 },
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
            spacing: { before: 400 },
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
