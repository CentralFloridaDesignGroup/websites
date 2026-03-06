    import { useEffect, useState } from 'react'
import { Instructions, Settings, Preview } from './pages'


export interface ProjectInformation {
    projectName: string,
    projectNumber: string,
    applicationNumber: string,
    submittalNumber: string,
    submittalDate: string,
    clientName: string,
    clientAddress: string,
    clientCity: string,
    clientState: string,
    clientZip: string,
    preparerName: string,
    surveyorName: string,
    report: string
}

export default function ClosureReportProcessor() {
    const [stage, setStage] = useState<'instructions' | 'settings' | 'preview'>('instructions')


    const [projectInfo, setProjectInfo] = useState<ProjectInformation>({} as ProjectInformation);

    useEffect(() => {
        document.title = "Closure Report Generator - The Compass";
    }, []);

    const stages = [
        { key: 'instructions', label: 'Instructions' },
        { key: 'settings', label: 'Settings' },
        { key: 'preview', label: 'Preview' }
    ] as const

    const stageIndex = stages.findIndex((item) => item.key === stage)
    const canGoPrev = stageIndex > 0
    const canGoNext = stageIndex < stages.length - 1

    const NextSection = () => {
        if (canGoNext) {
            const nextStage = stages[stageIndex + 1]
            setStage(nextStage.key)
        }
    }

    const PrevSection = () => {
        if (canGoPrev) {
            const prevStage = stages[stageIndex - 1]
            setStage(prevStage.key)
        }
    }

    return (
        <>
            <div className="border-b border-gray-200 bg-white">
                <div className="max-w-7xl mx-auto px-4 pb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Stage {stageIndex + 1} of {stages.length}</p>
                        <p className="text-lg font-semibold text-gray-900">{stages[stageIndex]?.label}</p>
                    </div>
                </div>
            </div>

            {stage === 'instructions' && (
                <div className='px-4 py-10'>
                    <Instructions onNext={NextSection} markdownFile='/documents/closureReportGenerator/instructions.md'/>
                </div>
            )}

            {stage === 'settings' && (
                <div className='px-4 py-10'>
                    <Settings onNext={NextSection} onBack={PrevSection} onInformationChange={setProjectInfo} reportInfo={projectInfo ? projectInfo : undefined} />
                </div>
            )}

            {stage === 'preview' && (
                <div className='px-4 py-10'>
                    <Preview onBack={PrevSection} projectData={projectInfo}/>
                </div>
            )}
        </>
    )
}