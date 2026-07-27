import { useEffect, useState } from "react";
import { Button, Combobox, Textarea, Textbox } from "cfdg/input";
import { Geodesy } from "cfdg/scripts";
import {
  getDatumFromProjection,
  getDefaultProjectionForDatum,
  pointMaterialOptions,
  statePlaneProjectionOptions,
  horizontalEstablishmentMethodOptions,
  verticalEstablishmentMethodOptions,
} from "./constants";
import type {
  AdditionalGisRecordFields,
  GisDatum,
  GisRecord,
  PointMaterial,
  UpdateGisRecordInput,
} from "./types";
import { X } from "lucide-react";
import { KnownStatePlaneProjection, Wgs84Input } from "cfdg/types";

type EditPointPanelProps = {
  isOpen: boolean;
  record: GisRecord | null;
  currentUser: string;
  onClose: () => void;
  onSave: (input: UpdateGisRecordInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function EditPointPanel({
  isOpen,
  record,
  currentUser,
  onClose,
  onSave,
  onDelete,
}: EditPointPanelProps) {
  const [pointNumber, setPointNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [material, setMaterial] = useState<PointMaterial>('5/8" Iron Rod');
  const [witness, setWitness] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [northing, setNorthing] = useState("");
  const [easting, setEasting] = useState("");
  const [elevation, setElevation] = useState("");
  const [elevationNgvd29, setElevationNgvd29] = useState("");
  const [conversionFactor, setConversionFactor] = useState("");
  const [conversionSigma, setConversionSigma] = useState("");
  const [additionalInfo, setAdditionalInfo] =
    useState<AdditionalGisRecordFields>({});
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [statePlaneProjection, setStatePlaneProjection] =
    useState<KnownStatePlaneProjection>("EPSG:2236");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const [isFormHydrated, setIsFormHydrated] = useState(false);
  const sourceDatum: GisDatum = getDatumFromProjection(statePlaneProjection)

  function recomputeCoordinates(
    nextNorthing: string,
    nextEasting: string,
    projection: KnownStatePlaneProjection = statePlaneProjection,
  ) {
    const parsedNorthing = Number(nextNorthing);
    const parsedEasting = Number(nextEasting);
    if (!Number.isFinite(parsedNorthing) || !Number.isFinite(parsedEasting)) {
      return;
    }

    if (projection === "EPSG:4326") {
      setLatitude(parsedNorthing.toFixed(8));
      setLongitude(parsedEasting.toFixed(8));
      setErrorMessage("");
      return;
    }

    try {
      const converted = Geodesy.convertStatePlaneToWgs84({
        northing: parsedNorthing,
        easting: parsedEasting,
        projection,
      });

      setLatitude(converted.latitude.toFixed(8));
      setLongitude(converted.longitude.toFixed(8));
      setErrorMessage("");
    } catch {
      // Keep current values while user is still editing.
    }
  }

  useEffect(() => {
    if (!isOpen || !record) {
      setIsFormHydrated(false);
      return;
    }

    setIsFormHydrated(false);

    setPointNumber(record.pointNumber);
    setNotes(record.notes);
    setMaterial(record.material);
    setWitness(record.witness);
    setProjectNumber(record.project_number);
    setNorthing(String(record.northing));
    setEasting(String(record.easting));
    setElevation(String(record.elevation));
    setElevationNgvd29(
      record.elevation_ngvd29 === null ? "" : String(record.elevation_ngvd29),
    );
    setConversionFactor(
      record.conversion_factor === null ? "" : String(record.conversion_factor),
    );
    setConversionSigma(
      record.conversion_sigma === null ? "" : String(record.conversion_sigma),
    );
    setAdditionalInfo({
      horizontal_establishment_method:
        String(record.additionalFields.horizontal_establishment_method ?? "") ||
        undefined,
      vertical_establishment_method:
        String(record.additionalFields.vertical_establishment_method ?? "") ||
        undefined,
      horizontal_accuracy: record.additionalFields.horizontal_accuracy,
      vertical_accuracy: record.additionalFields.vertical_accuracy,
    });
    setLatitude(String(record.latitude));
    setLongitude(String(record.longitude));
    setStatePlaneProjection(
      getDefaultProjectionForDatum(record.sourceDatum),
    );
    setErrorMessage("");
    setFormInstanceKey((previous) => previous + 1);
    setIsFormHydrated(true);
  }, [isOpen, record]);

  if (!isOpen || !record) {
    return null;
  }

  async function onDeletePoint() {
    if (!record) {
      return;
    }

    if (
      !globalThis.confirm(
        `Delete point ${record.project_number}-${record.pointNumber}?`,
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      setErrorMessage("");
      await onDelete(record.id);
      onClose();
    } catch (deleteError) {
      setErrorMessage(String(deleteError));
    } finally {
      setDeleting(false);
    }
  }

  async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) {
      setErrorMessage("No record selected.");
      return;
    }

    if (!pointNumber.trim()) {
      setErrorMessage("Point number is required.");
      return;
    }

    const parsedNorthing = Number(northing);
    const parsedEasting = Number(easting);
    if (!Number.isFinite(parsedNorthing) || !Number.isFinite(parsedEasting)) {
      setErrorMessage("Northing and Easting must be valid numbers.");
      return;
    }

    let convertedCoordinates: Wgs84Input;
    if (statePlaneProjection === "EPSG:4326") {
      convertedCoordinates = {
        latitude: parsedNorthing,
        longitude: parsedEasting,
      };
      setLatitude(convertedCoordinates.latitude.toFixed(8));
      setLongitude(convertedCoordinates.longitude.toFixed(8));
    } else {
      try {
        convertedCoordinates = Geodesy.convertStatePlaneToWgs84({
          northing: parsedNorthing,
          easting: parsedEasting,
          projection: statePlaneProjection,
        });
        setLatitude(convertedCoordinates.latitude.toFixed(8));
        setLongitude(convertedCoordinates.longitude.toFixed(8));
      } catch (conversionError) {
        setErrorMessage(String(conversionError));
        return;
      }
    }

    try {
      setSaving(true);
      setErrorMessage("");
      await onSave({
        id: record.id,
        pointNumber: pointNumber.trim(),
        notes: notes.trim(),
        material,
        witness: witness.trim(),
        project_number: projectNumber.trim(),
        northing:
          statePlaneProjection === "EPSG:4326"
            ? 0
            : parseRequiredNumber(northing),
        easting:
          statePlaneProjection === "EPSG:4326"
            ? 0
            : parseRequiredNumber(easting),
        elevation: parseRequiredNumber(elevation),
        elevation_ngvd29: parseOptionalNumber(elevationNgvd29),
        conversion_factor: parseOptionalNumber(conversionFactor),
        conversion_sigma: parseOptionalNumber(conversionSigma),
        additionalFields: {
          horizontal_establishment_method:
            String(additionalInfo.horizontal_establishment_method ?? "").trim() ||
            "",
          vertical_establishment_method:
            String(additionalInfo.vertical_establishment_method ?? "").trim() ||
            "",
          horizontal_accuracy: additionalInfo.horizontal_accuracy,
          vertical_accuracy: additionalInfo.vertical_accuracy,
        },
        latitude: convertedCoordinates.latitude,
        longitude: convertedCoordinates.longitude,
        sourceDatum,
        user: currentUser,
      });
      onClose();
    } catch (saveError) {
      setErrorMessage(String(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="absolute left-1/2 top-1/2 z-[600] max-h-[calc(100vh-15rem)] w-[calc(100%-1rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-slate-300 bg-white p-4 shadow-lg sm:max-h-[calc(100vh-6rem)] dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Edit Point</h3>
        <button
          type="button"
          onClick={onClose}
          disabled={saving || deleting}
          className="rounded text-slate-500 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isFormHydrated ? (
        <div className="py-6 text-sm text-slate-600">Loading point details...</div>
      ) : (
      <form key={`${record.id}-${formInstanceKey}`} className="space-y-3" onSubmit={onSubmit}>
        <p className="text-xs text-slate-600">
          Update a control point and save your changes to the GIS database.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Textbox colorMode="auto"
            field="edit-point-number"
            label="Point Number"
            defaultValue={pointNumber}
            required
            onValidChange={(_, value) => setPointNumber(value)}
          />
          <Textbox colorMode="auto"
            field="edit-project-number"
            label="Project Number"
            defaultValue={projectNumber}
            required
            onValidChange={(_, value) => setProjectNumber(value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Textbox colorMode="auto"
            field="edit-point-northing"
            label={
              statePlaneProjection === "EPSG:4326" ? "Latitude" : "Northing"
            }
            type="number"
            defaultValue={northing}
            required
            onValidChange={(_, value) => {
              setNorthing(value);
              recomputeCoordinates(value, easting);
            }}
          />
          <Textbox colorMode="auto"
            field="edit-point-easting"
            label={
              statePlaneProjection === "EPSG:4326" ? "Longitude" : "Easting"
            }
            type="number"
            defaultValue={easting}
            required
            onValidChange={(_, value) => {
              setEasting(value);
              recomputeCoordinates(northing, value);
            }}
          />
          <Combobox colorMode="auto"
            field="edit-point-state-plane-projection"
            label="Projection"
            selections={statePlaneProjectionOptions.map((option) => ({
              key: option.label,
              value: option.value,
            }))}
            defaultIndex={statePlaneProjectionOptions.findIndex(
              (o) => o.value === statePlaneProjection,
            )}
            onValidChange={(_, value) => {
              const projection = value as KnownStatePlaneProjection;
              setStatePlaneProjection(projection);
              recomputeCoordinates(northing, easting, projection);
            }}
          />
          <Textbox colorMode="auto"
            field="edit-point-horizontal-accuracy"
            label="Horizontal Accuracy"
            type="number"
            defaultValue={
              additionalInfo.horizontal_accuracy === undefined
                ? ""
                : String(additionalInfo.horizontal_accuracy)
            }
            onValidChange={(_, value) =>
              setAdditionalInfo((prev) => ({
                ...prev,
                horizontal_accuracy: parseOptionalNumber(value) ?? undefined,
              }))
            }
          />
          <Combobox colorMode="auto"
            field="edit-point-horizontal-establishment-method"
            label="Horizontal Establishment"
            selections={horizontalEstablishmentMethodOptions}
            defaultIndex={horizontalEstablishmentMethodOptions.findIndex(
              (o) => o.value === additionalInfo.horizontal_establishment_method,
            )}
            onValidChange={(_, value) =>
              setAdditionalInfo((prev) => ({
                ...prev,
                horizontal_establishment_method:
                  String(value).trim() || undefined,
              }))
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Combobox colorMode="auto"
            field="edit-point-material"
            label="Material"
            selections={pointMaterialOptions.map((option) => ({
              key: option.label,
              value: option.value,
            }))}
            defaultIndex={pointMaterialOptions.findIndex(
              (o) => o.value === material,
            )}
            onValidChange={(_, value) => setMaterial(value as PointMaterial)}
          />
          <Textbox colorMode="auto"
            field="edit-point-witness"
            label="Witness"
            defaultValue={witness}
            onValidChange={(_, value) => setWitness(value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Textbox colorMode="auto"
            field="edit-point-elevation"
            label="Elevation (NAVD88)"
            type="number"
            defaultValue={elevation}
            required
            onValidChange={(_, value) => setElevation(value)}
          />
          <Textbox colorMode="auto"
            field="edit-point-vertical-accuracy"
            label="Vertical Accuracy"
            type="number"
            defaultValue={
              additionalInfo.vertical_accuracy === undefined
                ? ""
                : String(additionalInfo.vertical_accuracy)
            }
            onValidChange={(_, value) =>
              setAdditionalInfo((prev) => ({
                ...prev,
                vertical_accuracy: parseOptionalNumber(value) ?? undefined,
              }))
            }
          />
          <Combobox colorMode="auto"
            field="edit-point-vertical-establishment-method"
            label="Vertical Establishment"
            selections={verticalEstablishmentMethodOptions}
            defaultIndex={verticalEstablishmentMethodOptions.findIndex(
              (o) => o.value === additionalInfo.vertical_establishment_method,
            )}
            onValidChange={(_, value) =>
              setAdditionalInfo((prev) => ({
                ...prev,
                vertical_establishment_method:
                  String(value).trim() || undefined,
              }))
            }
          />
          <Textbox colorMode="auto"
            field="edit-point-elevation-ngvd29"
            label="Elevation (NGVD29)"
            type="number"
            defaultValue={elevationNgvd29}
            onValidChange={(_, value) => setElevationNgvd29(value)}
          />
          <Textbox colorMode="auto"
            field="edit-conversion-factor"
            label="Conversion Factor"
            type="number"
            defaultValue={conversionFactor}
            onValidChange={(_, value) => setConversionFactor(value)}
          />
          <Textbox colorMode="auto"
            field="edit-conversion-sigma"
            label="Conversion Sigma"
            type="number"
            defaultValue={conversionSigma}
            onValidChange={(_, value) => setConversionSigma(value)}
          />
        </div>

        <Textarea colorMode="auto"
          field="edit-notes"
          label="Notes"
          defaultValue={notes}
          allowNewlines
          onValidChange={(_, value) => setNotes(value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <Textbox colorMode="auto"
            field="edit-latitude"
            value={latitude}
            readOnly
            label={
              statePlaneProjection === "EPSG:4326" ? "Latitude" : "Computed Latitude"
            }
            className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-slate-700"
          />
          <Textbox colorMode="auto"
            field="edit-longitude"
            value={longitude}
            readOnly
            label={
              statePlaneProjection === "EPSG:4326" ? "Longitude" : "Computed Longitude"
            }
            className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-slate-700"
          />
        </div>

        {errorMessage ? (
          <p className="text-sm text-red-600">{errorMessage}</p>
        ) : null}

        <div className="flex justify-between gap-2">
          <Button colorMode="auto"
            label={deleting ? "Deleting..." : "Delete Point"}
            style="danger"
            properties={{ disabled: saving || deleting }}
            onClick={onDeletePoint}
          />

          <Button colorMode="auto"
            label={saving ? "Saving..." : "Save Changes"}
            style="primary"
            size="small"
            properties={{ disabled: saving || deleting }}
          />
        </div>
      </form>
      )}
    </aside>
  );
}
