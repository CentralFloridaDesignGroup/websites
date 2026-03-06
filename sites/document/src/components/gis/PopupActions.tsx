import { Pencil } from "lucide-react";
import type { GisRecord } from "./types";
import { Button } from "@wps/input";
import { getDatumLabel } from "./constants";
import React from "react";

type PopupActionsProps = {
  currentUser: string;
  record: GisRecord;
  onEdit: (record: GisRecord) => void;
};

export function PopupActions({
  currentUser,
  record,
  onEdit,
}: PopupActionsProps) {
  function PopupEntry({
    title,
    value,
  }: {
    title: string;
    value: string;
  }): React.JSX.Element {
    return (
      <div className="flex flex-row md:flex-col mb-1">
        <p className="!m-0 !p-0 !pe-1">{title}:</p>
        <p className="!m-0 !p-0">
          <strong>{value}</strong>
        </p>
      </div>
    );
  }

  const toDisplayNumber = (value: number | null, digits = 3) => {
    if (value === null || Number.isNaN(value)) {
      return "N/A";
    }
    return value.toFixed(digits);
  };

  const toDisplayText = (value: string) => {
    return value.trim() ? value : "N/A";
  };

  const formatDate = (
    value: string | Date,
    format = "MM.dd.yyyy, HH:mm",
  ) => {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    const pad = (num: number) => String(num).padStart(2, "0");
    const tokens: Record<string, string> = {
      yyyy: String(date.getFullYear()),
      MM: pad(date.getMonth() + 1),
      dd: pad(date.getDate()),
      HH: pad(date.getHours()),
      mm: pad(date.getMinutes()),
      ss: pad(date.getSeconds()),
    };

    return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (token) => tokens[token]);
  };

  const project = toDisplayText(record.project_number);
  const title =
    project === "N/A" ? record.pointNumber : `${project}-${record.pointNumber}`;

  return (
    <div className="min-w-[260px] max-w-[500px] space-y-2 text-sm">
      <div className="">
        <div className="font-semibold text-slate-900">
          Control Point: {title}
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 text-slate-700 text-xs">
          <PopupEntry
            title="Northing"
            value={toDisplayNumber(record.northing)}
          />
          <PopupEntry title="Easting" value={toDisplayNumber(record.easting)} />
          <div className="col-span-full">
            <PopupEntry
              title="Datum"
              value={getDatumLabel(record.sourceDatum)}
            />
          </div>
          <PopupEntry
            title="Elevation NAVD88"
            value={toDisplayNumber(record.elevation)}
          />
          <PopupEntry
            title="Elevation NGVD29"
            value={toDisplayNumber(record.elevation_ngvd29)}
          />
          <div className="col-span-full">
            <PopupEntry
              title="NGVD29 Conversion"
              value={
                record.conversion_factor
                  ? toDisplayNumber(record.conversion_factor) +
                    "±" +
                    toDisplayNumber(record.conversion_sigma)
                  : "N/A"
              }
            />
          </div>
          <div className="col-span-full border-t border-slate-200 py-1"></div>
          <PopupEntry title="Latitude" value={record.latitude.toFixed(6)} />
          <PopupEntry title="Longitude" value={record.longitude.toFixed(6)} />
          <div className="col-span-full border-t border-slate-200 py-1"></div>
          <PopupEntry title="Project" value={project} />
          <div className="md:hidden">
            <PopupEntry
              title="Point Number"
              value={toDisplayText(record.pointNumber)}
            />
          </div>
          <div className="hidden md:block">
            <PopupEntry
              title="Point Number"
              value={toDisplayText(record.pointNumber)}
            />
          </div>
          <div className="col-span-full">
            <PopupEntry
              title="Material"
              value={toDisplayText(record.material)}
            />
          </div>
          <div className="col-span-full">
            <PopupEntry title="Witness" value={toDisplayText(record.witness)} />
          </div>
          <div className="col-span-full border-t border-slate-200 py-1"></div>
          <PopupEntry
            title="Horizontal Accuracy"
            value={
              record.additionalFields.horizontal_accuracy
                ? toDisplayNumber(record.additionalFields.horizontal_accuracy) +
                  "±"
                : "Not Provided"
            }
          />
          <PopupEntry
            title="Horizontal Method"
            value={
              record.additionalFields.horizontal_establishment_method
                ? toDisplayText(
                    record.additionalFields.horizontal_establishment_method,
                  )
                : "Not Provided"
            }
          />
          <PopupEntry
            title="Vertical Accuracy"
            value={
              record.additionalFields.vertical_accuracy
                ? toDisplayNumber(record.additionalFields.vertical_accuracy) +
                  "±"
                : "Not Provided"
            }
          />
          <PopupEntry
            title="Vertical Method"
            value={
              record.additionalFields.vertical_establishment_method
                ? toDisplayText(
                    record.additionalFields.vertical_establishment_method,
                  )
                : "Not Provided"
            }
          />
          <div className="col-span-full border-t border-slate-200 py-1"></div>
          <PopupEntry
            title="Created"
            value={formatDate(record.createdAt)}
          />
          <PopupEntry
            title="Created By"
            value={toDisplayText(record.createdBy)}
          />
          <PopupEntry
            title="Last Updated"
            value={formatDate(record.updatedAt)}
          />
          <PopupEntry
            title="Updated By"
            value={toDisplayText(record.updatedBy)}
          />
          <div className="col-span-full">
            <PopupEntry
              title="Notes"
              value={toDisplayText(record.notes)}
            />
          </div>
        </div>
      </div>
      {currentUser !== "unknown-user" && (
        <Button
          style="primary"
          size="small"
          label="Edit"
          icon={Pencil}
          onClick={() => onEdit(record)}
        />
      )}
    </div>
  );
}
