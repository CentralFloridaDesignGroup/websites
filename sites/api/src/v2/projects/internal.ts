import { normalizeString } from "cfdg/scripts";
import { mapQboCustomerRow } from "cfdg/types";
import type { NorthstarProject, ProjectExtraData, ProjectListItem } from "cfdg/types";

type UnknownRow = Record<string, unknown>;

/** Maps a cached QBO row into a Northstar project. */
export function mapProjectRow(row: UnknownRow): NorthstarProject {
  return { ...mapQboCustomerRow(row), purchaseOrder: normalizeString(row.purchase_order) };
}

/** Maps a project list row, including its parent client and lifecycle status. */
export function mapProjectListRow(row: UnknownRow): ProjectListItem {
  const project = mapProjectRow(row);
  return {
    ...project,
    fullName: project.displayName || project.fullyQualifiedName,
    parentDisplayName: normalizeString(row.parent_display_name),
    status: normalizeProjectStatus(row.extra_status),
  };
}

/** Maps project extra data and applies the API's defensive default. */
export function mapProjectExtraData(row: UnknownRow, qboId: string): ProjectExtraData {
  return {
    qboId: normalizeString(row.qbo_id) || qboId,
    status: normalizeProjectStatus(row.status),
    purchaseOrder: normalizeString(row.purchase_order),
    projectManagerId: normalizeString(row.project_manager) || null,
  };
}

function normalizeProjectStatus(value: unknown): ProjectListItem["status"] {
  const status = normalizeString(value).toLowerCase();
  return ["proposal", "active", "hold", "complete", "cancelled"].includes(status)
    ? status as ProjectListItem["status"]
    : "active";
}
