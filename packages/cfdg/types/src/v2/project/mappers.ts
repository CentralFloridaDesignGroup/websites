import { UnknownPartial } from "../common";
import { ProjectListItem, ProjectListItemDbRow } from "./types";
import { normalizeString, normalizeType } from "../helpers";
import { PROJECT_STATUSES } from "../constants/projectManagement";

export function mapProjectListItemDbToObject(
  dbRow: UnknownPartial<ProjectListItemDbRow>,
): ProjectListItem {
  return {
    id: normalizeString(dbRow.id),
    fullName: normalizeString(dbRow.fullName),
    status: normalizeType<ProjectListItem["status"]>(
      dbRow.extra_status,
      Object.keys(PROJECT_STATUSES) as ProjectListItem["status"][],
      "active",
    ),
  };
}
