import { type ProjectInformation } from "../ClosureReportGenerator"
import { Button } from "cfdg/input"
import * as scripts from "cfdg/scripts"
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'

export function Preview({
    onBack,
    projectData

}: {
    onBack: () => void,
    projectData: ProjectInformation
}) {

    const fileName = `${projectData.projectNumber} ${projectData.projectName} - Closure Report ${scripts.Dates.formatDate(projectData.submittalDate, "yyyy.MM.dd")}.docx`;


    const loadFile = async (url: string): Promise<ArrayBuffer> => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength === 0) {
            throw new Error('Template file is empty.');
        }
        return buffer;
    };

    async function generateClosureReport(reportData?: ProjectInformation): Promise<void> {
        try {
            if (!reportData) {
                throw new Error('Missing report data.');
            }

            reportData.submittalDate = scripts.Dates.formatDate(reportData.submittalDate, "MM.dd.yyyy");

            const basePath = (import.meta as any).env.BASE_URL || '/';
            const baseUrl = new URL(basePath, window.location.origin);
            const templateUrl = new URL('templates/lot-closure-report.docx', baseUrl);
            const content = await loadFile(templateUrl.toString());

            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: (part: any) => part.value ?? '',
            });

            doc.render(reportData);

            const blob = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            saveAs(blob, `${fileName || 'Lot_Closure_Report.docx'}`);
        } catch (err: any) {
            console.error(err);
            // You can throw or return error — or call setError if you pass a setter
        }
    }

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl text-center font-bold mb-4">Step 3: Preview and Export</h1>
            <section>
                <div className="mb-6 p-4 border border-gray-300 rounded-md">
                    <p><strong>File name:</strong> {fileName}</p>
                </div>
            </section>
            <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-300 rounded-md">
                    <h2 className="text-lg font-semibold mb-2">Project Information</h2>
                    <p><strong>Project Number:</strong> {projectData.projectNumber}</p>
                    <p><strong>Project Name:</strong> {projectData.projectName}</p>
                    <br />
                    <p><strong>Application Number:</strong> {projectData.applicationNumber}</p>
                    <p><strong>Submittal Number:</strong> {projectData.submittalNumber}</p>
                    <p><strong>Submittal Date:</strong> {scripts.Dates.formatDate(projectData.submittalDate, "MM.dd.yyyy")}</p>
                    <h2 className="text-lg font-semibold mt-4 mb-2">Client Information</h2>
                    <p><strong>Client Name:</strong> {projectData.clientName}</p>
                    <p><strong>Client Address:</strong> {projectData.clientAddress}</p>
                    <p><strong>Client City, ST ZIP:</strong> {projectData.clientCity}, {projectData.clientState} {projectData.clientZip}</p>
                    <h2 className="text-lg font-semibold mt-4 mb-2">Preparer Information</h2>
                    <p><strong>Preparer Name:</strong> {projectData.preparerName}</p>
                    <p><strong>Surveyor Name:</strong> {projectData.surveyorName}</p>
                </div>
                <textarea
                    readOnly
                    className="w-full h-[60vh] p-4 border border-gray-300 rounded-md font-mono text-sm"
                    value={projectData.report}
                >

                </textarea>
            </section>
            <section>
                <div className="flex justify-between">
                    <Button colorMode="auto"
                        label="Previous Stage"
                        style="secondary"
                        onClick={onBack}
                    />
                    <Button colorMode="auto"
                        label="Export Closure Report"
                        style="primary"
                        onClick={() => generateClosureReport(projectData)}
                    />
                </div>
            </section>
        </div>
    )
}