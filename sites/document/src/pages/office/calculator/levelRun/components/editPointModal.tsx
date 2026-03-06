import { useState, useEffect } from 'react'
import { Textbox } from '@wps/input'
import { Modal } from '@wps/layout'
import { type Point } from './index'

export function EditPointModal({
    point,
    isOpen,
    allowEditingElevation = true,
    onClose,
    onAccept,
    pointType
}: {
    point: Point | null;
    isOpen: boolean;
    allowEditingElevation?: boolean;
    onClose: () => void;
    onAccept: (updatedPoint: Point) => void;
    pointType: "start" | "end";
}) {
    const [editedPoint, setEditedPoint] = useState<Point | null>(point);

    useEffect(() => {
        setEditedPoint(point);
    }, [point, isOpen]);

    return (
        <Modal
            title={`Edit ${pointType === "start" ? "Starting" : "Ending"} Point`}
            isOpen={isOpen}
            size="lg"
            acceptText="Accept Changes"
            closeText="Discard Changes"
            onAccept={() => {
                if (editedPoint) {
                    onAccept(editedPoint);
                }
            }}
            onClose={onClose}
        >
            <div className="space-y-4">
                <Textbox
                    field={"pointNumber-" + editedPoint?.id}
                    label="Point Number"
                    defaultValue={editedPoint?.pointNumber}
                    onValidChange={(_, value) => setEditedPoint(prev => prev ? { ...prev, pointNumber: value } : null)}
                    required
                />
                <Textbox
                    field={"pointNorthing-" + editedPoint?.id}
                    label="Point Northing"
                    defaultValue={Math.round(editedPoint?.northing ?? 0).toString()}
                    onValidChange={(_, value) => setEditedPoint(prev => prev ? { ...prev, northing: parseFloat(value) } : null)}
                    type="number"
                />
                <Textbox
                    field={"pointEasting-" + editedPoint?.id}
                    label="Point Easting"
                    defaultValue={Math.round(editedPoint?.easting ?? 0).toString()}
                    onValidChange={(_, value) => setEditedPoint(prev => prev ? { ...prev, easting: parseFloat(value) } : null)}
                    type="number"
                />
                <Textbox
                    field={"pointElevation-" + editedPoint?.id}
                    label="Point Elevation"
                    defaultValue={Math.round(editedPoint?.elevation ?? 0).toString()}
                    onValidChange={(_, value) => setEditedPoint(prev => prev ? { ...prev, elevation: parseFloat(value) } : null)}
                    required
                    type="number"
                    disabled={!allowEditingElevation}
                />
                <Textbox
                    field={"pointDescription" + editedPoint?.id}
                    label="Point Description"
                    defaultValue={editedPoint?.description ?? ""}
                    onValidChange={(_, value) => setEditedPoint(prev => prev ? { ...prev, description: value } : null)}
                    required
                />
            </div>
        </Modal>
    )
}