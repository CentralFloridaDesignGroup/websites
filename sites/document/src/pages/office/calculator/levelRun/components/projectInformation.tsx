import { useState } from "react";
import { Textbox, Combobox } from "cfdg/input";
import { Numbers } from "cfdg/scripts";
import { type Point, type ProjectSettings, type VerticalAccuracyLevels, type CorrectionData } from "./index";
import { BasePointDetails } from "./basePointDetails";
import { EditPointModal } from "./editPointModal";

export function ProjectInformation({
    points, projectSettings, correctionData, updatePoint, updateProjectSetting
}: {
    points: Point[],
    projectSettings: ProjectSettings,
    correctionData?: CorrectionData,
    updatePoint: (updatedPoint: Point) => void,
    // TODO: Use a generic keyed to ProjectSettings so value type matches the key (avoid any).
    updateProjectSetting: (key: keyof ProjectSettings, value: any) => void
}) {
    const [openStartModal, setOpenStartModal] = useState(false);
    const [openEndModal, setOpenEndModal] = useState(false);

    const openModal = (pointId: string) => {
        if (pointId === "start") {
            setOpenStartModal(true);
        } else if (pointId === "end") {
            setOpenEndModal(true);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-center mb-2">Project Information</h1>
            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2 grow-1">
                    <Combobox colorMode="auto"
                        field="levelRunType"
                        label="Level Run Type"
                        selections={[
                            { key: "Closed Loop", value: "closed-loop" },
                            { key: "Open Loop", value: "open-loop" }
                        ]}
                        onValidChange={(_, value) => { updateProjectSetting('levelRunType', value as 'closed-loop' | 'open-loop') }}
                        defaultIndex={projectSettings.levelRunType === 'closed-loop' ? 0 : 1}
                    />
                    <Combobox colorMode="auto"
                        field="accuracyLevel"
                        label="Accuracy Level"
                        // TODO: Move accuracy level options and ordering into shared constants.
                        selections={[
                            { key: "Third Order", value: "order3" },
                            { key: "Second Order, Class II", value: "order2Class2" },
                            { key: "Second Order, Class I", value: "order2Class1" },
                            { key: "First Order, Class II", value: "order1Class2" },
                            { key: "First Order, Class I", value: "order1Class1" },
                        ]}
                        onValidChange={(_, value) => { updateProjectSetting('accuracyLevel', value as keyof VerticalAccuracyLevels) }}
                        // TODO: Use shared constants for default index calculation to avoid duplicated arrays.
                        defaultIndex={["order3", "order2Class2", "order2Class1", "order1Class2", "order1Class1"].findIndex(key => key === projectSettings.accuracyLevel)}
                    />
                    <Combobox colorMode="auto"
                        field="defaultWireMeasuurementType"
                        label="Default Wire Measurement Type"
                        // TODO: Fix typo defaultWireMeasuurementType -> defaultWireMeasurementType across settings and UI.
                        // TODO: Move wire measurement options into shared constants.
                        selections={[
                            { key: "One-Wire", value: "one-wire" },
                            { key: "Three-Wire", value: "three-wire" }
                        ]}
                        onValidChange={(_, value) => { updateProjectSetting('defaultWireMeasurementType', value as 'one-wire' | 'three-wire') }}
                        // TODO: Use shared constants for default index calculation to avoid duplicated arrays.
                        defaultIndex={["one-wire", "three-wire"].findIndex(key => key === projectSettings.defaultWireMeasurementType)}
                    />
                    <Textbox colorMode="auto"
                        field="stadiaConstant"
                        label="Stadia Constant"
                        defaultValue={projectSettings.stadiaConstant.toString()}
                        onValidChange={(_, value) => { updateProjectSetting('stadiaConstant', parseFloat(value)) }}
                        type="number"
                    />
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`${projectSettings.levelRunType === 'closed-loop' ? 'col-span-2' : ''}`}>
                            <BasePointDetails point={points.find(p => p.id === "start")} label="START" openModal={openModal} />
                        </div>
                        <div className={`${projectSettings.levelRunType === 'closed-loop' ? 'hidden' : ''}`}>
                            <BasePointDetails point={points.find(p => p.id === "end")} label="END" openModal={openModal} />
                        </div>
                    </div>
                    <div>
                        {correctionData && correctionData.successful && correctionData.hasDistances && (
                            <div className="border">
                                <p className={`text-center font-medium py-1 px-2 ${!(correctionData.inTolerance === 'yes' || correctionData.inTolerance === 'corrections') ? 'bg-red-500 text-white' : `${correctionData.elevationDifference && Math.abs(correctionData.elevationDifference) > 0 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}`}>
                                    {correctionData.inTolerance === 'no' ? 
                                        'Level run is out of tolerance' : 
                                        `${correctionData.inTolerance === 'corrections' ? 
                                            'Level run is within tolerance but requires adjustment' : 
                                            'Level run is within tolerance'
                                        }`
                                    }
                                </p>
                                <p className="text-center py-1 px-2">
                                    {correctionData.selectedTolerance && correctionData.selectedTolerance !== undefined ?
                                        <span>Allowed Error: <strong>{Numbers.FormatNumber(correctionData.selectedTolerance, { maximumFractionDigits: 3, minimumFractionDigits: 3 })} mm ({Numbers.FormatNumber(correctionData.selectedTolerance / 3.048 / 12, { maximumFractionDigits: 3, minimumFractionDigits: 3 })} ift)</strong></span> : ''} | Calculated Error:
                                    {correctionData.measuredTolerance && correctionData.elevationDifference !== undefined ?
                                        <span><strong>{Numbers.FormatNumber(correctionData.measuredTolerance, { maximumFractionDigits: 3, minimumFractionDigits: 3 })} mm ({Numbers.FormatNumber(correctionData.measuredTolerance / 3.048 / 12, { maximumFractionDigits: 3, minimumFractionDigits: 3 })} ift)</strong>
                                        </span> : ''}
                                </p>
                                <p className={`text-center py-1 px-2 ${correctionData.hasDistances && correctionData.distance ? 'block': 'hidden'}`}>
                                    {(correctionData.hasDistances && correctionData.distance) ?
                                        <span>Distance Traveled: <strong>{Numbers.FormatNumber(correctionData.distance, { maximumFractionDigits: 3, minimumFractionDigits: 3 })} linear km</strong> ({Numbers.FormatNumber(correctionData.distance / 1.609344, { maximumFractionDigits: 3, minimumFractionDigits: 3 })} linear miles or {Numbers.FormatNumber((correctionData.distance / 1.609344 * 5280), { maximumFractionDigits: 2, minimumFractionDigits: 2 })} linear ift)</span> : ''}
                                </p>
                                <p className={`text-center py-1 px-2 ${correctionData.successful && correctionData.distance ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {correctionData.successful && correctionData.distance ?
                                        'Corrections are applied' : 'Corrections cannot be applied due to distance not provided or being out of tolerance'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>


                <EditPointModal
                    key='start'
                    point={points.find(p => p.id === "start") ?? null}
                    isOpen={openStartModal}
                    onClose={() => setOpenStartModal(false)}
                    onAccept={(updatedPoint) => {
                        updatePoint(updatedPoint);
                        setOpenStartModal(false);
                    }}
                    pointType="start"
                />
                <EditPointModal
                    key='end'
                    point={points.find(p => p.id === "end") ?? null}
                    isOpen={openEndModal}
                    onClose={() => setOpenEndModal(false)}
                    onAccept={(updatedPoint) => {
                        updatePoint(updatedPoint);
                        setOpenEndModal(false);
                    }}
                    pointType="end"
                />
            </div>
        </div>
    )
}