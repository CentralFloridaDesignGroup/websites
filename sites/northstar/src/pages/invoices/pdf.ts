import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceBundle, InvoiceV2 } from "cfdg/types/v2";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function header(doc: jsPDF, title: string, invoiceNumber: string, name: string, address: string[], phone: string) {
  doc.setFontSize(18);
  doc.text(name || "White Point Survey", 14, 18);
  doc.setFontSize(9);
  doc.text(address.filter(Boolean), 14, 24);
  if (phone) doc.text(phone, 14, 24 + address.filter(Boolean).length * 4);
  doc.setFontSize(20);
  doc.text(title, 196, 18, { align: "right" });
  doc.setFontSize(10);
  doc.text(invoiceNumber, 196, 25, { align: "right" });
}

export function downloadInvoicePdf(invoice: InvoiceV2): void {
  const doc = new jsPDF();
  const companyAddress = [invoice.company.address.line1, invoice.company.address.line2, [invoice.company.address.city, invoice.company.address.state, invoice.company.address.postalCode].filter(Boolean).join(", ")];
  header(doc, "INVOICE", invoice.invoiceNumber, invoice.company.name, companyAddress, invoice.company.phone);
  doc.setFontSize(10);
  doc.text(`Client: ${invoice.client.name}`, 14, 48);
  doc.text(`Project: ${invoice.project.name}`, 14, 54);
  doc.text(`Created: ${invoice.activated?.date ? new Date(invoice.activated.date).toLocaleDateString() : "Draft"}`, 196, 48, { align: "right" });
  doc.text(`Due: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Pay When Paid"}`, 196, 54, { align: "right" });
  if (invoice.purchaseOrder) doc.text(`Purchase Order: ${invoice.purchaseOrder}`, 14, 60);
  autoTable(doc, {
    startY: 68,
    head: [["Description", "% Complete", "Contract", "Billed"]],
    body: invoice.lineItems.map((line) => [line.description || line.phaseName, line.lineType === "informational" ? "" : `${line.percentComplete.toFixed(2)}%`, line.lineType === "informational" ? "" : money(line.contractCents), line.lineType === "informational" ? "" : money(line.amountCents)]),
    styles: { fontSize: 9 },
    didParseCell: (data) => {
      if (data.section === "body" && invoice.lineItems[data.row.index]?.lineType === "informational") data.cell.styles.fontStyle = "italic";
    },
  });
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100;
  doc.setFontSize(13);
  doc.text(`TOTAL: ${money(invoice.totalCents)}`, 196, finalY + 14, { align: "right" });
  if (invoice.status === "void" || invoice.status === "paid") doc.text(invoice.status.toUpperCase(), 14, finalY + 14);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export function downloadBundlePdf(bundle: InvoiceBundle): void {
  const doc = new jsPDF();
  const companyAddress = [bundle.company.address.line1, bundle.company.address.line2, [bundle.company.address.city, bundle.company.address.state, bundle.company.address.postalCode].filter(Boolean).join(", ")];
  header(doc, "INVOICE BUNDLE", bundle.bundleNumber, bundle.company.name, companyAddress, bundle.company.phone);
  doc.setFontSize(11);
  doc.text(`Client: ${bundle.client.name}`, 14, 48);
  doc.text(`Invoices: ${bundle.invoices.length}`, 14, 55);
  doc.setFontSize(16);
  doc.text(`TOTAL: ${money(bundle.totalCents)}`, 196, 55, { align: "right" });
  autoTable(doc, {
    startY: 66,
    head: [["Invoice", "Project", "Amount"]],
    body: bundle.invoices.map((invoice) => [invoice.invoiceNumber, invoice.project.name, money(invoice.totalCents)]),
    styles: { fontSize: 9 },
  });
  for (const invoice of bundle.invoices) {
    doc.addPage();
    header(doc, "INVOICE", invoice.invoiceNumber, invoice.company.name, companyAddress, invoice.company.phone);
    autoTable(doc, {
      startY: 34,
      head: [["Description", "% Complete", "Contract", "Billed"]],
      body: invoice.lineItems.map((line) => [line.description || line.phaseName, line.lineType === "informational" ? "" : `${line.percentComplete.toFixed(2)}%`, line.lineType === "informational" ? "" : money(line.contractCents), line.lineType === "informational" ? "" : money(line.amountCents)]),
      styles: { fontSize: 9 },
    });
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;
    doc.setFontSize(13);
    doc.text(`TOTAL: ${money(invoice.totalCents)}`, 196, finalY + 14, { align: "right" });
  }
  doc.save(`${bundle.bundleNumber}.pdf`);
}
