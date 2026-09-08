import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ClientInvoiceReport } from "../../../api/invoiceReports";

function currency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
function date(value: string): string {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "-";
}

/** Downloads an internal client account report with clickable online-payment links. */
export function downloadClientAccountReportPdf(
  report: ClientInvoiceReport,
): void {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const left = 42;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Client Open Invoice Report", left, 44);
  pdf.setFontSize(12);
  pdf.text(report.clientName || report.clientId, left, 64);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(
    `Generated ${date(report.generatedDate)}   |   ${report.openInvoiceCount} open invoices   |   Balance ${currency(report.openBalanceCents)}   |   Past due ${currency(report.pastDueBalanceCents)}`,
    left,
    82,
  );
  pdf.text(
    `Aging: Current ${currency(report.aging.current)} | 1-30 ${currency(report.aging["1-30"])} | 31-60 ${currency(report.aging["31-60"])} | 61-90 ${currency(report.aging["61-90"])} | 91-120 ${currency(report.aging["91-120"])} | 121+ ${currency(report.aging["121+"])}`,
    left,
    98,
  );
  autoTable(pdf, {
    startY: 116,
    head: [
      [
        "Invoice",
        "Project",
        "Issued",
        "Due",
        "Days overdue",
        "Amount due",
        "Payment link",
      ],
    ],
    body: report.invoices.map((line) => [
      line.invoiceNumber,
      line.projectReference || "-",
      date(line.issueDate),
      date(line.dueDate),
      line.daysPastDue || "-",
      currency(line.amountDueCents),
      "Pay online",
    ]),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [28, 61, 90] },
    columnStyles: { 1: { cellWidth: 250 }, 6: { textColor: [29, 78, 216] } },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const line = report.invoices[data.row.index];
        pdf.textWithLink("Pay online", data.cell.x + 5, data.cell.y + 12, {
          url: line.paymentUrl,
        });
      }
    },
    didDrawPage: (data) => {
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(
        `White Point Survey - page ${data.pageNumber}`,
        pageWidth - left,
        pdf.internal.pageSize.getHeight() - 20,
        { align: "right" },
      );
    },
  });
  pdf.save(
    `${(report.clientName || "client").replace(/[^a-z0-9]+/gi, "_")}_open_invoices.pdf`,
  );
}
