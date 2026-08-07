import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { CircleCheck, CircleX, Printer } from "lucide-react"
import { WorkInProgressComponent } from "cfdg/layout";
import { Button } from "cfdg/input"
import ChecklistItem from "./components/ChecklistItem"

interface ChecklistMeta {
    Title?: string;
    Category?: string;
    WIP?: boolean;
}

interface ChecklistConfig {
    breadcrumbName?: string;
}

export default function BoundarySurveyChecklist() {
    const { checklistType } = useParams();
    const [noEntries, setNoEntries] = useState<string[]>([]);
    const [naEntries, setNaEntries] = useState<string[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [meta, setMeta] = useState<ChecklistMeta>({});
    const [config, setConfig] = useState<ChecklistConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isReviewerModalOpen, setIsReviewerModalOpen] = useState(false);
    const [includeComments, setIncludeComments] = useState(false);
    const [reviewData, setReviewData] = useState(null);
    const [printRequested, setPrintRequested] = useState(false);

    useEffect(() => {
        // Load checklist JSON from public/checklists
        const loadChecklist = async () => {
            try {
                if (!checklistType) {
                    setError('Checklist type is missing');
                    setLoading(false);
                    return;
                }

                const response = await fetch(`/checklists/${checklistType}.json`, { cache: 'no-cache' });
                if (!response.ok) {
                    setError(`Checklist type "${checklistType}" not found`);
                    setLoading(false);
                    return;
                }

                const module = await response.json();
                setSections(module.Sections || []);
                setMeta(module.Meta || {});
                setConfig({ breadcrumbName: module?.Meta?.Title });
                setLoading(false);
            } catch (err: Error | any) {
                console.error('Error loading checklist:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadChecklist();
    }, [checklistType]);

    useEffect(() => {
        if (config && meta && meta.Title) {
            document.title = `${meta.Title} - The Compass`;
        }
    }, [config, meta, checklistType]);

    const handlePrint = () => {
        setIncludeComments(true);
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
                        if (item.title === itemId) {
                            return { ...item, reason };
                        }
                        return item;
                    })
                };
            });
        });
    }, []);

    const handleSaveReview = (impReviewData: any) => {
        setReviewData(impReviewData);
        console.debug('Saved review data:', impReviewData);
        setPrintRequested(true);
        setIsReviewerModalOpen(false);
    };

    useEffect(() => {
        if (printRequested && !isReviewerModalOpen && reviewData) {
            const timer = setTimeout(() => {
                window.print();
                setPrintRequested(false);
            }, 50);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [printRequested, isReviewerModalOpen, reviewData]);

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
                    {meta.WIP && <WorkInProgressComponent />}
                    <h2 className="text-3xl font-semibold text-gray-900 text-center mb-0 pb-2 dark:text-white">{meta.Title}</h2>
                    <p className="text-xl font-semibold text-gray-900 text-center dark:text-white">{meta.Category}</p>
                    <div className={`p-4 border flex items-center justify-between gap-4 rounded-md ${noEntries.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-center gap-2">
                            {noEntries.length > 0 ? (
                                <CircleX className="w-8 h-8 text-red-500" />
                            ) : (
                                <CircleCheck className="w-8 h-8 text-green-500" />
                            )}
                            {noEntries.length > 0 ? (
                                <p className="text-red-500 text-lg dark:text-red-400">There are <b>{noEntries.length}</b> items not marked as not meeting requirements.</p>
                            ) : (
                                <p className="text-green-500 text-lg dark:text-green-400">All requirements are met.</p>
                            )}
                        </div>
                        <div className="gap-4 flex flex-col md:flex-row">
                            <Button colorMode="auto"
                                onClick={handlePrint}
                                label="Print Checklist"
                                icon={Printer}
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
                                    <ChecklistItem key={itemIndex} item={item} checklistItem={itemIndex} onStatusChange={onStatusChange} onNoteChange={onNoteChange} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Print View */}
            <div className="print-only">
                <PrintView sections={sections} noEntries={noEntries} naEntries={naEntries} meta={meta} reviewData={reviewData} />
            </div>

            <ReviewerModal isOpen={isReviewerModalOpen} includeComments={includeComments} onClose={() => setIsReviewerModalOpen(false)} onSave={handleSaveReview} />
        </div>
    )
}

const PrintView = ({ sections, noEntries, naEntries, meta, reviewData }: { sections: any[]; noEntries: string[]; naEntries: string[]; meta: any; reviewData: any }) => {

    const GetStatusDot = (item: any) => {
        if (noEntries.includes(item.title)) {
            return (
                <div className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full border-2 border-red-500 bg-red-50`}></span>
                    <span className={`text-sm font-medium text-red-600 dark:text-red-400`}>Not Met</span>
                </div>
            );
        } else if (naEntries.includes(item.title)) {
            return (
                <div className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full border-2 border-gray-500 bg-gray-50`}></span>
                    <span className={`text-sm font-medium text-gray-600 dark:text-gray-400`}>Not Applicable</span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full border-2 border-green-500 bg-green-500`}></span>
                    <span className={`text-sm font-medium text-green-600 dark:text-green-400`}>Met</span>
                </div>
            );
        }
    }

    const GetDenialNote = (item: any) => {
        if (noEntries.includes(item.title)) {
            return (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600 font-semibold dark:text-red-400">Denial Reason: </span>
                    <span className="text-sm text-gray-800 dark:text-gray-400">{item.reason || 'No reason provided.'}</span>
                </div>
            )
        };
        return null;
    }

    const convertDate = (dateString: string) => {
        if (!dateString || isNaN(Date.parse(dateString))) return 'N/A';
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const date = new Date(dateString);
        const correctedDate = new Date(date.getTime() + Math.abs(date.getTimezoneOffset() * 60000));
        return correctedDate.toLocaleDateString('en-US', options);
    }

    return (
        <div className="space-y-2 bg-white">
            <div className="text-center space-y-2">
                <img src="/White_Point_Logo_Name.svg" alt="White Point Survey" className="mx-auto h-16 mb-2 mt-4" />
                <p className="text-xl font-bold text-gray-900 mb-0 pb-2">{meta.Title}{meta.Category ? ` - ${meta.Category}` : ''}</p>
                <p className="text-gray-600 text-sm">
                    Generated on {new Date().toLocaleDateString()} |
                    {noEntries.length === 0 && <span className="text-green-600"> All items met</span>}
                    <span className="text-red-600">{noEntries.length > 0 && ` ${noEntries.length} items not met`}</span>
                </p>
                {reviewData && (
                    <section>
                        <div className="mt-20 mb-4 flex justify-between text-sm">
                            <p><span className="font-semibold w-full">Reviewer:</span> {reviewData.reviewer || 'N/A'}</p>
                            <p><span className="font-semibold w-full">Job Number:</span> {reviewData.jobNumber || 'N/A'}</p>
                            <p><span className="font-semibold w-full">Review Date:</span> {convertDate(reviewData.date) || 'N/A'}</p>
                        </div>
                        <div className="text-left break-after-page">
                            <p><span className="font-semibold text-sm">Reviewer Comments:</span></p>
                            <p className="whitespace-pre-line text-sm">{(reviewData.notes || '').trim() || 'No notes provided by the reviewer.'}</p>
                            <br />
                            <p className="text-center text-sm text-gray-600">-- End of Reviewer Information --</p>
                        </div>
                    </section>
                )}

            </div>
            {sections.map((section, index) => (
                <div key={index} className="space-y-2 page-break">
                    <p className={`text-lg font-semibold text-gray-800 border-b-2 border-gray-300 pb-2`}>{section.title} {section.subtitle ? ` - ${section.subtitle}` : ''}</p>
                    <div className="space-y-3">
                        {section.items.map((item: any, itemIndex: number) => (
                            <div key={itemIndex} className="border-l-4 border-gray-300 pl-4 py-2">
                                <div className="flex flex-inline items-center gap-2">
                                    <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                                    {GetStatusDot(item)}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{item.statement}</p>
                                <p className="text-xs text-gray-500 mt-1">Reference: {item.code}</p>
                                {GetDenialNote(item)}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-600">
                <p>This document was generated for review and printing purposes.</p>
            </div>
        </div>
    )
}

const ReviewerModal = ({ isOpen, includeComments, onClose, onSave }: { isOpen: boolean; includeComments: boolean; onClose: () => void; onSave: (data: any) => void }) => {
    const [reviewer, setReviewer] = useState('');
    const [jobNumber, setJobNumber] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setReviewer('');
            setJobNumber('');
            setDate('');
            setNotes('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 screen-only">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-2xl font-semibold mb-4 text-center">Finalize Review</h2>
                <div className="-space-y-px mb-6">
                    <div className="rounded-t-md bg-white px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 focus-within:relative focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-nile-blue">
                        <label htmlFor="reviewer-name" className="block text-xs font-medium text-gray-900">
                            Reviewer Name
                        </label>
                        <input
                            id="reviewer-name"
                            name="reviewer-name"
                            type="text"
                            placeholder="Jane Smith"
                            className="block w-full text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                            value={reviewer}
                            onChange={(e) => setReviewer(e.target.value)}
                        />
                    </div>
                    <div className="bg-white px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 focus-within:relative focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-nile-blue">
                        <label htmlFor="job-number" className="block text-xs font-medium text-gray-900">
                            Job Number
                        </label>
                        <input
                            id="job-number"
                            name="job-number"
                            type="text"
                            placeholder="##-####"
                            className="block w-full text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                            value={jobNumber}
                            onChange={(e) => setJobNumber(e.target.value)}
                        />
                    </div>
                    <div className='bg-white px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 focus-within:relative focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-nile-blue'>
                        <label htmlFor="job-review-date" className="block text-xs font-medium text-gray-900">
                            Review Date
                        </label>
                        <input
                            id="job-review-date"
                            name="job-review-date"
                            type="date"
                            placeholder="Head of Tomfoolery"
                            className="block w-full text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className="rounded-b-md bg-white px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 focus-within:relative focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-nile-blue">
                        <label htmlFor="review-comments" className="block text-xs font-medium text-gray-900">
                            Review Comments
                        </label>
                        <textarea
                            id="review-comments"
                            name="review-comments"
                            placeholder="Enter your comments"
                            rows={4}
                            className="block w-full text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6 resize-y"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-between gap-4">
                    <Button colorMode="auto" style="secondary" onClick={() => { onClose(); }} label="Cancel" />
                    <Button colorMode="auto" style="primary" onClick={() => { onSave({ reviewer, jobNumber, date, notes, includeComments: includeComments }); onClose(); }} label="Save Notes" />
                </div>
            </div>
        </div>
    );
}