import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import type { ClientInfo, TemplateEntry } from '../types/noteEntry';

function buildScopeOfWork(phases: TemplateEntry[]): string {
    return phases.map((phase, index) => {
        const phaseNum = (index + 1).toString().padStart(2, '0');
        const lines: string[] = [`PHASE ${phaseNum}: ${phase.name.toUpperCase()}`];

        const language = phase.formattedLanguage ?? phase.language;
        language.forEach(lang => {
            lines.push('');
            if (lang.type === 'paragraph') {
                lines.push(lang.content as string);
            } else if (lang.type === 'list-numbered') {
                (lang.content as string[]).forEach((item, i) => lines.push(`${i + 1}. ${item}`));
            } else if (lang.type === 'list-bulleted') {
                (lang.content as string[]).forEach(item => lines.push(`• ${item}`));
            }
        });

        return lines.join('\n');
    }).join('\n\n');
}

async function loadTemplate(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
        throw new Error('Template file is empty.');
    }
    return buffer;
}

export async function generateWordDocument(
    clientInfo: ClientInfo,
    phases: TemplateEntry[]
): Promise<void> {
    const basePath = (import.meta as any).env.BASE_URL || '/';
    const baseUrl = new URL(basePath, window.location.origin);
    const templateUrl = new URL('templates/project-proposal.docx', baseUrl);
    const content = await loadTemplate(templateUrl.toString());

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: (part: any) => part.value ?? '',
    });

    doc.render({
        ...clientInfo,
        scopeOfWork: buildScopeOfWork(phases),
    });

    const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const fileName = `${clientInfo.projectNumber || 'Proposal'} ${clientInfo.projectName || ''} - Proposal.docx`.trim();
    saveAs(blob, fileName);
}

export function generatePdfDocument(
    clientInfo: ClientInfo,
    phases: TemplateEntry[]
): void {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 54;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (needed: number) => {
        if (y + needed > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
        }
    };

    const addText = (
        text: string,
        fontSize: number,
        fontStyle: 'normal' | 'bold' | 'italic',
        color: [number, number, number] = [0, 0, 0],
        indent = 0
    ) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, contentWidth - indent);
        checkPageBreak(lines.length * (fontSize * 1.4));
        doc.text(lines, margin + indent, y);
        y += lines.length * (fontSize * 1.4);
    };

    const addSpacer = (height = 10) => { y += height; };
    const addRule = () => {
        checkPageBreak(6);
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
    };

    // Header
    doc.setFillColor(30, 58, 90);
    doc.rect(0, 0, pageWidth, 80, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('PROPOSAL FOR PROFESSIONAL SURVEYING SERVICES', margin, 48, { maxWidth: contentWidth });
    y = 100;

    // Client info
    addText('Client Information', 12, 'bold', [30, 58, 90]);
    addRule();

    const infoRows: [string, string][] = [
        ['Client', clientInfo.clientName],
        ['Contact', clientInfo.contactName],
        ['Address', clientInfo.clientAddressLine1],
        ['', clientInfo.clientAddressCityStZip],
        ['Phone', clientInfo.phone],
        ['Email', clientInfo.email],
    ];

    for (const [label, value] of infoRows) {
        checkPageBreak(16);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        if (label) doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '', margin + 90, y);
        y += 15;
    }

    addSpacer(12);

    // Project info
    addText('Project', 12, 'bold', [30, 58, 90]);
    addRule();

    const projectRows: [string, string][] = [
        ['Project #', clientInfo.projectNumber],
        ['Name', clientInfo.projectName],
        ['Date', clientInfo.proposalDate],
        ['Address', clientInfo.projectAddress],
        ['', clientInfo.projectJurisStZip],
        ['Parcel IDs', clientInfo.parcelIdList],
    ];

    for (const [label, value] of projectRows) {
        if (!value) continue;
        checkPageBreak(16);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        if (label) doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 90, y);
        y += 15;
    }

    addSpacer(12);

    // Scope of Work
    addText('Scope of Work', 12, 'bold', [30, 58, 90]);
    addRule();

    const intro = 'Based on our understanding of your needs, we have developed the detailed scope of work below. This scope of work is based on our professional opinion and advise to best service your goals.';
    addText(intro, 10, 'normal');
    addSpacer(10);

    phases.forEach((phase, index) => {
        const phaseNum = (index + 1).toString().padStart(2, '0');
        addText(`Phase ${phaseNum}: ${phase.name}`, 11, 'bold', [30, 58, 90]);
        addSpacer(4);

        const language = phase.formattedLanguage ?? phase.language;
        language.forEach(lang => {
            if (lang.type === 'paragraph') {
                addText(lang.content as string, 10, 'normal', [0, 0, 0]);
                addSpacer(6);
            } else if (lang.type === 'list-numbered') {
                (lang.content as string[]).forEach((item, i) => {
                    addText(`${i + 1}. ${item}`, 10, 'normal', [0, 0, 0], 12);
                    addSpacer(4);
                });
                addSpacer(4);
            } else if (lang.type === 'list-bulleted') {
                (lang.content as string[]).forEach(item => {
                    addText(`• ${item}`, 10, 'normal', [0, 0, 0], 12);
                    addSpacer(4);
                });
                addSpacer(4);
            }
        });

        addSpacer(8);
    });

    addSpacer(8);
    addText(
        'Note: This PDF is a summary. The full proposal document, including the fee schedule and Professional Services Agreement, is provided in the accompanying Word document.',
        9, 'italic', [100, 100, 100]
    );

    const fileName = `${clientInfo.projectNumber || 'Proposal'} ${clientInfo.projectName || ''} - Proposal.pdf`.trim();
    doc.save(fileName);
}
