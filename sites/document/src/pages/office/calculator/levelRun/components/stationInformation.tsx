import { useState, useEffect, useRef } from "react";
import { Numbers } from "@wps/scripts";
import { Textbox, Combobox } from "@wps/input";
import { type Station, type ProjectSettings } from "./index";
import { SquareChevronDown, SquareChevronUp, X, Plus } from "lucide-react";

export function StationInformation({
    stationInfo,
    positionMeta,
    projectSettings,
    onStationChange,
    onMoveStationDown,
    onMoveStationUp,
    onDeleteStation,
    onAddStation
}: {
    stationInfo: Station;
    positionMeta: {
        currentIndex: number;
        totalStations: number;
    };
    projectSettings: ProjectSettings;
    onStationChange: (updatedStation: Station) => void;
    onMoveStationDown: (id: number) => void;
    onMoveStationUp: (id: number) => void;
    onDeleteStation: (id: number) => void;
    onAddStation: (id: number) => void;
}): React.JSX.Element {
    /* TODO: Refactor page to store a single state object for stationInfo */
    const [name, setName] = useState(stationInfo.name || "");
    const [setup, setSetup] = useState(stationInfo.setup);
    const [backsightType, setBacksightType] = useState(stationInfo.backsight.type);
    const [backsightUpperStadia, setBacksightUpperStadia] = useState(stationInfo.backsight.upperStadia || 0);
    const [backsightLowerStadia, setBacksightLowerStadia] = useState(stationInfo.backsight.lowerStadia || 0);
    const [backsightMiddleStadia, setBacksightMiddleStadia] = useState(stationInfo.backsight.middleStadia || 0);
    const [foresightType, setForesightType] = useState(stationInfo.foresight.type);
    const [foresightUpperStadia, setForesightUpperStadia] = useState(stationInfo.foresight.upperStadia || 0);
    const [foresightLowerStadia, setForesightLowerStadia] = useState(stationInfo.foresight.lowerStadia || 0);
    const [foresightMiddleStadia, setForesightMiddleStadia] = useState(stationInfo.foresight.middleStadia || 0);
    const [backsightThreeWireInfo, setBacksightThreeWireInfo] = useState<{ average?: number, distance?: number }>({});
    const [foresightThreeWireInfo, setForesightThreeWireInfo] = useState<{ average?: number, distance?: number }>({});
    const stadiaConstant = projectSettings.stadiaConstant || 100;
    const isInitialMount = useRef(true);

    useEffect(() => {
        // Skip the initial mount to prevent calling onStationChange before user makes changes
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onStationChange({
            ...stationInfo,
            name,
            setup,
            backsight: {
                type: backsightType,
                upperStadia: backsightUpperStadia,
                lowerStadia: backsightLowerStadia,
                middleStadia: backsightMiddleStadia,
            },
            foresight: {
                type: foresightType,
                upperStadia: foresightUpperStadia,
                lowerStadia: foresightLowerStadia,
                middleStadia: foresightMiddleStadia,
            },
            // heightInstrument is calculated in parent's useMemo - don't include here
        });
        // onStationChange and stationInfo are intentionally omitted to prevent infinite loops
        // The effect responds to field changes only, not to prop updates from parent
        // heightInstrument is a derived/calculated value from parent, not user input
    }, [
        name, setup, backsightType, backsightUpperStadia, backsightLowerStadia, backsightMiddleStadia,
        foresightType, foresightUpperStadia, foresightLowerStadia, foresightMiddleStadia
    ]);

    useEffect(() => {
        if (stationInfo.backsight.type === "three-wire") {
            const upper = stationInfo.backsight.upperStadia ?? 0;
            const middle = stationInfo.backsight.middleStadia ?? 0;
            const lower = stationInfo.backsight.lowerStadia ?? 0;
            if (upper && middle && lower) {
                const average = (upper + middle + lower) / 3;
                const distance = (upper - lower) * stadiaConstant;
                setBacksightThreeWireInfo({ average: average, distance: distance });
                return;
            }
        }
        // Reset three-wire info when switching back to one-wire or when stadia values change
        setBacksightThreeWireInfo({});
    }, [stationInfo.backsight.type, stationInfo.backsight.upperStadia, stationInfo.backsight.middleStadia, stationInfo.backsight.lowerStadia])

    useEffect(() => {
        if (stationInfo.foresight.type === "three-wire") {
            const upper = stationInfo.foresight.upperStadia ?? 0;
            const middle = stationInfo.foresight.middleStadia ?? 0;
            const lower = stationInfo.foresight.lowerStadia ?? 0;
            if (upper && middle && lower) {
                const average = (upper + middle + lower) / 3;
                const distance = (upper - lower) * stadiaConstant;
                setForesightThreeWireInfo({ average: average, distance: distance });
                return;
            }
        }
        // Reset three-wire info when switching back to one-wire or when stadia values change
        setForesightThreeWireInfo({});
    }, [stationInfo.foresight.type, stationInfo.foresight.upperStadia, stationInfo.foresight.middleStadia, stationInfo.foresight.lowerStadia])

    return (
        <div className="border-t pt-2 mb-4">
            {/* Station Information
                Station ID (read-only)
                Station Name (editable)
                Setup (editable dropdown: Standard Setup, Side Shot)
                Delete, move up, move down buttons
            */}
            <div className="grid grid-cols-4 gap-4 items-center">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stationInfo.error?.isError ? 'bg-red-500' : 'bg-green-500'}`} title={stationInfo.error?.message || 'No errors'}></div>
                        <p>Station ID: {stationInfo.id}</p>
                    </div>
                    {stationInfo.error?.isError && <p className="text-sm text-red-500">{stationInfo.error.message ? stationInfo.error.message : 'Please correct the error'}</p>}
                </div>
                <Textbox
                    label="Sta. Name"
                    labelPosition="side"
                    field={`station-name-${stationInfo.id}`}
                    defaultValue={name || ""}
                    onValidChange={(_, value) => setName(value)} />
                <Combobox
                    label="Setup Type"
                    labelPosition="side"
                    field={`station-setup-${stationInfo.id}`}
                    defaultIndex={stationInfo.setup === "standard" ? 0 : 1}
                    selections={[
                        { key: "Standard Setup", value: "standard" },
                        { key: "Side Shot", value: "side-shot" },
                    ]}
                    onValidChange={(_, value) => setSetup(value as "standard" | "side-shot")} />
                <div className="flex gap-2 justify-end">
                    <button className={`p-1 hover:text-gray-500 cursor-pointer ${positionMeta.currentIndex === 0 ? "invisible" : ""}`} onClick={() => onMoveStationUp(stationInfo.id)}>
                        <SquareChevronUp size={24} />
                    </button>
                    <button className={`p-1 hover:text-gray-500 cursor-pointer ${positionMeta.currentIndex === positionMeta.totalStations - 1 ? "invisible" : ""}`} onClick={() => onMoveStationDown(stationInfo.id)}>
                        <SquareChevronDown size={24} />
                    </button>
                    <button className={`p-1 hover:text-green-500 cursor-pointer`} onClick={() => onAddStation(stationInfo.id)}>
                        <Plus size={24} />
                    </button>
                    <button className={`p-1 hover:text-red-500 cursor-pointer`} onClick={() => onDeleteStation(stationInfo.id)}>
                        <X size={24} />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="flex flex-col gap-2">
                    <p className="font-medium text-center">Backsight Information</p>
                    <Combobox
                        field={`backsight-type-${stationInfo.id}`}
                        label="Backsight Type"
                        labelPosition="side"
                        defaultIndex={stationInfo.backsight.type === "one-wire" ? 0 : 1}
                        selections={[
                            { key: "One-Wire", value: "one-wire" },
                            { key: "Three-Wire", value: "three-wire" },
                        ]}
                        onValidChange={(_, value) => setBacksightType(value as "one-wire" | "three-wire")} />
                    <div className={`${stationInfo.backsight.type === "three-wire" ? "block" : "invisible"}`}>
                        <Textbox
                            field={`backsight-upper-stadia-${stationInfo.id}`}
                            label="Upper Stadia"
                            labelPosition="side"
                            defaultValue={stationInfo.backsight.upperStadia?.toString() || ""}
                            onValidChange={(_, value) => setBacksightUpperStadia(parseFloat(value) || 0)}
                            type="number" />
                    </div>
                    <Textbox
                        field={`backsight-middle-stadia-${stationInfo.id}`}
                        label="Middle Stadia"
                        labelPosition="side"
                        defaultValue={stationInfo.backsight.middleStadia?.toString() || ""}
                        onValidChange={(_, value) => setBacksightMiddleStadia(parseFloat(value) || 0)}
                        type="number" />
                    <div className={`${stationInfo.backsight.type === "three-wire" ? "block" : "invisible"}`}>
                        <Textbox
                            field={`backsight-lower-stadia-${stationInfo.id}`}
                            label="Lower Stadia"
                            labelPosition="side"
                            defaultValue={stationInfo.backsight.lowerStadia?.toString() || ""}
                            onValidChange={(_, value) => setBacksightLowerStadia(parseFloat(value) || 0)}
                            type="number" />
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <p className="font-medium text-center">Instrument Information</p>
                    <div className="flex flex-col gap-1 text-center">
                        <p className="text-sm text-gray-600">Height of Instrument</p>
                        <p className="text-lg font-medium">{stationInfo.heightInstrument ? Numbers.FormatNumber(stationInfo.heightInstrument, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : "—"} ift.</p>
                        <div className="flex flex-row items-center justify-between gap-2">
                            <div className={`${stationInfo.backsight.type === "three-wire" ? "block" : "invisible"} flex flex-col w-full gap-1 text-center`}>
                                <p className="text-sm text-gray-600">Backsight Three-Wire Average</p>
                                <p className={`font-medium ${backsightThreeWireInfo.average !== stationInfo.backsight.middleStadia ? 'bg-orange-300 rounded' : ''}`}>{backsightThreeWireInfo.average ? `${Numbers.FormatNumber(backsightThreeWireInfo.average, { maximumFractionDigits: 3, minimumFractionDigits: 2 })}'` : "—"}</p>
                                <p className="text-sm text-gray-600">Backsight Three-Wire Distance</p>
                                <p className="font-medium">{backsightThreeWireInfo.distance ? `${Numbers.FormatNumber(backsightThreeWireInfo.distance, { maximumFractionDigits: 3, minimumFractionDigits: 2 })}'` : "—"}</p>
                            </div>
                            <div className={`${stationInfo.foresight.type === "three-wire" ? "block" : "invisible"} flex flex-col w-full gap-1 text-center`}>
                                <p className="text-sm text-gray-600">Foresight Three-Wire Average</p>
                                <p className={`font-medium ${foresightThreeWireInfo.average !== stationInfo.foresight.middleStadia ? 'bg-orange-300 rounded' : ''}`}>{foresightThreeWireInfo.average ? `${Numbers.FormatNumber(foresightThreeWireInfo.average, { maximumFractionDigits: 3, minimumFractionDigits: 2 })}'` : "—"}</p>
                                <p className="text-sm text-gray-600">Foresight Three-Wire Distance</p>
                                <p className="font-medium">{foresightThreeWireInfo.distance ? `${Numbers.FormatNumber(foresightThreeWireInfo.distance, { maximumFractionDigits: 3, minimumFractionDigits: 2 })}'` : "—"}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <p className="font-medium text-center">Foresight Information</p>
                    <Combobox
                        field={`foresight-type-${stationInfo.id}`}
                        label="Foresight Type"
                        labelPosition="side"
                        defaultIndex={stationInfo.foresight.type === "one-wire" ? 0 : 1}
                        selections={[
                            { key: "One-Wire", value: "one-wire" },
                            { key: "Three-Wire", value: "three-wire" },
                        ]}
                        onValidChange={(_, value) => setForesightType(value as "one-wire" | "three-wire")} />
                    <div className={`${stationInfo.foresight.type === "three-wire" ? "block" : "invisible"}`}>
                        <Textbox
                            field={`foresight-upper-stadia-${stationInfo.id}`}
                            label="Upper Stadia"
                            labelPosition="side"
                            defaultValue={stationInfo.foresight.upperStadia?.toString() || ""}
                            onValidChange={(_, value) => setForesightUpperStadia(parseFloat(value) || 0)}
                            type="number" />
                    </div>
                    <Textbox
                        field={`foresight-middle-stadia-${stationInfo.id}`}
                        label="Middle Stadia"
                        labelPosition="side"
                        defaultValue={stationInfo.foresight.middleStadia?.toString() || ""}
                        onValidChange={(_, value) => setForesightMiddleStadia(parseFloat(value) || 0)}
                        type="number" />
                    <div className={`${stationInfo.foresight.type === "three-wire" ? "block" : "invisible"}`}>
                        <Textbox
                            field={`foresight-lower-stadia-${stationInfo.id}`}
                            label="Lower Stadia"
                            labelPosition="side"
                            defaultValue={stationInfo.foresight.lowerStadia?.toString() || ""}
                            onValidChange={(_, value) => setForesightLowerStadia(parseFloat(value) || 0)}
                            type="number" />
                    </div>
                </div>
            </div>
        </div>
    )
}