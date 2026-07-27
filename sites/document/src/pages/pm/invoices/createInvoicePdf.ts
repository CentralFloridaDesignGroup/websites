import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type Invoice } from "cfdg/types";
import { type InvoiceEmailAttachment } from "../../../api/invoices";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Formats a date string into a human-readable date. Returns an empty string if the value is falsy. Date formats to MM/dd/yyyy */
function formatDate(value: string): string {
  if (!value) return "";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function sanitizeFilenamePart(value: string): string {
  return (
    value.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "") || "invoice"
  );
}

function getInvoiceBillingAddressLines(invoice: Invoice): string[] {
  return [
    invoice.billingAddressLine1,
    invoice.billingAddressLine2,
    [
      invoice.billingAddressCity,
      invoice.billingAddressState,
      invoice.billingAddressPostalCode,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);
}

function getInvoiceProjectAddressLines(invoice: Invoice): string[] {
  return [
    invoice.projectAddressLine1,
    invoice.projectAddressLine2,
    [
      invoice.projectAddressCity,
      invoice.projectAddressState,
      invoice.projectAddressPostalCode,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);
}

function loadImageAsPngDataUrl(
  src: string,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas context unavailable."));
        return;
      }

      context.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function createInvoicePdf(
  invoice: Invoice,
  paymentUrl: string,
): Promise<jsPDF> {
  const clientAddressLines = getInvoiceBillingAddressLines(invoice);
  const projectAddressLines = getInvoiceProjectAddressLines(invoice);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const left = 54;
  const lineSpace = 16;
  const brandNavy = "#0f172a";
  const brandBlue = "#1c3d5a";
  let cursorY = 105; // Starting Y position after the header after the logo and invoice number
  let secondColumnX = pageWidth / 2 + 70; // Starting X position for the second column
  let addressY = cursorY; // Y position for the address section

  // If invoice is marked as a draft, add a watermark
  if (invoice.status === "draft") {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(60);
    pdf.setTextColor(0, 0, 0, 0.1); // Light gray color for watermark
    pdf.text("DRAFT", pageWidth / 2, 75, {
      align: "center",
    });
    pdf.text("DRAFT", pageWidth / 2, 175, {
      align: "center",
    });
    pdf.text("DRAFT", pageWidth / 2, 275, {
      align: "center",
    });
    pdf.text("DRAFT", pageWidth / 2, 375, {
      align: "center",
    });
    pdf.text("DRAFT", pageWidth / 2, 475, {
      align: "center",
    });
    pdf.text("DRAFT", pageWidth / 2, 575, {
      align: "center",
    });
    pdf.text("DRAFT", pageWidth / 2, 675, {
      align: "center",
    });
    pdf.text("DRAFT", pageWidth / 2, 775, {
      align: "center",
    });
  }

  try {
    const logo = await loadImageAsPngDataUrl("/White_Point_Logo_Name.png");
    const logoWidth = 150;
    const logoHeight = logoWidth * (logo.height / logo.width);
    pdf.addImage(logo.dataUrl, "PNG", left, 34, logoWidth, logoHeight);
  } catch {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(brandBlue);
    pdf.text("White Point Surveying & Mapping LLC", left, 54);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor("#000000");
  pdf.text("INVOICE", pageWidth - left, 54, { align: "right" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(brandNavy);
  pdf.text(invoice.invoiceNumber, pageWidth - left, 78, { align: "right" });

  // headers

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(brandNavy);
  pdf.text("BILL TO", left, cursorY);
  pdf.text("DETAILS", secondColumnX, cursorY);
  cursorY += lineSpace;

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor("#111827");
  pdf.text(invoice.billingClientName || invoice.clientName, left, cursorY);

  pdf.setFont("helvetica", "normal");
  pdf.text("Issue Date:", secondColumnX, cursorY);
  pdf.text(formatDate(invoice.issueDate) || "", pageWidth - left, cursorY, {
    align: "right",
  });

  cursorY += lineSpace;

  if (clientAddressLines.length > 0) {
    let tempY = cursorY;
    if (clientAddressLines.length > 2) {
      pdf.text(
        `${clientAddressLines[0]}, ${clientAddressLines[1]}`,
        left,
        tempY,
      );
    } else {
      pdf.text(clientAddressLines[0], left, tempY);
    }
    tempY += 16;
    if (clientAddressLines.length > 2) {
      pdf.text(clientAddressLines[2], left, tempY);
    } else {
      pdf.text(clientAddressLines[1], left, tempY);
    }
    addressY = tempY;
  }
  

  pdf.text("Due Date:", secondColumnX, cursorY);
  pdf.text(
    formatDate(invoice.dueDate) || "Due on receipt",
    pageWidth - left,
    cursorY,
    { align: "right" },
  );

  cursorY += lineSpace;

  pdf.text("Invoice Status:", secondColumnX, cursorY);
  pdf.text(invoice.status !== "sent" ? invoice.status.toUpperCase() : "OPEN", pageWidth - left, cursorY, {
    align: "right",
  });

  // Ensure that the cursorY is at least 32 points below the address section
  cursorY = Math.max(cursorY + 32, addressY + 32);

  // Project information section
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(brandNavy);
  pdf.text("PROJECT INFORMATION", left, cursorY);

  // Pay Online text that looks like a button
  pdf.setFillColor(brandBlue);
  pdf.setDrawColor(brandBlue);
  pdf.roundedRect(pageWidth - left - 120, cursorY, 120, 30, 0, 0, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor("#ffffff");
  pdf.textWithLink("Pay Online", pageWidth - left - 60, cursorY + 18, {
    align: "center",
    url: paymentUrl,
  });

  cursorY += lineSpace;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor("#111827");
  pdf.text(invoice.projectReference, left, cursorY);

  cursorY += lineSpace;
  if (projectAddressLines.length > 0) {
    pdf.setFontSize(10);
    pdf.setTextColor("#111827");
    for (const line of projectAddressLines) {
      const wrappedLines = pdf.splitTextToSize(line, pageWidth - left * 2 - 140);
      pdf.text(wrappedLines, left, cursorY);
      cursorY += lineSpace * wrappedLines.length;
    }
    pdf.setFontSize(10);
    pdf.setTextColor("#111827");
  }

  if (invoice.poNumber) {
    pdf.text(`PO Number: ${invoice.poNumber}`, left, cursorY);
    cursorY += lineSpace;
  }

  cursorY += lineSpace;

  autoTable(pdf, {
    startY: cursorY,
    head: [["Description", "% Complete", "Contract", "Current"]],
    body: invoice.lineItems.map((item) => [
      item.description,
      `${item.percentComplete}%`,
      formatCurrency(item.contractAmountCents),
      formatCurrency(item.amountCents),
    ]),
    styles: {
      fontSize: 10,
      cellPadding: 6,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [28, 61, 90],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 250 },
      1: { cellWidth: 85, halign: "center" },
      2: { cellWidth: 85, halign: "center" },
      3: { cellWidth: 85, halign: "center" },
    },
    margin: { left, right: left },
  });

  const finalY =
    (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? cursorY;
  cursorY = finalY + 24;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(brandNavy);
  pdf.text("Current work total", secondColumnX, cursorY);
  pdf.text(formatCurrency(invoice.subtotalCents), pageWidth - left, cursorY, {
    align: "right",
  });
  if (invoice.previouslyBilledCents > 0) {
    cursorY += 16;
    pdf.text("Previously billed", secondColumnX, cursorY);
    pdf.text(
      `(${formatCurrency(invoice.previouslyBilledCents)})`,
      pageWidth - left,
      cursorY,
      { align: "right" },
    );
  }
  cursorY += 10;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(secondColumnX, cursorY, pageWidth - left, cursorY);
  cursorY += 18;
  pdf.setFontSize(14);
  pdf.text("AMOUNT DUE", secondColumnX, cursorY);
  pdf.text(formatCurrency(invoice.totalCents), pageWidth - left, cursorY, {
    align: "right",
  });

  if (invoice.status === "paid") {
    cursorY += lineSpace;
    pdf.setFontSize(10);
    pdf.setTextColor("#16a34a");
    pdf.text("PAID", secondColumnX, cursorY);
    pdf.text(formatDate(invoice.paidDate) || "", pageWidth - left, cursorY, {
      align: "right",
    });
  }

  if (invoice.status === "void") {
    cursorY += lineSpace;
    pdf.setFontSize(10);
    pdf.setTextColor("#dc2626");
    pdf.text("VOID", secondColumnX, cursorY);
    pdf.text(formatDate(invoice.voidDate) || "", pageWidth - left, cursorY, {
      align: "right",
    });
  }

  cursorY += 34;

  if (invoice.notes) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(brandNavy);
    pdf.text("Notes", left, cursorY);
    cursorY += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor("#111827");
    pdf.text(
      pdf.splitTextToSize(invoice.notes, pageWidth - left * 2),
      left,
      cursorY,
    );
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor("#232832");
  pdf.text(
    "Thank you for your business! We accept debit cards, credit cards, bank payments, and checks.",
    pageWidth / 2,
    725,
    { align: "center", maxWidth: pageWidth - left * 2 },
  );

  return pdf;
}

export function getInvoicePdfFilename(invoice: Invoice): string {
  return `${sanitizeFilenamePart(invoice.invoiceNumber)}.pdf`;
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  paymentUrl: string,
): Promise<void> {
  const pdf = await createInvoicePdf(invoice, paymentUrl);
  pdf.save(getInvoicePdfFilename(invoice));
}

export async function openInvoicePdfPreview(
  invoice: Invoice,
  paymentUrl: string,
): Promise<boolean> {
  const pdf = await createInvoicePdf(invoice, paymentUrl);
  const previewBlob = pdf.output("blob");
  const previewUrl = URL.createObjectURL(previewBlob);
  const previewWindow = window.open(
    previewUrl,
    "_blank",
    "noopener,noreferrer",
  );

  if (!previewWindow) {
    URL.revokeObjectURL(previewUrl);
    return false;
  }

  setTimeout(() => {
    URL.revokeObjectURL(previewUrl);
  }, 60_000);

  return true;
}

export async function createInvoicePdfAttachment(
  invoice: Invoice,
  paymentUrl: string,
): Promise<InvoiceEmailAttachment> {
  const pdf = await createInvoicePdf(invoice, paymentUrl);
  const dataUri = pdf.output("datauristring");
  return {
    filename: getInvoicePdfFilename(invoice),
    data: dataUri.split(",")[1] || "",
    mimetype: "application/pdf",
  };
}
