import { type Point } from './index';
import { Numbers } from '@wps/scripts';

export function BasePointDetails({
    point, label, openModal
}: {
    point: Point | undefined,
    label: string,
    openModal: (pointId: string) => void
}) {
    if (!point) {
        return (
            <div className="flex flex-col grow-1 border border-gray-300 text-center">
                <p className="bg-gray-300 text-gray-600 font-semibold">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="border border-primary text-center flex flex-col">
                <p className="bg-primary text-white font-semibold">{label} POINT INFORMATION</p>
                <p>Point Number: {point.pointNumber ?? "N/A"}</p>
                <p>Northing: {point.northing ? `${Numbers.FormatNumber(point.northing, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}'` : "N/A"}</p>
                <p>Easting: {point.easting ? `${Numbers.FormatNumber(point.easting, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}'` : "N/A"}</p>
                <p>Elevation: {point.elevation ? `${Numbers.FormatNumber(point.elevation, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}'` : "N/A"}</p>
                <p>Description: {point.description ?? "N/A"}</p>
                <button className="bg-gray-300 cursor-pointer" onClick={() => openModal(point.id)}>Edit Point</button>
            </div>
        </div>
    )
}