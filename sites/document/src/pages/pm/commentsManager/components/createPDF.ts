import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showNotification } from 'cfdg/layout';
import { type CommentStatus, type ReviewPackage } from 'cfdg/types';

type PdfCommentEntry = {
  commentId: string;
  department: string;
  status: CommentStatus;
  comment: string;
  response: string;
};

function loadImageAsPngDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Canvas context unavailable.'));
        return;
      }

      context.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function createPdfReport(selectedPackage: ReviewPackage, sortedComments: PdfCommentEntry[]): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const left = 54;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const rootStyles = getComputedStyle(document.documentElement);
  const primaryHex = rootStyles.getPropertyValue('--color-primary').trim() || '#000000';
  let cursorY = 90;

  try {
    const logo = await loadImageAsPngDataUrl('/White_Point_Logo_Name.webp');
    const logoWidth = 250;
    const logoHeight = logoWidth / 3;
    const logoX = (pageWidth - logoWidth) / 2;
    pdf.addImage(logo, 'PNG', logoX, 28, logoWidth, logoHeight);
    cursorY = logoHeight + 60;
  } catch {
    // Continue without a logo when the image cannot be loaded.
  }

  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryHex);
  pdf.text('Comment Response Report', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 40;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#000000');
  pdf.text(`Project #: ${selectedPackage.projectNumber || ''}`, left, cursorY);
  cursorY += 20;
  pdf.text(`Project Name: ${selectedPackage.projectName || ''}`, left, cursorY);
  cursorY += 20;
  pdf.text(`Municipal #: ${selectedPackage.municipalNumber || ''}`, left, cursorY);
  cursorY += 20;
  pdf.text(`Review #: ${selectedPackage.reviewNumber || ''}`, left, cursorY);
  cursorY += 20;
  pdf.text(`Review Date: ${selectedPackage.reviewDate || ''}`, left, cursorY);
  cursorY += 20;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Comments:', left, cursorY);
  cursorY += 16;

  pdf.setFont('helvetica', 'normal');
  const packageComment = selectedPackage.comment?.trim() || 'None';
  const wrappedComment = pdf.splitTextToSize(packageComment, pageWidth - left * 2);
  pdf.text(wrappedComment, left, cursorY);

  pdf.addPage();

  const tableMarginLeft = 40;
  const tableMarginRight = 40;
  const tableContentWidth = pageWidth - tableMarginLeft - tableMarginRight;

  const statusLabels: Record<CommentStatus, string> = {
    open: 'Open',
    closed: 'Closed',
    answered: 'Answered',
    'further information': 'Further Information',
    'not a comment': 'Not a Comment',
  };

  const statusColors: Partial<Record<CommentStatus, [number, number, number]>> = {
    open: [254, 226, 226],
    closed: [243, 244, 246],
    'further information': [254, 243, 199],
    'not a comment': [219, 234, 254],
  };

  const tableBody: Array<Array<string | { content: string; colSpan: number; styles: Record<string, unknown> }>> = [];

  sortedComments.forEach((entry, index) => {
    const currentDepartment = entry.department.trim() || 'General Comments';
    const previousDepartment = index > 0 ? sortedComments[index - 1].department.trim() || 'General Comments' : null;
    const isNewDepartment = index === 0 || currentDepartment.toLowerCase() !== (previousDepartment || '').toLowerCase();

    if (isNewDepartment) {
      tableBody.push([
        {
          content: `${currentDepartment.includes('General Comments') ? currentDepartment : `${currentDepartment} Department`}`,
          colSpan: 4,
          styles: {
            fillColor: [28, 61, 90],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
          },
        },
      ]);
    }

    tableBody.push([
      entry.commentId || '',
      statusLabels[entry.status] || entry.status,
      entry.comment || '',
      entry.response || '',
    ]);
  });

  autoTable(pdf, {
    startY: 54,
    head: [['#', 'Status', 'Comment', 'Response']],
    body: tableBody,
    styles: {
      fontSize: 10,
      cellPadding: 4,
      overflow: 'linebreak',
    },
    headStyles: {
      fontStyle: 'bold',
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: tableContentWidth * 0.05 },
      1: { cellWidth: tableContentWidth * 0.18 },
      2: { cellWidth: tableContentWidth * 0.39 },
      3: { cellWidth: tableContentWidth * 0.38 },
    },
    margin: {
      left: tableMarginLeft,
      right: tableMarginRight,
    },
    didParseCell: (data) => {
      if (data.section !== 'body') {
        return;
      }

      if (data.column.index === 1) {
        const row = data.row.raw as string[];
        const statusLabel = (row[1] || '').toLowerCase();
        const statusKey = statusLabel === 'further information'
          ? 'further information'
          : statusLabel === 'not a comment'
            ? 'not a comment'
            : statusLabel === 'answered'
              ? 'answered'
              : statusLabel === 'closed'
                ? 'closed'
                : 'open';
        const fillColor = statusColors[statusKey as CommentStatus];
        if (fillColor) {
          data.cell.styles.fillColor = fillColor;
        }
      }
    },
  });

  const previewBlob = pdf.output('blob');
  const previewUrl = URL.createObjectURL(previewBlob);
  const previewWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');

  if (!previewWindow) {
    URL.revokeObjectURL(previewUrl);
    showNotification({
      title: 'Preview Blocked',
      body: 'Enable pop-ups for this site to preview the PDF.',
      style: 'warning',
    });
    return;
  }

  setTimeout(() => {
    URL.revokeObjectURL(previewUrl);
  }, 60_000);
}