import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

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
    builtPackage: any
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

    doc.render(builtPackage);

    const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const fileName = `${builtPackage.projectNumber || 'Proposal'} ${builtPackage.projectName || ''}.docx`.trim();
    saveAs(blob, fileName);
}
