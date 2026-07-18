import { useState } from "react";
import { Button, Combobox, Textarea, Textbox } from "@wps/input";
import { Geodesy } from "@wps/scripts";
import {
  defaultPointMaterial,
  getDatumFromProjection,
  pointMaterialOptions,
  statePlaneProjectionOptions,
  horizontalEstablishmentMethodOptions,
  verticalEstablishmentMethodOptions
} from "./constants";
import type {
  AdditionalGisRecordFields,
  CreateGisRecordInput,
  PointMaterial,
} from "./types";
import { X } from "lucide-react";

type AddPointPanelProps = {
  isOpen: boolean;
  currentUser: string;
  onClose: () => void;
  onSave: (input: CreateGisRecordInput) => Promise<void>;
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

export function AddPointPanel({
  isOpen,
  currentUser,
  onClose,
  onSave,
}: AddPointPanelProps) {
  const [pointNumber, setPointNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [witness, setWitness] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [material, setMaterial] = useState<PointMaterial>(defaultPointMaterial);
  const [northing, setNorthing] = useState("");
  const [easting, setEasting] = useState("");
  const [elevation, setElevation] = useState("");
  const [elevationNgvd29, setElevationNgvd29] = useState("");
  const [conversionFactor, setConversionFactor] = useState("");
  const [conversionSigma, setConversionSigma] = useState("");
  const [additionalInfo, setAdditionalInfo] =
    useState<AdditionalGisRecordFields>({});
  const [statePlaneProjection, setStatePlaneProjection] =
    useState<Geodesy.KnownStatePlaneProjection>("EPSG:2236");
  const sourceDatum = getDatumFromProjection(statePlaneProjection);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) {
    return null;
  }

  async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

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

    let convertedCoordinates: Geodesy.Wgs84Coordinates;
    if (statePlaneProjection === "EPSG:4326") {
      convertedCoordinates = {
        latitude: parsedNorthing,
        longitude: parsedEasting,
      };
    } else {
      try {
        convertedCoordinates = Geodesy.convertStatePlaneToWgs84({
          northing: parsedNorthing,
          easting: parsedEasting,
          projection: statePlaneProjection,
        });
      } catch (conversionError) {
        setErrorMessage(String(conversionError));
        return;
      }
    }

    try {
      setSaving(true);
      setErrorMessage("");
      const payload: CreateGisRecordInput = {
        pointNumber: pointNumber.trim(),
        notes: notes.trim(),
        witness: witness.trim(),
        project_number: projectNumber.trim(),
        material,
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
        latitude:
          statePlaneProjection === "EPSG:4326"
            ? parseRequiredNumber(northing)
            : convertedCoordinates.latitude,
        longitude:
          statePlaneProjection === "EPSG:4326"
            ? parseRequiredNumber(easting)
            : convertedCoordinates.longitude,
        additionalFields: additionalInfo,
        sourceDatum,
        user: currentUser,
      };

      await onSave(payload);

      setPointNumber("");
      setNotes("");
      setWitness("");
      setProjectNumber("");
      setMaterial(defaultPointMaterial);
      setNorthing("0");
      setEasting("0");
      setElevation("0");
      setElevationNgvd29("");
      setConversionFactor("");
      setConversionSigma("");
      setErrorMessage("");
    } catch (saveError) {
      setErrorMessage(String(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="absolute left-1/2 top-1/2 z-[600] max-h-[calc(100vh-15rem)] w-[calc(100%-1rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-slate-300 bg-white p-4 shadow-lg sm:max-h-[calc(100vh-6rem)] dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Add a Control Point
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded text-slate-500 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Enter a control point into the database. After saving, the point will
          be visible on the map and available for reference.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Textbox colorMode="auto"
            field="add-point-number"
            label="Point Number"
            defaultValue={pointNumber}
            required
            onValidChange={(_, value) => setPointNumber(value)}
          />

          <Textbox colorMode="auto"
            field="add-project-number"
            label="Project Number"
            defaultValue={projectNumber}
            required
            onValidChange={(_, value) => setProjectNumber(value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Textbox colorMode="auto"
            field="add-point-northing"
            label={
              statePlaneProjection === "EPSG:4326" ? "Latitude" : "Northing"
            }
            defaultValue={northing}
            required
            onValidChange={(_, value) => setNorthing(value)}
          />
          <Textbox colorMode="auto"
            field="add-point-easting"
            label={
              statePlaneProjection === "EPSG:4326" ? "Longitude" : "Easting"
            }
            defaultValue={easting}
            required
            onValidChange={(_, value) => setEasting(value)}
          />
          <Combobox colorMode="auto"
            field="add-point-state-plane-projection"
            label="Projection"
            selections={statePlaneProjectionOptions.map((option) => ({
              key: option.label,
              value: option.value,
            }))}
            defaultIndex={statePlaneProjectionOptions.findIndex(
              (o) => o.value === statePlaneProjection,
            )}
            onValidChange={(_, value) =>
              setStatePlaneProjection(
                value as Geodesy.KnownStatePlaneProjection,
              )
            }
          />
          <Textbox colorMode="auto"
            field="add-point-horizontal-accuracy"
            label="Horizontal Accuracy"
            type="number"
            onValidChange={(_, value) =>
              setAdditionalInfo((prev) => ({
                ...prev,
                horizontal_accuracy: parseOptionalNumber(value) ?? undefined,
              }))
            }
          />
          <Combobox colorMode="auto"
            field="add-point-horizontal-establishment-method"
            label="Horizontal Establishment"
            selections={horizontalEstablishmentMethodOptions}
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
            field="add-point-material"
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
            field="add-point-witness"
            label="Witness"
            defaultValue={witness}
            onValidChange={(_, value) => setWitness(value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Textbox colorMode="auto"
            field="add-point-elevation"
            label="Elevation (NAVD88)"
            type="number"
            defaultValue={elevation}
            required
            onValidChange={(_, value) => setElevation(value)}
          />
          <Textbox colorMode="auto"
            field="add-point-elevation-sigma"
            label="Elevation Accuracy"
            type="number"
            onValidChange={(_, value) =>
              setAdditionalInfo((prev) => ({
                ...prev,
                elevation_sigma: parseOptionalNumber(value) ?? undefined,
              }))
            }
          />
          <Combobox colorMode="auto"
            field="add-point-vertical-establishment-method"
            label="Vertical Establishment"
            selections={verticalEstablishmentMethodOptions}
            onValidChange={(_, value) =>
              setAdditionalInfo((prev) => ({
                ...prev,
                vertical_establishment_method:
                  String(value).trim() || undefined,
              }))
            }
          />
          <Textbox colorMode="auto"
            field="add-point-elevation-ngvd29"
            label="Elevation (NGVD29)"
            type="number"
            defaultValue={elevationNgvd29}
            onValidChange={(_, value) => setElevationNgvd29(value)}
          />
          <Textbox colorMode="auto"
            field="add-conversion-factor"
            label="Conversion Factor"
            type="number"
            defaultValue={conversionFactor}
            onValidChange={(_, value) => setConversionFactor(value)}
          />
          <Textbox colorMode="auto"
            field="add-conversion-sigma"
            label="Conversion Sigma"
            type="number"
            defaultValue={conversionSigma}
            onValidChange={(_, value) => setConversionSigma(value)}
          />
        </div>

        <Textarea colorMode="auto"
          field="add-notes"
          label="Notes"
          defaultValue={notes}
          allowNewlines
          onValidChange={(_, value) => setNotes(value)}
        />

        {errorMessage ? (
          <p className="text-sm text-red-600">{errorMessage}</p>
        ) : null}

        <div className="flex justify-end">
          <Button colorMode="auto"
            label={saving ? "Saving..." : "Add Point"}
            style="primary"
            size="small"
            properties={{ disabled: saving }}
          />
        </div>
      </form>
    </aside>
  );
}
