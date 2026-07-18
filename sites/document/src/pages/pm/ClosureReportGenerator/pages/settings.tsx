import { useState, useEffect } from "react"
import { Button, Textbox } from "@wps/input"
import { type ProjectInformation } from "../ClosureReportGenerator"
import { Upload, X } from "lucide-react"

export function Settings({
    onNext,
    onBack,
    onInformationChange,
    reportInfo
}: {
    onNext: () => void,
    onBack: () => void,
    onInformationChange: (info: ProjectInformation) => void,
    reportInfo?: ProjectInformation
}) {
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [errorMessage, setErrorMessage] = useState("");
    const [projectInfo, setProjectInfo] = useState<ProjectInformation>({
        projectName: '',
        projectNumber: '',
        applicationNumber: '',
        submittalNumber: '',
        submittalDate: '',
        clientName: '',
        clientAddress: '',
        clientCity: '',
        clientState: '',
        clientZip: '',
        preparerName: '',
        surveyorName: '',
        report: ''
    });

    useEffect(() => {
        document.title = "Closure Report Processor - The Compass";
        if (reportInfo) {
            setProjectInfo(reportInfo);
        }
    }, [reportInfo]);

    function formatReport(text: string): string {
        let formattedText = text.toUpperCase();

        formattedText = formattedText.replace(/�/g, '°')
            .replace(/NAME: STANDARD : /g, 'LOT ')
            .replace(/NAME:\s+TRACT/g, 'TRACT')
            .replace(/(N|S)(\d{2}°) (\d{2}') (\d{2}")(W|E)/g, "$1$2$3$4$5")
            .replace(/(CLOSURE:)\s+/g, "$1 ")
            .replace(/SEGMENT #(\d+) {2}: {2}(LINE|CURVE)/g, 'SEGMENT #$1: $2')
            .replace(/ERROR NORTH:\s+/g, 'ERROR NORTH: ')
            .replace(/(?:(?:\s*\r?\n){2})(ERROR CLOSURE: \d+\.\d+)\s+COURSE:/g, '\r\n$1 @')
            .replace(/PRECISION\s+1: /g, 'PRECISION: 1:')
            .replace(/(?:\s*\r?\n)+\*{72}/g, '\r\n===============================')
            .replace(/\s+COURSE OUT/g, '\r\nCOURSE OUT')
            .replace(/\s+(AREA: .+)/gm, '\r\n$1')
            .replace(/(LOT|TRACT \d|\w+)\r\n\r\n/g, '$1\r\n')
            .replace(/((?:SEGMENT|COURSE|LENGTH|DELTA|CHORD|COURSE|RP|PERIMETER|ERROR).+$)((?:\s*\r?\n)+)/gm, '$1\r\n')
            .replace(/(NORTH.+$)((?:\s*\r?\n)+)(SEGMENT|PERIMETER)/gm, '$1\r\n\r\n$3')
            .replace(/(NORTH: \d+\.\d+')\s+(EAST)/g, '$1\t$2')
            .replace(/(LENGTH: \d+\.\d+')\s+(RADIUS)/g, '$1\t\t$2')
            .replace(/(CHORD: \d+\.\d+')\s+(COURSE)/g, '$1\t\t$2')
            .replace(/(DELTA: \d+°\d+'\d+")\s+(TANGENT)/g, '$1\t\t$2')
            .replace(/(COURSE: \S+)\s+(LENGTH)/g, '$1\t$2')
            .replace(/(ERROR NORTH: -?\d+\.\d+)\s+(EAST)/g, '$1\t$2');

        return formattedText;
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        const filename = selectedFile.name.toLowerCase();

        if (!filename.endsWith(".txt")) {
            alert("Please select a .txt file");
            return;
        }

        setFile(selectedFile);

        // Read file content
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            onValueChange("report", formatReport(content));
        };
        reader.readAsText(selectedFile);
    }

    function handleFileDrop(event: React.DragEvent<HTMLLabelElement>): void {
        event.preventDefault();
        setIsDragging(false);
        const droppedFile = event.dataTransfer.files?.[0];
        if (!droppedFile) return;

        if (!droppedFile.name.toLowerCase().endsWith('.txt')) {
            setErrorMessage('Only .txt files from Civil 3D Mapcheck are allowed.');
            return;
        }

        setErrorMessage('');
        setFile(droppedFile);

        const reader = new FileReader();
        reader.onload = (dropEvent) => {
            const content = dropEvent.target?.result as string;
            onValueChange("report", formatReport(content));
        };
        reader.readAsText(droppedFile);
    }

    function clearAll() {
        setFile(null);
        setErrorMessage("");
    }

    function onValueChange(field: string, value: string) {
        const nextInfo = {
            ...projectInfo,
            [field]: value
        };
        setProjectInfo(nextInfo);
        onInformationChange(nextInfo);
    };

    function validateNextStep(): void {
        if (!projectInfo.projectName || !projectInfo.projectNumber || !projectInfo.applicationNumber || !projectInfo.submittalNumber || !projectInfo.submittalDate || !projectInfo.clientName || !projectInfo.clientAddress || !projectInfo.clientCity || !projectInfo.clientState || !projectInfo.clientZip || !projectInfo.preparerName || !projectInfo.surveyorName || !file) {
            setErrorMessage("Please fill in all required project information fields before proceeding.");
            return;
        }
        setErrorMessage("");
        console.log("Project Information:", projectInfo);
        onNext();
    }

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl text-center font-bold mb-4">Step 2: Enter Project Information</h1>
            {errorMessage && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
            )}
            <section>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <Textbox colorMode="auto"
                            field="submittalDate"
                            label="Submittal Date"
                            onValidChange={onValueChange}
                            type="date"
                            required
                            defaultValue={projectInfo.submittalDate || ''}
                        />
                    </div>
                    <div>
                        <Textbox colorMode="auto"
                            field="projectNumber"
                            label="Project Number"
                            onValidChange={onValueChange}
                            required
                            defaultValue={projectInfo.projectNumber || ''}
                        />
                    </div>
                    <div className="col-span-2">
                        <Textbox colorMode="auto"
                            field="projectName"
                            label="Project Name"
                            onValidChange={onValueChange}
                            required
                            defaultValue={projectInfo.projectName || ''}
                        />
                    </div>
                    <div>
                        <Textbox colorMode="auto"
                            field="applicationNumber"
                            label="Application Number"
                            onValidChange={onValueChange}
                            required
                            defaultValue={projectInfo.applicationNumber || ''}
                        />
                    </div>
                    <div>
                        <Textbox colorMode="auto"
                            field="submittalNumber"
                            label="Submittal Number"
                            onValidChange={onValueChange}
                            required
                            defaultValue={projectInfo.submittalNumber || ''}
                        />
                    </div>
                    <div>
                        <Textbox colorMode="auto"
                            field="preparerName"
                            label="Preparer Name"
                            onValidChange={onValueChange}
                            required
                            defaultValue={projectInfo.preparerName || ''}
                        />
                    </div>
                    <div>
                        <Textbox colorMode="auto"
                            field="surveyorName"
                            label="Surveyor Name"
                            onValidChange={onValueChange}
                            required
                            defaultValue={projectInfo.surveyorName || ''}
                        />
                    </div>
                    <h2 className="text-lg font-semibold col-span-4 mt-2 mb-2 text-center">Client Information</h2>
                    <div className="col-span-2">
                        <Textbox colorMode="auto"
                            field="clientName"
                            label="Client Name"
                            defaultValue={projectInfo.clientName || ''}
                            onValidChange={onValueChange}
                            required
                        />
                    </div>
                    <div className="col-span-2">
                        <Textbox colorMode="auto"
                            field="clientAddress"
                            label="Client Address"
                            defaultValue={projectInfo.clientAddress || ''}
                            onValidChange={onValueChange}
                            required
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <div>
                        <Textbox colorMode="auto"
                            field="clientCity"
                            label="Client City"
                            defaultValue={projectInfo.clientCity || ''}
                            onValidChange={onValueChange}
                            required
                        />
                    </div>
                    <div>
                        <Textbox colorMode="auto"
                            field="clientState"
                            label="Client State"
                            defaultValue={projectInfo.clientState || ''}
                            onValidChange={onValueChange}
                            required
                        />
                    </div>
                    <div>
                        <Textbox colorMode="auto"
                            field="clientZip"
                            label="Client Zip"
                            defaultValue={projectInfo.clientZip || ''}
                            onValidChange={onValueChange}
                            required
                        />
                    </div>
                </div>
            </section >
            <section className="bg-white rounded-lg shadow p-6 mb-6 mt-6">
                <div className="relative">
                    <input
                        type="file"
                        accept=".txt"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-input"
                    />
                    <label
                        htmlFor="file-input"
                        onDragEnter={() => setIsDragging(true)}
                        onDragOver={(event) => {
                            event.preventDefault();
                            if (!isDragging) {
                                setIsDragging(true);
                            }
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleFileDrop}
                        className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg p-8 cursor-pointer transition ${isDragging
                            ? 'border-nile-blue bg-blue-50'
                            : 'border-gray-300 hover:border-nile-blue hover:bg-blue-50'
                            }`}
                    >
                        <Upload className="w-12 h-12 text-gray-400 mb-2" />
                        <span className="text-lg font-medium text-gray-700">
                            Click to upload or drag and drop
                        </span>
                        <span className="text-sm text-gray-500 mt-1">
                            Supported formats: .txt
                        </span>
                    </label>
                </div>

                {file && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                        <div>
                            <p className="font-medium text-green-900">{file.name}</p>
                            <p className="text-sm text-green-700">
                                Format: TXT • Size: {(file.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                        <button
                            onClick={clearAll}
                            className="text-green-600 hover:text-green-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </section>
            <section>
                <div className="flex justify-between">
                    <Button colorMode="auto"
                        label="Previous Stage"
                        style="secondary"
                        onClick={onBack}
                    />
                    <Button colorMode="auto"
                        label="Next Stage"
                        style="primary"
                        onClick={validateNextStep}
                    />
                </div>
            </section>
        </div >
    )
}