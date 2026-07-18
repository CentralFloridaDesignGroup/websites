import { useEffect, useMemo, useState } from "react";
import { Button } from "@wps/input";
import { Geodesy } from "@wps/scripts";
import {
  getDatumFromProjection,
  horizontalEstablishmentMethodOptions,
  pointMaterialOptions,
  statePlaneProjectionOptions,
  verticalEstablishmentMethodOptions,
} from "./constants";
import type { GisRecord, PointMaterial, UpdateGisRecordInput } from "./types";

type BulkEditTablePanelProps = {
  isOpen: boolean;
  currentUser: string;
  records: GisRecord[];
  onClose: () => void;
  onSave: (input: UpdateGisRecordInput) => Promise<void>;
};

type EditableRow = {
  id: string;
  createdBy: string;
  project_number: string;
  pointNumber: string;
  material: PointMaterial;
  witness: string;
  notes: string;
  statePlaneProjection: Geodesy.KnownStatePlaneProjection;
  northing: string;
  easting: string;
  elevation: string;
  elevation_ngvd29: string;
  conversion_factor: string;
  conversion_sigma: string;
  horizontal_accuracy: string;
  horizontal_establishment_method: string;
  vertical_accuracy: string;
  vertical_establishment_method: string;
  latitude: string;
  longitude: string;
};

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return parsed;
}

function getProjectionForRecord(
  record: GisRecord,
): Geodesy.KnownStatePlaneProjection {
  switch (record.sourceDatum) {
    case "nad83-2011-fl-east":
      return "EPSG:2236";
    case "nad83-2011-fl-west":
      return "EPSG:2237";
    case "nad83-2011-fl-north":
      return "EPSG:2238";
    case "wgs84":
    default:
      return "EPSG:4326";
  }
}

function toEditableRow(record: GisRecord): EditableRow {
  return {
    id: record.id,
    createdBy: record.createdBy,
    project_number: record.project_number,
    pointNumber: record.pointNumber,
    material: record.material,
    witness: record.witness,
    notes: record.notes,
    statePlaneProjection: getProjectionForRecord(record),
    northing: String(record.northing),
    easting: String(record.easting),
    elevation: String(record.elevation),
    elevation_ngvd29:
      record.elevation_ngvd29 === null ? "" : String(record.elevation_ngvd29),
    conversion_factor:
      record.conversion_factor === null ? "" : String(record.conversion_factor),
    conversion_sigma:
      record.conversion_sigma === null ? "" : String(record.conversion_sigma),
    horizontal_accuracy:
      record.additionalFields.horizontal_accuracy === undefined
        ? ""
        : String(record.additionalFields.horizontal_accuracy),
    horizontal_establishment_method:
      String(record.additionalFields.horizontal_establishment_method ?? ""),
    vertical_accuracy:
      record.additionalFields.vertical_accuracy === undefined
        ? ""
        : String(record.additionalFields.vertical_accuracy),
    vertical_establishment_method: String(
      record.additionalFields.vertical_establishment_method ?? "",
    ),
    latitude: String(record.latitude),
    longitude: String(record.longitude),
  };
}

function toComparableSnapshot(row: EditableRow): string {
  return JSON.stringify({
    createdBy: row.createdBy.trim(),
    project_number: row.project_number.trim(),
    pointNumber: row.pointNumber.trim(),
    material: row.material,
    witness: row.witness.trim(),
    notes: row.notes.trim(),
    statePlaneProjection: row.statePlaneProjection,
    northing: row.northing.trim(),
    easting: row.easting.trim(),
    elevation: row.elevation.trim(),
    elevation_ngvd29: row.elevation_ngvd29.trim(),
    conversion_factor: row.conversion_factor.trim(),
    conversion_sigma: row.conversion_sigma.trim(),
    horizontal_accuracy: row.horizontal_accuracy.trim(),
    horizontal_establishment_method: row.horizontal_establishment_method.trim(),
    vertical_accuracy: row.vertical_accuracy.trim(),
    vertical_establishment_method: row.vertical_establishment_method.trim(),
  });
}

