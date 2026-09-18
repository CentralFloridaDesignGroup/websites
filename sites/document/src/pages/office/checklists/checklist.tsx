import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { CircleCheck, CircleX, Download } from "lucide-react"
import { WorkInProgressComponent } from "cfdg/layout";
import { Button } from "cfdg/input"
import ChecklistItem from "./components/ChecklistItem"
import { type ReviewData } from "./createChecklistPdf"
import disclaimer from "./disclaimer.json" with { type: "json" };

type ExportReviewData = ReviewData & { isFinal: boolean };

interface ChecklistMeta {
    Title?: string;
    Category?: string;
    WIP?: boolean;
}

interface ChecklistConfig {
    breadcrumbName?: string;
}

export default function Checklist() {
    const { checklistType, "*": checklistPath } = useParams();
    const resolvedChecklistType = checklistType || checklistPath;
    return <ChecklistReview key={resolvedChecklistType} checklistType={resolvedChecklistType} />;
}

function ChecklistReview({ checklistType }: { checklistType?: string }) {
    const [noEntries, setNoEntries] = useState<string[]>([]);
    const [naEntries, setNaEntries] = useState<string[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [meta, setMeta] = useState<ChecklistMeta>({});
    const [config, setConfig] = useState<ChecklistConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isReviewerModalOpen, setIsReviewerModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        // Load checklist JSON from public/checklists
        const loadChecklist = async () => {
            try {
                if (!checklistType) {
                    setError('Checklist type is missing');
                    setLoading(false);
                    return;
                }

                const response = await fetch(`/checklists/${checklistType}.json`, { cache: 'no-cache', signal: controller.signal });
                if (!response.ok) {
                    setError(`Checklist type "${checklistType}" not found`);
                    setLoading(false);
                    return;
                }

                const module = await response.json();
                if (controller.signal.aborted) return;
                setSections(module.Sections || []);
                setMeta(module.Meta || {});
                setConfig({ breadcrumbName: module?.Meta?.Title });
                setLoading(false);
            } catch (err: Error | any) {
                if (controller.signal.aborted) return;
                console.error('Error loading checklist:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadChecklist();
        return () => controller.abort();
    }, [checklistType]);

    useEffect(() => {
        if (config && meta && meta.Title) {
            document.title = `${meta.Title} - The Compass`;
        }
    }, [config, meta, checklistType]);

    const handlePrint = () => {
        setExportError(null);
        setIsReviewerModalOpen(true);
    };

    const onStatusChange = useCallback((itemId: string, status: string) => {
        if (status === 'no') {
            setNoEntries(prev => {
                if (!prev.includes(itemId)) {
                    return [...prev, itemId];
                }
                return prev;
            });
            setNaEntries(prev => prev.filter(id => id !== itemId));
        } else if (status === 'na') {
            setNaEntries(prev => {
                if (!prev.includes(itemId)) {
                    return [...prev, itemId];
                }
                return prev;
            });
            setNoEntries(prev => prev.filter(id => id !== itemId));
        } else {
            setNoEntries(prev => prev.filter(id => id !== itemId));
            setNaEntries(prev => prev.filter(id => id !== itemId));
        }
    }, []);

    const onNoteChange = useCallback((itemId: string, reason: string) => {
        setSections(prevSections => {
            return prevSections.map(section => {
                return {
                    ...section,
                    items: section.items.map((item: any) => {
                        if ((item.id ?? item.title) === itemId) {
                            return { ...item, reason };
                        }
                        return item;
                    })
                };
            });
        });
    }, []);

    const handleSaveReview = async (review: ExportReviewData, action: "download" | "preview" = "download") => {
        if (exporting) return;
        // Open during the click event, before loading jsPDF, to avoid popup blocking.
        const previewWindow = action === "preview" ? window.open("about:blank", "_blank") : null;
        if (action === "preview" && !previewWindow) {
            setExportError("Allow pop-ups for this site to preview the PDF.");
            return;
        }
        if (previewWindow) previewWindow.opener = null;
        let previewUrl: string | null = null;
        setExporting(true);
        setExportError(null);
        try {
            const { createChecklistPdf, checklistPdfFilename } = await import("./createChecklistPdf");
            const pdf = createChecklistPdf({ meta: { ...meta, WIP: meta.WIP || !review.isFinal }, sections, noEntries, naEntries, review });
            if (previewWindow) {
                if (previewWindow.closed) return;
                previewUrl = URL.createObjectURL(pdf.output("blob"));
                previewWindow.location.replace(previewUrl);
                const url = previewUrl;
                // Keep the blob available for the viewer's save/reload actions.
                const cleanup = window.setInterval(() => {
                    if (previewWindow.closed) {
                        URL.revokeObjectURL(url);
                        window.clearInterval(cleanup);
                    }
                }, 1000);
            } else {
                await pdf.save(checklistPdfFilename(meta.Title || "Checklist", review.jobNumber), { returnPromise: true });
                setIsReviewerModalOpen(false);
            }
        } catch (error) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewWindow?.close();
            console.error("Checklist PDF export failed:", error);
            setExportError("The PDF could not be created. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    if (error || (!config && !loading)) {
        return (
            <div className="mx-auto w-full max-w-7xl p-6">
                <h2 className="text-3xl font-semibold text-red-600 text-center">Checklist not found</h2>
                <p className="text-center mt-4">{error || `The checklist type "${checklistType}" is not configured.`}</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-7xl p-6">
                <p className="text-center">Loading checklist...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Normal Screen View */}
            <div className="screen-only">
                <div className="mx-auto w-full max-w-7xl space-y-6">
                    <aside aria-label={disclaimer.title} className="rounded-md border border-gray-300 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                        <p className="mb-1 font-semibold">{disclaimer.title}</p>
                        <p>{disclaimer.body}</p>
                    </aside>
                    {meta.WIP && <WorkInProgressComponent />}
                    <h2 className="text-3xl font-semibold text-gray-900 text-center mb-0 pb-2 dark:text-white">{meta.Title}</h2>
                    <p className="text-xl font-semibold text-gray-900 text-center dark:text-white">{meta.Category}</p>
                    <div className={`p-4 border flex items-center justify-between gap-4 rounded-md ${noEntries.length > 0 ? 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800' : 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800'}`}>
                        <div className="flex items-center gap-2">
                            {noEntries.length > 0 ? (
                                <CircleX className="w-8 h-8 text-red-500" />
                            ) : (
                                <CircleCheck className="w-8 h-8 text-green-500" />
                            )}
                            {noEntries.length > 0 ? (
                                <p className="text-red-500 text-lg dark:text-red-400">There are <b>{noEntries.length}</b> items not meeting requirements.</p>
                            ) : (
                                <p className="text-green-500 text-lg dark:text-green-400">All requirements are met.</p>
                            )}
                        </div>
                        <div className="gap-4 flex flex-col md:flex-row">
                            <Button colorMode="auto"
                                onClick={handlePrint}
                                label="Export PDF"
                                icon={Download}
                                style="primary"
                            />
                        </div>
                    </div>
                    {sections.map((section, index) => (
                        <div key={index} className="space-y-4 border p-4 rounded-md">
                            <h3 className="text-3xl font-semibold text-gray-800 text-center dark:text-white">Section {index + 1}. {section.title}</h3>
                            {section.subtitle && <h4 className="text-xl font-semibold text-gray-600 text-center dark:text-gray-400">{section.subtitle}</h4>}
                            <div className="grid grid-cols-1 gap-4">
                                {section.items.map((item: any, itemIndex: number) => (
                                    <ChecklistItem key={item.id ?? item.title} item={item} checklistItem={itemIndex} onStatusChange={onStatusChange} onNoteChange={onNoteChange} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ReviewerModal defaultFinal={noEntries.length === 0} isOpen={isReviewerModalOpen} exporting={exporting} error={exportError} onClose={() => { if (!exporting) setIsReviewerModalOpen(false); }} onSave={handleSaveReview} />
        </div>
    )
}

const ReviewerModal = ({ defaultFinal, isOpen, exporting, error, onClose, onSave }: { defaultFinal: boolean; isOpen: boolean; exporting: boolean; error: string | null; onClose: () => void; onSave: (data: ExportReviewData, action?: "download" | "preview") => Promise<void> }) => {
    const [reviewer, setReviewer] = useState('');
    const [jobNumber, setJobNumber] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const [isFinal, setIsFinal] = useState(defaultFinal);

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setReviewer('');
            setJobNumber('');
            setDate('');
            setNotes('');
            setIsFinal(defaultFinal);
        }
    }, [isOpen, defaultFinal]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 id="review-dialog-title" className="text-2xl font-semibold mb-4 text-center">Export Checklist PDF</h2>
                <div className="-space-y-px mb-6">
                    <div className="rounded-t-md bg-white dark:bg-gray-800 px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 focus-within:relative focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-nile-blue">
                        <label htmlFor="reviewer-name" className="block text-xs font-medium text-gray-900 dark:text-gray-200">
                            Reviewer Name
                        </label>
                        <input
                            id="reviewer-name"
                            name="reviewer-name"
                            type="text"
                            placeholder="Jane Smith"
                            className="block w-full bg-transparent text-gray-900 dark:text-gray-100 dark:[color-scheme:dark] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none sm:text-sm/6"
                            value={reviewer}
                            onChange={(e) => setReviewer(e.target.value)}
                        />
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 focus-within:relative focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-nile-blue">
                        <label htmlFor="job-number" className="block text-xs font-medium text-gray-900 dark:text-gray-200">
                            Job Number
                        </label>
                        <input
                            id="job-number"
                            name="job-number"
                            type="text"
                            placeholder="##-####"
                            className="block w-full bg-transparent text-gray-900 dark:text-gray-100 dark:[color-scheme:dark] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none sm:text-sm/6"
                            value={jobNumber}
                            onChange={(e) => setJobNumber(e.target.value)}
                        />
                    </div>
                    <div className='bg-white dark:bg-gray-800 px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 focus-within:relative focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-nile-blue'>
                        <label htmlFor="job-review-date" className="block text-xs font-medium text-gray-900 dark:text-gray-200">
                            Review Date
                        </label>
                        <input
                            id="job-review-date"
                            name="job-review-date"
                            type="date"
                            className="block w-full bg-transparent text-gray-900 dark:text-gray-100 dark:[color-scheme:dark] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none sm:text-sm/6"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className="rounded-b-md bg-white dark:bg-gray-800 px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 focus-within:relative focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-nile-blue">
                        <label htmlFor="review-comments" className="block text-xs font-medium text-gray-900 dark:text-gray-200">
                            Review Comments
                        </label>
                        <textarea
                            id="review-comments"
                            name="review-comments"
                            placeholder="Enter your comments"
                            rows={4}
                            className="block w-full bg-transparent text-gray-900 dark:text-gray-100 dark:[color-scheme:dark] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none sm:text-sm/6 resize-y"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <label className="mb-4 flex items-start gap-3 text-sm text-gray-900 dark:text-gray-100">
                    <input
                        type="checkbox"
                        checked={isFinal}
                        onChange={event => setIsFinal(event.target.checked)}
                        disabled={exporting}
                        className="mt-0.5 h-4 w-4 accent-nile-blue dark:accent-blue-400 dark:[color-scheme:dark]"
                    />
                    <span>
                        <span className="font-semibold">Final review</span>
                        <span className="block text-gray-600 dark:text-gray-400">Uncheck to label the PDF as draft / work in progress. Draft source checklists remain draft even for a final review.</span>
                    </span>
                </label>
                {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex flex-wrap justify-between gap-4">
                    <Button colorMode="auto" style="secondary" properties={{ disabled: exporting }} onClick={onClose} label="Cancel" />
                    <Button colorMode="auto" style="secondary" properties={{ disabled: exporting }} onClick={() => { void onSave({ reviewer, jobNumber, date, notes, isFinal }, "preview"); }} label="Preview PDF" />
                    <Button colorMode="auto" style="primary" properties={{ disabled: exporting }} onClick={() => { void onSave({ reviewer, jobNumber, date, notes, isFinal }); }} label={exporting ? "Creating PDF..." : "Download PDF"} />
                </div>
            </div>
        </div>
    );
}
