import { Button } from "cfdg/input";
import { Numbers } from "cfdg/scripts";
import { type Point } from "./index";
import { EditPointModal } from "./editPointModal";
import { useState } from "react";

export function PointInformation({
    pointInfo,
    setPointInfo
}: {
    pointInfo: Point,
    setPointInfo: (updatedPoint: Point) => void
}) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const setNumberFormat = (value: number) => {
        return Numbers.FormatNumber(value, {
            maximumFractionDigits: 3,
            minimumFractionDigits: 3,
        });
    }

    return (
        <div className="grid grid-cols-6 gap-2 border-t border-dashed py-2 items-center" key={`${pointInfo.id}-${pointInfo.elevation}`}>
            <p className="col-span-1 text-sm font-medium text-gray-700">Point {pointInfo.pointNumber}</p>
            <p className="col-span-1 text-sm text-gray-500">Northing: {setNumberFormat(pointInfo.northing ?? 0)}</p>
            <p className="col-span-1 text-sm text-gray-500">Easting: {setNumberFormat(pointInfo.easting ?? 0)}</p>
            <p className="col-span-1 text-sm text-gray-500">Elevation: {setNumberFormat(pointInfo.elevation ?? 0)}</p>
            <p className="col-span-1 text-sm text-gray-500">{pointInfo.description}</p>
            <Button colorMode="auto"
                label="Edit Point"
                size="small"
                style="secondary"
                onClick={() => setIsEditModalOpen(true)}
            />
            <EditPointModal
                point={pointInfo}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onAccept={(updatedPoint) => {
                    setPointInfo(updatedPoint);
                    setIsEditModalOpen(false);
                }}
                pointType="start"
                allowEditingElevation={false}
            />
        </div>
    );
}