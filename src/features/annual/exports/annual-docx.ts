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
} from "docx";
import { formatCedi } from "@/lib/money";
import { AnnualReportData, MONTH_NAMES_SHORT } from "../service";

export async function generateAnnualDocxBuffer(data: AnnualReportData): Promise<Buffer> {
  // 1. Income Table Header (Category + 12 Months + Total)
  const incomeHeaderCells = [
    new TableCell({
      width: { size: 2400, type: WidthType.DXA },
      children: [
        new Paragraph({
          children: [new TextRun({ text: "Giving Category", bold: true, size: 18, font: "Calibri" })],
        }),
      ],
    }),
    ...MONTH_NAMES_SHORT.map(
      (m) =>
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: m, bold: true, size: 16, font: "Calibri" })],
            }),
          ],
        })
    ),
    new TableCell({
      width: { size: 1000, type: WidthType.DXA },
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Total", bold: true, size: 18, font: "Calibri" })],
        }),
      ],
    }),
  ];

  const incomeRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: incomeHeaderCells,
    }),
  ];

  for (const cat of data.income.categories) {
    incomeRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: cat.categoryName, size: 18, font: "Calibri" })],
              }),
            ],
          }),
          ...cat.monthlyAmounts.map(
            (amt) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: amt.isZero() ? "-" : amt.toFixed(0),
                        size: 16,
                        font: "Consolas",
                      }),
                    ],
                  }),
                ],
              })
          ),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: formatCedi(cat.rowTotal),
                    bold: true,
                    size: 18,
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

  // Monthly totals footer
  incomeRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "TOTAL INCOME", bold: true, size: 18, font: "Calibri" })],
            }),
          ],
        }),
        ...data.income.monthlyTotals.map(
          (amt) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: amt.isZero() ? "-" : amt.toFixed(0),
                      bold: true,
                      size: 16,
                      font: "Consolas",
                    }),
                  ],
                }),
              ],
            })
        ),
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: formatCedi(data.income.grandTotal),
                  bold: true,
                  size: 18,
                  font: "Consolas",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // 2. Expenses Table
  const expRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 4000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Expense Category", bold: true, size: 18, font: "Calibri" })] })],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Cash", bold: true, size: 18, font: "Calibri" })] })],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "MoMo", bold: true, size: 18, font: "Calibri" })] })],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Bank", bold: true, size: 18, font: "Calibri" })] })],
        }),
        new TableCell({
          width: { size: 2500, type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Total", bold: true, size: 18, font: "Calibri" })] })],
        }),
      ],
    }),
  ];

  for (const exp of data.expenses.categories) {
    expRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: exp.categoryName, size: 18, font: "Calibri" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCedi(exp.cashAmount), size: 18, font: "Consolas" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCedi(exp.momoAmount), size: 18, font: "Consolas" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCedi(exp.bankAmount), size: 18, font: "Consolas" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCedi(exp.totalAmount), bold: true, size: 18, font: "Consolas" })] })] }),
        ],
      })
    );
  }

  // Total Expenses Row
  expRows.push(
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL DISBURSEMENTS", bold: true, size: 18, font: "Calibri" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCedi(data.expenses.cashTotal), bold: true, size: 18, font: "Consolas" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCedi(data.expenses.momoTotal), bold: true, size: 18, font: "Consolas" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCedi(data.expenses.bankTotal), bold: true, size: 18, font: "Consolas" })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCedi(data.expenses.grandTotal), bold: true, size: 18, font: "Consolas" })] })] }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: data.churchName.toUpperCase(),
                bold: true,
                size: 28,
                font: "Georgia",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `${data.presbyteryName}  |  ANNUAL FINANCIAL SUMMARY - ${data.year}`,
                bold: true,
                size: 20,
                font: "Calibri",
                color: "555555",
              }),
            ],
          }),

          // 1. Income
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: "1. Annual Income by Month and Category", bold: true, size: 22, font: "Georgia" }),
            ],
          }),
          new Table({
            rows: incomeRows,
            width: { size: 10600, type: WidthType.DXA },
          }),

          // 2. Expenses
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({ text: "2. Annual Operating Disbursements & Expenses", bold: true, size: 22, font: "Georgia" }),
            ],
          }),
          new Table({
            rows: expRows,
            width: { size: 10600, type: WidthType.DXA },
          }),

          // 3. Banking & District Remittance Summary
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({ text: "3. Banking & District Obligations", bold: true, size: 22, font: "Georgia" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Bank Deposits: ${formatCedi(data.deposits.totalDeposited)} (Cash: ${formatCedi(data.deposits.cashDepositsTotal)} | MoMo Transfers: ${formatCedi(data.deposits.momoTransfersTotal)})`,
                font: "Calibri",
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `District Remittance Due: ${formatCedi(data.districtRemittance.totalDue)}  •  Paid: ${formatCedi(data.districtRemittance.totalPaid)}  •  Outstanding: ${formatCedi(data.districtRemittance.totalOutstanding)}`,
                font: "Calibri",
                size: 20,
              }),
            ],
          }),

          // 4. Net Operating Surplus / Deficit
          new Paragraph({
            spacing: { before: 250, after: 100 },
            children: [
              new TextRun({
                text: `ANNUAL NET OPERATING POSITION: ${formatCedi(data.netOperatingSurplus)}`,
                bold: true,
                size: 22,
                font: "Consolas",
              }),
              new TextRun({
                text: ` (Total Income: ${formatCedi(data.income.grandTotal)}  -  Total Expenses: ${formatCedi(data.expenses.grandTotal)})`,
                font: "Calibri",
                size: 18,
                color: "555555",
              }),
            ],
          }),

          // Signatures
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "Verified & Approved By: ___________________________ (Finance Secretary)    ___________________________ (Parish Treasurer)",
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