export function BulkEditTablePanel({
  isOpen,
  currentUser,
  records,
  onClose,
  onSave,
}: BulkEditTablePanelProps) {
  const canEditCreatedBy =
    currentUser.trim().toLowerCase() === "nathan white";
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [initialById, setInitialById] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowSavingState, setRowSavingState] = useState<Record<string, boolean>>(
    {},
  );
  const [saveAllError, setSaveAllError] = useState<string>("");
  const [saveAllStatus, setSaveAllStatus] = useState<string>("");
  const [savingAll, setSavingAll] = useState(false);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextRows = records.map((record) => toEditableRow(record));
    const nextInitial: Record<string, string> = {};
    for (const row of nextRows) {
      nextInitial[row.id] = toComparableSnapshot(row);
    }

    setRows(nextRows);
    setInitialById(nextInitial);
    setRowErrors({});
    setRowSavingState({});
    setSaveAllError("");
    setSaveAllStatus("");
  }, [isOpen, records]);

  const dirtyIds = useMemo(() => {
    return rows
      .filter((row) => toComparableSnapshot(row) !== initialById[row.id])
      .map((row) => row.id);
  }, [rows, initialById]);

  const filteredRows = useMemo(() => {
    const term = filterText.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.id.toLowerCase().includes(term) ||
        row.project_number.toLowerCase().includes(term) ||
        row.pointNumber.toLowerCase().includes(term) ||
        row.createdBy.toLowerCase().includes(term),
    );
  }, [rows, filterText]);

  if (!isOpen) {
    return null;
  }

  function updateCell<K extends keyof EditableRow>(
    rowId: string,
    key: K,
    value: EditableRow[K],
  ) {
    setRows((previous) =>
      previous.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    );
    setSaveAllStatus("");
    setSaveAllError("");
  }

  async function saveRow(rowId: string): Promise<boolean> {
    const row = rows.find((candidate) => candidate.id === rowId);
    if (!row) {
      return false;
    }

    if (!row.pointNumber.trim()) {
      setRowErrors((previous) => ({
        ...previous,
        [rowId]: "Point Number is required.",
      }));
      return false;
    }

    try {
      const parsedNorthing = parseRequiredNumber(row.northing, "Northing");
      const parsedEasting = parseRequiredNumber(row.easting, "Easting");
      const parsedElevation = parseRequiredNumber(row.elevation, "Elevation");

      let latitude: number;
      let longitude: number;
      let normalizedNorthing = parsedNorthing;
      let normalizedEasting = parsedEasting;

      if (row.statePlaneProjection === "EPSG:4326") {
        latitude = parsedNorthing;
        longitude = parsedEasting;
        normalizedNorthing = 0;
        normalizedEasting = 0;
      } else {
        const converted = Geodesy.convertStatePlaneToWgs84({
          northing: parsedNorthing,
          easting: parsedEasting,
          projection: row.statePlaneProjection,
        });
        latitude = converted.latitude;
        longitude = converted.longitude;
      }

      const payload: UpdateGisRecordInput = {
        id: row.id,
        pointNumber: row.pointNumber.trim(),
        material: row.material,
        witness: row.witness.trim(),
        project_number: row.project_number.trim(),
        notes: row.notes.trim(),
        elevation_ngvd29: parseOptionalNumber(row.elevation_ngvd29),
        conversion_factor: parseOptionalNumber(row.conversion_factor),
        conversion_sigma: parseOptionalNumber(row.conversion_sigma),
        northing: normalizedNorthing,
        easting: normalizedEasting,
        elevation: parsedElevation,
        additionalFields: {
          horizontal_establishment_method:
            row.horizontal_establishment_method.trim(),
          vertical_establishment_method: row.vertical_establishment_method.trim(),
          horizontal_accuracy: parseOptionalNumber(row.horizontal_accuracy) ?? undefined,
          vertical_accuracy: parseOptionalNumber(row.vertical_accuracy) ?? undefined,
        },
        latitude,
        longitude,
        sourceDatum: getDatumFromProjection(row.statePlaneProjection),
        user: currentUser,
        createdBy: row.createdBy.trim() || currentUser,
      };

      setRowSavingState((previous) => ({ ...previous, [rowId]: true }));
      setRowErrors((previous) => ({ ...previous, [rowId]: "" }));
      await onSave(payload);

      const savedCreatedBy = payload.createdBy || row.createdBy;

      setRows((previous) =>
        previous.map((candidate) =>
          candidate.id === rowId
            ? {
                ...candidate,
                northing:
                  row.statePlaneProjection === "EPSG:4326"
                    ? row.northing
                    : String(normalizedNorthing),
                easting:
                  row.statePlaneProjection === "EPSG:4326"
                    ? row.easting
                    : String(normalizedEasting),
                latitude: latitude.toFixed(8),
                longitude: longitude.toFixed(8),
                createdBy: savedCreatedBy,
              }
            : candidate,
        ),
      );

      const nextSnapshot = toComparableSnapshot({
        ...row,
        createdBy: savedCreatedBy,
      });
      setInitialById((previous) => ({ ...previous, [rowId]: nextSnapshot }));
      return true;
    } catch (error) {
      setRowErrors((previous) => ({
        ...previous,
        [rowId]: String(error),
      }));
      return false;
    } finally {
      setRowSavingState((previous) => ({ ...previous, [rowId]: false }));
    }
  }

  async function saveAllDirtyRows() {
    const idsToSave = [...dirtyIds];
    if (idsToSave.length === 0) {
      setSaveAllStatus("No unsaved changes.");
      setSaveAllError("");
      return;
    }

    setSavingAll(true);
    setSaveAllStatus("");
    setSaveAllError("");

    let successful = 0;
    const failedIds: string[] = [];

    for (const id of idsToSave) {
      // Save sequentially to keep API writes predictable.
      const saved = await saveRow(id);
      if (saved) {
        successful += 1;
      } else {
        failedIds.push(id);
      }
    }

    if (failedIds.length > 0) {
      setSaveAllError(
        `Saved ${successful}/${idsToSave.length}. Failed rows: ${failedIds.join(", ")}.`,
      );
    } else {
      setSaveAllStatus(`Saved ${successful} row${successful === 1 ? "" : "s"}.`);
    }

    setSavingAll(false);
  }

  return (
    <aside className="absolute left-1/2 top-1/2 z-[120600] h-[calc(100vh-15rem)] w-[calc(100%-5rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Bulk Edit Points</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Edit multiple control points in one table. Save rows individually or all at once.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Filter by ID, project, point, or creator…"
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            className="w-72 rounded border border-slate-300 px-3 py-1 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:ring-blue-400"
          />
          <Button colorMode="auto"
            label={savingAll ? "Saving..." : `Save All (${dirtyIds.length})`}
            style="primary"
            size="small"
            onClick={() => void saveAllDirtyRows()}
            properties={{ disabled: savingAll }}
          />
          <Button colorMode="auto"
            label="Close"
            style="secondary"
            size="small"
            onClick={onClose}
            properties={{ disabled: savingAll }}
          />
        </div>
      </div>

      <div className="h-[calc(100%-4rem)] overflow-auto">
        <table className="min-w-[1940px] w-full border-collapse text-xs dark:text-white">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-white">
            <tr>
              <th className="sticky left-0 top-0 z-30 w-24 min-w-24 border border-slate-200 bg-slate-100 px-2 py-2 text-left font-semibold dark:bg-slate-700 dark:text-white">ID</th>
              <th className="sticky left-[6rem] top-0 z-30 w-40 min-w-40 border border-slate-200 bg-slate-100 px-2 py-2 text-left font-semibold dark:bg-slate-700 dark:text-white">Project</th>
              <th className="sticky left-[16rem] top-0 z-30 w-32 min-w-32 border border-slate-200 bg-slate-100 px-2 py-2 text-left font-semibold dark:bg-slate-700 dark:text-white">Point</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Created By</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Material</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Witness</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Notes</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Projection</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Northing</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Easting</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Elevation</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">NGVD29</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Conv Factor</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Conv Sigma</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Horiz Accuracy</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Horiz Method</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Vert Accuracy</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Vert Method</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Latitude</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Longitude</th>
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const isDirty = dirtyIds.includes(row.id);
              const isSaving = rowSavingState[row.id] === true;
              const stickyCellBackground = isDirty ? "bg-amber-50 dark:bg-amber-700" : "bg-white dark:bg-gray-700";

              return (
                <tr key={row.id} className={stickyCellBackground}>
                  <td
                    className={`sticky left-0 z-20 w-24 min-w-24 border border-slate-200 px-2 py-1 align-top text-[11px] text-slate-500 dark:text-white ${stickyCellBackground}`}
                  >
                    {row.id}
                  </td>
                  <td className={`sticky left-[6rem] z-20 w-40 min-w-40 border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      value={row.project_number}
                      onChange={(event) =>
                        updateCell(row.id, "project_number", event.target.value)
                      }
                      className="w-36 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`sticky left-[16rem] z-20 w-32 min-w-32 border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      value={row.pointNumber}
                      onChange={(event) =>
                        updateCell(row.id, "pointNumber", event.target.value)
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    {canEditCreatedBy ? (
                    <input
                      value={row.createdBy}
                      onChange={(event) =>
                        updateCell(row.id, "createdBy", event.target.value)
                      }
                      disabled={!canEditCreatedBy}
                      title={
                        canEditCreatedBy
                          ? "Editable by Nathan White"
                          : "Only Nathan White can change this field"
                      }
                      className="w-40 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    ) : (
                        <p className="w-40 m-0 px-1 py-1 text-center">
                            {row.createdBy}
                        </p>
                    )}
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <select
                      value={row.material}
                      onChange={(event) =>
                        updateCell(
                          row.id,
                          "material",
                          event.target.value as PointMaterial,
                        )
                      }
                      className="w-40 rounded border border-slate-300  px-2 py-1 dark:bg-slate-700 dark:text-white"
                    >
                      {pointMaterialOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      value={row.witness}
                      onChange={(event) =>
                        updateCell(row.id, "witness", event.target.value)
                      }
                      className="w-44 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <textarea
                      value={row.notes}
                      onChange={(event) =>
                        updateCell(row.id, "notes", event.target.value)
                      }
                      className="h-16 w-56 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <select
                      value={row.statePlaneProjection}
                      onChange={(event) =>
                        updateCell(
                          row.id,
                          "statePlaneProjection",
                          event.target.value as Geodesy.KnownStatePlaneProjection,
                        )
                      }
                      className="w-44 rounded border border-slate-300 px-2 py-1 dark:bg-slate-700 dark:text-white"
                    >
                      {statePlaneProjectionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      type="number"
                      value={row.northing}
                      onChange={(event) =>
                        updateCell(row.id, "northing", event.target.value)
                      }
                      className="w-32 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      type="number"
                      value={row.easting}
                      onChange={(event) =>
                        updateCell(row.id, "easting", event.target.value)
                      }
                      className="w-32 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      type="number"
                      value={row.elevation}
                      onChange={(event) =>
                        updateCell(row.id, "elevation", event.target.value)
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      type="number"
                      value={row.elevation_ngvd29}
                      onChange={(event) =>
                        updateCell(row.id, "elevation_ngvd29", event.target.value)
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      type="number"
                      value={row.conversion_factor}
                      onChange={(event) =>
                        updateCell(row.id, "conversion_factor", event.target.value)
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-1 dark:bg-slate-700 dark:text-white"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      type="number"
                      value={row.conversion_sigma}
                      onChange={(event) =>
                        updateCell(row.id, "conversion_sigma", event.target.value)
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-1 dark:bg-slate-700 dark:text-white"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      type="number"
                      value={row.horizontal_accuracy}
                      onChange={(event) =>
                        updateCell(row.id, "horizontal_accuracy", event.target.value)
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-1 dark:bg-slate-700 dark:text-white"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <select
                      value={row.horizontal_establishment_method}
                      onChange={(event) =>
                        updateCell(
                          row.id,
                          "horizontal_establishment_method",
                          event.target.value,
                        )
                      }
                      className="w-40 rounded border border-slate-300 px-2 py-1 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">Select...</option>
                      {horizontalEstablishmentMethodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.key}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <input
                      type="number"
                      value={row.vertical_accuracy}
                      onChange={(event) =>
                        updateCell(row.id, "vertical_accuracy", event.target.value)
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-1 dark:bg-slate-700 dark:text-white"
                    />
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <select
                      value={row.vertical_establishment_method}
                      onChange={(event) =>
                        updateCell(
                          row.id,
                          "vertical_establishment_method",
                          event.target.value,
                        )
                      }
                      className="w-40 rounded border border-slate-300 px-2 py-1 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">Select...</option>
                      {verticalEstablishmentMethodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.key}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`border border-slate-200 px-2 py-1 align-top text-[11px] text-slate-700 dark:text-white ${stickyCellBackground}`}  >
                    {row.latitude.slice(0, 9)}
                  </td>
                  <td className={`border border-slate-200 px-2 py-1 align-top text-[11px] text-slate-700 dark:text-white ${stickyCellBackground}`}  >
                    {row.longitude.slice(0, 10)}
                  </td>
                  <td className={`border border-slate-200 p-1 align-top ${stickyCellBackground}`}>
                    <div className="flex min-w-36 flex-col gap-1">
                      <Button colorMode="auto"
                        label={isSaving ? "Saving..." : "Save Row"}
                        style="secondary"
                        size="small"
                        onClick={() => void saveRow(row.id)}
                        properties={{
                          disabled: isSaving || savingAll || !isDirty,
                          classNames: "w-full rounded text-xs",
                        }}
                      />
                      {rowErrors[row.id] ? (
                        <p className="text-[11px] text-red-600">{rowErrors[row.id]}</p>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {saveAllError ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {saveAllError}
        </div>
      ) : null}

      {saveAllStatus ? (
        <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
          {saveAllStatus}
        </div>
      ) : null}
    </aside>
  );
}
